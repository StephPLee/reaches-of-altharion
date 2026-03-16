import styles from "./GuildEmblem.module.css";

type GuildEmblemProps = {
  alt: string;
  src?: string;
};

export default function GuildEmblem({ alt, src }: GuildEmblemProps) {
  return (
    <div className={`${styles.emblemFrame} guild-emblem-root`}>
      {src ? (
        <img className={styles.emblemImage} src={src} alt={alt} />
      ) : (
        <div className={styles.emblemPlaceholder}>Emblem pending</div>
      )}
    </div>
  );
}
