import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import ChapterMarker from "./ChapterMarker";
import PageLoader from "../PageLoader";
import ImageCropDialog from "./ImageCropDialog";
import ReorderEventsDialog from "./ReorderEventsDialog";
import TimelineEventCard from "./TimelineEventCard";
import ToastStack from "./ToastStack";
import { uploadWorldWikiImage } from "./uploadImage";
import { useToasts } from "./useToasts";
import { resolveMediaUrl } from "../wikiMarkdown";
import wikiStyles from "./WorldWiki.module.css";
import styles from "./Timeline.module.css";
import { getAuthApiBaseUrl, type SessionUser, type TimelineEvent, type WorldWikiPage } from "./types";

// The world's history is told through these island illustrations appearing
// one by one; each is a unique irregular shape, so chapter markers render
// them at their natural aspect ratio instead of cropping them into a card.
const CHAPTER_MARKER_IMAGES = [
  { label: "Thaloryn", path: "/img/Thaloryn.png" },
  { label: "Iskralith", path: "/img/Iskralith.png" },
  { label: "Solcrata", path: "/img/Solcrata.png" },
  { label: "Tenebryn", path: "/img/Tenebryn.png" },
  { label: "Verdalis", path: "/img/Verdalis.png" },
  { label: "Abysmere", path: "/img/Abysmere.png" },
];

const EMPTY_FORM = {
  title: "",
  description: "",
  eraLabel: "",
  category: "",
  linkedWikiSlug: "",
  imagePath: null as string | null,
  isChapterMarker: false,
  isDraft: false,
};

