import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import ImageCropDialog from "./ImageCropDialog";
import TimelineEventCard from "./TimelineEventCard";
import { uploadWorldWikiImage } from "./uploadImage";
import wikiStyles from "./WorldWiki.module.css";
import styles from "./Timeline.module.css";
import { getAuthApiBaseUrl, type SessionUser, type TimelineEvent, type WorldWikiPage } from "./types";

const EMPTY_FORM = {
  title: "",
  description: "",
  eraLabel: "",
  sortValue: "0",
  category: "",
  linkedWikiSlug: "",
  imagePath: null as string | null,
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

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
    setError("");
    setMessage("");
  }

  function openEditForm(event: TimelineEvent) {
    setForm({
      title: event.title,
      description: event.description,
      eraLabel: event.eraLabel,
      sortValue: String(event.sortValue),
      category: event.category || "",
      linkedWikiSlug: event.linkedWikiSlug || "",
      imagePath: event.imagePath,
      isDraft: event.isDraft,
    });
    setEditingEventId(event.id);
    setIsFormOpen(true);
    setError("");
    setMessage("");
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
      setError("");
      const url = await uploadWorldWikiImage(authApiBaseUrl, blob);
      if (url) {
        setForm((current) => ({ ...current, imagePath: url }));
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload image.");
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function handleSaveEvent() {
    if (!form.title.trim() || !form.eraLabel.trim()) {
      setError("Title and era label are required.");
      return;
    }
    const sortValueNumber = Number(form.sortValue);
    if (!Number.isFinite(sortValueNumber)) {
      setError("Sort value must be a number.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description,
      eraLabel: form.eraLabel.trim(),
      sortValue: sortValueNumber,
      category: form.category.trim() || null,
      linkedWikiSlug: form.linkedWikiSlug || null,
      imagePath: form.imagePath,
      isDraft: form.isDraft,
    };

    try {
      setIsSaving(true);
      setError("");
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

      setMessage(editingEventId ? "Event updated." : "Event created.");
      closeForm();
      await loadEvents();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save event.");
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
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete event.");
    }
  }

  return (
    <div className={wikiStyles.page}>
      {pendingImageFile ? (
        <ImageCropDialog
          file={pendingImageFile}
          onCancel={() => setPendingImageFile(null)}
          onCropped={handleImageCropped}
        />
      ) : null}

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
        {currentUser?.isStaff ? (
          <button type="button" className={wikiStyles.button} onClick={isFormOpen ? closeForm : openAddForm}>
            {isFormOpen ? "Close" : "Add Event"}
          </button>
        ) : null}
      </div>

      {message ? <p className={wikiStyles.message} style={{ textAlign: "center" }}>{message}</p> : null}
      {error ? <p className={wikiStyles.error} style={{ textAlign: "center" }}>{error}</p> : null}

      {isFormOpen && currentUser?.isStaff ? (
        <div className={styles.eventForm}>
          <label className={wikiStyles.field}>
            <span className={wikiStyles.fieldLabel}>Title</span>
            <input
              className={wikiStyles.input}
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <div className={styles.formRow}>
            <label className={wikiStyles.field}>
              <span className={wikiStyles.fieldLabel}>Era Label</span>
              <input
                className={wikiStyles.input}
                value={form.eraLabel}
                onChange={(event) => setForm((current) => ({ ...current, eraLabel: event.target.value }))}
                placeholder="e.g. Age of Sundering, Year 214"
              />
            </label>
            <label className={wikiStyles.field}>
              <span className={wikiStyles.fieldLabel}>Sort Value</span>
              <input
                className={wikiStyles.input}
                type="number"
                value={form.sortValue}
                onChange={(event) => setForm((current) => ({ ...current, sortValue: event.target.value }))}
              />
            </label>
          </div>
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
          <div className={wikiStyles.field}>
            <span className={wikiStyles.fieldLabel}>Image (optional)</span>
            {form.imagePath ? (
              <img src={form.imagePath} alt="" className={wikiStyles.imageUploadPreview} />
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

      {isLoading ? <p className={wikiStyles.heroSubtitle} style={{ textAlign: "center" }}>Loading timeline...</p> : null}

      {!isLoading && visibleEvents.length === 0 ? (
        <div className={wikiStyles.emptyState}>No timeline events yet.</div>
      ) : null}

      {!isLoading && visibleEvents.length > 0 ? (
        <div
          ref={scrollRef}
          className={styles.scrollArea}
          onPointerDown={handleScrollPointerDown}
          onPointerMove={handleScrollPointerMove}
          onPointerUp={handleScrollPointerUp}
          onPointerCancel={handleScrollPointerUp}
        >
          <div className={styles.track}>
            <div className={styles.eraRow}>
              {visibleEvents.map((event) => (
                <div key={event.id} className={styles.eraCell}>
                  {event.eraLabel}
                </div>
              ))}
            </div>
            <div className={styles.dotRow}>
              {visibleEvents.map((event) => (
                <div key={event.id} className={styles.dotCell}>
                  <span className={styles.dot} aria-hidden="true" />
                </div>
              ))}
            </div>
            <div className={styles.cardRow}>
              {visibleEvents.map((event) => (
                <div key={event.id} className={styles.cardCell}>
                  <TimelineEventCard
                    event={event}
                    linkedWikiTitle={wikiTitleForSlug(event.linkedWikiSlug)}
                    isStaff={Boolean(currentUser?.isStaff)}
                    onEdit={() => openEditForm(event)}
                    onDelete={() => handleDeleteEvent(event.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
