import type { ReactNode } from "react";
import Link from "@docusaurus/Link";
import { Pencil, Trash2 } from "lucide-react";

import { resolveMediaUrl } from "../wikiMarkdown";
import styles from "./Timeline.module.css";
import type { TimelineEvent } from "./types";

type ChapterMarkerProps = {
  event: TimelineEvent;
  isStaff: boolean;
  authApiBaseUrl: string;
  onEdit: () => void;
  onDelete: () => void;
};

export default function ChapterMarker({ event, isStaff, authApiBaseUrl, onEdit, onDelete }: ChapterMarkerProps): ReactNode {
  const image = (
    <img
      src={event.imagePath ? resolveMediaUrl(authApiBaseUrl, event.imagePath) : undefined}
      alt={event.title}
      className={styles.chapterImage}
    />
  );

  return (
    <div className={styles.chapterMarker}>
      <div className={styles.chapterImageWrap}>
        {event.linkedWikiSlug ? (
          <Link
            to={`/world-wiki?slug=${encodeURIComponent(event.linkedWikiSlug)}`}
            className={styles.chapterLink}
            onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
          >
            {image}
          </Link>
        ) : (
          image
        )}
        {isStaff ? (
          <div className={styles.chapterActions}>
            <button
              type="button"
              className={styles.chapterActionButton}
              onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
              onClick={onEdit}
              aria-label={`Edit ${event.title}`}
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              className={`${styles.chapterActionButton} ${styles.chapterActionButtonDanger}`}
              onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
              onClick={onDelete}
              aria-label={`Delete ${event.title}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ) : null}
      </div>
      <div className={styles.chapterCaption}>
        <p className={styles.chapterTitle}>{event.title}</p>
        {event.description ? <p className={styles.chapterDescription}>{event.description}</p> : null}
      </div>
    </div>
  );
}
