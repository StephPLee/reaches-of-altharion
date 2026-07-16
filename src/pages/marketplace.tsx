import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import styles from "./marketplace.module.css";

type SessionUser = {
  id?: number;
  username: string;
  globalName: string | null;
};

type Listing = {
  id: number;
  sellerDiscordUserId: string;
  sellerCharacterId: string;
  sellerCharacterName: string;
  itemId: string;
  itemName: string;
  itemDescription: string | null;
  quantity: number;
  currencyType: "gold" | "sc";
  price: number;
  status: string;
  createdAt: string;
};

type BuyerCharacter = {
  id: string;
  name: string;
  level: number;
};

const CURRENCY_LABELS: Record<string, string> = { gold: "Gold", sc: "SC" };

function getAuthApiBaseUrl(siteConfig): string {
  const configuredBaseUrl = siteConfig.customFields?.authApiBaseUrl;
  return typeof configuredBaseUrl === "string"
    ? configuredBaseUrl.replace(/\/$/, "")
    : "";
}

export default function MarketplacePage(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const authApiBaseUrl = getAuthApiBaseUrl(siteConfig);

  const [user, setUser] = useState<SessionUser | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [myCharacters, setMyCharacters] = useState<BuyerCharacter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [activeListingId, setActiveListingId] = useState<number | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseMessage, setPurchaseMessage] = useState("");
  const [purchaseError, setPurchaseError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch(`${authApiBaseUrl}/api/me`, {
          credentials: "include",
        });
        if (response.status === 401) {
          if (!cancelled) setUser(null);
          return;
        }
        if (!response.ok) throw new Error(`Failed to load session (${response.status}).`);
        const payload = await response.json();
        if (!cancelled) setUser(payload.authenticated ? payload.user : null);
      } catch {
        if (!cancelled) setUser(null);
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, [authApiBaseUrl]);

  useEffect(() => {
    let cancelled = false;

    async function loadListings() {
      try {
        setIsLoading(true);
        setLoadError("");
        const response = await fetch(`${authApiBaseUrl}/api/marketplace/listings`, {
          credentials: "include",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load marketplace listings.");
        }
        if (!cancelled) {
          setListings(Array.isArray(payload.listings) ? payload.listings : []);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load marketplace listings.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadListings();
    return () => {
      cancelled = true;
    };
  }, [authApiBaseUrl]);

  useEffect(() => {
    if (!user) {
      setMyCharacters([]);
      return;
    }

    let cancelled = false;

    async function loadMyCharacters() {
      try {
        const response = await fetch(`${authApiBaseUrl}/api/marketplace/my-characters`, {
          credentials: "include",
        });
        if (!response.ok || cancelled) return;
        const payload = await response.json().catch(() => ({}));
        if (!cancelled) {
          setMyCharacters(Array.isArray(payload.characters) ? payload.characters : []);
        }
      } catch {
        // Non-critical — buy flow will just show no characters available.
      }
    }

    loadMyCharacters();
    return () => {
      cancelled = true;
    };
  }, [authApiBaseUrl, user]);

  function handleLogin(): void {
    const returnTo =
      window.location.pathname + window.location.search + window.location.hash;
    window.location.href = `${authApiBaseUrl}/auth/discord/login?returnTo=${encodeURIComponent(returnTo)}`;
  }

  function startBuyFlow(listingId: number): void {
    setActiveListingId(listingId);
    setSelectedCharacterId("");
    setPurchaseMessage("");
    setPurchaseError("");
  }

  async function confirmPurchase(listing: Listing): Promise<void> {
    if (!selectedCharacterId) {
      setPurchaseError("Choose which character is buying this item.");
      return;
    }

    try {
      setIsPurchasing(true);
      setPurchaseError("");
      setPurchaseMessage("");

      const response = await fetch(
        `${authApiBaseUrl}/api/marketplace/listings/${listing.id}/purchase`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ buyerCharacterId: selectedCharacterId }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to complete purchase.");
      }

      setListings((current) => current.filter((item) => item.id !== listing.id));
      setActiveListingId(null);
      setPurchaseMessage(`Purchased **${listing.itemName}** for ${listing.price} ${CURRENCY_LABELS[listing.currencyType]}.`);
    } catch (error) {
      setPurchaseError(error instanceof Error ? error.message : "Failed to complete purchase.");
    } finally {
      setIsPurchasing(false);
    }
  }

  return (
    <Layout title="Marketplace" description="Player-run item marketplace for Reaches of Altharion.">
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.hero}>
            <Heading as="h1">Marketplace</Heading>
            <p>
              Browse items crafted and listed by other players. Buying an item
              moves it directly to your character&apos;s WestMarches.games
              inventory and moves the price from your character to the
              seller&apos;s.
            </p>
          </section>

          {purchaseMessage ? <p className={styles.successText}>{purchaseMessage}</p> : null}
          {loadError ? <p className={styles.errorText}>{loadError}</p> : null}

          {isLoading ? (
            <p className={styles.muted}>Loading listings...</p>
          ) : listings.length === 0 ? (
            <p className={styles.muted}>No active listings right now. Check back later.</p>
          ) : (
            <div className={styles.grid}>
              {listings.map((listing) => (
                <section key={listing.id} className={styles.panel}>
                  <Heading as="h3">{listing.itemName}</Heading>
                  {listing.itemDescription ? (
                    <p className={styles.itemDescription}>{listing.itemDescription}</p>
                  ) : null}
                  <p className={styles.muted}>
                    Sold by <strong>{listing.sellerCharacterName}</strong>
                  </p>
                  <p className={styles.price}>
                    {listing.price} {CURRENCY_LABELS[listing.currencyType]}
                  </p>

                  {activeListingId === listing.id ? (
                    <div className={styles.buyPanel}>
                      {myCharacters.length === 0 ? (
                        <p className={styles.muted}>
                          You need an active WestMarches.games character to buy items.
                        </p>
                      ) : (
                        <>
                          <label htmlFor={`buyer-character-${listing.id}`}>
                            Buying character
                          </label>
                          <select
                            id={`buyer-character-${listing.id}`}
                            className={styles.select}
                            value={selectedCharacterId}
                            onChange={(event) => setSelectedCharacterId(event.target.value)}
                          >
                            <option value="">Choose a character...</option>
                            {myCharacters.map((character) => (
                              <option key={character.id} value={character.id}>
                                {character.name}
                              </option>
                            ))}
                          </select>
                          {purchaseError ? (
                            <p className={styles.errorText}>{purchaseError}</p>
                          ) : null}
                          <div className={styles.buyActions}>
                            <button
                              type="button"
                              className={styles.actionButton}
                              disabled={isPurchasing || !selectedCharacterId}
                              onClick={() => confirmPurchase(listing)}
                            >
                              {isPurchasing ? "Purchasing..." : "Confirm Purchase"}
                            </button>
                            <button
                              type="button"
                              className={styles.secondaryButton}
                              onClick={() => setActiveListingId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={styles.actionButton}
                      onClick={() => (user ? startBuyFlow(listing.id) : handleLogin())}
                    >
                      {user ? "Buy" : "Log in to buy"}
                    </button>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}
