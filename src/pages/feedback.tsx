import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import Layout from "@theme/Layout";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import styles from "./feedback.module.css";

type SessionUser = { username: string; globalName: string | null };

function apiBase(siteConfig): string {
  const value = siteConfig.customFields?.authApiBaseUrl;
  return typeof value === "string" ? value.replace(/\/$/, "") : "";
}

export default function FeedbackPage(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const base = apiBase(siteConfig);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    fetch(`${base}/api/me`, { credentials: "include" })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (p?.authenticated) {
          setUser(p.user);
          return;
        }
        window.location.replace(`${base}/auth/discord/login?returnTo=${encodeURIComponent("/feedback")}`);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [base]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);
    try {
      const response = await fetch(`${base}/api/feedback`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback, anonymous }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to submit feedback.");
      setFeedback("");
      setNotice({
        error: false,
        text:
          payload.sheetSynced === false
            ? "Thank you. Your feedback was saved; the spreadsheet copy is temporarily delayed."
            : "Thank you—your feedback has been submitted.",
      });
    } catch (error) {
      setNotice({ error: true, text: error instanceof Error ? error.message : "Failed to submit feedback." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout title="Feedback" description="Send feedback to the Reaches of Altharion staff.">
      <main className={styles.page}>
        <section className={styles.card}>
          <p className={styles.eyebrow}>Player Information</p>
          <h1>Send us feedback</h1>
          <p className={styles.intro}>
            Tell the staff what is working, what could be improved, or anything else you think we should know.
          </p>
          {loading || !user ? (
            <p>Checking your Discord membership…</p>
          ) : (
            <form onSubmit={submit} className={styles.form}>
              <label htmlFor="feedback">Feedback</label>
              <textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                maxLength={4000}
                required
                rows={10}
                placeholder="Share your feedback here…"
              />
              <span className={styles.counter}>{feedback.length.toLocaleString()} / 4,000</span>
              <label className={styles.checkbox}>
                <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
                <span>
                  <strong>Submit anonymously</strong>
                  <small>If you submit anonymously we won't be able to ask any follow up questions.</small>
                </span>
              </label>
              {!anonymous && (
                <p className={styles.identity}>
                  Submitting as <strong>{user.globalName || user.username}</strong>.
                </p>
              )}
              <button className={styles.button} type="submit" disabled={submitting || !feedback.trim()}>
                {submitting ? "Submitting…" : "Submit feedback"}
              </button>
              {notice && (
                <p role={notice.error ? "alert" : "status"} className={notice.error ? styles.error : styles.success}>
                  {notice.text}
                </p>
              )}
            </form>
          )}
        </section>
      </main>
    </Layout>
  );
}
