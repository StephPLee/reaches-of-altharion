import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Layout from "@theme/Layout";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

import ToastStack from "../components/worldWiki/ToastStack";
import { useToasts } from "../components/worldWiki/useToasts";
import styles from "./marketplace.module.css";

type SessionUser = {
  id?: number;
  username: string;
  globalName: string | null;
};

type Listing = {
  id: number;
  sellerCharacterName: string;
  itemName: string;
  quantity: number;
  priceGold: number | null;
  priceSc: number | null;
  status: string;
  createdAt: string;
};

type MarketplaceRequest = {
  id: number;
  requesterCharacterName: string;
  itemName: string;
  quantity: number;
  offerPriceGold: number | null;
  offerPriceSc: number | null;
  status: string;
  createdAt: string;
};

type BuyerCharacter = {
  id: string;
  name: string;
  level: number;
};

type InventoryItem = {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  remainingQty: number;
};

type CurrencyType = "gold" | "sc";

const CURRENCY_LABELS: Record<CurrencyType, string> = { gold: "Gold", sc: "SC" };

function getAuthApiBaseUrl(siteConfig): string {
  const configuredBaseUrl = siteConfig.customFields?.authApiBaseUrl;
  return typeof configuredBaseUrl === "string"
    ? configuredBaseUrl.replace(/\/$/, "")
    : "";
}

function formatListingPrice(listing: Listing): string {
  const parts: string[] = [];
  if (listing.priceGold !== null) parts.push(`${listing.priceGold} Gold`);
  if (listing.priceSc !== null) parts.push(`${listing.priceSc} SC`);
  return parts.join(" / ");
}

function formatRequestPrice(request: MarketplaceRequest): string {
  const parts: string[] = [];
  if (request.offerPriceGold !== null) parts.push(`${request.offerPriceGold} Gold`);
  if (request.offerPriceSc !== null) parts.push(`${request.offerPriceSc} SC`);
  return parts.join(" / ");
}

function listingCurrencies(listing: Listing): CurrencyType[] {
  const currencies: CurrencyType[] = [];
  if (listing.priceGold !== null) currencies.push("gold");
  if (listing.priceSc !== null) currencies.push("sc");
  return currencies;
}

function requestCurrencies(request: MarketplaceRequest): CurrencyType[] {
  const currencies: CurrencyType[] = [];
  if (request.offerPriceGold !== null) currencies.push("gold");
  if (request.offerPriceSc !== null) currencies.push("sc");
  return currencies;
}

function listingUnitPrice(listing: Listing, currencyType: CurrencyType): number | null {
  return currencyType === "gold" ? listing.priceGold : listing.priceSc;
}

function requestUnitPrice(request: MarketplaceRequest, currencyType: CurrencyType): number | null {
  return currencyType === "gold" ? request.offerPriceGold : request.offerPriceSc;
}

