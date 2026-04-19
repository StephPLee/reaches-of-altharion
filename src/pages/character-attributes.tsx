import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import type { ChartData, ChartOptions } from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

import styles from "./character-attributes.module.css";

type AttributeStatOption = {
  value: string;
  count: number;
  percentage: number;
};

type AttributeStat = {
  attributeName: string;
  totalSelections: number;
  options: AttributeStatOption[];
};

type CharacterLevelStat = {
  level: number;
  count: number;
  percentage: number;
};

type WestMarchesAttributeStats = {
  totalCharacters: number;
  levels?: CharacterLevelStat[];
  attributes: AttributeStat[];
};

const CHART_PALETTE = [
  "#244a73",
  "#14a3a3",
  "#cf1f73",
  "#f5514f",
  "#ffad31",
  "#bd0fe1",
  "#7210b5",
  "#3d8de3",
  "#2f38c8",
  "#1a0f9d",
  "#1e426b",
  "#0faeb0",
];

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
);

function getAuthApiBaseUrl(siteConfig): string {
  const configuredBaseUrl = siteConfig.customFields?.authApiBaseUrl;
  return typeof configuredBaseUrl === "string"
    ? configuredBaseUrl.replace(/\/$/, "")
    : "";
}

function formatAttributeName(attributeName: string) {
  return attributeName.replace(/\s*\(if applicable\)\s*/i, "");
}

