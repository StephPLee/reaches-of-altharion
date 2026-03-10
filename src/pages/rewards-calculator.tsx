import type { ReactNode } from "react";
import { useState } from "react";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";

import styles from "./rewards-calculator.module.css";

type RewardRow = {
  level: number;
  xpPerHour: number;
  goldPerHour: number;
  tier: string;
  tierClassName: string;
  range: string;
};

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

const EARLY_REWARD_ROWS = REWARD_TABLE.filter(
  (row) => row.level >= 1 && row.level <= 10,
);
const LATE_REWARD_ROWS = REWARD_TABLE.filter(
  (row) => row.level >= 11 && row.level <= 20,
);

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
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(2));
  return new Intl.NumberFormat("en-GB").format(rounded);
}

function parseWholeNumber(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export default function RewardsCalculatorPage(): ReactNode {
  const [hours, setHours] = useState("4");
  const [minutes, setMinutes] = useState("0");
  const [questLevel, setQuestLevel] = useState("6");
  const [players, setPlayers] = useState("5");
  const [rpHours, setRpHours] = useState("0");
  const [rpMinutes, setRpMinutes] = useState("10");
  const [rpLevel, setRpLevel] = useState("4");

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

  const playerXp = questDuration * playerRewardRow.xpPerHour;
  const playerGold = questDuration * playerRewardRow.goldPerHour;
  const playerSc = Math.trunc(safeHours);

  const dmXp = questDuration * dmRewardRow.xpPerHour;
  const dmGold = questDuration * dmRewardRow.goldPerHour;
  const dmSc = Math.trunc(safeHours) * 2;

  const rpXp = Math.round((rpDuration * rpRewardRow.xpPerHour) / 3);
  const rpGold = Math.round((rpDuration * rpRewardRow.goldPerHour) / 3);

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
              Calculate player, DM, and RP rewards directly on the site using
              the same reward table and formulas as the existing spreadsheet.
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
              </section>

              <div className={styles.twoCol}>
                <section className={`${styles.panel} ${styles.rewardPanel}`}>
                  <Heading as="h2">Player Rewards</Heading>
                  <div className={styles.rewardGrid}>
                    <div className={styles.rewardCard}>
                      <span className={styles.rewardLabel}>Reward XP</span>
                      <span className={styles.rewardValue}>
                        {formatReward(playerXp)}
                      </span>
                    </div>
                    <div className={styles.rewardCard}>
                      <span className={styles.rewardLabel}>Reward Gold</span>
                      <span className={styles.rewardValue}>
                        {formatReward(playerGold)}
                      </span>
                    </div>
                    <div className={styles.rewardCard}>
                      <span className={styles.rewardLabel}>Reward SC</span>
                      <span className={styles.rewardValue}>
                        {formatReward(playerSc)}
                      </span>
                    </div>
                  </div>
                </section>

                <section className={`${styles.panel} ${styles.rewardPanel}`}>
                  <Heading as="h2">DM Rewards</Heading>
                  <div className={styles.rewardGrid}>
                    <div className={styles.rewardCard}>
                      <span className={styles.rewardLabel}>Reward XP</span>
                      <span className={styles.rewardValue}>
                        {formatReward(dmXp)}
                      </span>
                    </div>
                    <div className={styles.rewardCard}>
                      <span className={styles.rewardLabel}>Reward Gold</span>
                      <span className={styles.rewardValue}>
                        {formatReward(dmGold)}
                      </span>
                    </div>
                    <div className={styles.rewardCard}>
                      <span className={styles.rewardLabel}>Reward SC</span>
                      <span className={styles.rewardValue}>
                        {formatReward(dmSc)}
                      </span>
                    </div>
                  </div>
                  <p className={styles.muted}>
                    DM rewards use an effective quest level of{" "}
                    <strong>{safeQuestLevel + dmBonusLevel}</strong> based on{" "}
                    <strong>{safePlayers}</strong> player
                    {safePlayers === 1 ? "" : "s"}.
                  </p>
                  <div className={styles.callout}>
                    The DM also picks one of their own characters to reward.
                    That character&apos;s effective quest level increases by{" "}
                    <strong>+{dmBonusLevel}</strong> based on player count.
                  </div>
                </section>
              </div>

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
                <div className={styles.rewardGrid}>
                  <div className={styles.rewardCard}>
                    <span className={styles.rewardLabel}>Reward XP</span>
                    <span className={styles.rewardValue}>
                      {formatReward(rpXp)}
                    </span>
                  </div>
                  <div className={styles.rewardCard}>
                    <span className={styles.rewardLabel}>Reward Gold</span>
                    <span className={styles.rewardValue}>
                      {formatReward(rpGold)}
                    </span>
                  </div>
                </div>
              </section>
            </div>

            <aside className={`${styles.stack} ${styles.sideStack}`}>
              <section className={styles.panel}>
                <Heading as="h3">Level Tiers</Heading>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
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

              <section className={`${styles.panel} ${styles.growPanel}`}>
                <Heading as="h3">DM Bonus Levels</Heading>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
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
            </aside>
          </div>

          <section className={`${styles.panel} ${styles.rewardTablePanel}`}>
            <Heading as="h2">Reward Table</Heading>
            <div className={styles.tableColumns}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Level</th>
                      <th>XP / Hour</th>
                      <th>Gold / Hour</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EARLY_REWARD_ROWS.map((row) => (
                      <tr key={row.level}>
                        <td className={row.tierClassName}>{row.level}</td>
                        <td>{formatReward(row.xpPerHour)}</td>
                        <td>{formatReward(row.goldPerHour)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Level</th>
                      <th>XP / Hour</th>
                      <th>Gold / Hour</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LATE_REWARD_ROWS.map((row) => (
                      <tr key={row.level}>
                        <td className={row.tierClassName}>{row.level}</td>
                        <td>{formatReward(row.xpPerHour)}</td>
                        <td>{formatReward(row.goldPerHour)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </main>
    </Layout>
  );
}
