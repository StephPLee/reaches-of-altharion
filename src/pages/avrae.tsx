import { useEffect, useMemo, useState, type ReactNode } from "react";
import Layout from "@theme/Layout";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import {
  composeAvraeCommand,
  parseTargets,
  type AvraeActionKind,
} from "../data/avraeCommandBuilder";
import styles from "./grimoire.module.css";

const ABILITIES = [
  { id: "str", label: "STR" },
  { id: "dex", label: "DEX" },
  { id: "con", label: "CON" },
  { id: "int", label: "INT" },
  { id: "wis", label: "WIS" },
  { id: "cha", label: "CHA" },
];

const SKILLS = [
  "acrobatics",
  "animalHandling",
  "arcana",
  "athletics",
  "deception",
  "history",
  "insight",
  "intimidation",
  "investigation",
  "medicine",
  "nature",
  "perception",
  "performance",
  "persuasion",
  "religion",
  "sleightOfHand",
  "stealth",
  "survival",
];

const SKILL_DEFS = [
  {
    id: "acrobatics",
    command: "acrobatics",
    label: "Acrobatics",
    ability: "dex",
  },
  {
    id: "animal-handling",
    command: "animalHandling",
    label: "Animal Handling",
    ability: "wis",
  },
  { id: "arcana", command: "arcana", label: "Arcana", ability: "int" },
  { id: "athletics", command: "athletics", label: "Athletics", ability: "str" },
  { id: "deception", command: "deception", label: "Deception", ability: "cha" },
  { id: "history", command: "history", label: "History", ability: "int" },
  { id: "insight", command: "insight", label: "Insight", ability: "wis" },
  {
    id: "intimidation",
    command: "intimidation",
    label: "Intimidation",
    ability: "cha",
  },
  {
    id: "investigation",
    command: "investigation",
    label: "Investigation",
    ability: "int",
  },
  { id: "medicine", command: "medicine", label: "Medicine", ability: "wis" },
  { id: "nature", command: "nature", label: "Nature", ability: "int" },
  {
    id: "perception",
    command: "perception",
    label: "Perception",
    ability: "wis",
  },
  {
    id: "performance",
    command: "performance",
    label: "Performance",
    ability: "cha",
  },
  {
    id: "persuasion",
    command: "persuasion",
    label: "Persuasion",
    ability: "cha",
  },
  { id: "religion", command: "religion", label: "Religion", ability: "int" },
  {
    id: "sleight-of-hand",
    command: "sleightOfHand",
    label: "Sleight of Hand",
    ability: "dex",
  },
  { id: "stealth", command: "stealth", label: "Stealth", ability: "dex" },
  { id: "survival", command: "survival", label: "Survival", ability: "wis" },
];

const KIND_LABELS: Record<AvraeActionKind, string> = {
  attack: "Attacks",
  spell: "Spells",
  save: "Saves",
  check: "Skills",
  initiative: "Initiative",
};

type AppView = "vault" | "character" | "modifiers";
type SheetTab = "attacks" | "spells" | "companions" | "wildshapes";

type AuthUser = {
  username: string;
  globalName: string | null;
  isStaff: boolean;
  isDm?: boolean;
};

type SyncedDdbCharacter = {
  id: string;
  sourceKind?: "ddb" | "dicecloud" | "bestiary-builder";
  sourceUrl: string;
  syncedAt: string;
  avatarUrl?: string | null;
  name: string;
  ancestry?: string;
  level?: number | null;
  challengeRating?: number | string | null;
  sourceBestiaryName?: string | null;
  classes?: Array<{ name: string; subclass?: string; level: number }>;
  abilities?: Record<string, number>;
  hp?: { max: number; current: number; temp: number };
  hpOverride?: number;
  ac?: number;
  acOverride?: number;
  companionCreatureIds?: string[];
  wildShapeCreatureIds?: string[];
  speed?: number;
  initiative?: number;
  proficiencyBonus?: number;
  savingThrows?: Record<string, string>;
  savingThrowTotals?: Record<string, number>;
  skills?: Record<string, string>;
  skillTotals?: Record<string, number>;
  attacks: Array<{
    id: string;
    name: string;
    damage?: string;
    sub?: string;
    source?: string;
  }>;
  spells: Array<{
    id: string;
    name: string;
    level: number;
    prepared?: boolean;
    sub?: string;
  }>;
};

function isDicecloudCharacterLink(value: string): boolean {
  return /(?:^|\/\/)(?:v1\.)?dicecloud\.com\/character\//i.test(value.trim());
}

function isBestiaryBuilderLink(value: string): boolean {
  return /(?:^|\/\/)(?:www\.)?bestiarybuilder\.com\//i.test(value.trim());
}

function detectImportKind(value: string): "character" | "creature" | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isBestiaryBuilderLink(trimmed)) return "creature";
  return "character";
}

type AvraeModifier = {
  id: string;
  name: string;
  appliesTo: AvraeActionKind[];
  bonus: string;
  damage: string;
  phrase: string;
  rawFlags: string;
  builtin?: boolean;
};

type CustomAttack = {
  id: string;
  name: string;
  note?: string;
};

const BUILTIN_MODIFIERS: AvraeModifier[] = [
  {
    id: "builtin:adv",
    name: "Advantage",
    appliesTo: ["attack", "spell", "save", "check"],
    bonus: "",
    damage: "",
    phrase: "",
    rawFlags: "adv",
    builtin: true,
  },
  {
    id: "builtin:dis",
    name: "Disadvantage",
    appliesTo: ["attack", "spell", "save", "check"],
    bonus: "",
    damage: "",
    phrase: "",
    rawFlags: "dis",
    builtin: true,
  },
  {
    id: "builtin:bless",
    name: "Bless",
    appliesTo: ["attack", "spell", "save"],
    bonus: "1d4",
    damage: "",
    phrase: "blessed",
    rawFlags: "",
    builtin: true,
  },
  {
    id: "builtin:guidance",
    name: "Guidance",
    appliesTo: ["check"],
    bonus: "1d4",
    damage: "",
    phrase: "guided",
    rawFlags: "",
    builtin: true,
  },
  {
    id: "builtin:bardic",
    name: "Bardic Inspiration",
    appliesTo: ["attack", "spell", "save", "check"],
    bonus: "{die}",
    damage: "",
    phrase: "inspired",
    rawFlags: "",
    builtin: true,
  },
];

const LEGACY_STORAGE_KEY = "roa.avrae.ddbCharacter";
const STORAGE_KEY = "roa.avrae.ddbCharacters";
const OVERRIDES_STORAGE_KEY = "roa.avrae.overrides";

function getAuthApiBaseUrl(siteConfig): string {
  const configuredBaseUrl = siteConfig.customFields?.authApiBaseUrl;
  return typeof configuredBaseUrl === "string"
    ? configuredBaseUrl.replace(/\/$/, "")
    : "";
}

