import { useEffect, useMemo, useState, type ReactNode } from "react";
import Layout from "@theme/Layout";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import {
  composeAvraeCommand,
  parseTargets,
  type AvraeActionKind,
  type AvraeRollMode,
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
  { id: "acrobatics", label: "Acrobatics", ability: "dex" },
  { id: "animal-handling", label: "Animal Handling", ability: "wis" },
  { id: "arcana", label: "Arcana", ability: "int" },
  { id: "athletics", label: "Athletics", ability: "str" },
  { id: "deception", label: "Deception", ability: "cha" },
  { id: "history", label: "History", ability: "int" },
  { id: "insight", label: "Insight", ability: "wis" },
  { id: "intimidation", label: "Intimidation", ability: "cha" },
  { id: "investigation", label: "Investigation", ability: "int" },
  { id: "medicine", label: "Medicine", ability: "wis" },
  { id: "nature", label: "Nature", ability: "int" },
  { id: "perception", label: "Perception", ability: "wis" },
  { id: "performance", label: "Performance", ability: "cha" },
  { id: "persuasion", label: "Persuasion", ability: "cha" },
  { id: "religion", label: "Religion", ability: "int" },
  { id: "sleight-of-hand", label: "Sleight of Hand", ability: "dex" },
  { id: "stealth", label: "Stealth", ability: "dex" },
  { id: "survival", label: "Survival", ability: "wis" },
];

const KIND_LABELS: Record<AvraeActionKind, string> = {
  attack: "Attacks",
  spell: "Spells",
  save: "Saves",
  check: "Skills",
};

type AppView = "vault" | "roll" | "character" | "modifiers";

type AuthUser = {
  username: string;
  globalName: string | null;
  isStaff: boolean;
  isDm?: boolean;
};

type SyncedDdbCharacter = {
  id: string;
  sourceUrl: string;
  syncedAt: string;
  name: string;
  ancestry?: string;
  level?: number | null;
  classes?: Array<{ name: string; subclass?: string; level: number }>;
  abilities?: Record<string, number>;
  hp?: { max: number; current: number; temp: number };
  hpOverride?: number;
  ac?: number;
  acOverride?: number;
  speed?: number;
  initiative?: number;
  proficiencyBonus?: number;
  savingThrows?: Record<string, string>;
  skills?: Record<string, string>;
  attacks: Array<{ id: string; name: string; damage?: string; sub?: string; source?: string }>;
  spells: Array<{ id: string; name: string; level: number; prepared?: boolean; sub?: string }>;
};

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

const BUILTIN_MODIFIERS: AvraeModifier[] = [
  { id: "builtin:adv", name: "Advantage", appliesTo: ["attack", "save", "check"], bonus: "", damage: "", phrase: "", rawFlags: "adv", builtin: true },
  { id: "builtin:dis", name: "Disadvantage", appliesTo: ["attack", "save", "check"], bonus: "", damage: "", phrase: "", rawFlags: "dis", builtin: true },
  { id: "builtin:bless", name: "Bless", appliesTo: ["attack", "save"], bonus: "1d4", damage: "", phrase: "blessed", rawFlags: "", builtin: true },
  { id: "builtin:guidance", name: "Guidance", appliesTo: ["check"], bonus: "1d4", damage: "", phrase: "guided", rawFlags: "", builtin: true },
  { id: "builtin:bardic", name: "Bardic Inspiration", appliesTo: ["attack", "save", "check"], bonus: "{die}", damage: "", phrase: "inspired", rawFlags: "", builtin: true },
];

const LEGACY_STORAGE_KEY = "roa.avrae.ddbCharacter";
const STORAGE_KEY = "roa.avrae.ddbCharacters";

function getAuthApiBaseUrl(siteConfig): string {
  const configuredBaseUrl = siteConfig.customFields?.authApiBaseUrl;
  return typeof configuredBaseUrl === "string" ? configuredBaseUrl.replace(/\/$/, "") : "";
}

