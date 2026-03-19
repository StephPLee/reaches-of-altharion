import type { ReactNode } from "react";
import { useState } from "react";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";

import styles from "./rewards-calculator.module.css";

type ConversionRow = {
  level: number;
  goldPerSc: number;
};

type XpConversionRow = {
  level: number;
  xpPerSc: number;
};

type XpThresholdRow = {
  level: number;
  totalXp: number;
};

type XpBreakdownRow = {
  fromLevel: number;
  toLevel: number;
  xpPerSc: number;
  xpNeededAtLevel: number;
  scSpent: number;
  xpSpentAtLevel: number;
  overflowXp: number;
};

const GOLD_CONVERSION_TABLE: ConversionRow[] = [
  { level: 1, goldPerSc: 5 },
  { level: 2, goldPerSc: 10 },
  { level: 3, goldPerSc: 15 },
  { level: 4, goldPerSc: 25 },
  { level: 5, goldPerSc: 50 },
  { level: 6, goldPerSc: 100 },
  { level: 7, goldPerSc: 150 },
  { level: 8, goldPerSc: 200 },
  { level: 9, goldPerSc: 250 },
  { level: 10, goldPerSc: 300 },
  { level: 11, goldPerSc: 350 },
  { level: 12, goldPerSc: 400 },
  { level: 13, goldPerSc: 500 },
  { level: 14, goldPerSc: 700 },
  { level: 15, goldPerSc: 900 },
  { level: 16, goldPerSc: 1100 },
  { level: 17, goldPerSc: 1300 },
  { level: 18, goldPerSc: 1500 },
  { level: 19, goldPerSc: 1700 },
  { level: 20, goldPerSc: 2000 },
];

const GOLD_TABLE_GROUPS = [
  GOLD_CONVERSION_TABLE.filter((row) => row.level >= 1 && row.level <= 7),
  GOLD_CONVERSION_TABLE.filter((row) => row.level >= 8 && row.level <= 14),
  GOLD_CONVERSION_TABLE.filter((row) => row.level >= 15 && row.level <= 20),
] as const;

const XP_CONVERSION_TABLE: XpConversionRow[] = [
  { level: 1, xpPerSc: 30 },
  { level: 2, xpPerSc: 40 },
  { level: 3, xpPerSc: 90 },
  { level: 4, xpPerSc: 120 },
  { level: 5, xpPerSc: 160 },
  { level: 6, xpPerSc: 200 },
  { level: 7, xpPerSc: 240 },
  { level: 8, xpPerSc: 300 },
  { level: 9, xpPerSc: 360 },
  { level: 10, xpPerSc: 400 },
  { level: 11, xpPerSc: 460 },
  { level: 12, xpPerSc: 500 },
  { level: 13, xpPerSc: 560 },
  { level: 14, xpPerSc: 600 },
  { level: 15, xpPerSc: 700 },
  { level: 16, xpPerSc: 800 },
  { level: 17, xpPerSc: 1000 },
  { level: 18, xpPerSc: 1100 },
  { level: 19, xpPerSc: 1200 },
  { level: 20, xpPerSc: 1200 },
];

const XP_THRESHOLDS: XpThresholdRow[] = [
  { level: 1, totalXp: 0 },
  { level: 2, totalXp: 300 },
  { level: 3, totalXp: 900 },
  { level: 4, totalXp: 2700 },
  { level: 5, totalXp: 6500 },
  { level: 6, totalXp: 14000 },
  { level: 7, totalXp: 23000 },
  { level: 8, totalXp: 34000 },
  { level: 9, totalXp: 48000 },
  { level: 10, totalXp: 64000 },
  { level: 11, totalXp: 85000 },
  { level: 12, totalXp: 100000 },
  { level: 13, totalXp: 120000 },
  { level: 14, totalXp: 140000 },
  { level: 15, totalXp: 165000 },
  { level: 16, totalXp: 195000 },
  { level: 17, totalXp: 225000 },
  { level: 18, totalXp: 265000 },
  { level: 19, totalXp: 305000 },
  { level: 20, totalXp: 355000 },
];

const XP_RATE_TABLE_GROUPS = [
  XP_CONVERSION_TABLE.filter((row) => row.level >= 1 && row.level <= 10),
  XP_CONVERSION_TABLE.filter((row) => row.level >= 11 && row.level <= 20),
] as const;

const XP_THRESHOLD_GROUPS = [
  XP_THRESHOLDS.filter((row) => row.level >= 1 && row.level <= 10),
  XP_THRESHOLDS.filter((row) => row.level >= 11 && row.level <= 20),
] as const;

