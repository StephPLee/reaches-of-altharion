import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "@docusaurus/Link";
import { useLocation } from "@docusaurus/router";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";
import {
  AnimatePresence,
  LazyMotion,
  domAnimation,
  m,
  useReducedMotion,
} from "motion/react";

import styles from "./index.module.css";

type IslandLandmark = {
  name: string;
  x: number;
  y: number;
  description?: string;
};

type IslandHotspot = {
  id: string;
  label: string;
  hoverSummary: string;
  islandName: string;
  regionType: string;
  description: string;
  landmarks: IslandLandmark[];
  to: string;
  image: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hitWidth: number;
  hitHeight: number;
  labelX?: number;
  labelY?: number;
  mobileLabelX?: number;
  mobileLabelY?: number;
};

const ISLAND_HOTSPOTS: IslandHotspot[] = [
  {
    id: "solcrata",
    label: "Player Information",
    hoverSummary:
      "Character creation, sourcebooks, and transformation guidance for players.",
    islandName: "Solcrata",
    regionType: "Shattered Frontier",
    description:
      "Solcrata is harsh and rugged, prone to seismic instability, it is covered in large ravines where the ground has shifted and been torn apart. Despite this there are people who choose to live in Solcrata, those who are more comfortable in the environment it offers.",
    landmarks: [
      {
        name: "Nemisa",
        x: 60,
        y: 45,
        description:
          "The city of Nemisa was built on the edge of a scorching desert, with its back to some massive mesas and is truly a wonder to behold. The climate these wide open and usually clear skies brought were of great importance, but they were also influential when it came to architectural designs as the vast majority of buildings have been built to weather harsh desert storms and the unearthly chills of desert nights. Yet, strangely enough, Nemisa, and all of Solcrata, does not see the night. A massive magical tarp covers the city, providing cool shade away from the heat. It is held aloft by the dome-like roofs of Nemisa's architecture, and pinned down in a way that looks like it can be easily pulled down or set back up, which anyone would know is due to the semi-frequent sand storms.\n\nLife is great in Nemisa and yet, it hasn't attracted that much attention, remaining mostly private and under the care of the various desert tribes. Nemisa's tribes share a long, ancient history, moving across the desert as it became more and more uninhabitable. This has shaped the methods in which they teach their new generations, and the habits in which they develop. Many focus their worship on gods of the sun specifically, yet many others broaden that to other aspects, worshiping deities of light, fire, warmth, and in the rarest of cases, life and death.\n\nIt's this multitribal identity that has truly left its mark on the few travelers and tourists that come to brave the Sands of Unwavering Sun. Hundreds of bars, bistros and bakeries offer a plethora of culinary choices, and those who feel hungry for something else can enjoy theaters, concerts, ruin tours, or one of the many other recreational venues.",
      },
    ],
    to: "/docs/getting-set-up",
    image: "/img/Solcrata.png",
    x: 32.2,
    y: 31.5,
    width: 46,
    height: 38.5,
    hitWidth: 40,
    hitHeight: 38.5,
    labelX: 47,
    mobileLabelX: 42,
    mobileLabelY: 48,
  },
  {
    id: "verdalis",
    label: "The World of Altharion",
    hoverSummary:
      "Island lore, locations, and setting details across the archipelago.",
    islandName: "Verdalis",
    regionType: "Heartland",
    description:
      "Lush and vibrant, Verdalis is the most populous area. People who arrive through one of the portals will generally find themselves in or around Everholt, the large city to the east edge of the island.",
    landmarks: [
      {
        name: "Everholt",
        x: 71,
        y: 49,
        description:
          "Everholt stands as a magnificent testament to human unity and ingenuity, a grand, walled settlement encircled by walls made by dwarven engineering-a seamless curtain of gleaming, sun-washed stone that soars proudly into the sky, offering a mighty embrace of security to all within, on top of which watchful elven eyes keep their eyes on the horizon. Inside, homes and shops dot the city, where the populace thrums with vibrant, prosperous life: sunlit plazas echo with the cheerful din of bustling markets and skilled crafts, tiers of elegant whitewashed homes and blooming terraces climb upwards, and the air is sweet with the scent of baking bread and flowering vines. From its bustling, well-ordered streets to the luminous spires where scholars and leaders ponder beneath clear skies, Everholt is not just a fortress, but a radiant beacon of civilization, community, and shared ambition.",
      },
    ],
    to: "/?view=world",
    image: "/img/Verdalis.png",
    x: 75.2,
    y: 40.2,
    width: 53.5,
    height: 41.5,
    hitWidth: 30,
    hitHeight: 40,
    mobileLabelX: 50,
    mobileLabelY: 50,
  },
  {
    id: "thaloryn",
    label: "DM Rules",
    hoverSummary:
      "Dungeon Master expectations, processes, and server-specific rulings.",
    islandName: "Thaloryn",
    regionType: "Beacon Isle",
    description:
      "A small forest-covered floating island in the centre of the archipelago. It is home to the Beacon of Altharion, the source of the magic that brought the islands together.",
    landmarks: [
      {
        name: "The Beacon of Altharion",
        x: 56.6,
        y: 46,
        description:
          "Towering over the forest of Thaloryn, the light from the Beacon of Altharion can be seen from all corners of the floating archipelago. It was created aeons ago by a mage as a guide for wayward interplanar travelers, a way for those lost in the space between the planes to right themselves. Within the lighthouse, ancient journals remain, chronicling the mage's own passage through the planes and the moment he arrived at what he believed to be the center-point of all realms. Whether this is true or merely the conviction of a weary traveler is unknown, but it was this belief that shaped the foundation of the Beacon itself.\n\nThe islands surrounding Thaloryn were not originally here. First there was just Thaloryn, followed by the lighthouse, then over time, the islands were pulled closer to the Beacon, forming the floating archipelago now called Altharion. The cause of this migration, whether by coincidence or force, is as yet unknown.\n\nThe mage is now gone and his name is lost to time, but he left in his stead a manifestation of the lighthouse itself. She has no power or control and serves only as a keeper of history and lore, but he wanted visitors to the lighthouse to have something more recognizable as a being to communicate with, so he created her as a face for the lighthouse and Altharion itself. For now she is known only as the Voice of the Beacon.",
      },
    ],
    to: "/docs/dm-rules",
    image: "/img/Thaloryn.png",
    x: 54.6,
    y: 36,
    width: 31,
    height: 30,
    hitWidth: 12,
    hitHeight: 20,
    labelX: 53,
    mobileLabelX: 53,
    mobileLabelY: 52,
  },
  {
    id: "tenebryn",
    label: "RP Rules",
    hoverSummary:
      "Roleplay standards, etiquette, and core community guidelines.",
    islandName: "Tenebryn",
    regionType: "Barren Peaks",
    description:
      "Unlike the other islands, people tend not to live in Tenebryn unless they have a specific reason to do so. It's extremely mountainous and barren, with little to no signs of life.",
    landmarks: [],
    to: "/docs/rp-rules",
    image: "/img/Tenebryn.png",
    x: 40.5,
    y: 62,
    width: 44,
    height: 43,
    hitWidth: 30,
    hitHeight: 40,
    mobileLabelX: 49,
    mobileLabelY: 48,
  },
  {
    id: "iskralith",
    label: "Homebrew",
    hoverSummary:
      "Custom server mechanics including graces, boons, and guild systems.",
    islandName: "Iskralith",
    regionType: "Frozen Reaches",
    description:
      "Like Solcrata, there are people who choose to live on the frozen islands of Iskralith. With its endless snow and ice, it can be unforgiving to those not accustomed to the climate, but for those who thrive in mountains and tundra, Iskralith can make a home safe from outside threats.",
    landmarks: [
      {
        name: "Fjallheim",
        x: 74,
        y: 61,
        description:
          "Fjallheim is a winter city of Iskralith, an ancient, Solshard-ruled city built inside a protected mountain basin.\n\nIt is a political, magical and cultural hub, maintaining an enchantment that governs a perpetual winter over its mountain ranges. The city sees itself as the True Capital of Iskralith due to its long history and strong trade routes. The Solshard Monarchy has a unique tradition of inheritance, which is currently destabilized by an inheritance mystery involving the heir apparent and a foundling child.\n\nThree major forces in the city are nobles, guilds and a strong fey presence. They do have relations with surrounding settlements like Drownlight. However, its geography makes it easily defensible should an external conflict arise; there currently is none. This makes the city a strong central location for adventurers to pursue quests that radiate outward across the frozen land.",
      },
    ],
    to: "/docs/homebrew/starting-graces",
    image: "/img/Iskralith.png",
    x: 66,
    y: 73.5,
    width: 24.5,
    height: 30,
    hitWidth: 18,
    hitHeight: 30,
    mobileLabelX: 50,
    mobileLabelY: 44,
  },
];

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  const location = useLocation();
  const detailScrollRef = useRef<HTMLDivElement | null>(null);
  const detailScrollbarTrackRef = useRef<HTMLDivElement | null>(null);
  const [hasEnteredMapMode, setHasEnteredMapMode] = useState(false);
  const [selectedIslandId, setSelectedIslandId] = useState<string | null>(null);
  const [detailScrollbar, setDetailScrollbar] = useState({
    thumbHeight: 0,
    thumbTop: 0,
    isVisible: false,
  });
  const shouldReduceMotion = useReducedMotion();
  const view = new URLSearchParams(location.search).get("view");
  const showMapMenu = view === "map";
  const showIslandNames = view === "world";
  const isWorldMapMode = hasEnteredMapMode || showMapMenu || showIslandNames;
  const showMapNavigation = hasEnteredMapMode || showMapMenu;
  const selectedIsland =
    ISLAND_HOTSPOTS.find((island) => island.id === selectedIslandId) ?? null;

  useEffect(() => {
    if (!showIslandNames) {
      setSelectedIslandId(null);
    }
  }, [showIslandNames]);

  useEffect(() => {
    const element = detailScrollRef.current;

    if (!element || !selectedIsland) {
      setDetailScrollbar({
        thumbHeight: 0,
        thumbTop: 0,
        isVisible: false,
      });
      return;
    }

    const updateScrollbar = () => {
      const { clientHeight, scrollHeight, scrollTop } = element;
      const trackHeight =
        detailScrollbarTrackRef.current?.clientHeight ?? clientHeight;

      if (scrollHeight <= clientHeight) {
        setDetailScrollbar({
          thumbHeight: 0,
          thumbTop: 0,
          isVisible: false,
        });
        return;
      }

      const thumbHeight = Math.max(
        44,
        (clientHeight / scrollHeight) * trackHeight,
      );
      const maxThumbTop = trackHeight - thumbHeight;
      const maxScrollTop = scrollHeight - clientHeight;
      const thumbTop =
        maxScrollTop > 0 ? (scrollTop / maxScrollTop) * maxThumbTop : 0;

      setDetailScrollbar({
        thumbHeight,
        thumbTop,
        isVisible: true,
      });
    };

    updateScrollbar();
    element.scrollTop = 0;
    updateScrollbar();

    element.addEventListener("scroll", updateScrollbar);
    window.addEventListener("resize", updateScrollbar);

    return () => {
      element.removeEventListener("scroll", updateScrollbar);
      window.removeEventListener("resize", updateScrollbar);
    };
  }, [selectedIsland]);

  const handleIslandFocus = (islandId: string) => {
    if (!showIslandNames) {
      return;
    }

    setSelectedIslandId(islandId);
  };

  const renderIslandDetailCard = (mobile: boolean) => {
    if (!selectedIsland) {
      return null;
    }

    const cardClassName = mobile
      ? `${styles.islandDetailCard} ${styles.islandDetailCardMobile}`
      : `${styles.islandDetailCard} ${styles.islandDetailCardDesktop}`;

    return (
      <m.div
        key={`${selectedIsland.id}-${mobile ? "mobile" : "desktop"}`}
        className={cardClassName}
        initial={
          shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 18, y: -12 }
        }
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={
          shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 10, y: -8 }
        }
        transition={{ duration: shouldReduceMotion ? 0 : 0.24 }}
      >
        <button
          type="button"
          className={styles.islandDetailClose}
          onClick={() => setSelectedIslandId(null)}
          aria-label="Close island lore"
        >
          <span aria-hidden="true">&times;</span>
        </button>
        <div
          className={styles.islandDetailScroll}
          ref={mobile ? undefined : detailScrollRef}
        >
          <div className={styles.islandDetailMeta}>
            <p className={styles.islandDetailEyebrow}>Island Profile</p>
            <Heading as="h2" className={styles.islandDetailTitle}>
              {selectedIsland.islandName}
            </Heading>
            <p className={styles.islandDetailRegion}>
              {selectedIsland.regionType}
            </p>
          </div>
          <div className={styles.islandDetailSection}>
            <p className={styles.islandDetailSectionLabel}>Overview</p>
            <p className={styles.islandDetailText}>
              {selectedIsland.description}
            </p>
          </div>
          {selectedIsland.landmarks.length > 0 ? (
            <>
              <div className={styles.islandDetailSection}>
                <p className={styles.islandDetailSectionLabel}>Landmarks</p>
                <p className={styles.islandDetailText}>
                  {selectedIsland.landmarks
                    .map((landmark) => landmark.name)
                    .join(", ")}
                </p>
              </div>
              {selectedIsland.landmarks
                .filter((landmark) => landmark.description)
                .map((landmark) => (
                  <div
                    key={landmark.name}
                    className={styles.islandDetailSection}
                  >
                    <p className={styles.islandDetailSectionLabel}>
                      {landmark.name}
                    </p>
                    <p className={styles.islandDetailText}>
                      {landmark.description}
                    </p>
                  </div>
                ))}
            </>
          ) : null}
        </div>
        {!mobile && detailScrollbar.isVisible ? (
          <div
            ref={detailScrollbarTrackRef}
            className={styles.islandDetailScrollbar}
            aria-hidden="true"
          >
            <div
              className={styles.islandDetailScrollbarThumb}
              style={{
                height: `${detailScrollbar.thumbHeight}px`,
                transform: `translateY(${detailScrollbar.thumbTop}px)`,
              }}
            />
          </div>
        ) : null}
      </m.div>
    );
  };

  return (
    <LazyMotion features={domAnimation}>
      <header
        className={`${styles.heroBanner} ${isWorldMapMode ? styles.isMapMode : ""} ${showMapNavigation ? styles.isMenuView : ""}`}
      >
        {!showMapMenu && !showIslandNames ? (
          <Link
            to="/?view=map"
            className={styles.cornerLogo}
            aria-label={siteConfig.title}
          >
            <img
              src="/img/altharion_logo_white.png"
              alt=""
              className={styles.cornerLogoImage}
            />
          </Link>
        ) : null}
        <div className={styles.sceneBackdrop} />
        <m.div
          className={styles.heroOverlay}
          animate={{ opacity: isWorldMapMode ? 0.28 : 1 }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.45,
            ease: [0.22, 0.7, 0.2, 1],
          }}
        />

        <div className={styles.worldFrame}>
          <m.div
            className={styles.worldScene}
            animate={{
              scale: selectedIsland
                ? shouldReduceMotion
                  ? 1.04
                  : 1.16
                : isWorldMapMode
                  ? shouldReduceMotion
                    ? 1.08
                    : 1.2
                  : 1,
              y: selectedIsland ? "1%" : isWorldMapMode ? "-2.5%" : "0%",
            }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.55,
              ease: [0.22, 0.7, 0.2, 1],
            }}
          >
            <m.img
              className={styles.mapForeground}
              src="/img/altharion-no-frame.png"
              alt=""
              animate={{ opacity: isWorldMapMode ? 0 : 1 }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.35,
                ease: "easeOut",
              }}
            />

            <AnimatePresence mode="wait">
              {renderIslandDetailCard(false)}
            </AnimatePresence>

            <div className={styles.hotspotLayer}>
              {ISLAND_HOTSPOTS.map((island, index) => {
                const isSelected = selectedIslandId === island.id;
                const isDimmed = Boolean(
                  selectedIslandId && selectedIslandId !== island.id,
                );
                const islandStyle = {
                  left: `${isSelected ? 27 : island.x}%`,
                  top: `${isSelected ? 54 : island.y}%`,
                  width: `${island.width}%`,
                  height: `${island.height}%`,
                } as CSSProperties;

                const hitboxStyle = {
                  width: `${(island.hitWidth / island.width) * 100}%`,
                  height: `${(island.hitHeight / island.height) * 100}%`,
                } as CSSProperties;
                const visibleLabel = showIslandNames
                  ? island.islandName
                  : island.label;
                const islandClassName = `${styles.islandHotspot} ${
                  isDimmed ? styles.islandHotspotDimmed : ""
                } ${isSelected ? styles.islandHotspotSelected : ""}`;
                const labelStyle = {
                  "--label-x": `${island.labelX ?? 50}%`,
                  "--label-y": `${island.labelY ?? 50}%`,
                  "--label-mobile-x": `${island.mobileLabelX ?? island.labelX ?? 50}%`,
                  "--label-mobile-y": `${island.mobileLabelY ?? island.labelY ?? 50}%`,
                } as CSSProperties;

                return (
                  <m.div
                    key={island.id}
                    layout={!shouldReduceMotion}
                    className={islandClassName}
                    style={islandStyle}
                    transition={{
                      layout: {
                        duration: shouldReduceMotion ? 0 : 0.45,
                        ease: [0.22, 0.7, 0.2, 1],
                      },
                    }}
                  >
                    <m.div
                      className={styles.islandHotspotBody}
                      initial={
                        shouldReduceMotion
                          ? false
                          : { opacity: 0, y: 24, scale: 0.95 }
                      }
                      animate={{
                        opacity: isWorldMapMode ? (isDimmed ? 0.12 : 1) : 0,
                        y: isWorldMapMode ? 0 : shouldReduceMotion ? 0 : 24,
                        scale: isSelected ? 1.55 : isDimmed ? 0.8 : 1,
                      }}
                      transition={{
                        duration: shouldReduceMotion ? 0 : 0.28,
                        delay:
                          isWorldMapMode &&
                          !selectedIslandId &&
                          !shouldReduceMotion
                            ? index * 0.045
                            : 0,
                        ease: [0.22, 0.7, 0.2, 1],
                      }}
                    >
                      {showIslandNames ? (
                        <button
                          type="button"
                          className={styles.islandHitboxButton}
                          style={hitboxStyle}
                          aria-label={visibleLabel}
                          onClick={() => handleIslandFocus(island.id)}
                        />
                      ) : (
                        <Link
                          to={island.to}
                          className={styles.islandHitbox}
                          style={hitboxStyle}
                          aria-label={visibleLabel}
                        />
                      )}
                      <img
                        className={styles.islandImage}
                        src={island.image}
                        alt=""
                      />
                      <AnimatePresence>
                        {isSelected
                          ? island.landmarks.map((landmark, landmarkIndex) => (
                              <m.div
                                key={landmark.name}
                                className={styles.landmarkPin}
                                style={{
                                  left: `${landmark.x}%`,
                                  top: `${landmark.y}%`,
                                }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{
                                  duration: shouldReduceMotion ? 0 : 0.18,
                                  delay: shouldReduceMotion
                                    ? 0
                                    : landmarkIndex * 0.05,
                                }}
                              >
                                <span className={styles.landmarkPinDot} />
                                <span className={styles.landmarkPinLabel}>
                                  {landmark.name}
                                </span>
                              </m.div>
                            ))
                          : null}
                      </AnimatePresence>
                      <AnimatePresence mode="wait" initial={false}>
                        {!isSelected ? (
                          <m.span
                            key={visibleLabel}
                            className={styles.islandLabel}
                            style={labelStyle}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{
                              duration: shouldReduceMotion ? 0 : 0.18,
                            }}
                          >
                            {visibleLabel}
                          </m.span>
                        ) : null}
                      </AnimatePresence>
                      {!isSelected ? (
                        <span className={styles.islandHoverCard}>
                          {island.hoverSummary}
                        </span>
                      ) : null}
                    </m.div>
                  </m.div>
                );
              })}
            </div>
          </m.div>
        </div>

        <AnimatePresence mode="wait">
          {renderIslandDetailCard(true)}
        </AnimatePresence>

        {showMapNavigation ? (
          <div className={styles.mobileMapNav} aria-label="Wiki sections">
            {ISLAND_HOTSPOTS.map((island) => (
              <Link
                key={island.id}
                to={island.to}
                className={styles.mobileMapNavLink}
              >
                {island.label}
              </Link>
            ))}
          </div>
        ) : null}

        <m.div
          className={styles.heroContent}
          animate={{
            opacity: isWorldMapMode ? 0 : 1,
            y: isWorldMapMode ? -20 : 0,
          }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.35,
            ease: [0.22, 0.7, 0.2, 1],
          }}
        >
          <Heading as="h1" className={styles.heroTitle}>
            {siteConfig.title}
          </Heading>
          <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
          <button
            type="button"
            className={styles.heroButton}
            onClick={() => setHasEnteredMapMode(true)}
          >
            Enter the Wiki
          </button>
        </m.div>
      </header>
    </LazyMotion>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const location = useLocation();
  const view = new URLSearchParams(location.search).get("view");
  const showMapView = view === "map" || view === "world";
  const layoutStyle = showMapView
    ? `
        .main-wrapper {
          padding-top: 0 !important;
        }
      `
    : `
        nav.navbar,
        .navbar-sidebar,
        .navbar-sidebar__backdrop {
          display: none !important;
        }

        .main-wrapper {
          margin-top: 0 !important;
          padding-top: 0 !important;
        }
      `;

  return (
    <Layout title={siteConfig.title}>
      <style>{layoutStyle}</style>
      <div className={styles.homepage}>
        <HomepageHeader />
      </div>
    </Layout>
  );
}