export default function MarketplacePage(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const authApiBaseUrl = getAuthApiBaseUrl(siteConfig);

  const { toasts, showToast, dismissToast } = useToasts();
  const [activeTab, setActiveTab] = useState<"marketplace" | "requests">("marketplace");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [myCharacters, setMyCharacters] = useState<BuyerCharacter[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Marketplace (buy) state
  const [listings, setListings] = useState<Listing[]>([]);
  const [isListingsLoading, setIsListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState("");
  const [activeListingId, setActiveListingId] = useState<number | null>(null);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [buyCharacterId, setBuyCharacterId] = useState("");
  const [buyCurrency, setBuyCurrency] = useState<CurrencyType | "">("");
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");

  // Requests (fulfill) state
  const [requests, setRequests] = useState<MarketplaceRequest[]>([]);
  const [isRequestsLoading, setIsRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null);
  const [fulfillCharacterId, setFulfillCharacterId] = useState("");
  const [fulfillItemId, setFulfillItemId] = useState("");
  const [fulfillCurrency, setFulfillCurrency] = useState<CurrencyType | "">("");
  const [fulfillInventory, setFulfillInventory] = useState<InventoryItem[]>([]);
  const [isFulfillInventoryLoading, setIsFulfillInventoryLoading] = useState(false);
  const [isFulfilling, setIsFulfilling] = useState(false);
  const [fulfillError, setFulfillError] = useState("");

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
        setIsListingsLoading(true);
        setListingsError("");
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
          setListingsError(
            error instanceof Error ? error.message : "Failed to load marketplace listings.",
          );
        }
      } finally {
        if (!cancelled) setIsListingsLoading(false);
      }
    }

    loadListings();
    return () => {
      cancelled = true;
    };
  }, [authApiBaseUrl]);

  useEffect(() => {
    let cancelled = false;

    async function loadRequests() {
      try {
        setIsRequestsLoading(true);
        setRequestsError("");
        const response = await fetch(`${authApiBaseUrl}/api/marketplace/requests`, {
          credentials: "include",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load marketplace requests.");
        }
        if (!cancelled) {
          setRequests(Array.isArray(payload.requests) ? payload.requests : []);
        }
      } catch (error) {
        if (!cancelled) {
          setRequestsError(
            error instanceof Error ? error.message : "Failed to load marketplace requests.",
          );
        }
      } finally {
        if (!cancelled) setIsRequestsLoading(false);
      }
    }

    loadRequests();
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
        // Non-critical — buy/fulfill flows will just show no characters available.
      }
    }

    loadMyCharacters();
    return () => {
      cancelled = true;
    };
  }, [authApiBaseUrl, user]);

  useEffect(() => {
    if (!fulfillCharacterId) {
      setFulfillInventory([]);
      return;
    }

    let cancelled = false;

    async function loadInventory() {
      try {
        setIsFulfillInventoryLoading(true);
        const response = await fetch(
          `${authApiBaseUrl}/api/marketplace/characters/${fulfillCharacterId}/inventory`,
          { credentials: "include" },
        );
        if (!response.ok || cancelled) return;
        const payload = await response.json().catch(() => ({}));
        if (!cancelled) {
          setFulfillInventory(Array.isArray(payload.items) ? payload.items : []);
        }
      } catch {
        // Non-critical — item picker will just show nothing.
      } finally {
        if (!cancelled) setIsFulfillInventoryLoading(false);
      }
    }

    loadInventory();
    return () => {
      cancelled = true;
    };
  }, [authApiBaseUrl, fulfillCharacterId]);

  function handleLogin(): void {
    const returnTo =
      window.location.pathname + window.location.search + window.location.hash;
    window.location.href = `${authApiBaseUrl}/auth/discord/login?returnTo=${encodeURIComponent(returnTo)}`;
  }

  function startBuyFlow(listing: Listing): void {
    setActiveListingId(listing.id);
    setBuyQuantity(1);
    setBuyCharacterId("");
    const currencies = listingCurrencies(listing);
    setBuyCurrency(currencies.length === 1 ? currencies[0] : "");
    setPurchaseError("");
  }

  async function confirmPurchase(listing: Listing): Promise<void> {
    if (!buyCharacterId) {
      setPurchaseError("Choose which character is buying this item.");
      return;
    }
    if (!buyCurrency) {
      setPurchaseError("Choose which currency to pay with.");
      return;
    }

    try {
      setIsPurchasing(true);
      setPurchaseError("");

      const response = await fetch(
        `${authApiBaseUrl}/api/marketplace/listings/${listing.id}/purchase`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            buyerCharacterId: buyCharacterId,
            currencyType: buyCurrency,
            quantity: buyQuantity,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to complete purchase.");
      }

      const unitPrice = listingUnitPrice(listing, buyCurrency);
      const total = (unitPrice ?? 0) * buyQuantity;
      setListings((current) =>
        current
          .map((item) =>
            item.id === listing.id ? { ...item, quantity: item.quantity - buyQuantity } : item,
          )
          .filter((item) => item.quantity > 0),
      );
      setActiveListingId(null);
      showToast(
        "success",
        `Purchased ${buyQuantity}x ${listing.itemName} for ${total} ${CURRENCY_LABELS[buyCurrency]}.`,
      );
    } catch (error) {
      setPurchaseError(error instanceof Error ? error.message : "Failed to complete purchase.");
    } finally {
      setIsPurchasing(false);
    }
  }

  function startFulfillFlow(request: MarketplaceRequest): void {
    setActiveRequestId(request.id);
    setFulfillCharacterId("");
    setFulfillItemId("");
    const currencies = requestCurrencies(request);
    setFulfillCurrency(currencies.length === 1 ? currencies[0] : "");
    setFulfillError("");
  }

  async function confirmFulfill(request: MarketplaceRequest): Promise<void> {
    if (!fulfillCharacterId) {
      setFulfillError("Choose which character is fulfilling this request.");
      return;
    }
    if (!fulfillItemId) {
      setFulfillError("Choose which item to send.");
      return;
    }
    if (!fulfillCurrency) {
      setFulfillError("Choose which currency to be paid in.");
      return;
    }

    try {
      setIsFulfilling(true);
      setFulfillError("");

      const response = await fetch(
        `${authApiBaseUrl}/api/marketplace/requests/${request.id}/fulfill`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fulfillerCharacterId: fulfillCharacterId,
            fulfillerItemId: fulfillItemId,
            currencyType: fulfillCurrency,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to fulfill request.");
      }

      setRequests((current) => current.filter((item) => item.id !== request.id));
      setActiveRequestId(null);
      showToast("success", `Fulfilled ${request.itemName} for ${formatRequestPrice(request)}.`);
    } catch (error) {
      setFulfillError(error instanceof Error ? error.message : "Failed to fulfill request.");
    } finally {
      setIsFulfilling(false);
    }
  }

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredListings = normalizedQuery
    ? listings.filter(
        (listing) =>
          listing.itemName.toLowerCase().includes(normalizedQuery) ||
          listing.sellerCharacterName.toLowerCase().includes(normalizedQuery),
      )
    : listings;
  const filteredRequests = normalizedQuery
    ? requests.filter(
        (request) =>
          request.itemName.toLowerCase().includes(normalizedQuery) ||
          request.requesterCharacterName.toLowerCase().includes(normalizedQuery),
      )
    : requests;

  return (
    <Layout title="Marketplace" description="Player-run item marketplace for Reaches of Altharion.">
      <div className={styles.page}>
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <div className={styles.shell}>
          <h1 className={styles.heading}>Marketplace</h1>
          <p className={styles.intro}>
            {activeTab === "marketplace"
              ? "Browse items crafted and listed by other players. Buying an item moves it to your character's WestMarches.games inventory and moves the price from your character to the seller's."
              : "Browse items other players are looking for. Fulfilling a request sends one of your own items to the requester and pays you their offered price."}
          </p>

          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tab} ${activeTab === "marketplace" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("marketplace")}
            >
              Marketplace
            </button>
            <button
              type="button"
              className={`${styles.tab} ${activeTab === "requests" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("requests")}
            >
              Requests
            </button>
          </div>

          <div className={styles.controls}>
            <label className={styles.searchField}>
              <span className={styles.searchLabel}>
                {activeTab === "marketplace" ? "Find an Item" : "Find a Request"}
              </span>
              <input
                type="search"
                className={styles.searchInput}
                placeholder={
                  activeTab === "marketplace"
                    ? "Search by item or seller"
                    : "Search by item or requester"
                }
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
          </div>

          {activeTab === "marketplace" ? (
            <>
              {listingsError ? <p className={styles.error}>{listingsError}</p> : null}

              {isListingsLoading ? (
                <p className={styles.hint}>Loading listings...</p>
              ) : filteredListings.length === 0 ? (
                <p className={styles.hint}>
                  {normalizedQuery
                    ? "No listings match that search."
                    : "No active listings right now. Check back later."}
                </p>
              ) : (
                <div className={styles.grid}>
                  {filteredListings.map((listing) => {
                    const currencies = listingCurrencies(listing);
                    const unitPrice = buyCurrency
                      ? listingUnitPrice(listing, buyCurrency)
                      : null;
                    const total = unitPrice !== null ? unitPrice * buyQuantity : null;

                    return (
                      <div key={listing.id} className={styles.row}>
                        <span className={styles.itemName}>
                          {listing.itemName}
                          {listing.quantity > 1 ? (
                            <span className={styles.quantityBadge}>×{listing.quantity}</span>
                          ) : null}
                        </span>
                        <span className={styles.sellerText}>{listing.sellerCharacterName}</span>
                        <span className={styles.price}>{formatListingPrice(listing)}</span>

                        <div className={styles.rowActions}>
                          {activeListingId === listing.id ? (
                            <div className={styles.buyPanel}>
                              {myCharacters.length === 0 ? (
                                <span className={styles.hint}>
                                  You need an active character to buy items.
                                </span>
                              ) : (
                                <>
                                  {listing.quantity > 1 ? (
                                    <input
                                      type="number"
                                      className={styles.quantityInput}
                                      min={1}
                                      max={listing.quantity}
                                      value={buyQuantity}
                                      onChange={(event) => {
                                        const next = Number.parseInt(event.target.value, 10);
                                        setBuyQuantity(
                                          Number.isInteger(next)
                                            ? Math.min(Math.max(next, 1), listing.quantity)
                                            : 1,
                                        );
                                      }}
                                    />
                                  ) : null}
                                  {currencies.length > 1 ? (
                                    <select
                                      className={styles.select}
                                      value={buyCurrency}
                                      onChange={(event) =>
                                        setBuyCurrency(event.target.value as CurrencyType)
                                      }
                                    >
                                      <option value="">Currency...</option>
                                      {currencies.map((currency) => (
                                        <option key={currency} value={currency}>
                                          {CURRENCY_LABELS[currency]}
                                        </option>
                                      ))}
                                    </select>
                                  ) : null}
                                  <select
                                    className={styles.select}
                                    value={buyCharacterId}
                                    onChange={(event) => setBuyCharacterId(event.target.value)}
                                  >
                                    <option value="">Choose a character...</option>
                                    {myCharacters.map((character) => (
                                      <option key={character.id} value={character.id}>
                                        {character.name}
                                      </option>
                                    ))}
                                  </select>
                                  {total !== null ? (
                                    <span className={styles.totalText}>
                                      Total: {total} {CURRENCY_LABELS[buyCurrency as CurrencyType]}
                                    </span>
                                  ) : null}
                                  <button
                                    type="button"
                                    className={styles.claimButton}
                                    disabled={isPurchasing || !buyCharacterId || !buyCurrency}
                                    onClick={() => confirmPurchase(listing)}
                                  >
                                    {isPurchasing ? "Purchasing..." : "Confirm"}
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                className={styles.claimButton}
                                onClick={() => {
                                  setActiveListingId(null);
                                  setPurchaseError("");
                                }}
                              >
                                Cancel
                              </button>
                              {purchaseError ? (
                                <span className={styles.error}>{purchaseError}</span>
                              ) : null}
                            </div>
                          ) : (
                            <button
                              type="button"
                              className={styles.claimButton}
                              onClick={() => (user ? startBuyFlow(listing) : handleLogin())}
                            >
                              {user ? "Buy" : "Log In"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              {requestsError ? <p className={styles.error}>{requestsError}</p> : null}

              {isRequestsLoading ? (
                <p className={styles.hint}>Loading requests...</p>
              ) : filteredRequests.length === 0 ? (
                <p className={styles.hint}>
                  {normalizedQuery
                    ? "No requests match that search."
                    : "No open requests right now. Check back later."}
                </p>
              ) : (
                <div className={styles.grid}>
                  {filteredRequests.map((request) => {
                    const currencies = requestCurrencies(request);
                    const unitPrice = fulfillCurrency
                      ? requestUnitPrice(request, fulfillCurrency)
                      : null;
                    const total = unitPrice !== null ? unitPrice * request.quantity : null;

                    return (
                      <div key={request.id} className={styles.row}>
                        <span className={styles.itemName}>
                          {request.itemName}
                          {request.quantity > 1 ? (
                            <span className={styles.quantityBadge}>×{request.quantity}</span>
                          ) : null}
                        </span>
                        <span className={styles.sellerText}>{request.requesterCharacterName}</span>
                        <span className={styles.price}>{formatRequestPrice(request)}</span>

                        <div className={styles.rowActions}>
                          {activeRequestId === request.id ? (
                            <div className={styles.buyPanel}>
                              {myCharacters.length === 0 ? (
                                <span className={styles.hint}>
                                  You need an active character to fulfill requests.
                                </span>
                              ) : (
                                <>
                                  <select
                                    className={styles.select}
                                    value={fulfillCharacterId}
                                    onChange={(event) => {
                                      setFulfillCharacterId(event.target.value);
                                      setFulfillItemId("");
                                    }}
                                  >
                                    <option value="">Choose a character...</option>
                                    {myCharacters.map((character) => (
                                      <option key={character.id} value={character.id}>
                                        {character.name}
                                      </option>
                                    ))}
                                  </select>
                                  {fulfillCharacterId ? (
                                    isFulfillInventoryLoading ? (
                                      <span className={styles.hint}>Loading inventory...</span>
                                    ) : (
                                      <select
                                        className={styles.select}
                                        value={fulfillItemId}
                                        onChange={(event) => setFulfillItemId(event.target.value)}
                                      >
                                        <option value="">Choose an item to send...</option>
                                        {fulfillInventory.map((item) => (
                                          <option key={item.id} value={item.id}>
                                            {item.name}
                                          </option>
                                        ))}
                                      </select>
                                    )
                                  ) : null}
                                  {currencies.length > 1 ? (
                                    <select
                                      className={styles.select}
                                      value={fulfillCurrency}
                                      onChange={(event) =>
                                        setFulfillCurrency(event.target.value as CurrencyType)
                                      }
                                    >
                                      <option value="">Currency...</option>
                                      {currencies.map((currency) => (
                                        <option key={currency} value={currency}>
                                          {CURRENCY_LABELS[currency]}
                                        </option>
                                      ))}
                                    </select>
                                  ) : null}
                                  {total !== null ? (
                                    <span className={styles.totalText}>
                                      You receive: {total} {CURRENCY_LABELS[fulfillCurrency as CurrencyType]}
                                    </span>
                                  ) : null}
                                  <button
                                    type="button"
                                    className={styles.claimButton}
                                    disabled={
                                      isFulfilling ||
                                      !fulfillCharacterId ||
                                      !fulfillItemId ||
                                      !fulfillCurrency
                                    }
                                    onClick={() => confirmFulfill(request)}
                                  >
                                    {isFulfilling ? "Fulfilling..." : "Confirm"}
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                className={styles.claimButton}
                                onClick={() => {
                                  setActiveRequestId(null);
                                  setFulfillError("");
                                }}
                              >
                                Cancel
                              </button>
                              {fulfillError ? (
                                <span className={styles.error}>{fulfillError}</span>
                              ) : null}
                            </div>
                          ) : (
                            <button
                              type="button"
                              className={styles.claimButton}
                              onClick={() => (user ? startFulfillFlow(request) : handleLogin())}
                            >
                              {user ? "Fulfill" : "Log In"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
