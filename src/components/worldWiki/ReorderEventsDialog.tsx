import type { ReactNode } from "react";
import { useState } from "react";
import { Reorder } from "motion/react";
import { GripVertical } from "lucide-react";

import dialogStyles from "./Dialog.module.css";
import styles from "./ReorderEventsDialog.module.css";
import wikiStyles from "./WorldWiki.module.css";
import type { TimelineEvent } from "./types";

type ReorderEventsDialogProps = {
  events: TimelineEvent[];
  isSaving: boolean;
  onCancel: () => void;
  onSave: (orderedEventIds: number[]) => void;
};

export default function ReorderEventsDialog({
  events,
  isSaving,
  onCancel,
  onSave,
}: ReorderEventsDialogProps): ReactNode {
  const [orderedEvents, setOrderedEvents] = useState(events);

  return (
    <div className={dialogStyles.overlay} role="dialog" aria-modal="true" aria-label="Reorder timeline events">
      <div className={`${dialogStyles.dialog} ${styles.wideDialog}`}>
        <h2 className={dialogStyles.title}>Reorder Events</h2>
        <p className={dialogStyles.hint}>
          Drag events into the order you want them to appear on the timeline.
        </p>

        <Reorder.Group
          as="div"
          axis="y"
          values={orderedEvents}
          onReorder={setOrderedEvents}
          className={styles.list}
        >
          {orderedEvents.map((event) => (
            <Reorder.Item as="div" key={event.id} value={event} className={styles.item}>
              <GripVertical size={16} className={styles.gripIcon} aria-hidden="true" />
              <div className={styles.itemText}>
                <p className={styles.itemEra}>
                  {event.eraLabel}
                  {event.isDraft ? " · Draft" : ""}
                </p>
                <p className={styles.itemTitle}>{event.title}</p>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        <div className={dialogStyles.actions}>
          <button type="button" className={wikiStyles.button} onClick={onCancel} disabled={isSaving}>
            Cancel
          </button>
          <button
            type="button"
            className={`${wikiStyles.button} ${wikiStyles.buttonPrimary}`}
            onClick={() => onSave(orderedEvents.map((event) => event.id))}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
