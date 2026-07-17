import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import styles from "./rewards-calculator.module.css";

type RewardRow = {
  level: number;
  xpPerHour: number;
  goldPerHour: number;
  tier: string;
  tierClassName: string;
  range: string;
};

type SessionUser = {
  id?: number;
  username: string;
  globalName: string | null;
  isStaff: boolean;
  isDm?: boolean;
  canSubmitRewards?: boolean;
};

type WestMarchesUserRef = {
  id: string;
  discordId: string | null;
};

type WestMarchesCharacter = {
  id: string;
  name: string;
  level: number;
  experience: number;
  status: string;
  image: string | null;
  user: WestMarchesUserRef | null;
};

type WestMarchesCurrency = {
  id: string;
  name: string;
  order: number;
};

type WestMarchesAdventure = {
  id: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  gm: WestMarchesUserRef | null;
  approvedCharacterIds: string[];
  participantCount: number;
};

type RewardEvent = {
  id: number;
  name: string;
  currencyId: string;
  currencyName: string;
  startsAt: string;
  endsAt: string;
  ruleType: "final_participant_fixed" | "sc_percentage" | "event_quest_fixed";
  fixedAmount: number;
  nonEventScPercent: number;
  eventScPercent: number;
  enabled: boolean;
};

type WestMarchesStatus = {
  configured: boolean;
  activeEvent: RewardEvent | null;
  currencyMappings: {
    gold: string | null;
    sc: string | null;
    event: {
      id: string;
      name: string;
    } | null;
  };
};

type RewardTarget = "player" | "dm" | "rp" | "manual";

const REWARD_TABLE: RewardRow[] = [
  {
    level: 1,
    xpPerHour: 150,
    goldPerHour: 30,
    tier: "Beginner",
    tierClassName: styles.tierBeginner,
    range: "1 - 4",
  },
  {
    level: 2,
    xpPerHour: 200,
    goldPerHour: 50,
    tier: "Beginner",
    tierClassName: styles.tierBeginner,
    range: "1 - 4",
  },
  {
    level: 3,
    xpPerHour: 450,
    goldPerHour: 100,
    tier: "Beginner",
    tierClassName: styles.tierBeginner,
    range: "1 - 4",
  },
  {
    level: 4,
    xpPerHour: 600,
    goldPerHour: 150,
    tier: "Beginner",
    tierClassName: styles.tierBeginner,
    range: "1 - 4",
  },
  {
    level: 5,
    xpPerHour: 800,
    goldPerHour: 300,
    tier: "Intermediate",
    tierClassName: styles.tierIntermediate,
    range: "5 - 8",
  },
  {
    level: 6,
    xpPerHour: 1000,
    goldPerHour: 500,
    tier: "Intermediate",
    tierClassName: styles.tierIntermediate,
    range: "5 - 8",
  },
  {
    level: 7,
    xpPerHour: 1200,
    goldPerHour: 800,
    tier: "Intermediate",
    tierClassName: styles.tierIntermediate,
    range: "5 - 8",
  },
  {
    level: 8,
    xpPerHour: 1500,
    goldPerHour: 1000,
    tier: "Intermediate",
    tierClassName: styles.tierIntermediate,
    range: "5 - 8",
  },
  {
    level: 9,
    xpPerHour: 1800,
    goldPerHour: 1500,
    tier: "Adept",
    tierClassName: styles.tierAdept,
    range: "9 - 12",
  },
  {
    level: 10,
    xpPerHour: 2000,
    goldPerHour: 2000,
    tier: "Adept",
    tierClassName: styles.tierAdept,
    range: "9 - 12",
  },
  {
    level: 11,
    xpPerHour: 2300,
    goldPerHour: 2500,
    tier: "Adept",
    tierClassName: styles.tierAdept,
    range: "9 - 12",
  },
  {
    level: 12,
    xpPerHour: 2500,
    goldPerHour: 3000,
    tier: "Adept",
    tierClassName: styles.tierAdept,
    range: "9 - 12",
  },
  {
    level: 13,
    xpPerHour: 2800,
    goldPerHour: 5000,
    tier: "Expert",
    tierClassName: styles.tierExpert,
    range: "13 - 16",
  },
  {
    level: 14,
    xpPerHour: 3000,
    goldPerHour: 5500,
    tier: "Expert",
    tierClassName: styles.tierExpert,
    range: "13 - 16",
  },
  {
    level: 15,
    xpPerHour: 3500,
    goldPerHour: 6000,
    tier: "Expert",
    tierClassName: styles.tierExpert,
    range: "13 - 16",
  },
  {
    level: 16,
    xpPerHour: 4000,
    goldPerHour: 6500,
    tier: "Expert",
    tierClassName: styles.tierExpert,
    range: "13 - 16",
  },
  {
    level: 17,
    xpPerHour: 5000,
    goldPerHour: 7500,
    tier: "Master",
    tierClassName: styles.tierMaster,
    range: "17 - 20",
  },
  {
    level: 18,
    xpPerHour: 5500,
    goldPerHour: 8000,
    tier: "Master",
    tierClassName: styles.tierMaster,
    range: "17 - 20",
  },
  {
    level: 19,
    xpPerHour: 6000,
    goldPerHour: 8500,
    tier: "Master",
    tierClassName: styles.tierMaster,
    range: "17 - 20",
  },
  {
    level: 20,
    xpPerHour: 7000,
    goldPerHour: 9000,
    tier: "Master",
    tierClassName: styles.tierMaster,
    range: "17 - 20",
  },
  {
    level: 21,
    xpPerHour: 7500,
    goldPerHour: 9500,
    tier: "Paragon",
    tierClassName: styles.tierParagon,
    range: "20+",
  },
  {
    level: 22,
    xpPerHour: 8000,
    goldPerHour: 10000,
    tier: "Paragon",
    tierClassName: styles.tierParagon,
    range: "20+",
  },
];

const TIER_ROWS = [
  { name: "Beginner", range: "1 - 4", className: styles.tierBeginner },
  { name: "Intermediate", range: "5 - 8", className: styles.tierIntermediate },
  { name: "Adept", range: "9 - 12", className: styles.tierAdept },
  { name: "Expert", range: "13 - 16", className: styles.tierExpert },
  { name: "Master", range: "17 - 20", className: styles.tierMaster },
  { name: "Paragon", range: "20+", className: styles.tierParagon },
];

