import type { ReactNode } from "react";
import {
  Award,
  Flame,
  Gem,
  Gift,
  GitBranch,
  PersonStanding,
  Sparkles,
  Swords,
  Users,
} from "lucide-react";

import SectionLanding, { type SectionLinkGroup } from "./_SectionLanding";

const GROUPS: SectionLinkGroup[] = [
  {
    heading: "Progression",
    links: [
      {
        icon: Sparkles,
        title: "Starting Graces",
        description: "Innate boons every new character begins with.",
        hint: "Browse graces",
        to: "/docs/homebrew/starting-graces",
      },
      {
        icon: Gift,
        title: "Boons",
        description: "Powerful rewards earned through play.",
        hint: "Browse boons",
        to: "/docs/homebrew/boons",
      },
      {
        icon: Users,
        title: "Guilds",
        description: "Player factions and the benefits of joining one.",
        hint: "View guilds",
        to: "/docs/homebrew/guilds",
      },
    ],
  },
  {
    heading: "Character Options",
    links: [
      {
        icon: Swords,
        title: "Weapons",
        description: "Custom weapons crafted for the Reaches.",
        hint: "Browse weapons",
        to: "/docs/homebrew/weapons",
      },
      {
        icon: Gem,
        title: "Wondrous Items",
        description: "Unique magic items found across Altharion.",
        hint: "Browse items",
        to: "/docs/homebrew/wondrous-items",
      },
      {
        icon: PersonStanding,
        title: "Species",
        description: "Playable species native to the Reaches.",
        hint: "Browse species",
        to: "/docs/homebrew/species",
      },
      {
        icon: Award,
        title: "Feats",
        description: "Custom feats available to characters.",
        hint: "Browse feats",
        to: "/docs/homebrew/feats",
      },
      {
        icon: GitBranch,
        title: "Subclasses",
        description: "Homebrew subclasses for every class.",
        hint: "Browse subclasses",
        to: "/docs/homebrew/subclasses",
      },
      {
        icon: Flame,
        title: "Spells",
        description: "New spells unique to this setting.",
        hint: "Browse spells",
        to: "/docs/homebrew/spells",
      },
    ],
  },
];

export default function HomebrewPage(): ReactNode {
  return (
    <SectionLanding
      pageTitle="Homebrew"
      title="Homebrew"
      subtitle="Content built for Altharion"
      groups={GROUPS}
    />
  );
}
