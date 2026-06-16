export type AvraeActionKind = "attack" | "spell" | "save" | "check";

export type AvraeRollMode = "normal" | "adv" | "dis";

export type AvraeAction = {
  kind: AvraeActionKind;
  id: string;
  actorKind?: "character" | "creature";
  initContext?: boolean;
  outOfTurn?: boolean;
  combatantName?: string;
  level?: number;
  upcastTo?: number;
  targets?: string[];
  phrase?: string;
};

export type AvraeCommandOptions = {
  action: AvraeAction;
  rollMode?: AvraeRollMode;
  bonus?: string | string[];
  damage?: string | string[];
  phrase?: string | string[];
  rawFlags?: string | string[];
};

function quote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function cleanList(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function cleanValues(value: string | string[] | undefined): string[] {
  return (Array.isArray(value) ? value : [value || ""])
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function parseTargets(value: string): string[] {
  return cleanList(value);
}

export function composeAvraeCommand({
  action,
  rollMode = "normal",
  bonus = "",
  damage = "",
  phrase = "",
  rawFlags = "",
}: AvraeCommandOptions): string {
  const creature = action.actorKind === "creature";
  const init = Boolean(action.initContext);
  const offturn = (creature || init) && Boolean(action.outOfTurn) && Boolean(action.combatantName?.trim());
  const combatantName = action.combatantName?.trim() ?? "";

  let command: string;
  if (creature && action.kind === "attack") {
    command = offturn
      ? `!i aoo ${quote(combatantName)} ${quote(action.id)}`
      : `!i a ${quote(action.id)}`;
  } else if (creature && action.kind === "spell") {
    command = offturn
      ? `!i rc ${quote(combatantName)} ${quote(action.id)}`
      : `!i cast ${quote(action.id)}`;
  } else if (creature && action.kind === "save") {
    command = offturn
      ? `!i os ${quote(combatantName)} ${action.id}`
      : `!i s ${action.id}`;
  } else if (action.kind === "attack") {
    command = offturn
      ? `!i offturnattack ${quote(combatantName)} ${quote(action.id)}`
      : init
        ? `!i a ${quote(action.id)}`
        : `!attack ${quote(action.id)}`;
  } else if (action.kind === "spell") {
    command = offturn
      ? `!i offturncast ${quote(combatantName)} ${quote(action.id)}`
      : init
        ? `!i cast ${quote(action.id)}`
        : `!cast ${quote(action.id)}`;
  } else if (action.kind === "save") {
    command = offturn
      ? `!i offturnsave ${quote(combatantName)} ${action.id}`
      : init
        ? `!i s ${action.id}`
        : `!save ${action.id}`;
  } else {
    command = offturn
      ? `!i offturncheck ${quote(combatantName)} ${action.id}`
      : init
        ? `!i c ${action.id}`
        : `!check ${action.id}`;
  }

  const parts: string[] = [];

  if (
    action.kind === "spell" &&
    typeof action.level === "number" &&
    typeof action.upcastTo === "number" &&
    action.upcastTo > action.level
  ) {
    parts.push(`-l ${action.upcastTo}`);
  }

  if ((action.kind === "attack" || action.kind === "spell") && action.targets?.length) {
    action.targets.forEach((target) => parts.push(`-t ${quote(target)}`));
  }

  if (rollMode === "adv") parts.push("adv");
  if (rollMode === "dis") parts.push("dis");

  for (const bonusValue of cleanValues(bonus)) {
    parts.push(`-b ${bonusValue}`);
  }
  if (action.kind === "attack" || action.kind === "spell") {
    for (const damageValue of cleanValues(damage)) {
      parts.push(`-d ${quote(damageValue)}`);
    }
  }
  for (const rawValue of cleanValues(rawFlags)) parts.push(rawValue);

  for (const phraseValue of cleanValues(phrase)) {
    parts.push(`-phrase ${quote(phraseValue)}`);
  }
  if (!cleanValues(phrase).length && action.phrase?.trim()) {
    parts.push(`-phrase ${quote(action.phrase.trim())}`);
  }

  return parts.length ? `${command} ${parts.join(" ")}` : command;
}