type Tab = "gold" | "xp";

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parseWholeNumber(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function formatValue(value: number) {
  return new Intl.NumberFormat("en-GB").format(value);
}

function splitRows<T>(rows: T[]) {
  const midpoint = Math.ceil(rows.length / 2);

  return [rows.slice(0, midpoint), rows.slice(midpoint)] as const;
}

function getLevelFromXp(totalXp: number) {
  let derivedLevel = 1;

  for (const row of XP_THRESHOLDS) {
    if (totalXp >= row.totalXp) {
      derivedLevel = row.level;
    } else {
      break;
    }
  }

  return derivedLevel;
}

function calculateXpPath(
  startingXp: number,
  targetLevel: number,
): {
  startingLevel: number;
  totalXpNeeded: number;
  totalScRequired: number;
  finalOverflowXp: number;
  breakdown: XpBreakdownRow[];
} {
  const startingLevel = getLevelFromXp(startingXp);

  if (targetLevel <= startingLevel) {
    return {
      startingLevel,
      totalXpNeeded: 0,
      totalScRequired: 0,
      finalOverflowXp: 0,
      breakdown: [],
    };
  }

  const totalXpNeeded = XP_THRESHOLDS[targetLevel - 1].totalXp - startingXp;

  let currentXp = startingXp;
  let simulatedLevel = startingLevel;
  let totalScRequired = 0;
  const breakdown: XpBreakdownRow[] = [];

  while (simulatedLevel < targetLevel) {
    const nextLevelXp = XP_THRESHOLDS[simulatedLevel].totalXp;
    const xpNeededAtLevel = nextLevelXp - currentXp;
    const xpPerSc = XP_CONVERSION_TABLE[simulatedLevel - 1].xpPerSc;
    const scSpent = Math.ceil(xpNeededAtLevel / xpPerSc);
    const xpSpentAtLevel = scSpent * xpPerSc;
    const overflowXp = xpSpentAtLevel - xpNeededAtLevel;

    breakdown.push({
      fromLevel: simulatedLevel,
      toLevel: simulatedLevel + 1,
      xpPerSc,
      xpNeededAtLevel,
      scSpent,
      xpSpentAtLevel,
      overflowXp,
    });

    totalScRequired += scSpent;
    currentXp += xpSpentAtLevel;

    while (
      simulatedLevel < targetLevel &&
      currentXp >= XP_THRESHOLDS[simulatedLevel].totalXp
    ) {
      simulatedLevel += 1;
    }
  }

  return {
    startingLevel,
    totalXpNeeded,
    totalScRequired,
    finalOverflowXp: currentXp - XP_THRESHOLDS[targetLevel - 1].totalXp,
    breakdown,
  };
}

export default function StellarCoinConversionPage(): ReactNode {
  const [activeTab, setActiveTab] = useState<Tab>("gold");
  const [level, setLevel] = useState("6");
  const [stellarCoins, setStellarCoins] = useState("1");
  const [startingXp, setStartingXp] = useState("14000");
  const [targetXpLevel, setTargetXpLevel] = useState("10");

  const safeLevel = clampNumber(parseWholeNumber(level, 1), 1, 20);
  const safeCoins = Math.max(0, parseWholeNumber(stellarCoins, 0));
  const conversionRow = GOLD_CONVERSION_TABLE[safeLevel - 1];
  const totalGold = safeCoins * conversionRow.goldPerSc;
  const safeStartingXp = Math.max(0, parseWholeNumber(startingXp, 0));
  const derivedStartingLevel = getLevelFromXp(safeStartingXp);
  const safeTargetXpLevel = clampNumber(
    parseWholeNumber(targetXpLevel, 1),
    1,
    20,
  );
  const safeAdjustedTargetXpLevel = Math.max(
    derivedStartingLevel,
    safeTargetXpLevel,
  );
  const xpCalculation = calculateXpPath(
    safeStartingXp,
    safeAdjustedTargetXpLevel,
  );
  const [leftBreakdownRows, rightBreakdownRows] = splitRows(
    xpCalculation.breakdown,
  );

  return (
    <Layout
      title="Stellar Coin Conversion"
      description="Convert Stellar Coins into gold or experience rewards."
    >
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.hero}>
            <Heading as="h1">Stellar Coin Conversion</Heading>
            <p>
              Convert Stellar Coins by character level. Gold conversion is live
              now, and the EXP conversion tab is ready for the additional logic.
            </p>
          </section>

          <section className={styles.panel}>
            <div className={styles.tabRow}>
              <button
                type="button"
                className={`${styles.tabButton} ${
                  activeTab === "gold" ? styles.tabButtonActive : ""
                }`}
                onClick={() => setActiveTab("gold")}
              >
                Gold
              </button>
              <button
                type="button"
                className={`${styles.tabButton} ${
                  activeTab === "xp" ? styles.tabButtonActive : ""
                }`}
                onClick={() => setActiveTab("xp")}
              >
                EXP
              </button>
            </div>

            {activeTab === "gold" ? (
              <div className={styles.stack}>
                <section className={styles.panel}>
                  <Heading as="h2">Gold Conversion</Heading>
                  <p className={styles.muted}>
                    Gold scales by character level and is calculated as Stellar
                    Coins multiplied by the gold-per-SC rate for that level.
                  </p>
                  <div className={styles.inputGrid}>
                    <div className={styles.field}>
                      <label htmlFor="sc-level">Character Level</label>
                      <input
                        id="sc-level"
                        inputMode="numeric"
                        value={level}
                        onChange={(event) => setLevel(event.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="sc-amount">Stellar Coins</label>
                      <input
                        id="sc-amount"
                        inputMode="numeric"
                        value={stellarCoins}
                        onChange={(event) =>
                          setStellarCoins(event.target.value)
                        }
                      />
                    </div>
                  </div>
                </section>

                <section className={`${styles.panel} ${styles.rewardPanel}`}>
                  <Heading as="h2">Results</Heading>
                  <div
                    className={`${styles.rewardGrid} ${styles.rewardGridTriple}`}
                  >
                    <div className={styles.rewardCard}>
                      <span className={styles.rewardLabel}>Level</span>
                      <span className={styles.rewardValue}>
                        {formatValue(safeLevel)}
                      </span>
                    </div>
                    <div className={styles.rewardCard}>
                      <span className={styles.rewardLabel}>Gold Per SC</span>
                      <span className={styles.rewardValue}>
                        {formatValue(conversionRow.goldPerSc)}
                      </span>
                    </div>
                    <div className={styles.rewardCard}>
                      <span className={styles.rewardLabel}>Total Gold</span>
                      <span className={styles.rewardValue}>
                        {formatValue(totalGold)}
                      </span>
                    </div>
                  </div>
                  <div className={styles.callout}>
                    <strong>{formatValue(safeCoins)}</strong> Stellar Coin
                    {safeCoins === 1 ? "" : "s"} at level{" "}
                    <strong>{formatValue(safeLevel)}</strong> converts to{" "}
                    <strong>{formatValue(totalGold)}</strong> gold.
                  </div>
                </section>

                <section className={styles.panel}>
                  <Heading as="h2">Gold Conversion Table</Heading>
                  <div className={styles.tableColumnsTriple}>
                    {GOLD_TABLE_GROUPS.map((group, index) => (
                      <div key={index} className={styles.tableWrap}>
                        <table className={styles.table}>
                          <thead>
                            <tr>
                              <th>Level</th>
                              <th>Gold / SC</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.map((row) => (
                              <tr key={row.level}>
                                <td>{row.level}</td>
                                <td>{formatValue(row.goldPerSc)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <div className={styles.stack}>
                <section className={styles.panel}>
                  <Heading as="h2">EXP Conversion</Heading>
                  <p className={styles.muted}>
                    This calculation derives the starting level from the current
                    XP total, then spends Stellar Coins through each level using
                    that level&apos;s XP-per-SC rate.
                  </p>
                  <div className={styles.inputGrid}>
                    <div className={styles.field}>
                      <label htmlFor="xp-starting-xp">Starting XP</label>
                      <input
                        id="xp-starting-xp"
                        inputMode="numeric"
                        value={startingXp}
                        onChange={(event) => setStartingXp(event.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="xp-target-level">Target Level</label>
                      <input
                        id="xp-target-level"
                        inputMode="numeric"
                        value={targetXpLevel}
                        onChange={(event) =>
                          setTargetXpLevel(event.target.value)
                        }
                      />
                    </div>
                  </div>
                </section>

                <section className={`${styles.panel} ${styles.rewardPanel}`}>
                  <Heading as="h2">Results</Heading>
                  <div
                    className={`${styles.rewardGrid} ${styles.rewardGridTriple}`}
                  >
                    <div className={styles.rewardCard}>
                      <span className={styles.rewardLabel}>Starting Level</span>
                      <span className={styles.rewardValue}>
                        {formatValue(xpCalculation.startingLevel)}
                      </span>
                    </div>
                    <div className={styles.rewardCard}>
                      <span className={styles.rewardLabel}>XP Needed</span>
                      <span className={styles.rewardValue}>
                        {formatValue(xpCalculation.totalXpNeeded)}
                      </span>
                    </div>
                    <div className={styles.rewardCard}>
                      <span className={styles.rewardLabel}>SC Required</span>
                      <span className={styles.rewardValue}>
                        {formatValue(xpCalculation.totalScRequired)}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`${styles.rewardGrid} ${styles.rewardGridDouble}`}
                  >
                    <div className={styles.rewardCard}>
                      <span className={styles.rewardLabel}>Overflow XP</span>
                      <span className={styles.rewardValue}>
                        {formatValue(xpCalculation.finalOverflowXp)}
                      </span>
                    </div>
                    <div className={styles.rewardCard}>
                      <span className={styles.rewardLabel}>Target Level</span>
                      <span className={styles.rewardValue}>
                        {formatValue(safeAdjustedTargetXpLevel)}
                      </span>
                    </div>
                  </div>
                  <div className={styles.callout}>
                    {safeAdjustedTargetXpLevel ===
                    xpCalculation.startingLevel ? (
                      <>
                        Target level must be above current level to require SC.
                      </>
                    ) : (
                      <>
                        Reaching level{" "}
                        <strong>
                          {formatValue(safeAdjustedTargetXpLevel)}
                        </strong>{" "}
                        from <strong>{formatValue(safeStartingXp)}</strong> XP
                        at level{" "}
                        <strong>
                          {formatValue(xpCalculation.startingLevel)}
                        </strong>{" "}
                        requires{" "}
                        <strong>
                          {formatValue(xpCalculation.totalScRequired)}
                        </strong>{" "}
                        Stellar Coins and crosses each level at its own EXP
                        rate.
                      </>
                    )}
                  </div>
                </section>

                <section className={styles.panel}>
                  <Heading as="h2">Per-Level Breakdown</Heading>
                  {xpCalculation.breakdown.length > 0 ? (
                    <div className={styles.tableColumns}>
                      {[leftBreakdownRows, rightBreakdownRows].map(
                        (group, index) =>
                          group.length > 0 ? (
                            <div key={index} className={styles.tableWrap}>
                              <table className={styles.table}>
                                <thead>
                                  <tr>
                                    <th>From</th>
                                    <th>To</th>
                                    <th>XP / SC</th>
                                    <th>XP Needed</th>
                                    <th>SC</th>
                                    <th>Overflow</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.map((row) => (
                                    <tr key={row.fromLevel}>
                                      <td>{row.fromLevel}</td>
                                      <td>{row.toLevel}</td>
                                      <td>{formatValue(row.xpPerSc)}</td>
                                      <td>
                                        {formatValue(row.xpNeededAtLevel)}
                                      </td>
                                      <td>{formatValue(row.scSpent)}</td>
                                      <td>{formatValue(row.overflowXp)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : null,
                      )}
                    </div>
                  ) : (
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>From</th>
                            <th>To</th>
                            <th>XP / SC</th>
                            <th>XP Needed</th>
                            <th>SC</th>
                            <th>Overflow</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td colSpan={6}>
                              No level jump required for this selection.
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <div className={styles.twoCol}>
                  <section className={styles.panel}>
                    <Heading as="h2">EXP Per SC Table</Heading>
                    <div className={styles.tableColumns}>
                      {XP_RATE_TABLE_GROUPS.map((group, index) => (
                        <div key={index} className={styles.tableWrap}>
                          <table className={styles.table}>
                            <thead>
                              <tr>
                                <th>Level</th>
                                <th>XP / SC</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.map((row) => (
                                <tr key={row.level}>
                                  <td>{row.level}</td>
                                  <td>{formatValue(row.xpPerSc)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className={styles.panel}>
                    <Heading as="h2">XP Thresholds</Heading>
                    <div className={styles.tableColumns}>
                      {XP_THRESHOLD_GROUPS.map((group, index) => (
                        <div key={index} className={styles.tableWrap}>
                          <table className={styles.table}>
                            <thead>
                              <tr>
                                <th>Level</th>
                                <th>Total XP</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.map((row) => (
                                <tr key={row.level}>
                                  <td>{row.level}</td>
                                  <td>{formatValue(row.totalXp)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </Layout>
  );
}