function skillLabel(value: string): string {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

function signedNum(n: number): string {
  return n >= 0 ? `+${n}` : String(n);
}

export default function AvraeCommandsPage(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const authApiBaseUrl = getAuthApiBaseUrl(siteConfig);
  const [view, setView] = useState<AppView>("vault");
  const [kind, setKind] = useState<AvraeActionKind>("attack");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [ddbUrl, setDdbUrl] = useState("");
  const [character, setCharacter] = useState<SyncedDdbCharacter | null>(null);
  const [savedCharacters, setSavedCharacters] = useState<SyncedDdbCharacter[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [savedModifiers, setSavedModifiers] = useState<AvraeModifier[]>([]);
  const [activeModifierIds, setActiveModifierIds] = useState<string[]>([]);
  const [modifierParams, setModifierParams] = useState<Record<string, string>>({
    "builtin:bardic": "1d8",
  });
  const [modifierError, setModifierError] = useState("");
  const [editingModifierId, setEditingModifierId] = useState<string | null>(null);
  const [sheetTab, setSheetTab] = useState<"attacks" | "spells">("attacks");
  const [editingOverrides, setEditingOverrides] = useState(false);
  const [overrideHp, setOverrideHp] = useState("");
  const [overrideAc, setOverrideAc] = useState("");
  const [modifierForm, setModifierForm] = useState({
    name: "",
    appliesTo: ["attack"] as AvraeActionKind[],
    bonus: "",
    damage: "",
    phrase: "",
    rawFlags: "",
  });
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [syncError, setSyncError] = useState("");
  const [attackName, setAttackName] = useState("Longsword");
  const [spellName, setSpellName] = useState("Fire Bolt");
  const [ability, setAbility] = useState("dex");
  const [skill, setSkill] = useState("perception");
  const [rollMode, setRollMode] = useState<AvraeRollMode>("normal");
  const [bonus, setBonus] = useState("");
  const [damage, setDamage] = useState("");
  const [upcastLevel, setUpcastLevel] = useState("base");
  const [targets, setTargets] = useState("");
  const [phrase, setPhrase] = useState("");
  const [initContext, setInitContext] = useState(false);
  const [outOfTurn, setOutOfTurn] = useState(false);
  const [combatantName, setCombatantName] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as { characters?: SyncedDdbCharacter[]; selectedId?: string }) : null;
      let characters = Array.isArray(parsed?.characters) ? parsed.characters.filter((entry) => entry?.name) : [];
      const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!characters.length && legacyRaw) {
        const legacy = JSON.parse(legacyRaw) as SyncedDdbCharacter;
        if (legacy?.name) {
          characters = [legacy];
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ characters, selectedId: legacy.id }));
          window.localStorage.removeItem(LEGACY_STORAGE_KEY);
        }
      }
      setSavedCharacters(characters);
      const selected = characters.find((entry) => entry.id === parsed?.selectedId) || characters[0] || null;
      if (selected) applyCharacterToBuilder(selected);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadUserAndData() {
      setAuthLoading(true);
      try {
        const meResponse = await fetch(`${authApiBaseUrl}/api/me`, { credentials: "include" });
        if (!meResponse.ok) {
          if (!cancelled) {
            setUser(null);
            setAuthLoading(false);
          }
          return;
        }

        const mePayload = await meResponse.json();
        const nextUser = mePayload.authenticated ? mePayload.user : null;
        if (!nextUser) {
          if (!cancelled) {
            setUser(null);
            setAuthLoading(false);
          }
          return;
        }

        const [charactersResponse, modifiersResponse] = await Promise.all([
          fetch(`${authApiBaseUrl}/api/avrae/characters`, { credentials: "include" }),
          fetch(`${authApiBaseUrl}/api/avrae/modifiers`, { credentials: "include" }),
        ]);
        const charactersPayload = charactersResponse.ok ? await charactersResponse.json() : { characters: [] };
        const modifiersPayload = modifiersResponse.ok ? await modifiersResponse.json() : { modifiers: [] };
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
            const selected = nextCharacters.find((entry) => entry.id === selectedCharacterId) || nextCharacters[0];
            applyCharacterToBuilder(selected);
          }
          setAuthLoading(false);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setAuthLoading(false);
        }
      }
    }

    loadUserAndData();
    return () => {
      cancelled = true;
    };
  }, [authApiBaseUrl]);

  const classSummary = useMemo(
    () => character?.classes?.map((entry) => `${entry.subclass || entry.name} ${entry.level}`).join(" / ") || "",
    [character],
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

  const effectiveSheetTab: "attacks" | "spells" = useMemo(() => {
    if (sheetTab === "attacks" && !character?.attacks.length) return "spells";
    if (sheetTab === "spells" && !character?.spells.length) return "attacks";
    return sheetTab;
  }, [sheetTab, character]);

  const availableModifiers = useMemo(
    () => [...BUILTIN_MODIFIERS, ...savedModifiers].filter((modifier) => modifier.appliesTo.includes(kind)),
    [kind, savedModifiers],
  );

  const activeModifiers = useMemo(
    () => availableModifiers.filter((modifier) => activeModifierIds.includes(modifier.id)),
    [activeModifierIds, availableModifiers],
  );

  const resolveModifierValue = (modifier: AvraeModifier, value: string): string =>
    value.replace(/\{die\}/g, modifierParams[modifier.id] || "1d8");

  const command = useMemo(() => {
    const id = kind === "attack" ? attackName.trim() || "Attack" : kind === "spell" ? spellName.trim() || "Spell" : kind === "save" ? ability : skill;
    return composeAvraeCommand({
      action: {
        kind,
        id,
        level: kind === "spell" && selectedSpell ? selectedSpell.level : undefined,
        upcastTo: kind === "spell" && upcastLevel !== "base" ? Number(upcastLevel) : undefined,
        initContext,
        outOfTurn,
        combatantName,
        targets: parseTargets(targets),
      },
      rollMode,
      bonus: [bonus, ...activeModifiers.map((modifier) => resolveModifierValue(modifier, modifier.bonus))],
      damage: [damage, ...activeModifiers.map((modifier) => resolveModifierValue(modifier, modifier.damage))],
      phrase: [phrase, ...activeModifiers.map((modifier) => resolveModifierValue(modifier, modifier.phrase))],
      rawFlags: activeModifiers.map((modifier) => resolveModifierValue(modifier, modifier.rawFlags)),
    });
  }, [ability, activeModifiers, attackName, bonus, combatantName, damage, initContext, kind, modifierParams, outOfTurn, phrase, rollMode, selectedSpell, skill, spellName, targets, upcastLevel]);

  async function copyCommand(): Promise<void> {
    if (!navigator?.clipboard) return;
    await navigator.clipboard.writeText(command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function handleLogin(): void {
    const returnTo = window.location.pathname + window.location.search + window.location.hash;
    window.location.href = `${authApiBaseUrl}/auth/discord/login?returnTo=${encodeURIComponent(returnTo)}`;
  }

  function saveCharactersToStorage(characters: SyncedDdbCharacter[], selectedId: string): void {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ characters, selectedId }));
  }

  function applyCharacterToBuilder(nextCharacter: SyncedDdbCharacter): void {
    setCharacter(nextCharacter);
    setSelectedCharacterId(nextCharacter.id);
    setDdbUrl(nextCharacter.sourceUrl || "");
    if (nextCharacter.attacks?.[0]?.name) {
      setAttackName(nextCharacter.attacks[0].name);
      setDamage(nextCharacter.attacks[0].damage || "");
      setSheetTab("attacks");
    } else if (nextCharacter.spells?.length) {
      setSheetTab("spells");
    }
    if (nextCharacter.spells?.[0]?.name) {
      setSpellName(nextCharacter.spells[0].name);
      setUpcastLevel("base");
    }
  }

  function setActiveCharacter(nextCharacter: SyncedDdbCharacter): void {
    saveCharactersToStorage(savedCharacters, nextCharacter.id);
    applyCharacterToBuilder(nextCharacter);
    setView("roll");
  }

  function selectKind(nextKind: AvraeActionKind): void {
    setKind(nextKind);
    setActiveModifierIds((ids) =>
      ids.filter((id) => {
        const modifier = [...BUILTIN_MODIFIERS, ...savedModifiers].find((entry) => entry.id === id);
        return modifier?.appliesTo.includes(nextKind);
      }),
    );
    if (nextKind === "attack") {
      const selectedAttack = character?.attacks.find((attack) => attack.name === attackName);
      setDamage(selectedAttack?.damage || "");
    } else {
      setDamage("");
    }
    if (nextKind !== "spell") setUpcastLevel("base");
  }

  function chooseAttack(name: string): void {
    const selectedAttack = character?.attacks.find((attack) => attack.name === name);
    setKind("attack");
    setAttackName(name);
    setDamage(selectedAttack?.damage || "");
  }

  function chooseSpell(name: string): void {
    setKind("spell");
    setSpellName(name);
    setUpcastLevel("base");
  }

  function toggleModifier(modifierId: string): void {
    setActiveModifierIds((ids) => (ids.includes(modifierId) ? ids.filter((id) => id !== modifierId) : [...ids, modifierId]));
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
    setModifierForm({ name: "", appliesTo: ["attack"], bonus: "", damage: "", phrase: "", rawFlags: "" });
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
    setModifierForm({ name: "", appliesTo: ["attack"], bonus: "", damage: "", phrase: "", rawFlags: "" });
  }

  async function deleteModifier(modifierId: string): Promise<void> {
    const response = await fetch(`${authApiBaseUrl}/api/avrae/modifiers/${encodeURIComponent(modifierId)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok && response.status !== 404) {
      setModifierError("Failed to delete modifier.");
      return;
    }
    setSavedModifiers((modifiers) => modifiers.filter((modifier) => modifier.id !== modifierId));
    setActiveModifierIds((ids) => ids.filter((id) => id !== modifierId));
  }

  function saveStatOverrides(): void {
    if (!character) return;
    const hpVal = parseInt(overrideHp, 10);
    const acVal = parseInt(overrideAc, 10);
    const updated: SyncedDdbCharacter = {
      ...character,
      hpOverride: !isNaN(hpVal) && hpVal > 0 ? hpVal : undefined,
      acOverride: !isNaN(acVal) && acVal > 0 ? acVal : undefined,
    };
    upsertSavedCharacter(updated);
    setEditingOverrides(false);
  }

  function upsertSavedCharacter(nextCharacter: SyncedDdbCharacter): void {
    const nextSavedCharacters = [
      nextCharacter,
      ...savedCharacters.filter((entry) => entry.id !== nextCharacter.id && entry.sourceUrl !== nextCharacter.sourceUrl),
    ].sort((a, b) => a.name.localeCompare(b.name));
    setSavedCharacters(nextSavedCharacters);
    saveCharactersToStorage(nextSavedCharacters, nextCharacter.id);
    applyCharacterToBuilder(nextCharacter);
  }

  async function removeCharacter(characterId: string): Promise<void> {
    if (user) {
      const response = await fetch(`${authApiBaseUrl}/api/avrae/characters/${encodeURIComponent(characterId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok && response.status !== 404) {
        setSyncStatus("error");
        setSyncError("Failed to remove saved character.");
        return;
      }
    }
    const nextSavedCharacters = savedCharacters.filter((entry) => entry.id !== characterId);
    const nextSelected = nextSavedCharacters[0] || null;
    setSavedCharacters(nextSavedCharacters);
    saveCharactersToStorage(nextSavedCharacters, nextSelected?.id || "");
    if (nextSelected) {
      applyCharacterToBuilder(nextSelected);
    } else {
      setCharacter(null);
      setSelectedCharacterId("");
      setDdbUrl("");
    }
  }

  async function syncDdbCharacter(sourceUrl = ddbUrl): Promise<void> {
    if (!user) {
      setSyncStatus("error");
      setSyncError("Sign in with Discord before saving D&D Beyond characters.");
      return;
    }
    setSyncStatus("syncing");
    setSyncError("");
    try {
      const response = await fetch(`${authApiBaseUrl}/api/avrae/ddb-character`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: sourceUrl }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Failed to sync D&D Beyond character.");
      const nextCharacter = payload.character as SyncedDdbCharacter;
      upsertSavedCharacter(nextCharacter);
      setView("roll");
      setSyncStatus("success");
    } catch (error) {
      setSyncStatus("error");
      setSyncError(error instanceof Error ? error.message : "Failed to sync D&D Beyond character.");
    }
  }

  const displayName = user?.globalName || user?.username || "not signed in";

  return (
    <Layout title="Avrae Commands" description="Avrae command builder for Reaches of Altharion.">
      <main className={styles.appPage}>
        <div className={styles.appShell}>
          <header className={styles.appHeader}>
            <div>
              <p className={styles.appTitle}>Avrae Commands</p>
              <p className={styles.appSubtitle}>{character ? `${character.name} · ${classSummary || "D&D Beyond"}` : "Vault"}</p>
            </div>
            <nav className={styles.appTabs} aria-label="Avrae tool sections">
              {(["vault", "roll", "character", "modifiers"] as AppView[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={view === tab ? styles.appTabActive : styles.appTab}
                  onClick={() => setView(tab)}
                >
                  {tab}
                </button>
              ))}
            </nav>
            <div className={styles.appUser}>{authLoading ? "checking..." : displayName}</div>
          </header>

          {view === "vault" ? (
            <section className={styles.appView}>
              <div className={styles.viewHeading}>
                <h1>Vault</h1>
                <p>Choose a character to play, refresh one, or add a public D&D Beyond sheet.</p>
              </div>
              {!user ? (
                <div className={styles.loginPrompt}>
                  <p>Sign in with Discord to save D&D Beyond imports to your account.</p>
                  <button type="button" className={styles.primaryButton} onClick={handleLogin}>Discord Login</button>
                </div>
              ) : null}
              <div className={styles.vaultGrid}>
                {savedCharacters.map((entry) => (
                  <article key={entry.id} className={styles.vaultCard}>
                    <button type="button" className={styles.vaultCardMain} onClick={() => setActiveCharacter(entry)}>
                      <span className={styles.vaultAvatar}>{entry.name.slice(0, 1)}</span>
                      <span>
                        <strong>{entry.name}</strong>
                        <em>{[entry.ancestry, entry.classes?.map((item) => item.subclass || item.name).join(" / ")].filter(Boolean).join(" · ")}</em>
                        <small>Level {entry.level || "?"} · {entry.attacks.length} attacks · {entry.spells.length} spells</small>
                      </span>
                    </button>
                    <div className={styles.vaultCardActions}>
                      <button type="button" onClick={() => syncDdbCharacter(entry.sourceUrl)} disabled={!user || syncStatus === "syncing"}>Refresh</button>
                      <button type="button" onClick={() => removeCharacter(entry.id)}>Remove</button>
                    </div>
                  </article>
                ))}
                <article className={styles.addCharacterCard}>
                  <div className={styles.addCharacterHeading}>
                    <strong>+</strong>
                    <span>Add character</span>
                  </div>
                  <div className={styles.addCharacterForm}>
                    <input
                      placeholder="https://www.dndbeyond.com/characters/..."
                      value={ddbUrl}
                      onChange={(event) => setDdbUrl(event.target.value)}
                    />
                    <button type="button" className={styles.primaryButton} onClick={() => syncDdbCharacter()} disabled={!user || syncStatus === "syncing"}>
                      {syncStatus === "syncing" ? "Syncing" : "Add / Sync"}
                    </button>
                  </div>
                </article>
              </div>
              {syncStatus === "error" ? <p className={styles.errorText}>{syncError}</p> : null}
            </section>
          ) : null}

          {view === "roll" ? (
            <section className={styles.appView}>
              <div className={styles.rollGrid}>
                <div className={styles.rollMain}>
                  <div className={styles.characterStrip}>
                    <span className={styles.vaultAvatar}>{character?.name.slice(0, 1) || "?"}</span>
                    <span>
                      <strong>{character?.name || "No character selected"}</strong>
                      <em>{classSummary || "Choose a character from the vault"}</em>
                    </span>
                  </div>
                  <div className={styles.rollTabs}>
                    {(Object.keys(KIND_LABELS) as AvraeActionKind[]).map((option) => (
                      <button key={option} type="button" className={kind === option ? styles.rollTabActive : styles.rollTab} onClick={() => selectKind(option)}>
                        {KIND_LABELS[option]}
                      </button>
                    ))}
                  </div>
                  <div className={styles.actionGrid}>
                    {kind === "attack" && (character?.attacks.length ? character.attacks.map((attack) => (
                      <button key={attack.id} type="button" className={attackName === attack.name ? styles.actionCardActive : styles.actionCard} onClick={() => chooseAttack(attack.name)}>
                        <strong>{attack.name}</strong>
                        <span>{attack.sub || attack.damage || "Attack"}</span>
                      </button>
                    )) : <ManualAction name="Attack name" value={attackName} onChange={setAttackName} />)}
                    {kind === "spell" && (character?.spells.length ? spellsByLevel.map(([level, spells]) => (
                      <div key={level} className={styles.actionGroup}>
                        <h3>{level === 0 ? "Cantrips" : `Level ${level}`}</h3>
                        {spells.map((spell) => (
                          <button key={spell.id} type="button" className={spellName === spell.name ? styles.actionCardActive : styles.actionCard} onClick={() => chooseSpell(spell.name)}>
                            <strong>{spell.name}</strong>
                            <span>{spell.sub || (level === 0 ? "Cantrip" : `Level ${level}`)}</span>
                          </button>
                        ))}
                      </div>
                    )) : <ManualAction name="Spell name" value={spellName} onChange={setSpellName} />)}
                    {kind === "save" && ABILITIES.map((item) => (
                      <button key={item.id} type="button" className={ability === item.id ? styles.actionCardActive : styles.actionCard} onClick={() => setAbility(item.id)}>
                        <strong>{item.label} Save</strong>
                      </button>
                    ))}
                    {kind === "check" && SKILLS.map((item) => (
                      <button key={item} type="button" className={skill === item ? styles.actionCardActive : styles.actionCard} onClick={() => setSkill(item)}>
                        <strong>{skillLabel(item)}</strong>
                      </button>
                    ))}
                  </div>
                </div>

                <aside className={styles.rollSide}>
                  <section>
                    <div className={styles.sideHeader}>
                      <h2>Modifiers</h2>
                      <button type="button" onClick={() => setActiveModifierIds([])}>clear all</button>
                    </div>
                    <div className={styles.sideModifierGrid}>
                      {availableModifiers.map((modifier) => {
                        const isActive = activeModifierIds.includes(modifier.id);
                        return (
                          <div key={modifier.id} className={isActive ? styles.sideModifierActive : styles.sideModifier}>
                            <label>
                              <input type="checkbox" checked={isActive} onChange={() => toggleModifier(modifier.id)} />
                              <span>{modifier.name}</span>
                            </label>
                            {modifier.id === "builtin:bardic" && isActive ? (
                              <select
                                className={styles.modifierParamSelect}
                                value={modifierParams[modifier.id] || "1d8"}
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
                  </section>
                  <section className={styles.rollFields}>
                    <label><span>Roll state</span><select value={rollMode} onChange={(event) => setRollMode(event.target.value as AvraeRollMode)}><option value="normal">Normal</option><option value="adv">Advantage</option><option value="dis">Disadvantage</option></select></label>
                    {kind === "spell" && selectedSpell && selectedSpell.level > 0 ? (
                      <label><span>Cast level</span><select value={upcastLevel} onChange={(event) => setUpcastLevel(event.target.value)}><option value="base">Base level {selectedSpell.level}</option>{Array.from({ length: 9 - selectedSpell.level }, (_, index) => selectedSpell.level + index + 1).map((level) => <option key={level} value={String(level)}>Level {level}</option>)}</select></label>
                    ) : null}
                    <label><span>Custom bonus</span><input placeholder="e.g. 2 or 1d4" value={bonus} onChange={(event) => setBonus(event.target.value)} /></label>
                    {(kind === "attack" || kind === "spell") ? <label><span>Custom extra damage</span><input placeholder="e.g. 1d6[fire]" value={damage} onChange={(event) => setDamage(event.target.value)} /></label> : null}
                    {(kind === "attack" || kind === "spell") ? <label><span>Targets</span><input placeholder="one per line or comma separated" value={targets} onChange={(event) => setTargets(event.target.value)} /></label> : null}
                    <label><span>Flavor phrase</span><input value={phrase} onChange={(event) => setPhrase(event.target.value)} /></label>
                    <div className={styles.toggleRow}>
                      <label><input type="checkbox" checked={initContext} onChange={(event) => setInitContext(event.target.checked)} /><span>Use initiative command</span></label>
                      <label><input type="checkbox" checked={outOfTurn} disabled={!initContext} onChange={(event) => setOutOfTurn(event.target.checked)} /><span>Out of turn</span></label>
                    </div>
                    {initContext && outOfTurn ? <label><span>Combatant name</span><input value={combatantName} onChange={(event) => setCombatantName(event.target.value)} /></label> : null}
                  </section>
                </aside>
              </div>
            </section>
          ) : null}

          {view === "character" ? (
            <section className={styles.appView}>
              {!character ? (
                <div className={styles.viewHeading}>
                  <h1>Character Sheet</h1>
                  <p>Select a character from the vault to view their sheet.</p>
                </div>
              ) : (
                <div className={styles.csSheet}>
                  <div className={styles.csIdentity}>
                    <span className={styles.vaultAvatar}>{character.name.slice(0, 1)}</span>
                    <div>
                      <p className={styles.csName}>{character.name}</p>
                      <p className={styles.csSub}>{[character.ancestry, classSummary].filter(Boolean).join(" · ")}</p>
                    </div>
                  </div>

                  <div className={styles.csAbilityRow}>
                    {ABILITIES.map(({ id, label }) => {
                      const score = character.abilities?.[id];
                      const mod = score != null ? abilityMod(score) : null;
                      return (
                        <div key={id} className={styles.csAbilityBox}>
                          <span className={styles.csAbilityLabel}>{label}</span>
                          <div className={styles.csAbilityBottom}>
                            <strong className={styles.csAbilityScore}>{score ?? "—"}</strong>
                            <span className={styles.csAbilityMod}>{mod != null ? signedNum(mod) : "—"}</span>
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
                      {(character.hp?.temp ?? 0) > 0 ? <span className={styles.csStatNote}>+{character.hp!.temp} temp</span> : null}
                    </div>
                    <div className={styles.csStat}>
                      <span className={styles.csStatLabel}>AC</span>
                      <strong className={styles.csStatValue}>{character.acOverride ?? character.ac ?? "—"}</strong>
                    </div>
                    <div className={styles.csStat}>
                      <span className={styles.csStatLabel}>Initiative</span>
                      <strong className={styles.csStatValue}>{character.initiative != null ? signedNum(character.initiative) : "—"}</strong>
                    </div>
                    <div className={styles.csStat}>
                      <span className={styles.csStatLabel}>Speed</span>
                      <strong className={styles.csStatValue}>{character.speed != null ? `${character.speed} ft` : "—"}</strong>
                    </div>
                    <div className={styles.csStat}>
                      <span className={styles.csStatLabel}>Prof. Bonus</span>
                      <strong className={styles.csStatValue}>{character.proficiencyBonus != null ? signedNum(character.proficiencyBonus) : "—"}</strong>
                    </div>
                    <div className={styles.csStat}>
                      <span className={styles.csStatLabel}>Level</span>
                      <strong className={styles.csStatValue}>{character.level ?? "—"}</strong>
                    </div>
                    {editingOverrides ? (
                      <div className={styles.csOverrideRow}>
                        <label className={styles.csOverrideField}>
                          <span>HP max</span>
                          <input type="number" placeholder={String(character.hp?.max ?? "")} value={overrideHp} onChange={(e) => setOverrideHp(e.target.value)} />
                        </label>
                        <label className={styles.csOverrideField}>
                          <span>AC</span>
                          <input type="number" placeholder={String(character.ac ?? "")} value={overrideAc} onChange={(e) => setOverrideAc(e.target.value)} />
                        </label>
                        <button type="button" className={styles.primaryButton} onClick={saveStatOverrides}>Save</button>
                        <button type="button" className={styles.secondaryButton} onClick={() => setEditingOverrides(false)}>Cancel</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={styles.csOverrideBtn}
                        title="Manually correct HP or AC for homebrew feats"
                        onClick={() => {
                          setOverrideHp(character.hpOverride != null ? String(character.hpOverride) : "");
                          setOverrideAc(character.acOverride != null ? String(character.acOverride) : "");
                          setEditingOverrides(true);
                        }}
                      >
                        Fix stats
                      </button>
                    )}
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
                          const bonus = prof === "expertise" ? pb * 2 : prof === "proficient" ? pb : prof === "half" ? Math.floor(pb / 2) : 0;
                          return (
                            <div key={id} className={styles.csSaveRow}>
                              <span className={prof !== "none" ? styles.csProfDot : styles.csEmptyDot} />
                              <span className={styles.csSaveAbility}>{label}</span>
                              <span className={styles.csSaveBonus}>{signedNum(base + bonus)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </section>

                    <section className={styles.csSection}>
                      <h2 className={styles.csSectionTitle}>Skills</h2>
                      <div className={styles.csSaveList}>
                        {SKILL_DEFS.map(({ id, label, ability }) => {
                          const prof = character.skills?.[id] || "none";
                          const score = character.abilities?.[ability];
                          const base = score != null ? abilityMod(score) : 0;
                          const pb = character.proficiencyBonus || 2;
                          const bonus = prof === "expertise" ? pb * 2 : prof === "proficient" ? pb : prof === "half" ? Math.floor(pb / 2) : 0;
                          return (
                            <div key={id} className={styles.csSkillRow}>
                              <span className={prof !== "none" ? styles.csProfDot : styles.csEmptyDot} />
                              <span className={styles.csSaveAbility}>{ability.toUpperCase()}</span>
                              <span className={styles.csSaveName}>{label}</span>
                              <span className={styles.csSaveBonus}>{signedNum(base + bonus)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </section>

                    <section className={styles.csSection}>
                      <div className={styles.csTabBar}>
                        {character.attacks.length > 0 ? (
                          <button type="button" className={effectiveSheetTab === "attacks" ? styles.csTabActive : styles.csTab} onClick={() => setSheetTab("attacks")}>
                            Attacks
                          </button>
                        ) : null}
                        {character.spells.length > 0 ? (
                          <button type="button" className={effectiveSheetTab === "spells" ? styles.csTabActive : styles.csTab} onClick={() => setSheetTab("spells")}>
                            Spells
                          </button>
                        ) : null}
                      </div>

                      {effectiveSheetTab === "attacks" ? (
                        <div className={styles.csAttackList}>
                          {character.attacks.map((attack) => (
                            <div key={attack.id} className={styles.csAttackRow}>
                              <strong>{attack.name}</strong>
                              <span>{attack.damage || attack.sub || "—"}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div>
                          {spellsByLevel.map(([level, spells]) => (
                            <div key={level} className={styles.csSpellGroup}>
                              <h3 className={styles.csSpellGroupTitle}>{level === 0 ? "Cantrips" : `Level ${level}`}</h3>
                              <div className={styles.csSpellList}>
                                {spells.map((spell) => (
                                  <div key={spell.id} className={styles.csSpellRow}>
                                    <span>{spell.name}</span>
                                    {spell.prepared && level > 0 ? <span className={styles.csPreparedMark} title="Prepared" /> : null}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                </div>
              )}
            </section>
          ) : null}

          {view === "modifiers" ? (
            <section className={styles.appView}>
              <div className={styles.viewHeading}><h1>Modifier Forge</h1><p>Forge togglable buffs, debuffs, and conditions that stack onto rolls.</p></div>
              <div className={styles.modForgeGrid}>
                <aside className={styles.modLibrary}>
                  <h2>Library</h2>
                  {[...BUILTIN_MODIFIERS, ...savedModifiers].map((modifier) => (
                    <article key={modifier.id} className={styles.modLibraryItem}>
                      <strong>{modifier.name}</strong>
                      <span>{modifier.bonus || modifier.damage || modifier.rawFlags || modifier.phrase || "modifier"}</span>
                    </article>
                  ))}
                </aside>
                <section className={styles.modEditor}>
                  <div className={styles.formGrid}>
                    <label className={styles.field}><span>Name</span><input value={modifierForm.name} onChange={(event) => setModifierForm((current) => ({ ...current, name: event.target.value }))} /></label>
                    <label className={styles.field}><span>Bonus</span><input placeholder="1d4" value={modifierForm.bonus} onChange={(event) => setModifierForm((current) => ({ ...current, bonus: event.target.value }))} /></label>
                    <label className={styles.field}><span>Damage</span><input placeholder="2d6[fire]" value={modifierForm.damage} onChange={(event) => setModifierForm((current) => ({ ...current, damage: event.target.value }))} /></label>
                    <label className={styles.field}><span>Phrase</span><input value={modifierForm.phrase} onChange={(event) => setModifierForm((current) => ({ ...current, phrase: event.target.value }))} /></label>
                    <label className={styles.field}><span>Raw flags</span><input placeholder="-rr 2 or -h" value={modifierForm.rawFlags} onChange={(event) => setModifierForm((current) => ({ ...current, rawFlags: event.target.value }))} /></label>
                  </div>
                  <div className={styles.checkboxGrid}>{(Object.keys(KIND_LABELS) as AvraeActionKind[]).map((option) => <label key={option}><input type="checkbox" checked={modifierForm.appliesTo.includes(option)} onChange={() => toggleModifierAppliesTo(option)} /><span>{KIND_LABELS[option]}</span></label>)}</div>
                  <div className={styles.modEditorActions}>
                    <button type="button" className={styles.primaryButton} onClick={saveModifier} disabled={!user}>{editingModifierId !== null ? "Update Modifier" : "Save Modifier"}</button>
                    {editingModifierId !== null ? <button type="button" className={styles.secondaryButton} onClick={cancelEditingModifier}>Cancel</button> : null}
                  </div>
                  {modifierError ? <p className={styles.errorText}>{modifierError}</p> : null}
                  <div className={styles.savedModifierList}>{savedModifiers.map((modifier) => <div key={modifier.id} className={styles.savedModifierItem}><span>{modifier.name}</span><div className={styles.savedModifierItemActions}><button type="button" className={styles.secondaryButton} onClick={() => startEditingModifier(modifier)}>Edit</button><button type="button" className={styles.secondaryButton} onClick={() => deleteModifier(modifier.id)}>Delete</button></div></div>)}</div>
                </section>
              </div>
            </section>
          ) : null}

          <footer className={styles.commandBar}>
            <span>CMD</span>
            <code>{command || "click an action to compose a command..."}</code>
            <button type="button" onClick={copyCommand}>{copied ? "Copied" : "Copy"}</button>
          </footer>
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
