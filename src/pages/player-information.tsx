import type { ReactNode } from "react";
import {
  BookOpen,
  ChartSpline,
  Feather,
  MessageCircleQuestion,
  ShieldAlert,
  WandSparkles,
} from "lucide-react";

import SectionLanding, { type SectionLinkGroup } from "./_SectionLanding";

const GROUPS: SectionLinkGroup[] = [
  {
    heading: "Getting Started",
    links: [
      {
        icon: Feather,
        title: "Character Creation",
        description: "Step-by-step guidance for building your first hero.",
        hint: "Begin here",
        to: "/character-creation",
      },
      {
        icon: MessageCircleQuestion,
        title: "FAQ",
        description: "Answers to the most common player questions.",
        hint: "Browse questions",
        to: "/docs/faq",
      },
      {
        icon: ChartSpline,
        title: "Server Stats",
        description: "Live character and server statistics.",
        hint: "View statistics",
        to: "/character-attributes",
      },
    ],
  },
  {
    heading: "Rules & Reference",
    links: [
      {
        icon: BookOpen,
        title: "Sourcebooks",
        description:
          "Approved books and content sources for character options.",
        hint: "Browse sources",
        to: "/docs/sourcebooks",
      },
      {
        icon: ShieldAlert,
        title: "Banned Content",
        description:
          "Options and materials that are not permitted on the server.",
        hint: "Read the rules",
        to: "/docs/banned-content",
      },
      {
        icon: WandSparkles,
        title: "Transformations",
        description:
          "Rules for polymorph, wild shape, and other shapechanging effects.",
        hint: "View the rules",
        to: "/docs/transformations",
      },
    ],
  },
];

export default function PlayerInformationPage(): ReactNode {
  return (
    <SectionLanding
      pageTitle="Player Information"
      title="Player Information"
      subtitle="Everything you need to play"
      groups={GROUPS}
    />
  );
}
