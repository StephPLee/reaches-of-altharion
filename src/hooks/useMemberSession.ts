import { useEffect, useState } from "react";

export type MemberSessionUser = {
  username: string;
  globalName: string | null;
  discordUserId?: string;
};

export default function useMemberSession(apiBaseUrl: string) {
  const [user, setUser] = useState<MemberSessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`${apiBaseUrl}/api/me`, { credentials: "include" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled) setUser(payload?.authenticated ? payload.user : null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [apiBaseUrl]);

  return { user, loading, authenticated: Boolean(user) };
}
