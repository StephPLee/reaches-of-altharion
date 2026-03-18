import styles from "./AvraeAliasBlock.module.css";

type AvraeAliasBlockProps = {
  code: string;
  title?: string;
  subtitle?: string;
  defaultOpen?: boolean;
  downloadName?: string;
};

function countLines(code: string) {
  return code.split(/\r?\n/).length;
}

function formatSize(code: string) {
  const bytes = new TextEncoder().encode(code).length;

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;
  return `${kilobytes.toFixed(kilobytes >= 10 ? 0 : 1)} KB`;
}

export default function AvraeAliasBlock({
  code,
  title = "avrae-alias.txt",
  subtitle,
  defaultOpen = false,
  downloadName,
}: AvraeAliasBlockProps) {
  const fallbackSubtitle = `${countLines(code)} lines - ${formatSize(code)}`;
  const summaryText = subtitle ?? fallbackSubtitle;
  const fileName = downloadName ?? title;

  function handleDownload(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.wrapper}>
      <details className={styles.aliasBlock} open={defaultOpen}>
        <summary className={styles.summary}>
          <span className={styles.toggle} aria-hidden="true">
            &gt;
          </span>
          <span className={styles.meta}>
            <span className={styles.title}>{title}</span>
            <span className={styles.subtitle}>{summaryText}</span>
          </span>
          <button
            type="button"
            className={styles.downloadButton}
            onClick={handleDownload}
          >
            Download
          </button>
        </summary>
        <div className={styles.body}>
          <pre className={styles.pre}>
            <code>{code}</code>
          </pre>
        </div>
      </details>
    </div>
  );
}