const REWARD_TABLE_GROUPS = [
  REWARD_TABLE.filter((row) => row.level >= 1 && row.level <= 8),
  REWARD_TABLE.filter((row) => row.level >= 9 && row.level <= 15),
  REWARD_TABLE.filter((row) => row.level >= 16 && row.level <= 22),
];

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getRewardRow(level: number) {
  return REWARD_TABLE[clampNumber(level, 1, 22) - 1];
}

function getDmBonusLevel(players: number) {
  if (players >= 4) {
    return 2;
  }

  if (players >= 2) {
    return 1;
  }

  return 0;
}

function formatReward(value: number) {
  return new Intl.NumberFormat("en-GB").format(Math.round(value));
}

function parseWholeNumber(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function getAuthApiBaseUrl(siteConfig): string {
  const configuredBaseUrl = siteConfig.customFields?.authApiBaseUrl;
  return typeof configuredBaseUrl === "string"
    ? configuredBaseUrl.replace(/\/$/, "")
    : "";
}

function formatCharacterOption(character: WestMarchesCharacter) {
  return character.name.trim();
}

const MIN_PARTY_CHIP_FONT_SCALE = 0.62;

type PlayerRewardOverride = {
  excluded: boolean;
  xp: string;
  gold: string;
  sc: string;
};

function PartyChipsRow({
  characterIds,
  getLabel,
  overrides,
  onSelect,
}: {
  characterIds: string[];
  getLabel: (characterId: string) => string;
  overrides: Record<string, PlayerRewardOverride>;
  onSelect: (characterId: string) => void;
}): ReactNode {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [fontSize, setFontSize] = useState("");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    function fit() {
      if (!container) {
        return;
      }
      container.style.fontSize = "";
      const baseFontSize = parseFloat(getComputedStyle(container).fontSize);
      const available = container.clientWidth;
      const needed = container.scrollWidth;
      if (available > 0 && needed > available) {
        const scale = Math.max(
          MIN_PARTY_CHIP_FONT_SCALE,
          (available / needed) * 0.97,
        );
        setFontSize(`${baseFontSize * scale}px`);
      } else {
        setFontSize("");
      }
    }

    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [characterIds]);

  return (
    <div
      ref={containerRef}
      className={styles.selectionChips}
      style={fontSize ? { fontSize } : undefined}
    >
      {characterIds.map((characterId) => {
        const override = overrides[characterId];
        const chipClassName = [
          styles.selectionChip,
          override?.excluded ? styles.selectionChipExcluded : "",
          override && !override.excluded ? styles.selectionChipModified : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <button
            key={characterId}
            type="button"
            className={chipClassName}
            onClick={() => onSelect(characterId)}
          >
            {getLabel(characterId)}
            {override?.excluded ? " (excluded)" : override ? " (custom)" : ""}
          </button>
        );
      })}
    </div>
  );
}

