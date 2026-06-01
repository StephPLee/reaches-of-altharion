import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import ToolsSidebarFrame from "../components/ToolsSidebarFrame";
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

type WestMarchesStatus = {
  configured: boolean;
  currencyMappings: {
    gold: string | null;
    sc: string | null;
    event: {
      id: string;
      name: string;
    } | null;
  };
};

type RewardTarget = "player" | "dm" | "rp";

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

export default function RewardsCalculatorPage(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const authApiBaseUrl = getAuthApiBaseUrl(siteConfig);

  const [hours, setHours] = useState("4");
  const [minutes, setMinutes] = useState("0");
  const [questLevel, setQuestLevel] = useState("6");
  const [players, setPlayers] = useState("5");
  const [isEventRelated, setIsEventRelated] = useState(false);
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
  const [dmCharacterId, setDmCharacterId] = useState("");
  const [rpCharacterId, setRpCharacterId] = useState("");
  const [dmCharacterQuery, setDmCharacterQuery] = useState("");
  const [rpCharacterQuery, setRpCharacterQuery] = useState("");
  const [playerReason, setPlayerReason] = useState("");
  const [dmReason, setDmReason] = useState("");
  const [rpReason, setRpReason] = useState("");
  const [submittingTarget, setSubmittingTarget] = useState<RewardTarget | null>(
    null,
  );
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [submissionError, setSubmissionError] = useState("");

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

        const [
          charactersResponse,
          currenciesResponse,
          adventuresResponse,
        ] = await Promise.all([
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
  const appliesEventRewardBonus = isEventRelated && !hasEventCurrency;
  const eventRewardMultiplier = appliesEventRewardBonus ? 1.5 : 1;

  const basePlayerXp = questDuration * playerRewardRow.xpPerHour;
  const basePlayerGold = questDuration * playerRewardRow.goldPerHour;
  const basePlayerSc = Math.trunc(safeHours);
  const playerXp = basePlayerXp * eventRewardMultiplier;
  const playerGold = basePlayerGold * eventRewardMultiplier;
  const playerSc = Math.round(basePlayerSc * eventRewardMultiplier);

  const baseDmXp = questDuration * dmRewardRow.xpPerHour;
  const baseDmGold = questDuration * dmRewardRow.goldPerHour;
  const dmScMultiplier = safeQuestLevel < 10 ? 2 : 1;
  const baseDmSc = Math.trunc(safeHours) * 2 * dmScMultiplier;
  const dmXp = baseDmXp * eventRewardMultiplier;
  const dmGold = baseDmGold * eventRewardMultiplier;
  const dmSc = Math.round(baseDmSc * eventRewardMultiplier);
  const playerRf = hasEventCurrency
    ? isEventRelated
      ? playerSc
      : Math.floor(playerSc / 2)
    : 0;
  const dmRf = hasEventCurrency
    ? isEventRelated
      ? dmSc
      : Math.floor(dmSc / 2)
    : 0;


  const rpXp = Math.round((rpDuration * rpRewardRow.xpPerHour) / 3);
  const rpGold = Math.round((rpDuration * rpRewardRow.goldPerHour) / 3);

  const eventReasonText = appliesEventRewardBonus ? ", event quest +50%" : "";
  const dmScReasonText = dmScMultiplier > 1 ? ", below level 10 DM SC x2" : "";
  const playerDefaultReason = `Quest rewards: ${safeHours}h ${safeMinutes}m, level ${safeQuestLevel}, ${safePlayers} player${safePlayers === 1 ? "" : "s"}${eventReasonText}`;
  const dmDefaultReason = `DM rewards: ${safeHours}h ${safeMinutes}m, base level ${safeQuestLevel}, DM bonus +${dmBonusLevel}${dmScReasonText}${eventReasonText}`;
  const rpDefaultReason = `RP rewards: ${safeRpHours}h ${safeRpMinutes}m, level ${safeRpLevel}`;

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

  const filteredDmCharacters = useMemo(
    () => {
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
    },
    [characters, dmCharacterQuery, selectedPlayerAdventure],
  );
  const rpCharacterList = user?.canSubmitRewards ? characters : myCharacters;
  const filteredRpCharacters = useMemo(
    () => filterCharacters(rpCharacterQuery, rpCharacterList),
    [rpCharacterList, rpCharacterQuery],
  );

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
            reason: playerReason.trim() || playerDefaultReason,
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

    const rewards =
      target === "player"
        ? targetConfig.characterIds.map((characterId) => ({
            characterId,
            experience: targetConfig.experience,
            gold: targetConfig.gold,
            sc: targetConfig.sc,
            eventRelated: targetConfig.eventRelated,
            adventureId: targetConfig.adventureId,
            reason: targetConfig.reason,
          }))
        : [
            {
              characterId: targetConfig.characterId,
              experience: targetConfig.experience,
              gold: targetConfig.gold,
              sc: targetConfig.sc,
              reason: targetConfig.reason,
              ...(target === "dm"
                ? { eventRelated: targetConfig.eventRelated }
                : {}),
              ...(target === "dm"
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
          ? `PLAYER rewards submitted for ${targetConfig.characterIds.length} characters.`
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

  function renderRewardSubmissionControls(
    target: RewardTarget,
    description: string,
    reason: string,
    setReason: (value: string) => void,
    defaultReason: string,
  ) {
    const singleCharacterId = target === "dm" ? dmCharacterId : rpCharacterId;
    const setSingleCharacterId =
      target === "dm" ? setDmCharacterId : setRpCharacterId;
    const characterQuery = target === "dm" ? dmCharacterQuery : rpCharacterQuery;
    const setCharacterQuery =
      target === "dm" ? setDmCharacterQuery : setRpCharacterQuery;
    const filteredCharacters =
      target === "dm" ? filteredDmCharacters : filteredRpCharacters;

    function handleAdventureChange(adventureId: string) {
      setPlayerAdventureId(adventureId);
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
        <p className={styles.muted}>{description}</p>
        <div className={styles.submissionGrid}>
          {target === "player" ? (
            <div className={styles.field}>
              <label htmlFor="player-adventure">Adventure</label>
              <select
                id="player-adventure"
                className={styles.select}
                value={playerAdventureId}
                onChange={(event) => handleAdventureChange(event.target.value)}
              >
                <option value="">Choose a recent adventure...</option>
                {adventures.map((adventure) => (
                  <option key={adventure.id} value={adventure.id}>
                    {formatAdventureOption(adventure)}
                  </option>
                ))}
              </select>
              {selectedPlayerAdventure ? (
                <div className={styles.selectionChips}>
                  {selectedPlayerCharacterIds.map((characterId) => (
                    <span key={characterId} className={styles.selectionChip}>
                      {getCharacterLabel(characterId)}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className={styles.field}>
              <label htmlFor={`${target}-character-search`}>Character</label>
              {target === "dm" && selectedPlayerAdventure?.gm?.discordId ? (
                <p className={styles.muted}>
                  Showing characters owned by the selected adventure&apos;s DM.
                </p>
              ) : target === "dm" ? (
                <p className={styles.muted}>
                  Choose a player reward adventure first to filter this list to
                  that adventure&apos;s DM.
                </p>
              ) : null}
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
        <ToolsSidebarFrame sidebarOffset="6.5rem">
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
                        {`${eventCurrencyName} pays ${isEventRelated ? "100%" : "50%"} of SC.`}
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
                <Heading as="h2">Player Rewards</Heading>
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
                      <span className={styles.rewardLabel}>{eventCurrencyName}</span>
                      <span className={styles.rewardValue}>
                        {formatReward(playerRf)}
                      </span>
                    </div>
                  ) : null}
                </div>
                {hasEventCurrency ? (
                  <p className={styles.muted}>
                    {eventCurrencyName} pays {isEventRelated ? "100%" : "50%"} of SC for player rewards.
                  </p>
                ) : null}
                {appliesEventRewardBonus ? (
                  <p className={styles.muted}>
                    Event quest bonus adds 50% to player XP, gold, and SC.
                  </p>
                ) : null}
                {user?.canSubmitRewards
                  ? renderRewardSubmissionControls(
                      "player",
                      "Choose the adventure that received these player rewards. Approved player characters on that adventure will receive the calculated reward package.",
                      playerReason,
                      setPlayerReason,
                      playerDefaultReason,
                    )
                  : null}
              </section>

              <section className={`${styles.panel} ${styles.rewardPanel}`}>
                <Heading as="h2">DM Rewards</Heading>
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
                      <span className={styles.rewardLabel}>{eventCurrencyName}</span>
                      <span className={styles.rewardValue}>
                        {formatReward(dmRf)}
                      </span>
                    </div>
                  ) : null}
                </div>
                {hasEventCurrency ? (
                  <p className={styles.muted}>
                    {eventCurrencyName} pays {isEventRelated ? "100%" : "50%"} of SC for DM rewards.
                  </p>
                ) : null}
                {appliesEventRewardBonus ? (
                  <p className={styles.muted}>
                    Event quest bonus adds 50% to DM XP, gold, and SC.
                  </p>
                ) : null}
                {dmScMultiplier > 1 ? (
                  <p className={styles.muted}>
                    Quests below level 10 grant DMs twice the usual SC.
                  </p>
                ) : null}
                <p className={styles.muted}>
                  DM rewards use an effective quest level of{" "}
                  <strong>{safeQuestLevel + dmBonusLevel}</strong> based on{" "}
                  <strong>{safePlayers}</strong> player
                  {safePlayers === 1 ? "" : "s"}.
                </p>
                <div className={styles.callout}>
                  The DM also picks one of their own characters to reward. That
                  character&apos;s effective quest level increases by{" "}
                  <strong>+{dmBonusLevel}</strong> based on player count.
                </div>
                {user?.canSubmitRewards
                  ? renderRewardSubmissionControls(
                      "dm",
                      "Search and select the single DM character that should receive the DM reward package.",
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
      </ToolsSidebarFrame>
      </main>
    </Layout>
  );
}
