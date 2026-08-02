import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import Layout from "@theme/Layout";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import styles from "./book-requests.module.css";

type SessionUser = {
  username: string;
  globalName: string | null;
  isStaff?: boolean;
};

type BookRequest = {
  id: number;
  discord_user_id: string;
  requester_username: string;
  title: string;
  notes: string | null;
  status: string;
  source: string;
  created_at: string;
  upvote_count: number;
  has_upvoted: boolean;
};

function apiBase(siteConfig): string {
  const value = siteConfig.customFields?.authApiBaseUrl;
  return typeof value === "string" ? value.replace(/\/$/, "") : "";
}

export default function BookRequestsPage(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const base = apiBase(siteConfig);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [purchasingId, setPurchasingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    fetch(`${base}/api/me`, { credentials: "include" })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (p?.authenticated) {
          setUser(p.user);
          return;
        }
        window.location.replace(`${base}/auth/discord/login?returnTo=${encodeURIComponent("/book-requests")}`);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [base]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadRequests() {
      try {
        setListLoading(true);
        const response = await fetch(`${base}/api/book-requests`, { credentials: "include" });
        if (!response.ok) throw new Error(`Failed to load book requests (${response.status}).`);
        const payload = await response.json();
        if (!cancelled) setRequests(Array.isArray(payload.requests) ? payload.requests : []);
      } catch {
        if (!cancelled) setRequests([]);
      } finally {
        if (!cancelled) setListLoading(false);
      }
    }

    loadRequests();
    return () => {
      cancelled = true;
    };
  }, [base, user]);

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);
    try {
      const response = await fetch(`${base}/api/book-requests`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, notes }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to submit book request.");
      setRequests((current) => [
        { ...payload.request, upvote_count: 0, has_upvoted: false },
        ...current,
      ]);
      setTitle("");
      setNotes("");
      setNotice({ error: false, text: "Book request submitted." });
    } catch (error) {
      setNotice({ error: true, text: error instanceof Error ? error.message : "Failed to submit book request." });
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleUpvote(request: BookRequest) {
    setTogglingId(request.id);
    try {
      const response = await fetch(`${base}/api/book-requests/${request.id}/upvote`, {
        method: "POST",
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to update upvote.");
      setRequests((current) =>
        current.map((item) =>
          item.id === request.id
            ? {
                ...item,
                has_upvoted: payload.upvoted,
                upvote_count: item.upvote_count + (payload.upvoted ? 1 : -1),
              }
            : item,
        ),
      );
    } catch (error) {
      setNotice({ error: true, text: error instanceof Error ? error.message : "Failed to update upvote." });
    } finally {
      setTogglingId(null);
    }
  }

  async function markPurchased(request: BookRequest) {
    setPurchasingId(request.id);
    try {
      const response = await fetch(`${base}/api/admin/book-requests/${request.id}/purchase`, {
        method: "POST",
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to mark book request purchased.");
      setRequests((current) => current.filter((item) => item.id !== request.id));
      setNotice({ error: false, text: `Marked "${request.title}" as purchased.` });
    } catch (error) {
      setNotice({ error: true, text: error instanceof Error ? error.message : "Failed to mark book request purchased." });
    } finally {
      setPurchasingId(null);
    }
  }

  const sortedRequests = [...requests].sort((a, b) => b.upvote_count - a.upvote_count);

  return (
    <Layout title="Book Requests" description="Request books the server doesn't have access to yet.">
      <main className={styles.page}>
        <section className={styles.card}>
          <p className={styles.eyebrow}>Player Information</p>
          <h1>Book Requests</h1>
          <p className={styles.intro}>
            Let staff know which sourcebooks or supplements we don't have access to yet. Upvote requests to help
            prioritize what gets purchased next.
          </p>

          {loading || !user ? (
            <p>Checking your Discord membership...</p>
          ) : (
            <>
              <form onSubmit={submitRequest} className={styles.form}>
                <label htmlFor="book-title">Book title</label>
                <input
                  id="book-title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={200}
                  required
                  placeholder="Xanathar's Guide to Everything"
                />
                <label htmlFor="book-notes">Notes (optional)</label>
                <textarea
                  id="book-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder="Why do you want this book?"
                />
                <button className={styles.button} type="submit" disabled={submitting || !title.trim()}>
                  {submitting ? "Submitting..." : "Request Book"}
                </button>
                {notice && (
                  <p role={notice.error ? "alert" : "status"} className={notice.error ? styles.error : styles.success}>
                    {notice.text}
                  </p>
                )}
              </form>

              <div className={styles.list}>
                {listLoading ? <p className={styles.hint}>Loading book requests...</p> : null}
                {!listLoading && sortedRequests.length === 0 ? (
                  <p className={styles.hint}>No open book requests yet.</p>
                ) : null}
                {sortedRequests.map((request) => (
                  <div key={request.id} className={styles.row}>
                    <div className={styles.rowMain}>
                      <p className={styles.rowTitle}>{request.title}</p>
                      {request.notes ? <p className={styles.rowNotes}>{request.notes}</p> : null}
                      <p className={styles.rowMeta}>Requested by {request.requester_username}</p>
                    </div>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={request.has_upvoted ? styles.upvoteButtonActive : styles.upvoteButton}
                        disabled={togglingId === request.id}
                        onClick={() => toggleUpvote(request)}
                      >
                        ▲ {request.upvote_count}
                      </button>
                      {user.isStaff ? (
                        <button
                          type="button"
                          className={styles.staffButton}
                          disabled={purchasingId === request.id}
                          onClick={() => markPurchased(request)}
                        >
                          {purchasingId === request.id ? "Marking..." : "Mark Purchased"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </Layout>
  );
}
