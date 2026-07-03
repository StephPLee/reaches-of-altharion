import Link from "@docusaurus/Link";

import { GUILD_LORE } from "@site/src/data/guildLore";
import styles from "./GuildLoreIndex.module.css";

export default function GuildLoreIndex() {
  return (
    <>
      <p className={styles.intro}>
        Guilds in Altharion are more than mechanical affiliations. They are
        institutions, movements, orders, and rival circles of influence that
        shape how adventurers find allies, rivals, patronage, and purpose.
      </p>
      <div className={styles.grid}>
        {GUILD_LORE.map((guild) => (
          <Link
            key={guild.slug}
            to={`/docs/world/guilds/${guild.slug}`}
            className={styles.card}
          >
            <span className={styles.emblemWrap}>
              {guild.emblem ? (
                <img
                  className={styles.emblem}
                  src={guild.emblem.src}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <span className={styles.emblemFallback} aria-hidden="true">
                  {guild.name.slice(0, 1)}
                </span>
              )}
            </span>
            <span className={styles.body}>
              <strong className={styles.title}>{guild.name}</strong>
              <span className={styles.summary}>{guild.summary}</span>
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
