import type { ReactNode } from "react";
import { Bot, Calculator, Coins, Dices } from "lucide-react";

import SectionLanding, { type SectionLinkGroup } from "./_SectionLanding";

const GROUPS: SectionLinkGroup[] = [
  {
    heading: "Discord Tools",
    links: [
      {
        icon: Bot,
        title: "Avrae Commands",
        description:
          "Import characters and creatures to build Avrae commands.",
        hint: "Build commands",
        to: "/avrae",
      },
    ],
  },
  {
    heading: "Calculators & Rolls",
    links: [
      {
        icon: Calculator,
        title: "Rewards Calculator",
        description: "Calculate player, DM, and RP rewards.",
        hint: "Check rewards",
        to: "/rewards-calculator",
      },
      {
        icon: Coins,
        title: "Stellar Coin Conversion",
        description: "Convert gold to Stellar Coins and back.",
        hint: "Convert currency",
        to: "/stellar-coin-conversion",
      },
      {
        icon: Dices,
        title: "Stat Rolls",
        description: "View available stat rolls and claim them.",
        hint: "View available rolls",
        to: "/stat-rolls",
      },
    ],
  },
];

export default function ToolsPage(): ReactNode {
  return (
    <SectionLanding
      pageTitle="Tools"
      title="Tools"
      subtitle="Utilities built for West Marches play"
      groups={GROUPS}
    />
  );
}
