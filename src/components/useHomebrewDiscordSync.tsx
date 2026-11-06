import { useEffect, useState, type ReactNode } from "react";
import styles from "./SubclassesDirectory.module.css";

type DiscordSyncStatus = {
  configured: boolean;
  posts: { key: string; sections: string[] }[];
};

type UseHomebrewDiscordSyncOptions = {
  authApiBaseUrl: string;
  isStaff: boolean;
  section: string;
  nounPlural: string;
};

// Staff-only buttons that push a homebrew section to its bot-owned Discord
// forum post. `buttons` goes in the page's control row and `status` below it;
// both are null for non-staff and for sections that aren't mirrored.
export default function useHomebrewDiscordSync({
  authApiBaseUrl,
  isStaff,
  section,
  nounPlural,
}: UseHomebrewDiscordSyncOptions): { buttons: ReactNode; status: ReactNode } {
  const [postKey, setPostKey] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isStaff) {
      setPostKey(null);
      return;
    }

    let cancelled = false;

    fetch(`${authApiBaseUrl}/api/admin/homebrew/discord-sync`, {
      credentials: "include",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: DiscordSyncStatus | null) => {
        if (cancelled || !payload) {
          return;
        }
        const post = payload.posts.find((candidate) =>
          candidate.sections.includes(section),
        );
        setPostKey(post?.key ?? null);
        setConfigured(payload.configured);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [authApiBaseUrl, isStaff, section]);

  if (!isStaff || !postKey) {
    return { buttons: null, status: null };
  }

  async function syncToDiscord(repost: boolean) {
    if (
      repost &&
      !window.confirm(
        `Delete and repost every ${nounPlural} message in the Discord forum post?`,
      )
    ) {
      return;
    }

    setMessage("");
    setError("");

    try {
      setIsSyncing(true);
      const response = await fetch(
        `${authApiBaseUrl}/api/admin/homebrew/discord-sync`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ postKey, repost }),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Failed to sync to Discord.");
      }

      setMessage("Discord forum post is up to date.");
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : "Failed to sync to Discord.",
      );
    } finally {
      setIsSyncing(false);
    }
  }

  const disabledReason = configured
    ? ""
    : "Discord sync is off: set HOMEBREW_FORUM_CHANNEL_ID on the server and restart it.";

  const buttons = (
    <>
      <button
        type="button"
        className={styles.controlButton}
        onClick={() => syncToDiscord(false)}
        disabled={isSyncing || !configured}
        title={disabledReason || undefined}
      >
        {isSyncing ? "Syncing..." : "Sync to Discord"}
      </button>
      <button
        type="button"
        className={styles.controlButton}
        onClick={() => syncToDiscord(true)}
        disabled={isSyncing || !configured}
        title={disabledReason || undefined}
      >
        Repost to Discord
      </button>
    </>
  );

  const status = (
    <>
      {disabledReason ? (
        <p className={styles.status}>{disabledReason}</p>
      ) : null}
      {message ? <p className={styles.success}>{message}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
    </>
  );

  return { buttons, status };
}