function skillLabel(value: string): string {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

function signedNum(n: number): string {
  return n >= 0 ? `+${n}` : String(n);
}

function proficiencyValue(
  proficiency: string | undefined,
  proficiencyBonus: number,
): number {
  if (proficiency === "expertise") return proficiencyBonus * 2;
  if (proficiency === "proficient") return proficiencyBonus;
  if (proficiency === "half") return Math.floor(proficiencyBonus / 2);
  return 0;
}

export default function AvraeCommandsPage(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const authApiBaseUrl = getAuthApiBaseUrl(siteConfig);
  const [view, setView] = useState<AppView>("vault");
  const [kind, setKind] = useState<AvraeActionKind>("attack");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [, setAuthLoading] = useState(true);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [vaultSearch, setVaultSearch] = useState("");
  const [character, setCharacter] = useState<SyncedDdbCharacter | null>(null);
  const [returnLinkSource, setReturnLinkSource] = useState<{
    characterId: string;
    tab: "companions" | "wildshapes";
  } | null>(null);
  const [savedCharacters, setSavedCharacters] = useState<SyncedDdbCharacter[]>(
    [],
  );
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [savedModifiers, setSavedModifiers] = useState<AvraeModifier[]>([]);
  const [activeModifierIds, setActiveModifierIds] = useState<string[]>([]);
  const [modifierParams, setModifierParams] = useState<Record<string, string>>({
    "builtin:bardic": "1d8",
  });
  const [modifierError, setModifierError] = useState("");
  const [editingModifierId, setEditingModifierId] = useState<string | null>(
    null,
  );
  const [sheetTab, setSheetTab] = useState<SheetTab>("attacks");
  const [modifierForm, setModifierForm] = useState({
    name: "",
    appliesTo: ["attack"] as AvraeActionKind[],
    bonus: "",
    damage: "",
    phrase: "",
    rawFlags: "",
  });
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "success" | "error"
  >("idle");
  const [syncError, setSyncError] = useState("");
  const [creatureSyncStatus, setCreatureSyncStatus] = useState<
    "idle" | "syncing" | "success" | "error"
  >("idle");
  const [creatureSyncError, setCreatureSyncError] = useState("");
  const [attackName, setAttackName] = useState("Longsword");
  const [spellName, setSpellName] = useState("Fire Bolt");
  const [ability, setAbility] = useState("dex");
  const [skill, setSkill] = useState("perception");
  const [bonus, setBonus] = useState("");
  const [damage, setDamage] = useState("");
  const [upcastLevel, setUpcastLevel] = useState("base");
  const [targets, setTargets] = useState("");
  const [phrase, setPhrase] = useState("");
  const [initContext, setInitContext] = useState(false);
  const [outOfTurn, setOutOfTurn] = useState(false);
  const [combatantName, setCombatantName] = useState("");
  const [useGroupInitiative, setUseGroupInitiative] = useState(false);
  const [initiativeGroupName, setInitiativeGroupName] = useState("");
  const [initiativeCompanionId, setInitiativeCompanionId] = useState("");
  const [initiativeCompanionNickname, setInitiativeCompanionNickname] =
    useState("");
  const [copied, setCopied] = useState(false);
  const [openDrawer, setOpenDrawer] = useState<"modifiers" | "targets" | null>(
    null,
  );
  const [customAttacks, setCustomAttacks] = useState<CustomAttack[]>([]);
  const [customAttackFormOpen, setCustomAttackFormOpen] = useState(false);
  const [customAttackName, setCustomAttackName] = useState("");
  const [customAttackNote, setCustomAttackNote] = useState("");
  const [combatantInput, setCombatantInput] = useState("");
  const [parsedCombatants, setParsedCombatants] = useState<string[]>([]);
  const [combatantFetchStatus, setCombatantFetchStatus] = useState<
    "idle" | "fetching" | "error"
  >("idle");
  const [combatantFetchError, setCombatantFetchError] = useState("");
  const [openCreaturePicker, setOpenCreaturePicker] = useState<
    "companions" | "wildshapes" | "initiative-companion" | null
  >(null);

  useEffect(() => {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  }, []);

  function loadGuestCharacters(preferredId?: string): void {
    try {
      const storedChars = JSON.parse(
        window.localStorage.getItem(STORAGE_KEY) ?? "[]",
      );
      const storedOverrides = JSON.parse(
        window.localStorage.getItem(OVERRIDES_STORAGE_KEY) ?? "{}",
      );
      const guestChars: SyncedDdbCharacter[] = (
        Array.isArray(storedChars) ? storedChars : []
      ).map((c: SyncedDdbCharacter) =>
        storedOverrides[c.id] ? { ...c, ...storedOverrides[c.id] } : c,
      );
      setSavedCharacters(guestChars);
      if (guestChars.length) {
        const selected =
          guestChars.find((c) => c.id === preferredId) || guestChars[0];
        applyCharacterToBuilder(selected);
      }
    } catch {
      setSavedCharacters([]);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadUserAndData() {
      setAuthLoading(true);
      try {
        const meResponse = await fetch(`${authApiBaseUrl}/api/me`, {
          credentials: "include",
        });
        if (!meResponse.ok) {
          if (!cancelled) {
            setUser(null);
            loadGuestCharacters(selectedCharacterId);
            setSavedModifiers([]);
            setAuthLoading(false);
          }
          return;
        }

        const mePayload = await meResponse.json();
        const nextUser = mePayload.authenticated ? mePayload.user : null;
        if (!nextUser) {
          if (!cancelled) {
            setUser(null);
            loadGuestCharacters(selectedCharacterId);
            setSavedModifiers([]);
            setAuthLoading(false);
          }
          return;
        }

        const [charactersResponse, modifiersResponse] = await Promise.all([
          fetch(`${authApiBaseUrl}/api/avrae/characters`, {
            credentials: "include",
          }),
          fetch(`${authApiBaseUrl}/api/avrae/modifiers`, {
            credentials: "include",
          }),
        ]);
        const charactersPayload = charactersResponse.ok
          ? await charactersResponse.json()
          : { characters: [] };
        const modifiersPayload = modifiersResponse.ok
          ? await modifiersResponse.json()
          : { modifiers: [] };
        const nextCharacters = Array.isArray(charactersPayload.characters)
          ? (charactersPayload.characters as SyncedDdbCharacter[])
          : [];
        const nextModifiers = Array.isArray(modifiersPayload.modifiers)
          ? (modifiersPayload.modifiers as AvraeModifier[])
          : [];

        if (!cancelled) {
          setUser(nextUser);
          setSavedCharacters(nextCharacters);
          setSavedModifiers(nextModifiers);
          if (nextCharacters.length) {
            const selected =
              nextCharacters.find(
                (entry) => entry.id === selectedCharacterId,
              ) || nextCharacters[0];
            applyCharacterToBuilder(selected);
          } else {
            setCharacter(null);
            setSelectedCharacterId("");
          }
          setAuthLoading(false);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          loadGuestCharacters(selectedCharacterId);
          setSavedModifiers([]);
          setAuthLoading(false);
        }
      }
    }

    loadUserAndData();
    return () => {
      cancelled = true;
    };
  }, [authApiBaseUrl]);

  useEffect(() => {
    if (!character?.id) {
      setCustomAttacks([]);
      return;
    }
    try {
      const stored = window.localStorage.getItem(
        `avrae-custom-attacks-${character.id}`,
      );
      setCustomAttacks(stored ? JSON.parse(stored) : []);
    } catch {
      setCustomAttacks([]);
    }
  }, [character?.id]);

  const classSummary = useMemo(
    () =>
      character?.sourceKind === "bestiary-builder"
        ? [
            character.sourceBestiaryName,
            character.challengeRating != null
              ? `CR ${character.challengeRating}`
              : "Creature",
          ]
            .filter(Boolean)
            .join(" / ")
        : character?.classes
            ?.map((entry) => `${entry.subclass || entry.name} ${entry.level}`)
            .join(" / ") || "",
    [character],
  );

  const characterEntries = useMemo(
    () =>
      savedCharacters.filter(
        (entry) => entry.sourceKind !== "bestiary-builder",
      ),
    [savedCharacters],
  );

  const creatureEntries = useMemo(
    () =>
      savedCharacters.filter(
        (entry) => entry.sourceKind === "bestiary-builder",
      ),
    [savedCharacters],
  );

  const normalizedVaultSearch = vaultSearch.trim().toLowerCase();

  const filterVaultEntries = (entries: SyncedDdbCharacter[]) => {
    if (!normalizedVaultSearch) return entries;
    return entries.filter((entry) =>
      [
        entry.name,
        entry.ancestry,
        entry.sourceBestiaryName,
        entry.challengeRating != null ? `cr ${entry.challengeRating}` : "",
        entry.level != null ? `level ${entry.level}` : "",
        ...(entry.classes || []).flatMap((item) => [
          item.name,
          item.subclass || "",
        ]),
        ...entry.attacks.map((attack) => attack.name),
        ...entry.spells.map((spell) => spell.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedVaultSearch),
    );
  };

  const visibleCharacterEntries = useMemo(
    () => filterVaultEntries(characterEntries),
    [characterEntries, normalizedVaultSearch],
  );

  const visibleCreatureEntries = useMemo(
    () => filterVaultEntries(creatureEntries),
    [creatureEntries, normalizedVaultSearch],
  );

  const isCreatureSheet = character?.sourceKind === "bestiary-builder";

  useEffect(() => {
    if (!isCreatureSheet && !initContext) {
      setOutOfTurn(false);
    }
  }, [initContext, isCreatureSheet]);

  const isDruidCharacter = useMemo(() => {
    if (!character || isCreatureSheet) return false;
    return (character.classes || []).some((entry) => {
      const text = `${entry.name} ${entry.subclass || ""}`.toLowerCase();
      return (
        text.includes("druid") ||
        text.includes("circle of ") ||
        text.startsWith("circle ")
      );
    });
  }, [character, isCreatureSheet]);

  const linkedCompanions = useMemo(() => {
    const linkedIds = new Set(character?.companionCreatureIds || []);
    return creatureEntries.filter((entry) => linkedIds.has(entry.id));
  }, [character?.companionCreatureIds, creatureEntries]);

  const selectedInitiativeCompanion = useMemo(
    () =>
      linkedCompanions.find((entry) => entry.id === initiativeCompanionId) ||
      null,
    [initiativeCompanionId, linkedCompanions],
  );

  useEffect(() => {
    if (
      initiativeCompanionId &&
      !linkedCompanions.some((entry) => entry.id === initiativeCompanionId)
    ) {
      setInitiativeCompanionId("");
      setInitiativeCompanionNickname("");
    }
  }, [initiativeCompanionId, linkedCompanions]);

  const linkedWildShapes = useMemo(() => {
    const linkedIds = new Set(character?.wildShapeCreatureIds || []);
    return creatureEntries.filter((entry) => linkedIds.has(entry.id));
  }, [character?.wildShapeCreatureIds, creatureEntries]);

  const availableCompanionCreatures = useMemo(() => {
    const linkedIds = new Set(character?.companionCreatureIds || []);
    return creatureEntries.filter((entry) => !linkedIds.has(entry.id));
  }, [character?.companionCreatureIds, creatureEntries]);

  const availableWildShapeCreatures = useMemo(() => {
    const linkedIds = new Set(character?.wildShapeCreatureIds || []);
    return creatureEntries.filter((entry) => !linkedIds.has(entry.id));
  }, [character?.wildShapeCreatureIds, creatureEntries]);

  const returnCharacter = useMemo(
    () =>
      returnLinkSource
        ? savedCharacters.find(
            (entry) => entry.id === returnLinkSource.characterId,
          ) || null
        : null,
    [returnLinkSource, savedCharacters],
  );

  const selectedSpell = useMemo(
    () => character?.spells.find((spell) => spell.name === spellName) || null,
    [character, spellName],
  );

  const spellsByLevel = useMemo(() => {
    const groups = new Map<number, SyncedDdbCharacter["spells"]>();
    for (const spell of character?.spells || []) {
      const level = Number(spell.level) || 0;
      groups.set(level, [...(groups.get(level) || []), spell]);
    }
    return [...groups.entries()].sort(([a], [b]) => a - b);
  }, [character]);

  const effectiveSheetTab: SheetTab = useMemo(() => {
    if (!character) return "attacks";
    if (sheetTab === "companions" && !isCreatureSheet) return "companions";
    if (sheetTab === "wildshapes" && isDruidCharacter) return "wildshapes";
    if (sheetTab === "attacks" && !character?.attacks.length) return "spells";
    if (sheetTab === "spells" && !character?.spells.length) return "attacks";
    return sheetTab === "attacks" || sheetTab === "spells"
      ? sheetTab
      : "attacks";
  }, [sheetTab, character, isCreatureSheet, isDruidCharacter]);

  const selectedTargetNames = useMemo(
    () =>
      targets
        .split(/[\n,]/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    [targets],
  );

  const isDiscordUrl = useMemo(
    () =>
      /^https?:\/\/(canary\.)?discord\.com\/channels\/\d+\/\d+\/\d+/.test(
        combatantInput.trim(),
      ),
    [combatantInput],
  );

  const availableModifiers = useMemo(
    () =>
      [...BUILTIN_MODIFIERS, ...savedModifiers].filter((modifier) =>
        modifier.appliesTo.includes(kind),
      ),
    [kind, savedModifiers],
  );

  const activeModifiers = useMemo(
    () =>
      availableModifiers.filter((modifier) =>
        activeModifierIds.includes(modifier.id),
      ),
    [activeModifierIds, availableModifiers],
  );

  const resolveModifierValue = (
    modifier: AvraeModifier,
    value: string,
  ): string => value.replace(/\{die\}/g, modifierParams[modifier.id] || "1d8");

  const command = useMemo(() => {
    const id =
      kind === "attack"
        ? attackName.trim() || "Attack"
        : kind === "spell"
          ? spellName.trim() || "Spell"
          : kind === "save"
            ? ability
            : kind === "check"
              ? skill
              : "initiative";
    return composeAvraeCommand({
      action: {
        kind,
        id,
        actorKind: isCreatureSheet ? "creature" : "character",
        groupName: useGroupInitiative ? initiativeGroupName : "",
        companionName: useGroupInitiative
          ? selectedInitiativeCompanion?.name
          : "",
        companionNickname: useGroupInitiative
          ? initiativeCompanionNickname
          : "",
        level:
          kind === "spell" && selectedSpell ? selectedSpell.level : undefined,
        upcastTo:
          kind === "spell" && upcastLevel !== "base"
            ? Number(upcastLevel)
            : undefined,
        initContext,
        outOfTurn,
        combatantName,
        targets: parseTargets(targets),
      },
      bonus: [
        bonus,
        ...activeModifiers.map((modifier) =>
          resolveModifierValue(modifier, modifier.bonus),
        ),
      ],
      damage: [
        damage,
        ...activeModifiers.map((modifier) =>
          resolveModifierValue(modifier, modifier.damage),
        ),
      ],
      phrase: [
        phrase,
        ...activeModifiers.map((modifier) =>
          resolveModifierValue(modifier, modifier.phrase),
        ),
      ],
      rawFlags: activeModifiers.map((modifier) =>
        resolveModifierValue(modifier, modifier.rawFlags),
      ),
    });
  }, [
    ability,
    activeModifiers,
    attackName,
    bonus,
    combatantName,
    damage,
    initContext,
    initiativeCompanionNickname,
    initiativeGroupName,
    isCreatureSheet,
    kind,
    modifierParams,
    outOfTurn,
    phrase,
    selectedInitiativeCompanion,
    selectedSpell,
    skill,
    spellName,
    targets,
    upcastLevel,
    useGroupInitiative,
  ]);

  async function copyCommand(): Promise<void> {
    if (!navigator?.clipboard) return;
    await navigator.clipboard.writeText(command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function handleLogin(): void {
    const returnTo =
      window.location.pathname + window.location.search + window.location.hash;
    window.location.href = `${authApiBaseUrl}/auth/discord/login?returnTo=${encodeURIComponent(returnTo)}`;
  }

  function applyCharacterToBuilder(nextCharacter: SyncedDdbCharacter): void {
    setCharacter(nextCharacter);
    setSelectedCharacterId(nextCharacter.id);
    if (nextCharacter.attacks?.[0]?.name) {
      setAttackName(nextCharacter.attacks[0].name);
      setDamage("");
      setSheetTab("attacks");
    } else if (nextCharacter.spells?.length) {
      setSheetTab("spells");
    }
    if (nextCharacter.spells?.[0]?.name) {
      setSpellName(nextCharacter.spells[0].name);
      setUpcastLevel("base");
    }
  }

  function setActiveCharacter(
    nextCharacter: SyncedDdbCharacter,
    origin: {
      characterId: string;
      tab: "companions" | "wildshapes";
    } | null = null,
  ): void {
    setReturnLinkSource(origin);
    applyCharacterToBuilder(nextCharacter);
    setView("character");
  }

  function returnToLinkedCharacter(): void {
    if (!returnLinkSource) return;
    const nextCharacter = savedCharacters.find(
      (entry) => entry.id === returnLinkSource.characterId,
    );
    if (!nextCharacter) {
      setReturnLinkSource(null);
      return;
    }
    const returnTab = returnLinkSource.tab;
    setReturnLinkSource(null);
    applyCharacterToBuilder(nextCharacter);
    setSheetTab(returnTab);
    setView("character");
  }

  function selectKind(nextKind: AvraeActionKind): void {
    setKind(nextKind);
    setActiveModifierIds((ids) =>
      ids.filter((id) => {
        const modifier = [...BUILTIN_MODIFIERS, ...savedModifiers].find(
          (entry) => entry.id === id,
        );
        return modifier?.appliesTo.includes(nextKind);
      }),
    );
    setDamage("");
    if (nextKind !== "spell") setUpcastLevel("base");
  }

  function addCustomAttack(): void {
    if (!customAttackName.trim() || !character) return;
    const next: CustomAttack[] = [
      ...customAttacks,
      {
        id: `custom-${Date.now()}`,
        name: customAttackName.trim(),
        note: customAttackNote.trim() || undefined,
      },
    ];
    setCustomAttacks(next);
    window.localStorage.setItem(
      `avrae-custom-attacks-${character.id}`,
      JSON.stringify(next),
    );
    setCustomAttackName("");
    setCustomAttackNote("");
    setCustomAttackFormOpen(false);
  }

  function removeCustomAttack(id: string): void {
    if (!character) return;
    const next = customAttacks.filter((a) => a.id !== id);
    setCustomAttacks(next);
    window.localStorage.setItem(
      `avrae-custom-attacks-${character.id}`,
      JSON.stringify(next),
    );
  }

  function parseCombatantsFromText(text: string): string[] {
    if (!text.trim()) return [];

    // Format: -t "Name|" (Avrae targeting syntax)
    const targetFmt: string[] = [];
    const targetRegex = /-t\s+"([^|"]+)\|?[^"]*"/g;
    let match: RegExpExecArray | null;
    while ((match = targetRegex.exec(text)) !== null) {
      const name = match[1].trim();
      if (name) targetFmt.push(name);
    }
    if (targetFmt.length > 0) return targetFmt;

    // Format: **Name** ... (Avrae !i list embed — bold name at start of line)
    const boldFmt = [...text.matchAll(/^\*{1,2}([^*\n]+)\*{1,2}/gm)]
      .map((m) => m[1].trim())
      .filter(Boolean);
    if (boldFmt.length > 0) return boldFmt;

    // Fallback: one name per line
    return text
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function handleCombatantInputChange(value: string): void {
    setCombatantInput(value);
    setCombatantFetchError("");
    if (!value.trim()) {
      setParsedCombatants([]);
      return;
    }
    if (!value.trim().startsWith("https://")) {
      setParsedCombatants(parseCombatantsFromText(value));
    }
  }

  async function fetchCombatantsFromDiscord(): Promise<void> {
    setCombatantFetchStatus("fetching");
    setCombatantFetchError("");
    try {
      const response = await fetch(
        `${authApiBaseUrl}/api/avrae/discord-message?url=${encodeURIComponent(combatantInput.trim())}`,
        { credentials: "include" },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload?.error || "Failed to fetch message.");
      const parsed = parseCombatantsFromText(payload.content || "");
      if (parsed.length === 0) {
        setCombatantFetchStatus("error");
        setCombatantFetchError(
          "No combatants found in that message. Try right-clicking the specific Avrae message with the -t lines, or paste the text directly.",
        );
        return;
      }
      setParsedCombatants(parsed);
      setCombatantFetchStatus("idle");
    } catch (err) {
      setCombatantFetchStatus("error");
      setCombatantFetchError(
        err instanceof Error ? err.message : "Failed to fetch message.",
      );
    }
  }

  function toggleCombatant(name: string): void {
    setTargets((current) => {
      const lines = current
        .split(/[\n,]/)
        .map((t) => t.trim())
        .filter(Boolean);
      const idx = lines.findIndex(
        (t) => t.toLowerCase() === name.toLowerCase(),
      );
      if (idx >= 0) {
        lines.splice(idx, 1);
      } else {
        lines.push(name);
      }
      return lines.join("\n");
    });
  }

  function chooseAttack(name: string): void {
    setKind("attack");
    setAttackName(name);
    setDamage("");
  }

  function chooseSpell(name: string): void {
    setKind("spell");
    setSpellName(name);
    setUpcastLevel("base");
  }

  function chooseSave(abilityId: string): void {
    setKind("save");
    setAbility(abilityId);
    setDamage("");
    setUpcastLevel("base");
  }

  function chooseSkill(skillId: string): void {
    setKind("check");
    setSkill(skillId);
    setDamage("");
    setUpcastLevel("base");
  }

  function chooseInitiative(): void {
    setKind("initiative");
    setDamage("");
    setBonus("");
    setPhrase("");
    setUpcastLevel("base");
    if (!initiativeGroupName.trim() && character?.name) {
      setInitiativeGroupName(character.name);
    }
    setOpenDrawer("modifiers");
  }

  function toggleModifier(modifierId: string): void {
    setActiveModifierIds((ids) => {
      if (ids.includes(modifierId)) {
        return ids.filter((id) => id !== modifierId);
      }
      let next = ids;
      if (modifierId === "builtin:adv")
        next = next.filter((id) => id !== "builtin:dis");
      if (modifierId === "builtin:dis")
        next = next.filter((id) => id !== "builtin:adv");
      return [...next, modifierId];
    });
  }

  function toggleOutOfTurn(checked: boolean): void {
    setOutOfTurn(checked);
    if (
      checked &&
      isCreatureSheet &&
      !combatantName.trim() &&
      character?.name
    ) {
      setCombatantName(character.name);
    }
  }

  function toggleModifierAppliesTo(kindValue: AvraeActionKind): void {
    setModifierForm((current) => {
      const appliesTo = current.appliesTo.includes(kindValue)
        ? current.appliesTo.filter((entry) => entry !== kindValue)
        : [...current.appliesTo, kindValue];
      return { ...current, appliesTo };
    });
  }

  function startEditingModifier(modifier: AvraeModifier): void {
    setEditingModifierId(modifier.id);
    setModifierForm({
      name: modifier.name,
      appliesTo: modifier.appliesTo,
      bonus: modifier.bonus,
      damage: modifier.damage,
      phrase: modifier.phrase,
      rawFlags: modifier.rawFlags,
    });
    setModifierError("");
  }

  function cancelEditingModifier(): void {
    setEditingModifierId(null);
    setModifierForm({
      name: "",
      appliesTo: ["attack"],
      bonus: "",
      damage: "",
      phrase: "",
      rawFlags: "",
    });
    setModifierError("");
  }

  async function saveModifier(): Promise<void> {
    if (!user) {
      setModifierError("Sign in before saving modifiers.");
      return;
    }
    setModifierError("");
    const isEditing = editingModifierId !== null;
    const url = isEditing
      ? `${authApiBaseUrl}/api/avrae/modifiers/${encodeURIComponent(editingModifierId)}`
      : `${authApiBaseUrl}/api/avrae/modifiers`;
    const response = await fetch(url, {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(modifierForm),
    });
    const payload = await response.json();
    if (!response.ok) {
      setModifierError(payload?.error || "Failed to save modifier.");
      return;
    }
    const saved = payload.modifier as AvraeModifier;
    setSavedModifiers((modifiers) => {
      const without = modifiers.filter((m) => m.id !== saved.id);
      return [...without, saved].sort((a, b) => a.name.localeCompare(b.name));
    });
    setEditingModifierId(null);
    setModifierForm({
      name: "",
      appliesTo: ["attack"],
      bonus: "",
      damage: "",
      phrase: "",
      rawFlags: "",
    });
  }

  async function deleteModifier(modifierId: string): Promise<void> {
    const response = await fetch(
      `${authApiBaseUrl}/api/avrae/modifiers/${encodeURIComponent(modifierId)}`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );
    if (!response.ok && response.status !== 404) {
      setModifierError("Failed to delete modifier.");
      return;
    }
    setSavedModifiers((modifiers) =>
      modifiers.filter((modifier) => modifier.id !== modifierId),
    );
    setActiveModifierIds((ids) => ids.filter((id) => id !== modifierId));
  }

  function upsertSavedCharacter(nextCharacter: SyncedDdbCharacter): void {
    const nextSavedCharacters = [
      nextCharacter,
      ...savedCharacters.filter((entry) => entry.id !== nextCharacter.id),
    ].sort((a, b) => a.name.localeCompare(b.name));
    setSavedCharacters(nextSavedCharacters);
    applyCharacterToBuilder(nextCharacter);
    if (!user) {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(nextSavedCharacters),
        );
      } catch {}
    }
  }

  async function removeCharacter(characterId: string): Promise<void> {
    if (user) {
      const response = await fetch(
        `${authApiBaseUrl}/api/avrae/characters/${encodeURIComponent(characterId)}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!response.ok && response.status !== 404) {
        setSyncStatus("error");
        setSyncError("Failed to remove saved character.");
        return;
      }
    } else {
      try {
        const storedChars: SyncedDdbCharacter[] = JSON.parse(
          window.localStorage.getItem(STORAGE_KEY) ?? "[]",
        );
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(storedChars.filter((c) => c.id !== characterId)),
        );
      } catch {}
    }
    const nextSavedCharacters = savedCharacters.filter(
      (entry) => entry.id !== characterId,
    );
    const nextSelected = nextSavedCharacters[0] || null;
    setSavedCharacters(nextSavedCharacters);
    if (nextSelected) {
      applyCharacterToBuilder(nextSelected);
    } else {
      setCharacter(null);
      setSelectedCharacterId("");
    }
  }

  async function updateCharacterCreatureLinks(
    linkKind: "companions" | "wildshapes",
    ids: string[],
  ): Promise<void> {
    if (!character) return;
    const uniqueIds = [...new Set(ids)].filter(Boolean);
    const payloadKey =
      linkKind === "companions"
        ? "companionCreatureIds"
        : "wildShapeCreatureIds";

    if (user) {
      const response = await fetch(
        `${authApiBaseUrl}/api/avrae/characters/${encodeURIComponent(character.id)}/overrides`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ [payloadKey]: uniqueIds }),
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        setSyncStatus("error");
        setSyncError(payload?.error || "Failed to save creature links.");
        return;
      }
      const updated = payload.character as SyncedDdbCharacter;
      setSavedCharacters((entries) =>
        entries
          .map((entry) => (entry.id === updated.id ? updated : entry))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      applyCharacterToBuilder(updated);
      return;
    }

    const updated = { ...character, [payloadKey]: uniqueIds };
    setCharacter(updated);
    setSavedCharacters((entries) =>
      entries.map((entry) => (entry.id === updated.id ? updated : entry)),
    );
    try {
      const stored = JSON.parse(
        window.localStorage.getItem(OVERRIDES_STORAGE_KEY) ?? "{}",
      );
      window.localStorage.setItem(
        OVERRIDES_STORAGE_KEY,
        JSON.stringify({
          ...stored,
          [updated.id]: {
            ...(stored[updated.id] || {}),
            [payloadKey]: uniqueIds,
          },
        }),
      );
    } catch {}
  }

  async function syncDdbCharacter(sourceUrl: string): Promise<void> {
    const requestedUrl = sourceUrl;
    const isDicecloud = isDicecloudCharacterLink(requestedUrl);
    const endpoint = isDicecloud ? "dicecloud-character" : "ddb-character";
    const sourceLabel = isDicecloud ? "Dicecloud" : "D&D Beyond";
    setSyncStatus("syncing");
    setSyncError("");
    try {
      const response = await fetch(
        `${authApiBaseUrl}/api/avrae/${endpoint}${user ? "" : "/preview"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ url: requestedUrl }),
        },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          payload?.error || `Failed to sync ${sourceLabel} character.`,
        );
      let nextCharacter = payload.character as SyncedDdbCharacter;
      if (user) {
        upsertSavedCharacter(nextCharacter);
      } else {
        try {
          const stored = JSON.parse(
            window.localStorage.getItem(OVERRIDES_STORAGE_KEY) ?? "{}",
          );
          const overrides = stored[nextCharacter.id];
          if (overrides) {
            nextCharacter = { ...nextCharacter, ...overrides };
          }
        } catch {}
        upsertSavedCharacter(nextCharacter);
      }
      setView("character");
      setSyncStatus("success");
    } catch (error) {
      setSyncStatus("error");
      setSyncError(
        error instanceof Error
          ? error.message
          : `Failed to sync ${sourceLabel} character.`,
      );
    }
  }

  async function syncBestiaryBuilderCreatures(
    sourceUrl: string,
  ): Promise<void> {
    const requestedUrl = sourceUrl;
    if (!user) {
      setCreatureSyncStatus("error");
      setCreatureSyncError("Sign in with Discord before importing creatures.");
      return;
    }

    setCreatureSyncStatus("syncing");
    setCreatureSyncError("");
    try {
      const response = await fetch(
        `${authApiBaseUrl}/api/avrae/bestiary-builder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ url: requestedUrl }),
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          payload?.error || "Failed to import Bestiary Builder creatures.",
        );
      }

      const imported = Array.isArray(payload.creatures)
        ? (payload.creatures as SyncedDdbCharacter[])
        : [];
      const importedIds = new Set(imported.map((entry) => entry.id));
      const nextSavedCharacters = [
        ...imported,
        ...savedCharacters.filter((entry) => !importedIds.has(entry.id)),
      ].sort((a, b) => a.name.localeCompare(b.name));
      setSavedCharacters(nextSavedCharacters);
      setCreatureSyncStatus("success");
    } catch (error) {
      setCreatureSyncStatus("error");
      setCreatureSyncError(
        error instanceof Error
          ? error.message
          : "Failed to import Bestiary Builder creatures.",
      );
    }
  }

  const detectedImportKind = detectImportKind(importUrl);

  async function handleUnifiedImport(): Promise<void> {
    if (detectedImportKind === "creature") {
      await syncBestiaryBuilderCreatures(importUrl);
    } else if (detectedImportKind === "character") {
      await syncDdbCharacter(importUrl);
    }
  }

  useEffect(() => {
    if (
      isImportOpen &&
      (syncStatus === "success" || creatureSyncStatus === "success")
    ) {
      setIsImportOpen(false);
      setImportUrl("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncStatus, creatureSyncStatus]);

  function renderVaultCard(entry: SyncedDdbCharacter): ReactNode {
    const isCreature = entry.sourceKind === "bestiary-builder";

    return (
      <article
        key={entry.id}
        className={isCreature ? styles.vaultCreatureCard : styles.vaultCard}
      >
        <button
          type="button"
          className={
            isCreature ? styles.vaultCreatureCardMain : styles.vaultCardMain
          }
          onClick={() => setActiveCharacter(entry)}
        >
          {!isCreature ? (
            <span className={styles.vaultAvatar}>
              {entry.avatarUrl ? (
                <img
                  src={entry.avatarUrl}
                  alt={entry.name}
                  className={styles.vaultAvatarImg}
                />
              ) : (
                entry.name.slice(0, 1)
              )}
            </span>
          ) : null}
          <span>
            <strong>{entry.name}</strong>
            <em>
              {[
                entry.ancestry,
                entry.sourceKind === "bestiary-builder"
                  ? entry.challengeRating != null
                    ? `CR ${entry.challengeRating}`
                    : "Creature"
                  : entry.classes
                      ?.map((item) => item.subclass || item.name)
                      .join(" / "),
              ]
                .filter(Boolean)
                .join(" · ")}
            </em>
            <small>
              {entry.sourceKind === "bestiary-builder"
                ? `CR ${entry.challengeRating ?? "?"} - ${entry.attacks.length} actions - ${entry.spells.length} spells`
                : `Level ${entry.level || "?"} - ${entry.attacks.length} attacks - ${entry.spells.length} spells`}
            </small>
          </span>
        </button>
        <div className={styles.vaultCardActions}>
          {isCreature ? (
            <a href={entry.sourceUrl} target="_blank" rel="noreferrer">
              Source
            </a>
          ) : (
            <button
              type="button"
              onClick={() => syncDdbCharacter(entry.sourceUrl)}
              disabled={syncStatus === "syncing"}
            >
              Refresh
            </button>
          )}
          <button type="button" onClick={() => removeCharacter(entry.id)}>
            Remove
          </button>
        </div>
      </article>
    );
  }

  function renderImportDialog(): ReactNode {
    if (!isImportOpen) return null;

    const isSyncing =
      syncStatus === "syncing" || creatureSyncStatus === "syncing";
    const dialogError =
      detectedImportKind === "creature" && creatureSyncStatus === "error"
        ? creatureSyncError
        : detectedImportKind !== "creature" && syncStatus === "error"
          ? syncError
          : "";
    const needsLogin = detectedImportKind === "creature" && !user;

    let actionLabel = "Import";
    if (isSyncing) actionLabel = "Importing";
    else if (detectedImportKind === "character")
      actionLabel = user ? "Add / Sync" : "Preview";
    else if (detectedImportKind === "creature") actionLabel = "Import";

    return (
      <div
        className={styles.importDialogOverlay}
        onClick={() => setIsImportOpen(false)}
      >
        <div
          className={styles.importDialogPanel}
          role="dialog"
          aria-modal="true"
          aria-label="Import a character or creature"
          onClick={(event) => event.stopPropagation()}
        >
          <div className={styles.importDialogHeader}>
            <h2>Import</h2>
            <button
              type="button"
              className={styles.importDialogClose}
              onClick={() => setIsImportOpen(false)}
              aria-label="Close import dialog"
            >
              ×
            </button>
          </div>
          <p className={styles.importDialogHint}>
            Paste a D&amp;D Beyond, Dicecloud, or Bestiary Builder link. We’ll
            work out what it is automatically.
          </p>
          <input
            autoFocus
            placeholder="Paste a character or creature link"
            value={importUrl}
            onChange={(event) => setImportUrl(event.target.value)}
          />
          {importUrl.trim() ? (
            <p className={styles.importDialogDetected}>
              {detectedImportKind === "creature"
                ? "Detected: Bestiary Builder creature"
                : "Detected: D&D Beyond / Dicecloud character"}
            </p>
          ) : null}
          {needsLogin ? (
            <p className={styles.errorText}>
              Sign in with Discord before importing creatures.
            </p>
          ) : dialogError ? (
            <p className={styles.errorText}>{dialogError}</p>
          ) : null}
          <div className={styles.importDialogActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setIsImportOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleUnifiedImport}
              disabled={!importUrl.trim() || isSyncing || needsLogin}
            >
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderCreatureLinksPanel(
    title: string,
    description: string,
    linkKind: "companions" | "wildshapes",
    linkedEntries: SyncedDdbCharacter[],
    availableEntries: SyncedDdbCharacter[],
  ): ReactNode {
    const linkedIds =
      linkKind === "companions"
        ? character?.companionCreatureIds || []
        : character?.wildShapeCreatureIds || [];
    const pickerOpen = openCreaturePicker === linkKind;

    return (
      <div className={styles.csCreatureLinksPanel}>
        <div className={styles.csCreatureLinksHeader}>
          <h3>{title}</h3>
          <span>{linkedEntries.length} linked</span>
        </div>
        <p>{description}</p>
        <div className={styles.csCreaturePicker}>
          <button
            type="button"
            className={styles.csCreaturePickerButton}
            disabled={!availableEntries.length}
            aria-expanded={pickerOpen}
            onClick={() =>
              setOpenCreaturePicker((current) =>
                current === linkKind ? null : linkKind,
              )
            }
          >
            <span>
              {availableEntries.length
                ? "Add imported creature..."
                : "No imported creatures available"}
            </span>
            <span aria-hidden="true">⌄</span>
          </button>
          {pickerOpen ? (
            <div className={styles.csCreaturePickerMenu}>
              {availableEntries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={styles.csCreaturePickerOption}
                  onClick={() => {
                    updateCharacterCreatureLinks(linkKind, [
                      ...linkedIds,
                      entry.id,
                    ]);
                    setOpenCreaturePicker(null);
                  }}
                >
                  <strong>{entry.name}</strong>
                  <span>
                    {entry.challengeRating != null
                      ? `CR ${entry.challengeRating}`
                      : "Creature"}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {linkedEntries.length ? (
          <div className={styles.csLinkedCreatureList}>
            {linkedEntries.map((entry) => (
              <div key={entry.id} className={styles.csLinkedCreatureRow}>
                <button
                  type="button"
                  className={styles.csLinkedCreatureMain}
                  onClick={() =>
                    character &&
                    setActiveCharacter(entry, {
                      characterId: character.id,
                      tab: linkKind,
                    })
                  }
                >
                  <strong>{entry.name}</strong>
                  <span>
                    {[entry.ancestry, `CR ${entry.challengeRating ?? "?"}`]
                      .filter(Boolean)
                      .join(" - ")}
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.csLinkedCreatureRemove}
                  onClick={() =>
                    updateCharacterCreatureLinks(
                      linkKind,
                      linkedIds.filter((id) => id !== entry.id),
                    )
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.csCreatureLinksEmpty}>
            Import creature stats in the collection, then add them here.
          </div>
        )}
      </div>
    );
  }

  return (
    <Layout
      title="Avrae Commands"
      description="Avrae command builder for Reaches of Altharion."
    >
      <main className={styles.appPage}>
        <div className={styles.appShell}>
          <header className={styles.appHeader}>
            {view === "vault" ? (
              <button
                type="button"
                className={`${styles.primaryButton} ${styles.appHeaderAction}`}
                onClick={() => setIsImportOpen(true)}
              >
                + Import
              </button>
            ) : null}
            <p className={styles.appTitle}>Avrae Commands</p>
            <nav className={styles.appTabs} aria-label="Avrae tool sections">
              {(
                [
                  { id: "vault", label: "Collection" },
                  { id: "character", label: "Active Character" },
                  { id: "modifiers", label: "Modifiers" },
                ] as { id: AppView; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={
                    view === tab.id ? styles.appTabActive : styles.appTab
                  }
                  onClick={() => setView(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </header>

          {view === "vault" ? (
            <section className={styles.appView}>
              {!user ? (
                <div className={styles.loginPrompt}>
                  <p>
                    Sign in with Discord to save character imports to your
                    account.
                  </p>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={handleLogin}
                  >
                    Discord Login
                  </button>
                </div>
              ) : null}
              <label
                htmlFor="vault-search-input"
                className={styles.vaultSearchLabel}
              >
                Search collection
              </label>
              <input
                id="vault-search-input"
                type="search"
                className={styles.vaultSearchInput}
                placeholder="Search by name, type, CR, level, attack, or spell"
                value={vaultSearch}
                onChange={(event) => setVaultSearch(event.target.value)}
              />
              {renderImportDialog()}
              <section className={styles.vaultSection}>
                <div className={styles.vaultSectionHeader}>
                  <h2>Characters</h2>
                  <span>
                    {visibleCharacterEntries.length} of{" "}
                    {characterEntries.length} saved
                  </span>
                </div>
                <div className={styles.vaultGrid}>
                  {visibleCharacterEntries.map((entry) => (
                    <article key={entry.id} className={styles.vaultCard}>
                      <button
                        type="button"
                        className={styles.vaultCardMain}
                        onClick={() => setActiveCharacter(entry)}
                      >
                        <span className={styles.vaultAvatar}>
                          {entry.avatarUrl ? (
                            <img
                              src={entry.avatarUrl}
                              alt={entry.name}
                              className={styles.vaultAvatarImg}
                            />
                          ) : (
                            entry.name.slice(0, 1)
                          )}
                        </span>
                        <span>
                          <strong>{entry.name}</strong>
                          <em>
                            {[
                              entry.ancestry,
                              entry.classes
                                ?.map((item) => item.subclass || item.name)
                                .join(" / "),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </em>
                          <small>
                            {entry.sourceKind === "bestiary-builder"
                              ? `CR ${entry.challengeRating ?? "?"} - ${entry.attacks.length} actions - ${entry.spells.length} spells`
                              : `Level ${entry.level || "?"} - ${entry.attacks.length} attacks - ${entry.spells.length} spells`}
                          </small>
                        </span>
                      </button>
                      <div className={styles.vaultCardActions}>
                        {entry.sourceKind === "bestiary-builder" ? (
                          <a
                            href={entry.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Source
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => syncDdbCharacter(entry.sourceUrl)}
                            disabled={syncStatus === "syncing"}
                          >
                            Refresh
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeCharacter(entry.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className={styles.vaultSection}>
                <div className={styles.vaultSectionHeader}>
                  <h2>Creatures</h2>
                  <span>
                    {visibleCreatureEntries.length} of {creatureEntries.length}{" "}
                    saved
                  </span>
                </div>
                {visibleCreatureEntries.length > 0 ? (
                  <div className={styles.vaultGrid}>
                    {visibleCreatureEntries.map(renderVaultCard)}
                  </div>
                ) : creatureEntries.length > 0 ? (
                  <div className={styles.emptyVaultSection}>
                    <p>No creature stat blocks match that search.</p>
                  </div>
                ) : (
                  <div className={styles.emptyVaultSection}>
                    <p>
                      Import a Bestiary Builder link to add creature stat blocks
                      here.
                    </p>
                  </div>
                )}
              </section>
              {syncStatus === "error" ? (
                <p className={styles.errorText}>{syncError}</p>
              ) : null}
              {creatureSyncStatus === "error" ? (
                <p className={styles.errorText}>{creatureSyncError}</p>
              ) : null}
            </section>
          ) : null}

          {view === "character" ? (
            <section className={styles.appView}>
              {!character ? (
                <div className={styles.viewHeading}>
                  <h1>Character Sheet</h1>
                  <p>
                    Select a character from the collection to view their sheet.
                  </p>
                </div>
              ) : (
                <div className={styles.csCommandGrid}>
                  <div className={styles.csSheet}>
                    <div className={styles.csIdentity}>
                      <span className={styles.vaultAvatar}>
                        {character.avatarUrl ? (
                          <img
                            src={character.avatarUrl}
                            alt={character.name}
                            className={styles.vaultAvatarImg}
                          />
                        ) : (
                          character.name.slice(0, 1)
                        )}
                      </span>
                      <div>
                        <p className={styles.csName}>{character.name}</p>
                        <p className={styles.csSub}>
                          {[character.ancestry, classSummary]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      {isCreatureSheet && returnCharacter ? (
                        <button
                          type="button"
                          className={styles.csReturnButton}
                          onClick={returnToLinkedCharacter}
                        >
                          Back to {returnCharacter.name}
                        </button>
                      ) : null}
                    </div>

                    <div className={styles.csAbilityRow}>
                      {ABILITIES.map(({ id, label }) => {
                        const score = character.abilities?.[id];
                        const mod = score != null ? abilityMod(score) : null;
                        return (
                          <div key={id} className={styles.csAbilityBox}>
                            <span className={styles.csAbilityLabel}>
                              {label}
                            </span>
                            <div className={styles.csAbilityBottom}>
                              <strong className={styles.csAbilityScore}>
                                {score ?? "—"}
                              </strong>
                              <span className={styles.csAbilityMod}>
                                {mod != null ? signedNum(mod) : "—"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className={styles.csStatBar}>
                      <div className={styles.csStat}>
                        <span className={styles.csStatLabel}>HP</span>
                        <strong className={styles.csStatValue}>
                          {character.hpOverride != null
                            ? `${character.hpOverride}/${character.hpOverride}`
                            : character.hp
                              ? `${character.hp.current}/${character.hp.max}`
                              : "—"}
                        </strong>
                        {(character.hp?.temp ?? 0) > 0 ? (
                          <span className={styles.csStatNote}>
                            +{character.hp!.temp} temp
                          </span>
                        ) : null}
                      </div>
                      <div className={styles.csStat}>
                        <span className={styles.csStatLabel}>AC</span>
                        <strong className={styles.csStatValue}>
                          {character.acOverride ?? character.ac ?? "—"}
                        </strong>
                      </div>
                      <button
                        type="button"
                        className={
                          kind === "initiative"
                            ? styles.csStatButtonActive
                            : styles.csStatButton
                        }
                        onClick={chooseInitiative}
                      >
                        <span className={styles.csStatLabel}>Initiative</span>
                        <strong className={styles.csStatValue}>
                          {character.initiative != null
                            ? signedNum(character.initiative)
                            : "—"}
                        </strong>
                      </button>
                      <div className={styles.csStat}>
                        <span className={styles.csStatLabel}>Speed</span>
                        <strong className={styles.csStatValue}>
                          {character.speed != null
                            ? `${character.speed} ft`
                            : "—"}
                        </strong>
                      </div>
                      <div className={styles.csStat}>
                        <span className={styles.csStatLabel}>Prof. Bonus</span>
                        <strong className={styles.csStatValue}>
                          {character.proficiencyBonus != null
                            ? signedNum(character.proficiencyBonus)
                            : "—"}
                        </strong>
                      </div>
                      <div className={styles.csStat}>
                        <span className={styles.csStatLabel}>Level</span>
                        <strong className={styles.csStatValue}>
                          {character.level ?? "—"}
                        </strong>
                      </div>
                    </div>

                    <div className={styles.csCommandBar}>
                      <span>CMD</span>
                      <code>
                        {command ||
                          "click a save, skill, attack or spell below…"}
                      </code>
                      <button type="button" onClick={copyCommand}>
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>

                    <div className={styles.csBody}>
                      <section className={styles.csSection}>
                        <h2 className={styles.csSectionTitle}>Saving Throws</h2>
                        <div className={styles.csSaveList}>
                          {ABILITIES.map(({ id, label }) => {
                            const prof = character.savingThrows?.[id] || "none";
                            const score = character.abilities?.[id];
                            const base = score != null ? abilityMod(score) : 0;
                            const pb = character.proficiencyBonus || 2;
                            const fallbackTotal =
                              base + proficiencyValue(prof, pb);
                            const total =
                              character.savingThrowTotals?.[id] ??
                              fallbackTotal;
                            return (
                              <button
                                key={id}
                                type="button"
                                className={
                                  ability === id && kind === "save"
                                    ? styles.csSaveRowActive
                                    : styles.csSaveRow
                                }
                                onClick={() => chooseSave(id)}
                              >
                                <span
                                  className={
                                    prof !== "none"
                                      ? styles.csProfDot
                                      : styles.csEmptyDot
                                  }
                                />
                                <span className={styles.csSaveAbility}>
                                  {label}
                                </span>
                                <span className={styles.csSaveBonus}>
                                  {signedNum(total)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </section>

                      <section className={styles.csSection}>
                        <h2 className={styles.csSectionTitle}>Skills</h2>
                        <div className={styles.csSaveList}>
                          {SKILL_DEFS.map(({ id, command, label, ability }) => {
                            const prof = character.skills?.[id] || "none";
                            const score = character.abilities?.[ability];
                            const base = score != null ? abilityMod(score) : 0;
                            const pb = character.proficiencyBonus || 2;
                            const fallbackTotal =
                              base + proficiencyValue(prof, pb);
                            const total =
                              character.skillTotals?.[id] ?? fallbackTotal;
                            return (
                              <button
                                key={id}
                                type="button"
                                className={
                                  skill === command && kind === "check"
                                    ? styles.csSkillRowActive
                                    : styles.csSkillRow
                                }
                                onClick={() => chooseSkill(command)}
                              >
                                <span
                                  className={
                                    prof !== "none"
                                      ? styles.csProfDot
                                      : styles.csEmptyDot
                                  }
                                />
                                <span className={styles.csSaveAbility}>
                                  {ability.toUpperCase()}
                                </span>
                                <span className={styles.csSaveName}>
                                  {label}
                                </span>
                                <span className={styles.csSaveBonus}>
                                  {signedNum(total)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </section>

                      <section className={styles.csSection}>
                        <div className={styles.csTabBar}>
                          {character.attacks.length > 0 ? (
                            <button
                              type="button"
                              className={
                                effectiveSheetTab === "attacks"
                                  ? styles.csTabActive
                                  : styles.csTab
                              }
                              onClick={() => setSheetTab("attacks")}
                            >
                              Attacks
                            </button>
                          ) : null}
                          {character.spells.length > 0 ? (
                            <button
                              type="button"
                              className={
                                effectiveSheetTab === "spells"
                                  ? styles.csTabActive
                                  : styles.csTab
                              }
                              onClick={() => setSheetTab("spells")}
                            >
                              Spells
                            </button>
                          ) : null}
                          {!isCreatureSheet ? (
                            <button
                              type="button"
                              className={
                                effectiveSheetTab === "companions"
                                  ? styles.csTabActive
                                  : styles.csTab
                              }
                              onClick={() => setSheetTab("companions")}
                            >
                              Companions
                            </button>
                          ) : null}
                          {isDruidCharacter ? (
                            <button
                              type="button"
                              className={
                                effectiveSheetTab === "wildshapes"
                                  ? styles.csTabActive
                                  : styles.csTab
                              }
                              onClick={() => setSheetTab("wildshapes")}
                            >
                              Wild Shapes
                            </button>
                          ) : null}
                        </div>

                        {effectiveSheetTab === "attacks" ? (
                          <div className={styles.csAttackList}>
                            {character.attacks.map((attack) => (
                              <button
                                key={attack.id}
                                type="button"
                                className={
                                  attackName === attack.name &&
                                  kind === "attack"
                                    ? styles.csAttackRowActive
                                    : styles.csAttackRow
                                }
                                onClick={() => chooseAttack(attack.name)}
                              >
                                <strong>{attack.name}</strong>
                                <span>
                                  {attack.damage || attack.sub || "—"}
                                </span>
                              </button>
                            ))}
                            {customAttacks.map((attack) => (
                              <div
                                key={attack.id}
                                className={styles.csCustomAttackWrapper}
                              >
                                <button
                                  type="button"
                                  className={
                                    attackName === attack.name &&
                                    kind === "attack"
                                      ? styles.csAttackRowActive
                                      : styles.csAttackRow
                                  }
                                  onClick={() => chooseAttack(attack.name)}
                                >
                                  <strong>{attack.name}</strong>
                                  {attack.note ? (
                                    <span>{attack.note}</span>
                                  ) : null}
                                </button>
                                <button
                                  type="button"
                                  className={styles.csRemoveAttack}
                                  onClick={() => removeCustomAttack(attack.id)}
                                  title="Remove"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            {customAttackFormOpen ? (
                              <div className={styles.csCustomAttackForm}>
                                <input
                                  className={styles.csCustomAttackInput}
                                  placeholder="Attack name"
                                  value={customAttackName}
                                  onChange={(e) =>
                                    setCustomAttackName(e.target.value)
                                  }
                                  onKeyDown={(e) =>
                                    e.key === "Enter" && addCustomAttack()
                                  }
                                  autoFocus
                                />
                                <input
                                  className={styles.csCustomAttackInput}
                                  placeholder="Note (e.g. 1d6[slashing])"
                                  value={customAttackNote}
                                  onChange={(e) =>
                                    setCustomAttackNote(e.target.value)
                                  }
                                  onKeyDown={(e) =>
                                    e.key === "Enter" && addCustomAttack()
                                  }
                                />
                                <div
                                  className={styles.csCustomAttackFormActions}
                                >
                                  <button
                                    type="button"
                                    className={`${styles.csFormButton} ${styles.csFormButtonPrimary}`}
                                    onClick={addCustomAttack}
                                  >
                                    Add
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.csFormButton}
                                    onClick={() => {
                                      setCustomAttackFormOpen(false);
                                      setCustomAttackName("");
                                      setCustomAttackNote("");
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className={styles.csAddAttack}
                                onClick={() => setCustomAttackFormOpen(true)}
                              >
                                + Custom attack
                              </button>
                            )}
                          </div>
                        ) : effectiveSheetTab === "companions" ? (
                          renderCreatureLinksPanel(
                            "Companions",
                            "Attach imported creature stats to this character so they are available from the sheet.",
                            "companions",
                            linkedCompanions,
                            availableCompanionCreatures,
                          )
                        ) : effectiveSheetTab === "wildshapes" ? (
                          renderCreatureLinksPanel(
                            "Wild Shapes",
                            "Attach imported beast forms to this druid so they can be opened as Avrae sheets.",
                            "wildshapes",
                            linkedWildShapes,
                            availableWildShapeCreatures,
                          )
                        ) : (
                          <div>
                            {spellsByLevel.map(([level, spells]) => (
                              <div key={level} className={styles.csSpellGroup}>
                                <h3 className={styles.csSpellGroupTitle}>
                                  {level === 0 ? "Cantrips" : `Level ${level}`}
                                </h3>
                                <div className={styles.csSpellList}>
                                  {spells.map((spell) => (
                                    <button
                                      key={spell.id}
                                      type="button"
                                      className={
                                        spellName === spell.name &&
                                        kind === "spell"
                                          ? styles.csSpellRowActive
                                          : styles.csSpellRow
                                      }
                                      onClick={() => chooseSpell(spell.name)}
                                    >
                                      <span>{spell.name}</span>
                                      {spell.prepared && level > 0 ? (
                                        <span
                                          className={styles.csPreparedMark}
                                          title="Prepared"
                                        />
                                      ) : null}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    </div>
                  </div>
                  <div className={styles.csDrawerAnchor}>
                    <div className={styles.csDrawerStack}>
                      <div
                        className={
                          openDrawer === "modifiers"
                            ? styles.csPanelAreaOpen
                            : styles.csPanelAreaClosed
                        }
                      >
                        <div
                          id="avrae-modifier-drawer"
                          className={styles.csModifierDrawerInner}
                        >
                          <div className={styles.sideHeader}>
                            <h2>Roll Modifiers</h2>
                            <button
                              type="button"
                              className={styles.drawerCloseButton}
                              onClick={() => setOpenDrawer(null)}
                            >
                              close
                            </button>
                          </div>
                          <div className={styles.selectedCommandSummary}>
                            <span>{KIND_LABELS[kind]}</span>
                            <strong>
                              {kind === "attack"
                                ? attackName
                                : kind === "spell"
                                  ? spellName
                                  : kind === "save"
                                    ? ability.toUpperCase()
                                    : kind === "check"
                                      ? skillLabel(skill)
                                      : "Join initiative"}
                            </strong>
                          </div>
                          {kind !== "initiative" ? (
                            <div className={styles.sideModifierGrid}>
                              {availableModifiers.map((modifier) => {
                                const isActive = activeModifierIds.includes(
                                  modifier.id,
                                );
                                return (
                                  <div
                                    key={modifier.id}
                                    className={
                                      isActive
                                        ? styles.sideModifierActive
                                        : styles.sideModifier
                                    }
                                  >
                                    <label>
                                      <input
                                        type="checkbox"
                                        checked={isActive}
                                        onChange={() =>
                                          toggleModifier(modifier.id)
                                        }
                                      />
                                      <span>{modifier.name}</span>
                                    </label>
                                    {modifier.id === "builtin:bardic" &&
                                    isActive ? (
                                      <select
                                        className={styles.modifierParamSelect}
                                        value={
                                          modifierParams[modifier.id] || "1d8"
                                        }
                                        onChange={(event) =>
                                          setModifierParams((params) => ({
                                            ...params,
                                            [modifier.id]: event.target.value,
                                          }))
                                        }
                                      >
                                        <option value="1d6">d6</option>
                                        <option value="1d8">d8</option>
                                        <option value="1d10">d10</option>
                                        <option value="1d12">d12</option>
                                      </select>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                          <section className={styles.rollFields}>
                            {kind === "initiative" ? (
                              <>
                                <div className={styles.toggleRow}>
                                  <label>
                                    <input
                                      type="checkbox"
                                      checked={useGroupInitiative}
                                      onChange={(event) =>
                                        setUseGroupInitiative(
                                          event.target.checked,
                                        )
                                      }
                                    />
                                    <span>Group initiative</span>
                                  </label>
                                </div>
                                {useGroupInitiative ? (
                                  <>
                                    <label>
                                      <span>Group name</span>
                                      <input
                                        placeholder={character.name}
                                        value={initiativeGroupName}
                                        onChange={(event) =>
                                          setInitiativeGroupName(
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </label>
                                    {!isCreatureSheet ? (
                                      <label>
                                        <span>Companion</span>
                                        <div
                                          className={styles.csCreaturePicker}
                                        >
                                          <button
                                            type="button"
                                            className={
                                              styles.csCreaturePickerButton
                                            }
                                            disabled={!linkedCompanions.length}
                                            aria-expanded={
                                              openCreaturePicker ===
                                              "initiative-companion"
                                            }
                                            onClick={() =>
                                              setOpenCreaturePicker(
                                                (current) =>
                                                  current ===
                                                  "initiative-companion"
                                                    ? null
                                                    : "initiative-companion",
                                              )
                                            }
                                          >
                                            <span>
                                              {selectedInitiativeCompanion?.name ||
                                                (linkedCompanions.length
                                                  ? "No companion"
                                                  : "No linked companions")}
                                            </span>
                                            <span aria-hidden="true">⌄</span>
                                          </button>
                                          {openCreaturePicker ===
                                          "initiative-companion" ? (
                                            <div
                                              className={
                                                styles.csCreaturePickerMenu
                                              }
                                            >
                                              <button
                                                type="button"
                                                className={
                                                  styles.csCreaturePickerOption
                                                }
                                                onClick={() => {
                                                  setInitiativeCompanionId("");
                                                  setInitiativeCompanionNickname(
                                                    "",
                                                  );
                                                  setOpenCreaturePicker(null);
                                                }}
                                              >
                                                <strong>No companion</strong>
                                                <span>Only join character</span>
                                              </button>
                                              {linkedCompanions.map((entry) => (
                                                <button
                                                  key={entry.id}
                                                  type="button"
                                                  className={
                                                    styles.csCreaturePickerOption
                                                  }
                                                  onClick={() => {
                                                    setInitiativeCompanionId(
                                                      entry.id,
                                                    );
                                                    setInitiativeCompanionNickname(
                                                      entry.name,
                                                    );
                                                    setOpenCreaturePicker(null);
                                                  }}
                                                >
                                                  <strong>{entry.name}</strong>
                                                  <span>
                                                    {entry.challengeRating !=
                                                    null
                                                      ? `CR ${entry.challengeRating}`
                                                      : "Companion"}
                                                  </span>
                                                </button>
                                              ))}
                                            </div>
                                          ) : null}
                                        </div>
                                      </label>
                                    ) : null}
                                    {selectedInitiativeCompanion ? (
                                      <label>
                                        <span>Companion nickname</span>
                                        <input
                                          value={initiativeCompanionNickname}
                                          onChange={(event) =>
                                            setInitiativeCompanionNickname(
                                              event.target.value,
                                            )
                                          }
                                        />
                                      </label>
                                    ) : null}
                                  </>
                                ) : null}
                              </>
                            ) : (
                              <>
                                {kind === "spell" &&
                                selectedSpell &&
                                selectedSpell.level > 0 ? (
                                  <label>
                                    <span>Cast level</span>
                                    <select
                                      value={upcastLevel}
                                      onChange={(event) =>
                                        setUpcastLevel(event.target.value)
                                      }
                                    >
                                      <option value="base">
                                        Base level {selectedSpell.level}
                                      </option>
                                      {Array.from(
                                        { length: 9 - selectedSpell.level },
                                        (_, index) =>
                                          selectedSpell.level + index + 1,
                                      ).map((level) => (
                                        <option
                                          key={level}
                                          value={String(level)}
                                        >
                                          Level {level}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                ) : null}
                                <label>
                                  <span>Custom bonus</span>
                                  <input
                                    placeholder="e.g. 2 or 1d4"
                                    value={bonus}
                                    onChange={(event) =>
                                      setBonus(event.target.value)
                                    }
                                  />
                                </label>
                                {kind === "attack" || kind === "spell" ? (
                                  <label>
                                    <span>Custom extra damage</span>
                                    <input
                                      placeholder="e.g. 1d6[fire]"
                                      value={damage}
                                      onChange={(event) =>
                                        setDamage(event.target.value)
                                      }
                                    />
                                  </label>
                                ) : null}
                                {kind === "attack" || kind === "spell" ? (
                                  <label>
                                    <span>Targets</span>
                                    <input
                                      placeholder="one per line or comma separated"
                                      value={targets}
                                      onChange={(event) =>
                                        setTargets(event.target.value)
                                      }
                                    />
                                  </label>
                                ) : null}
                                <label>
                                  <span>Flavor phrase</span>
                                  <input
                                    value={phrase}
                                    onChange={(event) =>
                                      setPhrase(event.target.value)
                                    }
                                  />
                                </label>
                                <div className={styles.toggleRow}>
                                  <label>
                                    <input
                                      type="checkbox"
                                      checked={isCreatureSheet || initContext}
                                      disabled={isCreatureSheet}
                                      onChange={(event) =>
                                        setInitContext(event.target.checked)
                                      }
                                    />
                                    <span>Use initiative command</span>
                                  </label>
                                  <label>
                                    <input
                                      type="checkbox"
                                      checked={outOfTurn}
                                      disabled={
                                        !isCreatureSheet && !initContext
                                      }
                                      onChange={(event) =>
                                        toggleOutOfTurn(event.target.checked)
                                      }
                                    />
                                    <span>Out of turn</span>
                                  </label>
                                </div>
                                {(isCreatureSheet || initContext) &&
                                outOfTurn ? (
                                  <label>
                                    <span>Combatant name</span>
                                    <input
                                      value={combatantName}
                                      onChange={(event) =>
                                        setCombatantName(event.target.value)
                                      }
                                    />
                                  </label>
                                ) : null}
                              </>
                            )}
                          </section>
                        </div>
                      </div>
                      <div
                        className={
                          openDrawer === "targets"
                            ? styles.csPanelAreaOpen
                            : styles.csPanelAreaClosed
                        }
                      >
                        <div
                          id="avrae-target-drawer"
                          className={styles.csTargetDrawerInner}
                        >
                          <div className={styles.sideHeader}>
                            <h2>Targets</h2>
                            <button
                              type="button"
                              className={styles.drawerCloseButton}
                              onClick={() => setOpenDrawer(null)}
                            >
                              close
                            </button>
                          </div>
                          <div className={styles.csTargetInputRow}>
                            <textarea
                              className={styles.csTargetInput}
                              placeholder='-t "example1|"
                          -t "example2|"
                          -t "example3|"
                          -t "example4|" '
                              value={combatantInput}
                              onChange={(e) =>
                                handleCombatantInputChange(e.target.value)
                              }
                            />
                            {isDiscordUrl ? (
                              <button
                                type="button"
                                className={`${styles.csFormButton} ${styles.csFormButtonPrimary}`}
                                onClick={fetchCombatantsFromDiscord}
                                disabled={combatantFetchStatus === "fetching"}
                              >
                                {combatantFetchStatus === "fetching"
                                  ? "Loading…"
                                  : "Load"}
                              </button>
                            ) : null}
                          </div>
                          {combatantFetchError ? (
                            <p className={styles.errorText}>
                              {combatantFetchError}
                            </p>
                          ) : null}
                          {parsedCombatants.length > 0 ? (
                            <div className={styles.csCombatantList}>
                              {parsedCombatants.map((name) => {
                                const isSelected = selectedTargetNames.includes(
                                  name.toLowerCase(),
                                );
                                return (
                                  <button
                                    key={name}
                                    type="button"
                                    className={
                                      isSelected
                                        ? styles.csCombatantItemActive
                                        : styles.csCombatantItem
                                    }
                                    onClick={() => toggleCombatant(name)}
                                  >
                                    <span
                                      className={
                                        isSelected
                                          ? styles.csProfDot
                                          : styles.csEmptyDot
                                      }
                                    />
                                    <span>{name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <p className={styles.csTargetHint}>
                              Paste initiative list from !combatants
                            </p>
                          )}
                        </div>
                      </div>
                      <div className={styles.csHandleColumn}>
                        <button
                          type="button"
                          className={styles.csModifierDrawerHandle}
                          onClick={() =>
                            setOpenDrawer(
                              openDrawer === "modifiers" ? null : "modifiers",
                            )
                          }
                          aria-expanded={openDrawer === "modifiers"}
                          aria-controls="avrae-modifier-drawer"
                        >
                          Modifiers
                          {activeModifierIds.length ? (
                            <span>{activeModifierIds.length}</span>
                          ) : null}
                        </button>
                        <button
                          type="button"
                          className={styles.csTargetDrawerHandle}
                          onClick={() =>
                            setOpenDrawer(
                              openDrawer === "targets" ? null : "targets",
                            )
                          }
                          aria-expanded={openDrawer === "targets"}
                          aria-controls="avrae-target-drawer"
                        >
                          Targets
                          {selectedTargetNames.length > 0 ? (
                            <span>{selectedTargetNames.length}</span>
                          ) : null}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          ) : null}

          {view === "modifiers" ? (
            <section className={styles.appView}>
              <div className={styles.viewHeading}>
                <h1>Modifier Builder</h1>
                <p>
                  Build togglable buffs, debuffs, and conditions that stack onto
                  rolls.
                </p>
              </div>
              <div className={styles.modForgeGrid}>
                <aside className={styles.modLibrary}>
                  <h2>Library</h2>
                  {[...BUILTIN_MODIFIERS, ...savedModifiers].map((modifier) => (
                    <article
                      key={modifier.id}
                      className={styles.modLibraryItem}
                    >
                      <strong>{modifier.name}</strong>
                      <span>
                        {modifier.bonus ||
                          modifier.damage ||
                          modifier.rawFlags ||
                          modifier.phrase ||
                          "modifier"}
                      </span>
                    </article>
                  ))}
                </aside>
                <section className={styles.modEditor}>
                  <div className={styles.formGrid}>
                    <label className={styles.field}>
                      <span>Name</span>
                      <input
                        value={modifierForm.name}
                        onChange={(event) =>
                          setModifierForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className={styles.field}>
                      <span>Bonus</span>
                      <input
                        placeholder="1d4"
                        value={modifierForm.bonus}
                        onChange={(event) =>
                          setModifierForm((current) => ({
                            ...current,
                            bonus: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className={styles.field}>
                      <span>Damage</span>
                      <input
                        placeholder="2d6[fire]"
                        value={modifierForm.damage}
                        onChange={(event) =>
                          setModifierForm((current) => ({
                            ...current,
                            damage: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className={styles.field}>
                      <span>Phrase</span>
                      <input
                        value={modifierForm.phrase}
                        onChange={(event) =>
                          setModifierForm((current) => ({
                            ...current,
                            phrase: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className={styles.field}>
                      <span>Raw flags</span>
                      <input
                        placeholder="-rr 2 or -h"
                        value={modifierForm.rawFlags}
                        onChange={(event) =>
                          setModifierForm((current) => ({
                            ...current,
                            rawFlags: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                  <div className={styles.checkboxGrid}>
                    {(Object.keys(KIND_LABELS) as AvraeActionKind[]).map(
                      (option) => (
                        <label key={option}>
                          <input
                            type="checkbox"
                            checked={modifierForm.appliesTo.includes(option)}
                            onChange={() => toggleModifierAppliesTo(option)}
                          />
                          <span>{KIND_LABELS[option]}</span>
                        </label>
                      ),
                    )}
                  </div>
                  <div className={styles.modEditorActions}>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={saveModifier}
                      disabled={!user}
                    >
                      {editingModifierId !== null
                        ? "Update Modifier"
                        : "Save Modifier"}
                    </button>
                    {editingModifierId !== null ? (
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={cancelEditingModifier}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                  {modifierError ? (
                    <p className={styles.errorText}>{modifierError}</p>
                  ) : null}
                  <div className={styles.savedModifierList}>
                    {savedModifiers.map((modifier) => (
                      <div
                        key={modifier.id}
                        className={styles.savedModifierItem}
                      >
                        <span>{modifier.name}</span>
                        <div className={styles.savedModifierItemActions}>
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => startEditingModifier(modifier)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => deleteModifier(modifier.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </Layout>
  );
}

function ManualAction({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.manualAction}>
      <span>{name}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
