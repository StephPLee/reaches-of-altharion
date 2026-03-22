import styles from "./GuildEmblem.module.css";

type GuildEmblemProps = {
  alt: string;
  className?: string;
  src?: string;
};

export default function GuildEmblem({
  alt,
  className = "",
  src,
}: GuildEmblemProps) {
  return (
    <div
      className={`${styles.emblemFrame} guild-emblem-root ${className}`.trim()}
    >
      {src ? (
        <img className={styles.emblemImage} src={src} alt={alt} />
      ) : (
        <div className={styles.emblemPlaceholder}>Emblem pending</div>
      )}
    </div>
  );
}
