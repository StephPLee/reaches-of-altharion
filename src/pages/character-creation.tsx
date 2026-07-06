import type { ReactNode } from "react";
import Layout from "@theme/Layout";

import CharacterCreationHero from "./CharacterCreationHero";
import styles from "./character-creation.module.css";

export default function CharacterCreationPage(): ReactNode {
  return (
    <Layout
      title="Character Creation"
      description="Everything you need to know to create a character in the Reaches of Altharion."
    >
      <div className={styles.page}>
        <CharacterCreationHero />
      </div>
    </Layout>
  );
}
