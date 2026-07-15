import type { ReactNode } from "react";
import { BookOpen, Clock, Map } from "lucide-react";

import SectionLanding, { type SectionLinkGroup } from "./_SectionLanding";

const GROUPS: SectionLinkGroup[] = [
  {
    heading: "Explore Altharion",
    links: [
      {
        icon: Map,
        title: "World Map",
        description: "Explore the continents, cities, and regions of Altharion.",
        hint: "View the map",
        to: "/?view=world",
      },
      {
        icon: BookOpen,
        title: "World Wiki",
        description: "Browse lore, locations, and factions written by the staff team.",
        hint: "Read the wiki",
        to: "/world-wiki",
      },
      {
        icon: Clock,
        title: "Timeline",
        description: "Trace the ages of the world from its first sunrise to today.",
        hint: "View the timeline",
        to: "/world-timeline",
      },
    ],
  },
];

export default function WorldOfAltharionPage(): ReactNode {
  return (
    <SectionLanding
      pageTitle="The World of Altharion"
      title="The World of Altharion"
      subtitle="Maps, lore, and history for the server"
      groups={GROUPS}
    />
  );
}
