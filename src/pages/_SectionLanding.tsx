import type { ReactNode } from "react";
import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import { Sparkles } from "lucide-react";

import styles from "./SectionLanding.module.css";

function Divider() {
  return (
    <div className={styles.divider} aria-hidden="true">
      <span className={styles.dividerLine} />
      <Sparkles size={14} />
      <span className={styles.dividerLine} />
    </div>
  );
}

export type SectionLink = {
  icon: typeof Sparkles;
  title: string;
  description: string;
  hint?: string;
  to: string;
};

export type SectionLinkGroup = {
  heading?: string;
  links: SectionLink[];
};

export default function SectionLanding({
  pageTitle,
  title,
  subtitle,
  groups,
}: {
  pageTitle: string;
  title: string;
  subtitle: string;
  groups: SectionLinkGroup[];
}): ReactNode {
  return (
    <Layout title={pageTitle}>
      <main className={styles.page}>
        <header className={styles.hero}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </header>

        {groups.map((group) => (
          <div key={group.heading ?? "links"}>
            <Divider />
            <section className={styles.linksSection}>
              <h2 className={styles.heroSectionHeading}>
                <span className={styles.sectionMark}>+</span>{" "}
                {group.heading ?? "Explore"}{" "}
                <span className={styles.sectionMark}>+</span>
              </h2>
              <div className={styles.linksGrid}>
                {group.links.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={styles.linkCard}
                  >
                    <div className={styles.linkIcon}>
                      <link.icon size={22} />
                    </div>
                    <div className={styles.linkBody}>
                      <p className={styles.linkTitle}>{link.title}</p>
                      <p className={styles.linkText}>{link.description}</p>
                      <p className={styles.linkHintRow}>
                        {link.hint ? (
                          <span className={styles.linkHint}>
                            {link.hint}
                          </span>
                        ) : null}
                        <span
                          className={styles.linkArrow}
                          aria-hidden="true"
                        >
                          &rarr;
                        </span>
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        ))}

        <div className={styles.closingDivider} aria-hidden="true">
          <span className={styles.closingDividerLine} />
          <Sparkles size={22} />
          <span className={styles.closingDividerLine} />
        </div>
      </main>
    </Layout>
  );
}
