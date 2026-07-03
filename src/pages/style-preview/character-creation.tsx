import type { ReactNode } from "react";
import Layout from "@theme/Layout";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import CharacterCreationHero from "./CharacterCreationHero";
import styles from "./character-creation.module.css";

export default function CharacterCreationStylePreview(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const discordInviteUrl =
    typeof siteConfig.customFields?.discordInviteUrl === "string"
      ? siteConfig.customFields.discordInviteUrl
      : "#";

  return (
    <Layout
      title="Style Preview: Character Creation"
      description="Layout and iconography mockup for a Character Creation page redesign."
    >
      <div className={styles.page}>
        <CharacterCreationHero discordInviteUrl={discordInviteUrl} />
      </div>
    </Layout>
  );
}
