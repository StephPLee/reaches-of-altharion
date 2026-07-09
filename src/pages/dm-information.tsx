import type { ReactNode } from "react";
import { ClipboardList, ScrollText } from "lucide-react";

import SectionLanding, { type SectionLinkGroup } from "./_SectionLanding";

const GROUPS: SectionLinkGroup[] = [
  {
    links: [
      {
        icon: ScrollText,
        title: "DM Rules",
        description: "Core rulings and expectations for running sessions.",
        hint: "Read the rules",
        to: "/docs/dm-rules",
      },
      {
        icon: ClipboardList,
        title: "Homebrew Guidelines",
        description: "How homebrew content gets reviewed and approved.",
        hint: "View guidelines",
        to: "/docs/homebrew-guidelines",
      },
    ],
  },
];

export default function DmInformationPage(): ReactNode {
  return (
    <SectionLanding
      pageTitle="DM Information"
      title="DM Information"
      subtitle="Guidance for running the Reaches"
      groups={GROUPS}
    />
  );
}
