import EditableWikiPage from "@site/src/components/EditableWikiPage";
import { getGuildLoreBySlug, type GuildLoreEntry } from "@site/src/data/guildLore";
import styles from "./GuildLoreProfile.module.css";

function formatImage(image: { src: string; alt: string; caption?: string }) {
  return [
    `![${image.alt}](${image.src})`,
    image.caption ? `*${image.caption}*` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildGuildMarkdown(guild: GuildLoreEntry) {
  const headquartersImage = guild.headquarters.image
    ? formatImage(guild.headquarters.image)
    : "*Headquarters image to be added.*";
  const leaderImage = guild.leader.image
    ? formatImage(guild.leader.image)
    : "*Guild leader image to be added.*";
  const leaderName = guild.leader.title
    ? `${guild.leader.name}, ${guild.leader.title}`
    : guild.leader.name;

  return `## Lore

${guild.lore.join("\n\n")}

## Guild Leader

### ${leaderName}

${guild.leader.description.join("\n\n")}

${leaderImage}

## Headquarters

### ${guild.headquarters.name}

${guild.headquarters.description.join("\n\n")}

${headquartersImage}

---

[View guild mechanics and roster details](/docs/homebrew/guilds)`;
}

export default function GuildLoreProfile({ slug }: { slug: string }) {
  const guild = getGuildLoreBySlug(slug);

  if (!guild) {
    return <p>Guild lore entry not found.</p>;
  }

  return (
    <>
      <header className={styles.hero}>
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
        <div>
          <p className={styles.eyebrow}>Guild Lore</p>
          <h1 className={styles.title}>{guild.name}</h1>
          <p className={styles.summary}>{guild.summary}</p>
        </div>
      </header>
      <EditableWikiPage
        slug={`world-guild-lore-${guild.slug}`}
        title={guild.name}
        fallbackMarkdown={buildGuildMarkdown(guild)}
      />
    </>
  );
}
