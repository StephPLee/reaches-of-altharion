import type { ReactNode } from "react";
import Link from "@docusaurus/Link";
import {
  BookOpen,
  Compass,
  Feather,
  Layers,
  Sparkles,
  TrendingUp,
  UserRound,
} from "lucide-react";

import styles from "./character-creation.module.css";

function Divider() {
  return (
    <div className={styles.divider} aria-hidden="true">
      <span className={styles.dividerLine} />
      <Sparkles size={14} />
      <span className={styles.dividerLine} />
    </div>
  );
}

type Step = {
  icon: typeof Feather;
  title: string;
  detail: string;
  to?: string;
  linkLabel?: string;
};

const STEPS: Step[] = [
  {
    icon: Feather,
    title: "1. Read the Rules",
    detail:
      "Familiarize yourself with the 2024 Player's Handbook rules and our server guidelines.",
  },
  {
    icon: Compass,
    title: "2. Join the Server",
    detail:
      "Log into WestMarches.games with your Discord account to manage your character and join sessions.",
  },
  {
    icon: UserRound,
    title: "3. Create Your Hero",
    detail:
      "Build your character using approved methods and bring your story to life.",
    to: "/character-creation-guide",
    linkLabel: "View the Guide",
  },
];

const BASICS = [
  {
    icon: TrendingUp,
    title: "Leveling",
    detail: "Start at level 4. XP is tracked automatically.",
  },
  {
    icon: Layers,
    title: "Multiclassing",
    detail: "Allowed. You may multiclass twice (up to 3 total classes).",
  },
  {
    icon: Sparkles,
    title: "Milestones",
    detail: "Reach milestone levels: 5th, 9th, 13th, and 17th for extra slots.",
  },
  {
    icon: BookOpen,
    title: "Content",
    detail:
      "Use 2024 PHB content; 2014 content without a reprint is also allowed.",
  },
];

const SERVER_JOIN_URL =
  "https://www.westmarches.games/communities/reaches-of-altharion";

export default function CharacterCreationHero(): ReactNode {
  return (
    <>
      <header className={styles.hero}>
        <h1 className={styles.title}>Character Creation</h1>
        <p className={styles.subtitle}>Your legend begins here</p>
      </header>

      <Divider />

      <section className={styles.introSection}>
        <h2 className={styles.heroSectionHeading}>
          <span className={styles.sectionMark}>+</span> I. The First Spark{" "}
          <span className={styles.sectionMark}>+</span>
        </h2>
        <p className={styles.introText}>
          Creating a character is the first step in your journey across the
          Reaches of Altharion. This guide will walk you through everything you
          need to know to craft a hero worthy of legend.
        </p>
      </section>

      <Divider />

      <section className={styles.stepsSection}>
        <h2 className={styles.heroSectionHeading}>
          <span className={styles.sectionMark}>+</span> II. Getting Started{" "}
          <span className={styles.sectionMark}>+</span>
        </h2>
        <div className={styles.stepsRow}>
          {STEPS.map((step) => (
            <div key={step.title} className={styles.step}>
              <div className={styles.stepIcon}>
                <step.icon size={22} />
              </div>
              <p className={styles.stepTitle}>{step.title}</p>
              <p className={styles.stepText}>{step.detail}</p>
              {step.to ? (
                <Link className={styles.stepLink} to={step.to}>
                  {step.linkLabel} &rarr;
                </Link>
              ) : null}
            </div>
          ))}
        </div>
        <a
          className={styles.discordLink}
          href={SERVER_JOIN_URL}
          target="_blank"
          rel="noreferrer"
        >
          Join our Server &rarr;
        </a>
      </section>

      <Divider />

      <section className={styles.basicsSection}>
        <h2 className={styles.heroSectionHeading}>
          <span className={styles.sectionMark}>+</span> III. Character Basics{" "}
          <span className={styles.sectionMark}>+</span>
        </h2>
        <div className={styles.basicsRow}>
          {BASICS.map((item) => (
            <div key={item.title} className={styles.basicTile}>
              <div className={styles.basicIcon}>
                <item.icon size={18} />
              </div>
              <div>
                <p className={styles.basicTitle}>{item.title}</p>
                <p className={styles.basicText}>{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.closingDivider} aria-hidden="true">
        <span className={styles.closingDividerLine} />
        <Sparkles size={22} />
        <span className={styles.closingDividerLine} />
      </div>
    </>
  );
}