export default function Timeline(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const authApiBaseUrl = getAuthApiBaseUrl(siteConfig);

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [wikiPages, setWikiPages] = useState<WorldWikiPage[]>([]);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isCompact, setIsCompact] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [isReorderDialogOpen, setIsReorderDialogOpen] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const { toasts, showToast, dismissToast } = useToasts();

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number; moved: boolean } | null>(
    null,
  );
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  async function loadEvents() {
    const response = await fetch(`${authApiBaseUrl}/api/timeline/events`, {
      credentials: "include",
    });
    const payload = await response.json().catch(() => ({}));
    setEvents(Array.isArray(payload.events) ? payload.events : []);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        const sessionResponse = await fetch(`${authApiBaseUrl}/api/me`, {
          credentials: "include",
        });
        const sessionPayload = await sessionResponse.json().catch(() => ({}));
        if (!cancelled) {
          setCurrentUser(sessionPayload.authenticated ? sessionPayload.user : null);
        }

        const pagesResponse = await fetch(`${authApiBaseUrl}/api/world-wiki/pages`, {
          credentials: "include",
        });
        const pagesPayload = await pagesResponse.json().catch(() => ({}));
        if (!cancelled) {
          setWikiPages(Array.isArray(pagesPayload.pages) ? pagesPayload.pages : []);
        }

        await loadEvents();
      } catch {
        // Leave defaults on failure.
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authApiBaseUrl]);

  // Wheel scrolling needs preventDefault to redirect vertical scroll into the
  // horizontal rail, but React attaches onWheel as passive, so a native
  // listener (matching the crop dialog's fix) is required.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    function handleWheel(event: WheelEvent) {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }
      event.preventDefault();
      node!.scrollLeft += event.deltaY;
    }

    node.addEventListener("wheel", handleWheel, { passive: false });
    return () => node.removeEventListener("wheel", handleWheel);
  }, []);

  function handleScrollPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const node = scrollRef.current;
    if (!node) {
      return;
    }
    node.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: node.scrollLeft,
      moved: false,
    };
  }

  function handleScrollPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const node = scrollRef.current;
    const drag = dragStateRef.current;
    if (!node || !drag || drag.pointerId !== event.pointerId) {
      return;
    }
    const dx = event.clientX - drag.startX;
    if (Math.abs(dx) > 3) {
      drag.moved = true;
    }
    node.scrollLeft = drag.startScrollLeft - dx;
  }

  function handleScrollPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
    }
  }

  const categories = useMemo(() => {
    const unique = new Set<string>();
    for (const event of events) {
      if (event.category) {
        unique.add(event.category);
      }
    }
    return [...unique].sort();
  }, [events]);

  const visibleEvents = useMemo(() => {
    if (categoryFilter === "all") {
      return events;
    }
    return events.filter((event) => event.category === categoryFilter);
  }, [events, categoryFilter]);

  function wikiTitleForSlug(slug: string | null) {
    if (!slug) {
      return null;
    }
    return wikiPages.find((page) => page.slug === slug)?.title || slug;
  }

  function openAddForm() {
    setForm(EMPTY_FORM);
    setEditingEventId(null);
    setIsFormOpen(true);
  }

  function openEditForm(event: TimelineEvent) {
    setForm({
      title: event.title,
      description: event.description,
      eraLabel: event.eraLabel,
      category: event.category || "",
      linkedWikiSlug: event.linkedWikiSlug || "",
      imagePath: event.imagePath,
      isChapterMarker: event.isChapterMarker,
      isDraft: event.isDraft,
    });
    setEditingEventId(event.id);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingEventId(null);
    setForm(EMPTY_FORM);
  }

  function handleImageSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    setPendingImageFile(file);
  }

  async function handleImageCropped(blob: Blob) {
    setPendingImageFile(null);
    try {
      setIsUploadingImage(true);
      const url = await uploadWorldWikiImage(authApiBaseUrl, blob);
      if (url) {
        setForm((current) => ({ ...current, imagePath: url }));
      }
    } catch (uploadError) {
      showToast("error", uploadError instanceof Error ? uploadError.message : "Failed to upload image.");
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function handleSaveEvent() {
    if (!form.title.trim() || !form.eraLabel.trim()) {
      showToast("error", "Title and era label are required.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description,
      eraLabel: form.eraLabel.trim(),
      category: form.category.trim() || null,
      linkedWikiSlug: form.linkedWikiSlug || null,
      imagePath: form.imagePath,
      isChapterMarker: form.isChapterMarker,
      isDraft: form.isDraft,
    };

    try {
      setIsSaving(true);
      const response = await fetch(
        editingEventId
          ? `${authApiBaseUrl}/api/admin/timeline/events/${editingEventId}`
          : `${authApiBaseUrl}/api/admin/timeline/events`,
        {
          method: editingEventId ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const responsePayload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(responsePayload.error || "Failed to save event.");
      }

      showToast("success", editingEventId ? "Event updated." : "Event created.");
      closeForm();
      await loadEvents();
    } catch (saveError) {
      showToast("error", saveError instanceof Error ? saveError.message : "Failed to save event.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteEvent(eventId: number) {
    if (!window.confirm("Delete this timeline event?")) {
      return;
    }

    try {
      const response = await fetch(`${authApiBaseUrl}/api/admin/timeline/events/${eventId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to delete event.");
      }
      await loadEvents();
    } catch (deleteError) {
      showToast("error", deleteError instanceof Error ? deleteError.message : "Failed to delete event.");
    }
  }

  async function handleSaveReorder(orderedEventIds: number[]) {
    try {
      setIsReordering(true);
      const response = await fetch(`${authApiBaseUrl}/api/admin/timeline/events/reorder`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventIds: orderedEventIds }),
      });
      const responsePayload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(responsePayload.error || "Failed to reorder events.");
      }

      showToast("success", "Order updated.");
      setIsReorderDialogOpen(false);
      await loadEvents();
    } catch (reorderError) {
      showToast("error", reorderError instanceof Error ? reorderError.message : "Failed to reorder events.");
    } finally {
      setIsReordering(false);
    }
  }

  if (isLoading) {
    return <PageLoader label="Loading timeline" />;
  }

  return (
    <div className={wikiStyles.page}>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      {pendingImageFile ? (
        <ImageCropDialog
          file={pendingImageFile}
          onCancel={() => setPendingImageFile(null)}
          onCropped={handleImageCropped}
        />
      ) : null}
      {isReorderDialogOpen ? (
        <ReorderEventsDialog
          events={events}
          isSaving={isReordering}
          onCancel={() => setIsReorderDialogOpen(false)}
          onSave={handleSaveReorder}
        />
      ) : null}

      <div className={wikiStyles.panel}>
      <header className={wikiStyles.hero}>
        <h1 className={wikiStyles.heroTitle}>Timeline of Altharion</h1>
        <p className={wikiStyles.heroSubtitle}>
          Trace the ages of the world, from the first sunrise to the present day.
        </p>
      </header>

      <div className={styles.filterRow}>
        <select
          className={wikiStyles.categorySelect}
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          aria-label="Filter timeline by category"
        >
          <option value="all">All eras</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={wikiStyles.button}
          onClick={() => setIsCompact((current) => !current)}
        >
          {isCompact ? "Expand Timeline" : "Collapse Timeline"}
        </button>
        {currentUser?.isStaff ? (
          <>
            <button type="button" className={wikiStyles.button} onClick={isFormOpen ? closeForm : openAddForm}>
              {isFormOpen ? "Close" : "Add Event"}
            </button>
            <button
              type="button"
              className={wikiStyles.button}
              onClick={() => setIsReorderDialogOpen(true)}
              disabled={events.length < 2}
            >
              Reorder Events
            </button>
          </>
        ) : null}
      </div>

      {isFormOpen && currentUser?.isStaff ? (
        <div className={styles.eventForm}>
          {!editingEventId ? (
            <p className={wikiStyles.heroSubtitle} style={{ margin: 0 }}>
              New events are added to the end of the timeline — use "Reorder Events" to move them.
            </p>
          ) : null}
          <label className={wikiStyles.field}>
            <span className={wikiStyles.fieldLabel}>Title</span>
            <input
              className={wikiStyles.input}
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <label className={wikiStyles.field}>
            <span className={wikiStyles.fieldLabel}>Era Label</span>
            <input
              className={wikiStyles.input}
              value={form.eraLabel}
              onChange={(event) => setForm((current) => ({ ...current, eraLabel: event.target.value }))}
              placeholder="e.g. Age of Sundering, Year 214"
            />
          </label>
          <div className={styles.formRow}>
            <label className={wikiStyles.field}>
              <span className={wikiStyles.fieldLabel}>Category (optional)</span>
              <input
                className={wikiStyles.input}
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              />
            </label>
            <label className={wikiStyles.field}>
              <span className={wikiStyles.fieldLabel}>Linked Wiki Page (optional)</span>
              <select
                className={wikiStyles.select}
                value={form.linkedWikiSlug}
                onChange={(event) => setForm((current) => ({ ...current, linkedWikiSlug: event.target.value }))}
              >
                <option value="">None</option>
                {wikiPages.map((page) => (
                  <option key={page.slug} value={page.slug}>
                    {page.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className={wikiStyles.toggleRow}>
            <input
              type="checkbox"
              checked={form.isChapterMarker}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isChapterMarker: event.target.checked,
                  imagePath: event.target.checked ? CHAPTER_MARKER_IMAGES[0].path : null,
                }))
              }
            />
            <span>Chapter marker (show a full island illustration instead of a card)</span>
          </label>

          {form.isChapterMarker ? (
            <label className={wikiStyles.field}>
              <span className={wikiStyles.fieldLabel}>Island</span>
              <select
                className={wikiStyles.select}
                value={form.imagePath ?? ""}
                onChange={(event) => setForm((current) => ({ ...current, imagePath: event.target.value }))}
              >
                {CHAPTER_MARKER_IMAGES.map((island) => (
                  <option key={island.path} value={island.path}>
                    {island.label}
                  </option>
                ))}
              </select>
              {form.imagePath ? (
                <img
                  src={form.imagePath}
                  alt=""
                  style={{ display: "block", height: "10rem", width: "auto", maxWidth: "none", margin: "0.5rem auto 0" }}
                />
              ) : null}
            </label>
          ) : (
            <div className={wikiStyles.field}>
              <span className={wikiStyles.fieldLabel}>Image (optional)</span>
              {form.imagePath ? (
                <img
                  src={resolveMediaUrl(authApiBaseUrl, form.imagePath)}
                  alt=""
                  className={wikiStyles.imageUploadPreview}
                />
              ) : null}
              <div className={wikiStyles.actions}>
                <button
                  type="button"
                  className={wikiStyles.button}
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? "Uploading..." : form.imagePath ? "Replace Image" : "Add Image"}
                </button>
                {form.imagePath ? (
                  <button
                    type="button"
                    className={wikiStyles.button}
                    onClick={() => setForm((current) => ({ ...current, imagePath: null }))}
                  >
                    Remove Image
                  </button>
                ) : null}
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                style={{ display: "none" }}
                onChange={handleImageSelected}
              />
            </div>
          )}
          <label className={wikiStyles.field}>
            <span className={wikiStyles.fieldLabel}>Description</span>
            <textarea
              className={wikiStyles.textarea}
              style={{ minHeight: "10rem" }}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </label>
          <label className={wikiStyles.toggleRow}>
            <input
              type="checkbox"
              checked={form.isDraft}
              onChange={(event) => setForm((current) => ({ ...current, isDraft: event.target.checked }))}
            />
            <span>Draft (hidden from players)</span>
          </label>
          <div className={wikiStyles.actions}>
            <button type="button" className={wikiStyles.button} onClick={closeForm} disabled={isSaving}>
              Cancel
            </button>
            <button
              type="button"
              className={`${wikiStyles.button} ${wikiStyles.buttonPrimary}`}
              onClick={handleSaveEvent}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : editingEventId ? "Update Event" : "Create Event"}
            </button>
          </div>
        </div>
      ) : null}

      {visibleEvents.length === 0 ? (
        <div className={wikiStyles.emptyState}>No timeline events yet.</div>
      ) : null}

      {visibleEvents.length > 0 ? (
        <div
          ref={scrollRef}
          className={styles.scrollArea}
          onPointerDown={handleScrollPointerDown}
          onPointerMove={handleScrollPointerMove}
          onPointerUp={handleScrollPointerUp}
          onPointerCancel={handleScrollPointerUp}
        >
          <div className={`${styles.track} ${isCompact ? styles.trackCompact : ""}`}>
            <div className={styles.trackLine} aria-hidden="true" />
            {visibleEvents.map((event) => (
              <div key={event.id} className={styles.column}>
                {isCompact ? (
                  <p className={styles.compactTitle}>{event.title}</p>
                ) : event.isChapterMarker && event.imagePath ? (
                  <ChapterMarker
                    event={event}
                    isStaff={Boolean(currentUser?.isStaff)}
                    authApiBaseUrl={authApiBaseUrl}
                    onEdit={() => openEditForm(event)}
                    onDelete={() => handleDeleteEvent(event.id)}
                  />
                ) : (
                  <div className={styles.cardSlot}>
                    <TimelineEventCard
                      event={event}
                      linkedWikiTitle={wikiTitleForSlug(event.linkedWikiSlug)}
                      isStaff={Boolean(currentUser?.isStaff)}
                      authApiBaseUrl={authApiBaseUrl}
                      onEdit={() => openEditForm(event)}
                      onDelete={() => handleDeleteEvent(event.id)}
                    />
                  </div>
                )}
                <span className={styles.dot} aria-hidden="true" />
                <p className={styles.columnEra}>{event.eraLabel}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}
