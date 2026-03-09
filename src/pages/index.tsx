import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";

import styles from "./index.module.css";

type IslandHotspot = {
  id: string;
  label: string;
  to: string;
  image: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hitWidth: number;
  hitHeight: number;
};

const ISLAND_HOTSPOTS: IslandHotspot[] = [
  {
    id: "solcrata",
    label: "Character Creation",
    to: "/docs/getting-set-up",
    image: "/img/Solcrata.png",
    x: 32.2,
    y: 31.5,
    width: 46,
    height: 38.5,
    hitWidth: 40,
    hitHeight: 38.5,
  },
  {
    id: "verdalis",
    label: "Server Lore",
    to: "/docs/tutorial-extras/manage-docs-versions",
    image: "/img/Verdalis.png",
    x: 75.2,
    y: 40.2,
    width: 53.5,
    height: 41.5,
    hitWidth: 30,
    hitHeight: 40,
  },
  {
    id: "thaloryn",
    label: "DM Rules",
    to: "/docs/tutorial-basics/create-a-document",
    image: "/img/Thaloryn.png",
    x: 54.6,
    y: 36,
    width: 31,
    height: 30,
    hitWidth: 12,
    hitHeight: 20,
  },
  {
    id: "tenebryn",
    label: "RP Rules",
    to: "/docs/tutorial-basics/markdown-features",
    image: "/img/Tenebryn.png",
    x: 40.5,
    y: 62,
    width: 44,
    height: 43,
    hitWidth: 30,
    hitHeight: 40,
  },
  {
    id: "iskralith",
    label: "World Map",
    to: "/docs/tutorial-basics/create-a-page",
    image: "/img/Iskralith.png",
    x: 66,
    y: 73.5,
    width: 24.5,
    height: 30,
    hitWidth: 18,
    hitHeight: 30,
  },
];

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  const [isMapMode, setIsMapMode] = useState(false);

  return (
    <header
      className={`${styles.heroBanner} ${isMapMode ? styles.isMapMode : ""}`}
    >
      <Link to="/" className={styles.cornerLogo} aria-label={siteConfig.title}>
        <img src="/img/logo.svg" alt="" className={styles.cornerLogoImage} />
      </Link>
      <div className={styles.sceneBackdrop} />
      <div className={styles.heroOverlay} />

      <div className={styles.worldFrame}>
        <div className={styles.worldScene}>
          <img
            className={`${styles.mapForeground} ${isMapMode ? styles.mapForegroundHidden : ""}`}
            src="/img/altharion-no-frame.png"
            alt=""
          />

          <div className={styles.hotspotLayer}>
            {ISLAND_HOTSPOTS.map((island, index) => {
              const islandStyle = {
                left: `${island.x}%`,
                top: `${island.y}%`,
                width: `${island.width}%`,
                height: `${island.height}%`,
                animationDelay: `${index * 90}ms`,
              } as CSSProperties;

              const hitboxStyle = {
                width: `${(island.hitWidth / island.width) * 100}%`,
                height: `${(island.hitHeight / island.height) * 100}%`,
              } as CSSProperties;

              return (
                <div
                  key={island.id}
                  className={styles.islandHotspot}
                  style={islandStyle}
                >
                  <Link
                    to={island.to}
                    className={styles.islandHitbox}
                    style={hitboxStyle}
                    aria-label={island.label}
                  />
                  <img
                    className={styles.islandImage}
                    src={island.image}
                    alt=""
                  />
                  <span className={styles.islandLabel}>{island.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.heroContent}>
        <Heading as="h1" className={styles.heroTitle}>
          {siteConfig.title}
        </Heading>
        <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
        <button
          type="button"
          className={styles.heroButton}
          onClick={() => setIsMapMode(true)}
        >
          Enter the Wiki
        </button>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout title={siteConfig.title}>
      <style>{`
        nav.navbar,
        .navbar-sidebar,
        .navbar-sidebar__backdrop {
          display: none !important;
        }

        .main-wrapper {
          margin-top: 0 !important;
          padding-top: 0 !important;
        }
      `}</style>
      <div className={styles.homepage}>
        <HomepageHeader />
      </div>
    </Layout>
  );
}

