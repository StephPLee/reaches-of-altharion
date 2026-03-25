import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useHistory } from "@docusaurus/router";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import styles from "./admin.module.css";

type SessionUser = {
  id?: number;
  username: string;
  globalName: string | null;
  isStaff: boolean;
  isDm?: boolean;
  canSubmitRewards?: boolean;
};

function getAuthApiBaseUrl(siteConfig): string {
  const configuredBaseUrl = siteConfig.customFields?.authApiBaseUrl;
  return typeof configuredBaseUrl === "string"
    ? configuredBaseUrl.replace(/\/$/, "")
    : "";
}

export default function AdminPage(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const history = useHistory();
  const authApiBaseUrl = getAuthApiBaseUrl(siteConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        setIsLoading(true);
        const response = await fetch(`${authApiBaseUrl}/api/me`, {
          credentials: "include",
        });

        if (response.status === 401) {
          if (!cancelled) {
            setUser(null);
            history.replace("/?view=map");
          }
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to load auth session (${response.status}).`);
        }

        const payload = await response.json();
        if (!cancelled) {
          const nextUser = payload.authenticated ? payload.user : null;
          if (nextUser && !nextUser.isStaff) {
            setUser(null);
            history.replace("/?view=map");
            return;
          }
          setUser(nextUser);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          history.replace("/?view=map");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [authApiBaseUrl, history]);

  async function handleLogout() {
    try {
      await fetch(`${authApiBaseUrl}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
      history.replace("/?view=map");
    }
  }

  return (
    <Layout title="Staff Panel" description="Discord-authenticated admin area.">
      <main className={styles.page}>
        <div className={styles.shell}>
          <p className={styles.eyebrow}>Administrative Access</p>
          <Heading as="h1">Staff Panel</Heading>
          <p className={styles.intro}>
            This is the authenticated entry point for calendar and wiki editing.
            Calendar CRUD is the next feature to land here.
          </p>

          <section className={styles.panel}>
            {isLoading ? (
              <p className={styles.status}>Checking staff session...</p>
            ) : null}

            {!isLoading && !user ? (
              <>
                <p className={styles.status}>You are not signed in.</p>
                <div className={styles.actions}>
                  <a
                    href={`${authApiBaseUrl}/auth/discord/login`}
                    className={styles.button}
                  >
                    Sign in with Discord
                  </a>
                </div>
              </>
            ) : null}

            {!isLoading && user ? (
              <>
                <p className={styles.meta}>
                  Staff role verified: {user.isStaff ? "yes" : "no"}.
                </p>
                <div className={styles.actions}>
                  <Link to="/calendar" className={styles.button}>
                    Open Calendar Tools
                  </Link>
                  <button
                    type="button"
                    className={styles.button}
                    onClick={handleLogout}
                  >
                    Sign Out
                  </button>
                </div>
                <div className={styles.formPanel}>
                  <Heading as="h2">Calendar Tools Moved</Heading>
                  <p className={styles.meta}>
                    The calendar creation workflow now lives directly on the
                    public calendar page and only appears when a signed-in staff
                    member opens it.
                  </p>
                </div>
              </>
            ) : null}
          </section>
        </div>
      </main>
    </Layout>
  );
}
