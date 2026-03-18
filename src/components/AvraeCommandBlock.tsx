import styles from "./AvraeCommandBlock.module.css";

type AvraeCommandBlockProps = {
  command: string;
  label?: string;
};

export default function AvraeCommandBlock({
  command,
  label = "Required CC",
}: AvraeCommandBlockProps) {
  return (
    <div className={styles.commandBlock}>
      <span className={styles.label}>{label}</span>
      <pre className={styles.code}>
        <code>{command}</code>
      </pre>
    </div>
  );
}
