import type { ReactNode } from "react";
import { useState } from "react";
import Link from "@docusaurus/Link";
import { RotateCw } from "lucide-react";

import styles from "./Timeline.module.css";
import wikiStyles from "./WorldWiki.module.css";
import type { TimelineEvent } from "./types";

type TimelineEventCardProps = {
  event: TimelineEvent;
  linkedWikiTitle: string | null;
  isStaff: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export default function TimelineEventCard({
  event,
  linkedWikiTitle,
  isStaff,
  onEdit,
  onDelete,
}: TimelineEventCardProps): ReactNode {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className={styles.card}>
      <div className={`${styles.cardInner} ${isFlipped ? styles.cardFlipped : ""}`}>
        <div className={`${styles.cardFace} ${styles.cardFront}`}>
          {event.imagePath ? (
            <>
              <img src={event.imagePath} alt={event.title} className={styles.cardImage} />
              <div className={styles.cardFrontOverlay}>
                <p className={styles.cardFrontTitle}>{event.title}</p>
              </div>
            </>
          ) : (
            <div className={styles.cardPlaceholder}>
              <p className={styles.cardPlaceholderTitle}>{event.title}</p>
            </div>
          )}
        </div>
        <div className={`${styles.cardFace} ${styles.cardBack}`}>
          <p className={styles.cardBackEra}>
            {event.eraLabel}
            {event.category ? ` · ${event.category}` : ""}
            {event.isDraft ? " · Draft" : ""}
          </p>
          <p className={styles.cardBackTitle}>{event.title}</p>
          {event.description ? (
            <p className={styles.cardBackDescription}>{event.description}</p>
          ) : null}
          {linkedWikiTitle ? (
            <Link
              to={`/world-wiki?slug=${encodeURIComponent(event.linkedWikiSlug || "")}`}
              className={styles.cardBackLink}
              onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
            >
              Read more: {linkedWikiTitle} &rarr;
            </Link>
          ) : null}
          {isStaff ? (
            <div className={styles.cardBackActions}>
              <button
                type="button"
                className={wikiStyles.button}
                onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation();
                  onEdit();
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className={`${wikiStyles.button} ${wikiStyles.buttonDanger}`}
                onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation();
                  onDelete();
                }}
              >
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        className={styles.flipButton}
        onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
        onClick={() => setIsFlipped((current) => !current)}
        aria-label={isFlipped ? "Show image side" : "Show details"}
      >
        <RotateCw size={14} />
      </button>
    </div>
  );
}
