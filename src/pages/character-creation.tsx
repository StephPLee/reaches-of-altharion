import type { ReactNode } from "react";
import Layout from "@theme/Layout";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import CharacterCreationHero from "./CharacterCreationHero";
import styles from "./character-creation.module.css";

export default function CharacterCreationPage(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const discordInviteUrl =
    typeof siteConfig.customFields?.discordInviteUrl === "string"
      ? siteConfig.customFields.discordInviteUrl
      : "#";

  return (
    <Layout
      title="Character Creation"
      description="Everything you need to know to create a character in the Reaches of Altharion."
    >
      <div className={styles.page}>
        <CharacterCreationHero discordInviteUrl={discordInviteUrl} />
      </div>
    </Layout>
  );
}