function renderAttributeChart(attribute: AttributeStat) {
  const segments = [...attribute.options]
    .sort((left, right) => right.count - left.count)
    .map((option, index) => ({
      ...option,
      color: CHART_PALETTE[index % CHART_PALETTE.length],
    }));
  const displayName = formatAttributeName(attribute.attributeName);
  const useBarChart =
    segments.length > 8 ||
    segments.some((segment) => segment.value.length > 18) ||
    displayName === "Species";
  const chartData: ChartData<"doughnut" | "bar", number[], string> = {
    labels: segments.map((segment) => segment.value),
    datasets: [
      {
        data: segments.map((segment) => segment.count),
        backgroundColor: segments.map((segment) => segment.color),
        borderColor: "rgba(13, 15, 29, 0.9)",
        borderWidth: useBarChart ? 1 : 2,
        borderRadius: useBarChart ? 8 : 0,
        hoverOffset: useBarChart ? 0 : 4,
      },
    ],
  };
  const sharedTooltip = {
    callbacks: {
      label(tooltipItem) {
        const value = Number(tooltipItem.raw || 0);
        const percentage = attribute.totalSelections
          ? ((value / attribute.totalSelections) * 100).toFixed(1)
          : "0.0";
        return `${value} selections (${percentage}%)`;
      },
    },
  };
  const doughnutOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "42%",
    plugins: {
      legend: {
        display: false,
      },
      tooltip: sharedTooltip,
    },
  };
  const barOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",
    plugins: {
      legend: {
        display: false,
      },
      tooltip: sharedTooltip,
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          color: "#d7ddef",
          precision: 0,
        },
        grid: {
          color: "rgba(190, 176, 138, 0.12)",
        },
        border: {
          color: "rgba(190, 176, 138, 0.12)",
        },
      },
      y: {
        ticks: {
          color: "#ece2ff",
        },
        grid: {
          display: false,
        },
        border: {
          color: "rgba(190, 176, 138, 0.12)",
        },
      },
    },
  };

  return (
    <article key={attribute.attributeName} className={styles.attributeCard}>
      <div className={styles.attributeHeader}>
        <h2 className={styles.attributeCardTitle}>{displayName}</h2>
      </div>
      <div className={styles.attributeChartWrap}>
        {useBarChart ? (
          <div
            className={styles.attributeBarChart}
            style={{
              height: `${Math.max(22, Math.min(34, 5 + segments.length * 1.85))}rem`,
            }}
          >
            <Bar
              data={chartData as ChartData<"bar", number[], string>}
              options={barOptions}
              aria-label={`${displayName} distribution bar chart`}
            />
          </div>
        ) : (
          <div className={styles.attributeDoughnutShell}>
            <div className={styles.attributeDoughnutChart}>
              <Doughnut
                data={chartData as ChartData<"doughnut", number[], string>}
                options={doughnutOptions}
                aria-label={`${displayName} distribution doughnut chart`}
              />
            </div>
            <div className={styles.attributeChartCenter}>
              <div className={styles.attributeChartTitle}>{displayName}</div>
            </div>
          </div>
        )}
      </div>
      <div className={styles.attributeLegend}>
        {segments.map((segment) => (
          <div
            key={`${attribute.attributeName}-${segment.value}`}
            className={styles.attributeLegendRow}
          >
            <span className={styles.attributeLegendLabel}>
              <span
                className={styles.attributeLegendSwatch}
                style={{ backgroundColor: segment.color }}
              />
              {segment.value}
            </span>
            <span className={styles.attributeLegendValue}>
              {segment.count} ({segment.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

function renderLevelChart(levels: CharacterLevelStat[]) {
  const chartData: ChartData<"bar", number[], string> = {
    labels: levels.map((level) => `lvl ${level.level}`),
    datasets: [
      {
        data: levels.map((level) => level.count),
        backgroundColor: "rgba(190, 176, 138, 0.82)",
        borderColor: "rgba(233, 221, 186, 0.58)",
        borderWidth: 1,
        borderRadius: 3,
        maxBarThickness: 42,
      },
    ],
  };
  const chartOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label(tooltipItem) {
            const value = Number(tooltipItem.raw || 0);
            const level = levels[tooltipItem.dataIndex];
            return `${value} character${value === 1 ? "" : "s"} (${level?.percentage ?? 0}%)`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "character level",
          color: "#f0e8fb",
          font: {
            size: 18,
            weight: "bold",
            family: '"Cormorant Garamond", "Garamond", "Times New Roman", serif',
          },
        },
        ticks: {
          color: "#ece2ff",
          maxRotation: 0,
          autoSkip: false,
        },
        grid: {
          display: false,
        },
        border: {
          color: "rgba(233, 221, 186, 0.48)",
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Number of Characters",
          color: "#f0e8fb",
          font: {
            size: 14,
            weight: "bold",
          },
        },
        ticks: {
          color: "#d7ddef",
          precision: 0,
        },
        grid: {
          color: "rgba(190, 176, 138, 0.14)",
        },
        border: {
          color: "rgba(233, 221, 186, 0.48)",
        },
      },
    },
  };

  return (
    <article className={styles.levelChartPanel}>
      <h2 className={styles.levelChartTitle}>Character Levels</h2>
      <div className={styles.levelChartWrap}>
        <Bar
          data={chartData}
          options={chartOptions}
          aria-label="Character level distribution bar chart"
        />
      </div>
    </article>
  );
}

export default function CharacterAttributesPage(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const authApiBaseUrl = getAuthApiBaseUrl(siteConfig);

  const [attributeStats, setAttributeStats] =
    useState<WestMarchesAttributeStats | null>(null);
  const [isAttributeStatsLoading, setIsAttributeStatsLoading] = useState(false);
  const [attributeStatsError, setAttributeStatsError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAttributeStats() {
      try {
        setIsAttributeStatsLoading(true);
        setAttributeStatsError("");

        const response = await fetch(
          `${authApiBaseUrl}/api/rewards/westmarches/attribute-stats`,
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            payload.error || "Failed to load character attribute statistics.",
          );
        }

        if (!cancelled) {
          setAttributeStats(
            payload && typeof payload === "object"
              ? (payload as WestMarchesAttributeStats)
              : null,
          );
        }
      } catch (statsError) {
        if (!cancelled) {
          setAttributeStats(null);
          setAttributeStatsError(
            statsError instanceof Error
              ? statsError.message
              : "Failed to load character attribute statistics.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsAttributeStatsLoading(false);
        }
      }
    }

    loadAttributeStats();
    return () => {
      cancelled = true;
    };
  }, [authApiBaseUrl]);

  return (
    <Layout
      title="Server Stats"
      description="Server-wide West Marches character attribute statistics"
    >
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.hero}>
            <Heading as="h1">Server Stats</Heading>
            <p>
              Server stats so we can track balance. Data comes from the
              westmarches.games API.
            </p>
          </section>

          <section className={styles.panel}>
            {isAttributeStatsLoading ? (
              <p className={styles.statusText}>
                Loading character attribute statistics...
              </p>
            ) : null}
            {attributeStatsError ? (
              <p className={styles.errorText}>{attributeStatsError}</p>
            ) : null}
            {attributeStats ? (
              <>
                {attributeStats.levels?.length
                  ? renderLevelChart(attributeStats.levels)
                  : null}
                <p className={styles.attributeSummary}>
                  Active characters counted:{" "}
                  <strong>{attributeStats.totalCharacters}</strong>
                </p>
                <div className={styles.attributeGrid}>
                  {attributeStats.attributes.map(renderAttributeChart)}
                </div>
              </>
            ) : null}
          </section>
        </div>
      </main>
    </Layout>
  );
}
