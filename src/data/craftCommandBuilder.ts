import { quote } from "./avraeCommandBuilder";

export type CraftMode = "start" | "continue";
export type CraftRollMode = "normal" | "adv" | "dis";
export type CraftAbility = "str" | "dex" | "con" | "int" | "wis" | "cha";

export const CRAFT_RARITIES: { value: string; label: string }[] = [
  { value: "Common", label: "Common" },
  { value: "Uncommon", label: "Uncommon" },
  { value: "Rare", label: "Rare" },
  { value: "Very Rare", label: "Very Rare" },
  { value: "Legendary", label: "Legendary" },
  { value: "Artifact", label: "Artifact" },
];

export const CRAFT_USAGES: { value: string; label: string }[] = [
  { value: "permanent", label: "Permanent" },
  { value: "single", label: "Single Use" },
];

export const CRAFT_TOOLS: string[] = [
  "Alchemist's supplies",
  "Brewer's supplies",
  "Calligrapher's supplies",
  "Carpenter's tools",
  "Cartographer's tools",
  "Cobbler's tools",
  "Cook's utensils",
  "Glassblower's tools",
  "Jeweler's tools",
  "Leatherworker's tools",
  "Mason's tools",
  "Painter's supplies",
  "Potter's tools",
  "Smith's tools",
  "Tinker's tools",
  "Weaver's tools",
  "Woodcarver's tools",
];

export type CraftCommandOptions = {
  mode: CraftMode;
  item?: string;
  rarity?: string;
  usage?: string;
  tool?: string;
  ability?: CraftAbility | "";
  rollMode?: CraftRollMode;
  guidance?: boolean;
  half?: boolean;
  bonuses?: string;
  freeCheck?: boolean;
};

export function parseBonuses(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function composeCraftCommand({
  mode,
  item = "",
  rarity = "",
  usage = "",
  tool = "",
  ability = "",
  rollMode = "normal",
  guidance = false,
  half = false,
  bonuses = "",
  freeCheck = false,
}: CraftCommandOptions): string {
  // Continuing an ongoing craft reuses the modifiers saved on the first
  // `!craft start` call — Avrae ignores anything else appended after that.
  if (mode === "continue") {
    return freeCheck ? "!craft start -i" : "!craft start";
  }

  const parts: string[] = [];

  if (item.trim()) parts.push(`-item ${quote(item.trim())}`);
  if (rarity.trim()) parts.push(`-rarity ${quote(rarity.trim())}`);
  if (usage.trim()) parts.push(`-usage ${quote(usage.trim())}`);
  if (tool.trim()) parts.push(`-tool ${quote(tool.trim())}`);

  for (const bonus of parseBonuses(bonuses)) {
    parts.push(`-b ${bonus}`);
  }

  if (guidance) parts.push("guidance");
  if (ability) parts.push(ability);
  if (half) parts.push("half");
  if (rollMode === "adv") parts.push("adv");
  if (rollMode === "dis") parts.push("dis");

  return parts.length ? `!craft start ${parts.join(" ")}` : "!craft start";
}