export default function RewardsCalculatorPage(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const authApiBaseUrl = getAuthApiBaseUrl(siteConfig);

  const [hours, setHours] = useState("4");
  const [minutes, setMinutes] = useState("0");
  const [questLevel, setQuestLevel] = useState("6");
  const [players, setPlayers] = useState("5");
  const [isEventRelated, setIsEventRelated] = useState(false);
  const [isPrizeHunt, setIsPrizeHunt] = useState(false);
  const [playerOverrides, setPlayerOverrides] = useState<
    Record<string, PlayerRewardOverride>
  >({});
  const [editingOverrideCharacterId, setEditingOverrideCharacterId] = useState<
    string | null
  >(null);
  const [draftExcluded, setDraftExcluded] = useState(false);
  const [draftXp, setDraftXp] = useState("0");
  const [draftGold, setDraftGold] = useState("0");
  const [draftSc, setDraftSc] = useState("0");
  const [rpHours, setRpHours] = useState("0");
  const [rpMinutes, setRpMinutes] = useState("10");
  const [rpLevel, setRpLevel] = useState("4");

  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authError, setAuthError] = useState("");

  const [isWestMarchesLoading, setIsWestMarchesLoading] = useState(true);
  const [westMarchesError, setWestMarchesError] = useState("");
  const [westMarchesStatus, setWestMarchesStatus] =
    useState<WestMarchesStatus | null>(null);
  const [characters, setCharacters] = useState<WestMarchesCharacter[]>([]);
  const [myCharacters, setMyCharacters] = useState<WestMarchesCharacter[]>([]);
  const [currencies, setCurrencies] = useState<WestMarchesCurrency[]>([]);
  const [adventures, setAdventures] = useState<WestMarchesAdventure[]>([]);

  const [playerAdventureId, setPlayerAdventureId] = useState("");
  const [isAdventureMenuOpen, setIsAdventureMenuOpen] = useState(false);
  const [adventureMenuRect, setAdventureMenuRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const adventureMenuRef = useRef<HTMLDivElement>(null);
  const adventurePanelRef = useRef<HTMLDivElement>(null);
  const [dmCharacterId, setDmCharacterId] = useState("");
  const [rpCharacterId, setRpCharacterId] = useState("");
  const [manualCharacterId, setManualCharacterId] = useState("");
  const [dmCharacterQuery, setDmCharacterQuery] = useState("");
  const [rpCharacterQuery, setRpCharacterQuery] = useState("");
  const [manualCharacterQuery, setManualCharacterQuery] = useState("");
  const [manualXp, setManualXp] = useState("0");
  const [manualGold, setManualGold] = useState("0");
  const [manualSc, setManualSc] = useState("0");
  const [playerReason, setPlayerReason] = useState("");
  const [dmReason, setDmReason] = useState("");
  const [rpReason, setRpReason] = useState("");
  const [manualReason, setManualReason] = useState("");
  const [submittingTarget, setSubmittingTarget] = useState<RewardTarget | null>(
    null,
  );
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [submissionError, setSubmissionError] = useState("");

  useEffect(() => {
    if (!isAdventureMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      const isInsideTrigger = adventureMenuRef.current?.contains(target);
      const isInsidePanel = adventurePanelRef.current?.contains(target);
      if (!isInsideTrigger && !isInsidePanel) {
        setIsAdventureMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsAdventureMenuOpen(false);
      }
    }

    function updatePosition() {
      if (!adventureMenuRef.current) {
        return;
      }
      const rect = adventureMenuRef.current.getBoundingClientRect();
      setAdventureMenuRect({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isAdventureMenuOpen]);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        setIsAuthLoading(true);
        setAuthError("");

        const response = await fetch(`${authApiBaseUrl}/api/me`, {
          credentials: "include",
        });

        if (response.status === 401) {
          if (!cancelled) {
            setUser(null);
          }
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to load auth session (${response.status}).`);
        }

        const payload = await response.json();
        if (!cancelled) {
          setUser(payload.authenticated ? payload.user : null);
        }
      } catch (sessionError) {
        if (!cancelled) {
          setAuthError(
            sessionError instanceof Error
              ? sessionError.message
              : "Failed to load staff session.",
          );
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsAuthLoading(false);
        }
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, [authApiBaseUrl]);

  useEffect(() => {
    let cancelled = false;

    async function loadWestMarchesStatus() {
      try {
        const response = await fetch(
          `${authApiBaseUrl}/api/rewards/westmarches/status`,
          {
            credentials: "include",
          },
        );
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            payload.error || "Failed to load West Marches status.",
          );
        }

        if (!cancelled) {
          setWestMarchesStatus(payload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setWestMarchesError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load West Marches status.",
          );
        }
      }
    }

    loadWestMarchesStatus();
    return () => {
      cancelled = true;
    };
  }, [authApiBaseUrl]);

  useEffect(() => {
    if (!user?.canSubmitRewards) {
      setIsWestMarchesLoading(false);
      setCharacters([]);
      setAdventures([]);
      setCurrencies([]);
      return;
    }

    let cancelled = false;

    async function loadWestMarchesData() {
      try {
        setIsWestMarchesLoading(true);
        setWestMarchesError("");

        const [charactersResponse, currenciesResponse, adventuresResponse] =
          await Promise.all([
            fetch(`${authApiBaseUrl}/api/rewards/westmarches/characters`, {
              credentials: "include",
            }),
            fetch(`${authApiBaseUrl}/api/rewards/westmarches/currencies`, {
              credentials: "include",
            }),
            fetch(`${authApiBaseUrl}/api/rewards/westmarches/adventures`, {
              credentials: "include",
            }),
          ]);

        const charactersPayload = await charactersResponse
          .json()
          .catch(() => ({}));
        const currenciesPayload = await currenciesResponse
          .json()
          .catch(() => ({}));
        const adventuresPayload = await adventuresResponse
          .json()
          .catch(() => ({}));

        if (!charactersResponse.ok) {
          throw new Error(
            charactersPayload.error ||
              "Failed to load West Marches characters.",
          );
        }

        if (!currenciesResponse.ok) {
          throw new Error(
            currenciesPayload.error ||
              "Failed to load West Marches currencies.",
          );
        }

        if (!adventuresResponse.ok) {
          throw new Error(
            adventuresPayload.error ||
              "Failed to load West Marches adventures.",
          );
        }

        if (!cancelled) {
          setCharacters(() => {
            const nextCharacters = Array.isArray(charactersPayload.characters)
              ? charactersPayload.characters
              : [];

            return [...nextCharacters].sort((left, right) =>
              formatCharacterOption(left).localeCompare(
                formatCharacterOption(right),
                undefined,
                { sensitivity: "base" },
              ),
            );
          });
          setCurrencies(
            Array.isArray(currenciesPayload.currencies)
              ? currenciesPayload.currencies
              : [],
          );
          setAdventures(
            Array.isArray(adventuresPayload.adventures)
              ? adventuresPayload.adventures
              : [],
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setWestMarchesError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load West Marches integration data.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsWestMarchesLoading(false);
        }
      }
    }

    loadWestMarchesData();
    return () => {
      cancelled = true;
    };
  }, [authApiBaseUrl, user?.canSubmitRewards]);

  useEffect(() => {
    if (!user) {
      setMyCharacters([]);
      return;
    }

    let cancelled = false;

    async function loadMyCharacters() {
      try {
        const response = await fetch(
          `${authApiBaseUrl}/api/rewards/westmarches/my-characters`,
          { credentials: "include" },
        );
        if (!response.ok || cancelled) return;
        const payload = await response.json().catch(() => ({}));
        if (!cancelled) {
          setMyCharacters(
            Array.isArray(payload.characters)
              ? [...payload.characters].sort((a, b) =>
                  formatCharacterOption(a).localeCompare(
                    formatCharacterOption(b),
                    undefined,
                    { sensitivity: "base" },
                  ),
                )
              : [],
          );
        }
      } catch {
        // Non-critical — RP section will just show no characters
      }
    }

    loadMyCharacters();
    return () => {
      cancelled = true;
    };
  }, [authApiBaseUrl, user]);

  const safeHours = Math.max(0, parseWholeNumber(hours, 0));
  const safeMinutes = clampNumber(parseWholeNumber(minutes, 0), 0, 59);
  const safeQuestLevel = clampNumber(parseWholeNumber(questLevel, 1), 1, 22);
  const safePlayers = Math.max(1, parseWholeNumber(players, 1));
  const safeRpHours = Math.max(0, parseWholeNumber(rpHours, 0));
  const safeRpMinutes = clampNumber(parseWholeNumber(rpMinutes, 0), 0, 59);
  const safeRpLevel = clampNumber(parseWholeNumber(rpLevel, 1), 1, 22);

  const questDuration = safeHours + safeMinutes / 60;
  const rpDuration = safeRpHours + safeRpMinutes / 60;
  const playerRewardRow = getRewardRow(safeQuestLevel);
  const dmBonusLevel = getDmBonusLevel(safePlayers);
  const dmRewardRow = getRewardRow(
    clampNumber(safeQuestLevel + dmBonusLevel, 1, 22),
  );
  const rpRewardRow = getRewardRow(safeRpLevel);
  const eventCurrencyName =
    westMarchesStatus?.currencyMappings.event?.name?.trim() || "";
  const hasEventCurrency = Boolean(eventCurrencyName);

  const basePlayerXp = questDuration * playerRewardRow.xpPerHour;
  const basePlayerGold = questDuration * playerRewardRow.goldPerHour;
  const basePlayerSc = Math.trunc(safeHours);
  const playerXp = basePlayerXp;
  const playerGold = basePlayerGold;
  const playerSc = basePlayerSc;

  const baseDmXp = questDuration * dmRewardRow.xpPerHour;
  const baseDmGold = questDuration * dmRewardRow.goldPerHour;
  const dmScMultiplier = safeQuestLevel < 10 ? 2 : 1;
  const baseDmSc = Math.trunc(safeHours) * 2 * dmScMultiplier;
  const dmXp = baseDmXp;
  const dmGold = baseDmGold;
  const dmSc = baseDmSc;
  const activeEvent = westMarchesStatus?.activeEvent || null;
  function getEventCurrencyAmount(sc: number): number {
    if (!activeEvent) return 0;
    if (activeEvent.ruleType === "event_quest_fixed") {
      return isEventRelated ? activeEvent.fixedAmount : 0;
    }
    if (activeEvent.ruleType === "sc_percentage") {
      const percent = isEventRelated
        ? activeEvent.eventScPercent
        : activeEvent.nonEventScPercent;
      return Math.floor((sc * percent) / 100);
    }
    return 0;
  }
  const playerEventCurrencyAmount = getEventCurrencyAmount(playerSc);
  const dmEventCurrencyAmount = getEventCurrencyAmount(dmSc);

  const rpXp = Math.round((rpDuration * rpRewardRow.xpPerHour) / 3);
  const rpGold = Math.round((rpDuration * rpRewardRow.goldPerHour) / 3);

  const eventReasonText = activeEvent
    ? `, ${activeEvent.name}${isEventRelated ? " event quest" : ""}`
    : "";
  const dmScReasonText = dmScMultiplier > 1 ? ", below level 10 DM SC x2" : "";
  const playerDefaultReason = `Quest rewards: ${safeHours}h ${safeMinutes}m, level ${safeQuestLevel}, ${safePlayers} player${safePlayers === 1 ? "" : "s"}${eventReasonText}`;
  const prizeHuntPlaceholder =
    "Character Name - Item\nOne per line, e.g.:\nHarkul - Potion of Diminution";
  const dmDefaultReason = `DM rewards: ${safeHours}h ${safeMinutes}m, base level ${safeQuestLevel}, DM bonus +${dmBonusLevel}${dmScReasonText}${eventReasonText}`;
  const rpDefaultReason = `RP rewards: ${safeRpHours}h ${safeRpMinutes}m, level ${safeRpLevel}`;
  const manualDefaultReason = "Individual reward";

  function filterCharacters(query: string, characterList = characters) {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return characterList;
    }

    return characterList.filter((character) =>
      formatCharacterOption(character).toLowerCase().includes(normalizedQuery),
    );
  }

  const selectedPlayerAdventure =
    adventures.find((adventure) => adventure.id === playerAdventureId) || null;
  const selectedPlayerCharacterIds =
    selectedPlayerAdventure?.approvedCharacterIds || [];

  const filteredDmCharacters = useMemo(() => {
    const gmDiscordId = selectedPlayerAdventure?.gm?.discordId;
    const dmOwnedCharacters = gmDiscordId
      ? characters.filter(
          (character) => character.user?.discordId === gmDiscordId,
        )
      : characters;
    const normalizedQuery = dmCharacterQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return dmOwnedCharacters;
    }

    return dmOwnedCharacters.filter((character) =>
      formatCharacterOption(character).toLowerCase().includes(normalizedQuery),
    );
  }, [characters, dmCharacterQuery, selectedPlayerAdventure]);
  const rpCharacterList = user?.canSubmitRewards ? characters : myCharacters;
  const filteredRpCharacters = useMemo(
    () => filterCharacters(rpCharacterQuery, rpCharacterList),
    [rpCharacterList, rpCharacterQuery],
  );
  const filteredManualCharacters = useMemo(
    () => filterCharacters(manualCharacterQuery, characters),
    [characters, manualCharacterQuery],
  );

  function parsePrizeHuntLines(
    notes: string,
    characterIds: string[],
  ): { itemsByCharacterId: Record<string, string>; errors: string[] } {
    const itemsByCharacterId: Record<string, string> = {};
    const errors: string[] = [];
    const lines = notes
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      const match = line.match(/^(.+?)\s*-\s*(.+)$/);
      if (!match) {
        errors.push(`Could not parse "${line}" — use the format "Character Name - Item".`);
        continue;
      }

      const [, namePart, itemPart] = match;
      const normalizedName = namePart.trim().toLowerCase();
      const character = characterIds
        .map((characterId) => characters.find((item) => item.id === characterId))
        .find(
          (item) => item && formatCharacterOption(item).toLowerCase() === normalizedName,
        );

      if (!character) {
        errors.push(`Could not find "${namePart.trim()}" in the selected party.`);
        continue;
      }

      itemsByCharacterId[character.id] = itemPart.trim();
    }

    return { itemsByCharacterId, errors };
  }

  async function submitReward(target: RewardTarget) {
    const targetConfig =
      target === "player"
        ? {
            characterIds: selectedPlayerCharacterIds,
            experience: Math.round(playerXp),
            gold: Math.round(playerGold),
            sc: playerSc,
            eventRelated: isEventRelated,
            adventureId: selectedPlayerAdventure?.id || "",
            reason: isPrizeHunt
              ? playerDefaultReason
              : playerReason.trim() || playerDefaultReason,
          }
        : target === "dm"
          ? {
              characterId: dmCharacterId,
              experience: Math.round(dmXp),
              gold: Math.round(dmGold),
              sc: dmSc,
              eventRelated: isEventRelated,
              adventureId: selectedPlayerAdventure?.id || "",
              reason: dmReason.trim() || dmDefaultReason,
            }
          : target === "manual"
            ? {
                characterId: manualCharacterId,
                experience: Math.max(0, parseWholeNumber(manualXp, 0)),
                gold: Math.max(0, parseWholeNumber(manualGold, 0)),
                sc: Math.max(0, parseWholeNumber(manualSc, 0)),
                adventureId: selectedPlayerAdventure?.id || "",
                reason: manualReason.trim() || manualDefaultReason,
              }
            : {
                characterId: rpCharacterId,
                experience: Math.round(rpXp),
                gold: Math.round(rpGold),
                sc: 0,
                reason: rpReason.trim() || rpDefaultReason,
              };

    if (
      (target === "player" && targetConfig.characterIds.length === 0) ||
      (target !== "player" && !targetConfig.characterId)
    ) {
      setSubmissionMessage("");
      setSubmissionError(
        target === "player"
          ? "Choose an adventure with approved player characters before submitting rewards."
          : "Choose a character before submitting rewards.",
      );
      return;
    }

    const includedPlayerCharacterIds =
      target === "player"
        ? targetConfig.characterIds.filter(
            (characterId) => !playerOverrides[characterId]?.excluded,
          )
        : [];

    if (target === "player" && includedPlayerCharacterIds.length === 0) {
      setSubmissionMessage("");
      setSubmissionError(
        "All party members are excluded from this reward — nothing to submit.",
      );
      return;
    }

    let prizeItemsByCharacterId: Record<string, string> = {};
    if (target === "player" && isPrizeHunt) {
      const parsed = parsePrizeHuntLines(playerReason, includedPlayerCharacterIds);
      if (parsed.errors.length > 0) {
        setSubmissionMessage("");
        setSubmissionError(parsed.errors.join(" "));
        return;
      }
      prizeItemsByCharacterId = parsed.itemsByCharacterId;
    }

    const rewards =
      target === "player"
        ? includedPlayerCharacterIds.map((characterId) => {
            const override = playerOverrides[characterId];
            const experience = override
              ? Math.max(0, parseWholeNumber(override.xp, 0))
              : targetConfig.experience;
            const gold = override
              ? Math.max(0, parseWholeNumber(override.gold, 0))
              : targetConfig.gold;
            const sc = override
              ? Math.max(0, parseWholeNumber(override.sc, 0))
              : targetConfig.sc;
            const prizeItem = prizeItemsByCharacterId[characterId];
            return {
              characterId,
              experience,
              gold,
              sc,
              eventRelated: targetConfig.eventRelated,
              rewardRole: "player",
              adventureId: targetConfig.adventureId,
              // A prize item makes this entry's reason unique so the bulk
              // rewards API (which merges entries with identical experience,
              // currencies, and reason into one Discord notification) doesn't
              // fold this player's prize into the shared party notification.
              reason: prizeItem
                ? `${targetConfig.reason} — Prize: ${prizeItem}`
                : targetConfig.reason,
              ...(prizeItem
                ? {
                    items: [
                      {
                        name: prizeItem,
                        quantity: 1,
                        isConsumable: false,
                      },
                    ],
                  }
                : {}),
            };
          })
        : [
            {
              characterId: targetConfig.characterId,
              experience: targetConfig.experience,
              gold: targetConfig.gold,
              sc: targetConfig.sc,
              reason: targetConfig.reason,
              ...(target === "dm"
                ? {
                    eventRelated: targetConfig.eventRelated,
                    rewardRole: "dm",
                  }
                : {}),
              ...(target === "manual" ? { rewardRole: "player" } : {}),
              ...(target === "dm" || target === "manual"
                ? { adventureId: targetConfig.adventureId }
                : {}),
            },
          ];

    try {
      setSubmittingTarget(target);
      setSubmissionError("");
      setSubmissionMessage("");

      const isSelfRp = target === "rp" && !user?.canSubmitRewards;
      const rpBody = isSelfRp
        ? {
            characterId: rewards[0].characterId,
            experience: rewards[0].experience ?? 0,
            gold: rewards[0].gold ?? 0,
            reason: rewards[0].reason,
          }
        : null;

      const response = await fetch(
        isSelfRp
          ? `${authApiBaseUrl}/api/rewards/rp`
          : `${authApiBaseUrl}/api/rewards/westmarches/rewards`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            isSelfRp
              ? rpBody
              : {
                  rewards,
                  ...((target === "player" || target === "dm") &&
                  selectedPlayerAdventure?.id
                    ? { adventureId: selectedPlayerAdventure.id }
                    : {}),
                },
          ),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to submit rewards.");
      }

      setSubmissionMessage(
        target === "player"
          ? `PLAYER rewards submitted for ${includedPlayerCharacterIds.length} characters.`
          : target === "manual"
            ? "Individual reward submitted successfully."
            : `${target.toUpperCase()} rewards submitted successfully.`,
      );
    } catch (submitError) {
      setSubmissionError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to submit rewards.",
      );
      setSubmissionMessage("");
    } finally {
      setSubmittingTarget(null);
    }
  }

  function formatAdventureOption(adventure: WestMarchesAdventure) {
    const endDate = adventure.endTime
      ? new Intl.DateTimeFormat("en-GB", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(adventure.endTime))
      : "Date unknown";
    return `${endDate} - ${adventure.title}`;
  }

  function getCharacterLabel(characterId: string) {
    const character = characters.find((item) => item.id === characterId);
    return character ? formatCharacterOption(character) : characterId;
  }

  function openOverrideEditor(characterId: string) {
    if (editingOverrideCharacterId === characterId) {
      setEditingOverrideCharacterId(null);
      return;
    }

    const existing = playerOverrides[characterId];
    setDraftExcluded(existing?.excluded ?? false);
    setDraftXp(existing?.xp ?? String(Math.round(playerXp)));
    setDraftGold(existing?.gold ?? String(Math.round(playerGold)));
    setDraftSc(existing?.sc ?? String(playerSc));
    setEditingOverrideCharacterId(characterId);
  }

  function saveOverride() {
    if (!editingOverrideCharacterId) {
      return;
    }

    setPlayerOverrides((current) => ({
      ...current,
      [editingOverrideCharacterId]: {
        excluded: draftExcluded,
        xp: draftXp,
        gold: draftGold,
        sc: draftSc,
      },
    }));
    setEditingOverrideCharacterId(null);
  }

  function clearOverride(characterId: string) {
    setPlayerOverrides((current) => {
      const next = { ...current };
      delete next[characterId];
      return next;
    });
    setEditingOverrideCharacterId(null);
  }

  function renderRewardSubmissionControls(
    target: RewardTarget,
    description: string,
    reason: string,
    setReason: (value: string) => void,
    defaultReason: string,
  ) {
    const singleCharacterId =
      target === "dm"
        ? dmCharacterId
        : target === "manual"
          ? manualCharacterId
          : rpCharacterId;
    const setSingleCharacterId =
      target === "dm"
        ? setDmCharacterId
        : target === "manual"
          ? setManualCharacterId
          : setRpCharacterId;
    const characterQuery =
      target === "dm"
        ? dmCharacterQuery
        : target === "manual"
          ? manualCharacterQuery
          : rpCharacterQuery;
    const setCharacterQuery =
      target === "dm"
        ? setDmCharacterQuery
        : target === "manual"
          ? setManualCharacterQuery
          : setRpCharacterQuery;
    const filteredCharacters =
      target === "dm"
        ? filteredDmCharacters
        : target === "manual"
          ? filteredManualCharacters
          : filteredRpCharacters;

    function handleAdventureChange(adventureId: string) {
      setPlayerAdventureId(adventureId);
      setPlayerOverrides({});
      setEditingOverrideCharacterId(null);
      const adventure = adventures.find((item) => item.id === adventureId);
      if (adventure) {
        setPlayers(String(Math.max(1, adventure.participantCount)));
        const gmDiscordId = adventure.gm?.discordId;
        if (
          gmDiscordId &&
          dmCharacterId &&
          !characters.some(
            (character) =>
              character.id === dmCharacterId &&
              character.user?.discordId === gmDiscordId,
          )
        ) {
          setDmCharacterId("");
        }
      }
    }

    return (
      <div className={styles.submissionPanel}>
        {description ? <p className={styles.muted}>{description}</p> : null}
        <div className={styles.submissionGrid}>
          {target === "player" ? (
            <div className={styles.field}>
              <label
                htmlFor="player-adventure"
                className={styles.fieldSubheading}
              >
                Adventure
              </label>
              <div className={styles.selectCombo} ref={adventureMenuRef}>
                <button
                  type="button"
                  id="player-adventure"
                  className={styles.selectTrigger}
                  aria-haspopup="listbox"
                  aria-expanded={isAdventureMenuOpen}
                  onClick={() => {
                    if (!isAdventureMenuOpen && adventureMenuRef.current) {
                      const rect =
                        adventureMenuRef.current.getBoundingClientRect();
                      setAdventureMenuRect({
                        top: rect.bottom + 6,
                        left: rect.left,
                        width: rect.width,
                      });
                    }
                    setIsAdventureMenuOpen((open) => !open);
                  }}
                >
                  <span
                    className={
                      selectedPlayerAdventure
                        ? styles.selectTriggerValue
                        : styles.selectTriggerPlaceholder
                    }
                  >
                    {selectedPlayerAdventure
                      ? formatAdventureOption(selectedPlayerAdventure)
                      : "Choose a recent adventure..."}
                  </span>
                  <span className={styles.selectChevron} aria-hidden="true" />
                </button>
                {isAdventureMenuOpen && adventureMenuRect
                  ? createPortal(
                      <div
                        ref={adventurePanelRef}
                        className={styles.selectPanel}
                        role="listbox"
                        style={{
                          top: adventureMenuRect.top,
                          left: adventureMenuRect.left,
                          width: adventureMenuRect.width,
                        }}
                      >
                        <button
                          type="button"
                          role="option"
                          aria-selected={playerAdventureId === ""}
                          className={`${styles.selectOption} ${
                            playerAdventureId === ""
                              ? styles.selectOptionActive
                              : ""
                          }`}
                          onClick={() => {
                            handleAdventureChange("");
                            setIsAdventureMenuOpen(false);
                          }}
                        >
                          Choose a recent adventure...
                        </button>
                        {adventures.map((adventure) => (
                          <button
                            key={adventure.id}
                            type="button"
                            role="option"
                            aria-selected={adventure.id === playerAdventureId}
                            className={`${styles.selectOption} ${
                              adventure.id === playerAdventureId
                                ? styles.selectOptionActive
                                : ""
                            }`}
                            onClick={() => {
                              handleAdventureChange(adventure.id);
                              setIsAdventureMenuOpen(false);
                            }}
                          >
                            {formatAdventureOption(adventure)}
                          </button>
                        ))}
                      </div>,
                      document.body,
                    )
                  : null}
              </div>
              {selectedPlayerAdventure ? (
                <PartyChipsRow
                  characterIds={selectedPlayerCharacterIds}
                  getLabel={getCharacterLabel}
                  overrides={playerOverrides}
                  onSelect={openOverrideEditor}
                />
              ) : null}
              {editingOverrideCharacterId ? (
                <div className={styles.overridePanel}>
                  <p className={styles.fieldSubheading}>
                    {getCharacterLabel(editingOverrideCharacterId)} — Individual Override
                  </p>
                  <label className={styles.toggleRow} htmlFor="override-excluded">
                    <input
                      id="override-excluded"
                      type="checkbox"
                      checked={draftExcluded}
                      onChange={(event) => setDraftExcluded(event.target.checked)}
                    />
                    <span>
                      Exclude from this reward
                      <small>
                        They will receive nothing from this submission — use
                        this if they're being rewarded separately.
                      </small>
                    </span>
                  </label>
                  {!draftExcluded ? (
                    <div className={styles.inputGrid}>
                      <div className={styles.field}>
                        <label htmlFor="override-xp">XP</label>
                        <input
                          id="override-xp"
                          inputMode="numeric"
                          value={draftXp}
                          onChange={(event) => setDraftXp(event.target.value)}
                        />
                      </div>
                      <div className={styles.field}>
                        <label htmlFor="override-gold">Gold</label>
                        <input
                          id="override-gold"
                          inputMode="numeric"
                          value={draftGold}
                          onChange={(event) => setDraftGold(event.target.value)}
                        />
                      </div>
                      <div className={styles.field}>
                        <label htmlFor="override-sc">SC</label>
                        <input
                          id="override-sc"
                          inputMode="numeric"
                          value={draftSc}
                          onChange={(event) => setDraftSc(event.target.value)}
                        />
                      </div>
                    </div>
                  ) : null}
                  <div className={styles.formActions}>
                    <button type="button" className={styles.actionButton} onClick={saveOverride}>
                      Save
                    </button>
                    {playerOverrides[editingOverrideCharacterId] ? (
                      <button
                        type="button"
                        className={styles.actionButton}
                        onClick={() => clearOverride(editingOverrideCharacterId)}
                      >
                        Remove Override
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={styles.actionButton}
                      onClick={() => setEditingOverrideCharacterId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className={styles.field}>
              <label htmlFor={`${target}-character-search`}>Character</label>
              <input
                id={`${target}-character-search`}
                className={styles.input}
                value={characterQuery}
                onChange={(event) => setCharacterQuery(event.target.value)}
                placeholder="Search for a character"
              />
              <div className={styles.searchResults}>
                {filteredCharacters.map((character) => {
                  const isSelected = singleCharacterId === character.id;

                  return (
                    <button
                      key={character.id}
                      type="button"
                      className={`${styles.searchResultButton} ${
                        isSelected ? styles.searchResultButtonSelected : ""
                      }`.trim()}
                      onClick={() => setSingleCharacterId(character.id)}
                    >
                      {formatCharacterOption(character)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {target === "manual" ? (
            <div className={styles.field}>
              <label className={styles.fieldSubheading}>Reward Amounts</label>
              <div className={styles.inputGrid}>
                <div className={styles.field}>
                  <label htmlFor="manual-xp">XP</label>
                  <input
                    id="manual-xp"
                    inputMode="numeric"
                    value={manualXp}
                    onChange={(event) => setManualXp(event.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="manual-gold">Gold</label>
                  <input
                    id="manual-gold"
                    inputMode="numeric"
                    value={manualGold}
                    onChange={(event) => setManualGold(event.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="manual-sc">SC</label>
                  <input
                    id="manual-sc"
                    inputMode="numeric"
                    value={manualSc}
                    onChange={(event) => setManualSc(event.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : null}
          <div className={styles.field}>
            <label htmlFor={`${target}-reason`}>Notes</label>
            <textarea
              id={`${target}-reason`}
              className={styles.textarea}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={defaultReason}
              rows={3}
            />
          </div>
        </div>
        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => submitReward(target)}
            disabled={
              submittingTarget !== null || !westMarchesStatus?.configured
            }
          >
            {submittingTarget === target ? "Submitting..." : "Submit Reward"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout
      title="Rewards Calculator"
      description="Rewards of Altharion calculator"
    >
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.hero}>
            <Heading as="h1">Rewards Calculator</Heading>
            <p>
              Calculate player, DM, and RP rewards directly on the site. Staff
              can also submit them to West Marches through the protected
              backend.
            </p>
          </section>

          <div className={styles.layout}>
            <div className={styles.stack}>
              <section className={styles.panel}>
                <Heading as="h2">Quest Rewards</Heading>
                <p className={styles.muted}>
                  These inputs drive both the player rewards and DM rewards
                  sections.
                </p>
                <div className={styles.inputGrid}>
                  <div className={styles.field}>
                    <label htmlFor="hours">Hours</label>
                    <input
                      id="hours"
                      inputMode="numeric"
                      value={hours}
                      onChange={(event) => setHours(event.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="minutes">Minutes</label>
                    <input
                      id="minutes"
                      inputMode="numeric"
                      value={minutes}
                      onChange={(event) => setMinutes(event.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="quest-level">Quest Level</label>
                    <input
                      id="quest-level"
                      inputMode="numeric"
                      value={questLevel}
                      onChange={(event) => setQuestLevel(event.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="players">Players</label>
                    <input
                      id="players"
                      inputMode="numeric"
                      value={players}
                      onChange={(event) => setPlayers(event.target.value)}
                    />
                  </div>
                </div>
                {hasEventCurrency ? (
                  <label className={styles.toggleRow} htmlFor="event-related">
                    <input
                      id="event-related"
                      type="checkbox"
                      checked={isEventRelated}
                      onChange={(event) =>
                        setIsEventRelated(event.target.checked)
                      }
                    />
                    <span>
                      Event quest
                      <small>
                        Mark this adventure as an event quest.
                      </small>
                    </span>
                  </label>
                ) : null}
              </section>

              {!isAuthLoading &&
              user?.canSubmitRewards &&
              (submissionMessage ||
                submissionError ||
                westMarchesError ||
                authError) ? (
                <section className={styles.panel}>
                  {submissionMessage ? (
                    <p className={styles.successText}>{submissionMessage}</p>
                  ) : null}
                  {submissionError ? (
                    <p className={styles.errorText}>{submissionError}</p>
                  ) : null}
                  {westMarchesError ? (
                    <p className={styles.errorText}>{westMarchesError}</p>
                  ) : null}
                  {authError ? (
                    <p className={styles.errorText}>{authError}</p>
                  ) : null}
                </section>
              ) : null}

              <section className={`${styles.panel} ${styles.rewardPanel}`}>
                <Heading as="h3">Player Rewards</Heading>
                <div
                  className={`${styles.rewardGrid} ${hasEventCurrency ? styles.rewardGridQuad : styles.rewardGridTriple}`}
                >
                  <div className={styles.rewardCard}>
                    <span className={styles.rewardLabel}>XP</span>
                    <span className={styles.rewardValue}>
                      {formatReward(playerXp)}
                    </span>
                  </div>
                  <div className={styles.rewardCard}>
                    <span className={styles.rewardLabel}>Gold</span>
                    <span className={styles.rewardValue}>
                      {formatReward(playerGold)}
                    </span>
                  </div>
                  <div className={styles.rewardCard}>
                    <span className={styles.rewardLabel}>SC</span>
                    <span className={styles.rewardValue}>
                      {formatReward(playerSc)}
                    </span>
                  </div>
                  {hasEventCurrency ? (
                    <div className={styles.rewardCard}>
                      <span className={styles.rewardLabel}>
                        {eventCurrencyName}
                      </span>
                      <span className={styles.rewardValue}>
                        {formatReward(playerEventCurrencyAmount)}
                      </span>
                    </div>
                  ) : null}
                </div>
                {hasEventCurrency ? (
                  <p className={styles.muted}>
                    {activeEvent?.ruleType === "final_participant_fixed"
                      ? `Event-quest participants receive ${activeEvent.fixedAmount} ${eventCurrencyName} at the final payout.`
                      : `${playerEventCurrencyAmount} ${eventCurrencyName} under the active ${activeEvent?.name} rule.`}
                  </p>
                ) : null}
                {user?.canSubmitRewards ? (
                  <>
                    <label className={styles.toggleRow} htmlFor="prize-hunt">
                      <input
                        id="prize-hunt"
                        type="checkbox"
                        checked={isPrizeHunt}
                        onChange={(event) => setIsPrizeHunt(event.target.checked)}
                      />
                      <span>
                        Prize hunt
                        <small>
                          Give each player named in the notes an item, using
                          the format "Character Name - Item" (one per line).
                        </small>
                      </span>
                    </label>
                    {renderRewardSubmissionControls(
                      "player",
                      "",
                      playerReason,
                      setPlayerReason,
                      isPrizeHunt ? prizeHuntPlaceholder : playerDefaultReason,
                    )}
                  </>
                ) : null}
              </section>

              {user?.canSubmitRewards ? (
                <section className={styles.panel}>
                  <Heading as="h2">Individual Reward</Heading>
                  <p className={styles.muted}>
                    Give one player a custom reward — useful when someone only
                    attended part of the quest and doesn't qualify for the
                    full reward package above.
                  </p>
                  {renderRewardSubmissionControls(
                    "manual",
                    "",
                    manualReason,
                    setManualReason,
                    manualDefaultReason,
                  )}
                </section>
              ) : null}

              <section className={`${styles.panel} ${styles.rewardPanel}`}>
                <Heading as="h3">DM Rewards</Heading>
                <div
                  className={`${styles.rewardGrid} ${hasEventCurrency ? styles.rewardGridQuad : styles.rewardGridTriple}`}
                >
                  <div className={styles.rewardCard}>
                    <span className={styles.rewardLabel}>XP</span>
                    <span className={styles.rewardValue}>
                      {formatReward(dmXp)}
                    </span>
                  </div>
                  <div className={styles.rewardCard}>
                    <span className={styles.rewardLabel}>Gold</span>
                    <span className={styles.rewardValue}>
                      {formatReward(dmGold)}
                    </span>
                  </div>
                  <div className={styles.rewardCard}>
                    <span className={styles.rewardLabel}>SC</span>
                    <span className={styles.rewardValue}>
                      {formatReward(dmSc)}
                    </span>
                  </div>
                  {hasEventCurrency ? (
                    <div className={styles.rewardCard}>
                      <span className={styles.rewardLabel}>
                        {eventCurrencyName}
                      </span>
                      <span className={styles.rewardValue}>
                        {formatReward(dmEventCurrencyAmount)}
                      </span>
                    </div>
                  ) : null}
                </div>
                {hasEventCurrency ? (
                  <p className={styles.muted}>
                    {activeEvent?.ruleType === "final_participant_fixed"
                      ? `Event-quest participants receive ${activeEvent.fixedAmount} ${eventCurrencyName} at the final payout.`
                      : `${dmEventCurrencyAmount} ${eventCurrencyName} under the active ${activeEvent?.name} rule.`}
                  </p>
                ) : null}
                <p className={styles.muted}>
                  Effective quest level{" "}
                  <strong>{safeQuestLevel + dmBonusLevel}</strong> for{" "}
                  <strong>{safePlayers}</strong> player
                  {safePlayers === 1 ? "" : "s"}
                  {dmBonusLevel > 0 ? ` (+${dmBonusLevel} bonus)` : ""}.
                </p>
                {user?.canSubmitRewards
                  ? renderRewardSubmissionControls(
                      "dm",
                      "",
                      dmReason,
                      setDmReason,
                      dmDefaultReason,
                    )
                  : null}
              </section>

              <section className={styles.panel}>
                <Heading as="h2">RP Rewards</Heading>
                <div className={styles.inputGrid}>
                  <div className={styles.field}>
                    <label htmlFor="rp-hours">Hours</label>
                    <input
                      id="rp-hours"
                      inputMode="numeric"
                      value={rpHours}
                      onChange={(event) => setRpHours(event.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="rp-minutes">Minutes</label>
                    <input
                      id="rp-minutes"
                      inputMode="numeric"
                      value={rpMinutes}
                      onChange={(event) => setRpMinutes(event.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="rp-level">Character Level</label>
                    <input
                      id="rp-level"
                      inputMode="numeric"
                      value={rpLevel}
                      onChange={(event) => setRpLevel(event.target.value)}
                    />
                  </div>
                </div>
                <div
                  className={`${styles.rewardGrid} ${styles.rewardGridDouble}`}
                >
                  <div className={styles.rewardCard}>
                    <span className={styles.rewardLabel}>XP</span>
                    <span className={styles.rewardValue}>
                      {formatReward(rpXp)}
                    </span>
                  </div>
                  <div className={styles.rewardCard}>
                    <span className={styles.rewardLabel}>Gold</span>
                    <span className={styles.rewardValue}>
                      {formatReward(rpGold)}
                    </span>
                  </div>
                </div>
                {user
                  ? renderRewardSubmissionControls(
                      "rp",
                      user.canSubmitRewards
                        ? "Search and select the single character that should receive the RP reward package."
                        : "Select one of your characters to receive the RP reward package.",
                      rpReason,
                      setRpReason,
                      rpDefaultReason,
                    )
                  : null}
              </section>
            </div>

            <aside className={`${styles.stack} ${styles.sideStack}`}>
              <section className={styles.panel}>
                <Heading as="h3">Level Tiers</Heading>
                <div className={styles.tableWrap}>
                  <table
                    className={`${styles.table} ${styles.compactTable} ${styles.sideTwoColumnTable}`}
                  >
                    <thead>
                      <tr>
                        <th>Tier</th>
                        <th>Range</th>
                      </tr>
                    </thead>
                    <tbody>
                      {TIER_ROWS.map((tier) => (
                        <tr key={tier.name}>
                          <td className={tier.className}>{tier.name}</td>
                          <td>{tier.range}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className={styles.panel}>
                <Heading as="h3">DM Bonus Levels</Heading>
                <div className={styles.tableWrap}>
                  <table
                    className={`${styles.table} ${styles.compactTable} ${styles.sideTwoColumnTable}`}
                  >
                    <thead>
                      <tr>
                        <th>Players</th>
                        <th>Bonus Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>1</td>
                        <td>+0</td>
                      </tr>
                      <tr>
                        <td>2-3</td>
                        <td>+1</td>
                      </tr>
                      <tr>
                        <td>4+</td>
                        <td>+2</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className={styles.sideNote}>
                  Example: a DM running a level 3 quest for 4 players gets
                  rewards as if it were a level 5 quest.
                </p>
              </section>

              <section className={styles.panel}>
                <Heading as="h3">Reward Table</Heading>
                <div className={styles.tableWrap}>
                  <table
                    className={`${styles.table} ${styles.compactTable} ${styles.rewardRateTable}`}
                  >
                    <thead>
                      <tr>
                        <th>Level</th>
                        <th>XP / h</th>
                        <th>Gold / h</th>
                      </tr>
                    </thead>
                    <tbody>
                      {REWARD_TABLE.map((row) => (
                        <tr key={row.level}>
                          <td className={row.tierClassName}>{row.level}</td>
                          <td>{formatReward(row.xpPerHour)}</td>
                          <td>{formatReward(row.goldPerHour)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </Layout>
  );
}
