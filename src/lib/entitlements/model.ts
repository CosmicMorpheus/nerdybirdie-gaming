/**
 * Optional Pro unlock (founder decision A, 27 Nov 2026): the website and every guide stay free; Pro is a one-time,
 * non-consumable purchase in the Android app that adds cloud sync, offline access and future premium tools.
 * Ownership belongs to the account, so it works on every device and in the browser once signed in.
 *
 * This module is the store-agnostic core: products, purchase states and the rule that turns verified purchases into
 * entitlements. It never trusts the client: a purchase only counts after a store verifier (server side) has checked it.
 * Nothing here is switched on yet (docs/PRO_UNLOCK.md).
 */

/** What an entitlement unlocks. `pro` today; per-guide grants (`guide:<id>`) are possible later without schema changes. */
export type Grant = 'pro' | `guide:${string}`;
export type Store = 'google_play' | 'test';

export interface Product {
  /** Our stable id, never shown to customers. */
  id: string;
  grants: Grant[];
  /** Store-specific product ids. Prices are never stored here: the store supplies the local price. */
  storeIds: Partial<Record<Store, string>>;
}

/** Proposed ids (confirm before registering in Play Console; they can't be changed after). No game trademarks in ids. */
export const PRODUCTS: readonly Product[] = [
  { id: 'nb-pro', grants: ['pro'], storeIds: { google_play: 'pro_unlock', test: 'pro_unlock' } },
];

export function productForStoreId(store: Store, storeProductId: string): Product | undefined {
  return PRODUCTS.find((p) => p.storeIds[store] === storeProductId);
}

/**
 * Normalised purchase state after server-side verification.
 * pending: paid but not cleared (e.g. cash payment): never unlocks. purchased: unlocks. canceled: never completed.
 * refunded / revoked: was owned, access removed.
 */
export type PurchaseState = 'pending' | 'purchased' | 'canceled' | 'refunded' | 'revoked';

export interface VerifiedPurchase {
  store: Store;
  /** The store's purchase token: unique per purchase, the key for duplicate protection. */
  token: string;
  storeProductId: string;
  orderId: string | null;
  state: PurchaseState;
  acknowledged: boolean;
}

export type EntitlementStatus = 'owned' | 'pending' | 'none';
export type EntitlementSource = 'purchase' | 'grant';

export interface PurchaseRecord extends VerifiedPurchase {
  userId: string;
  productId: string;
  createdAt: string;
  updatedAt: string;
}

export interface GrantRecord {
  userId: string;
  grant: Grant;
  /** Who granted it (admin user id) and why: support, reviewer access, testing. Never mistaken for a paid purchase. */
  grantedBy: string;
  reason: string;
  active: boolean;
  createdAt: string;
}

export interface AuditEntry {
  at: string;
  actor: string;
  action: string;
  target: string;
  detail?: string;
}

/** The ledger's storage. A Supabase implementation sits behind the server functions; tests use the in-memory one. */
export interface Repo {
  findPurchase(store: Store, token: string): Promise<PurchaseRecord | undefined>;
  savePurchase(p: PurchaseRecord): Promise<void>;
  purchasesFor(userId: string): Promise<PurchaseRecord[]>;
  saveGrant(g: GrantRecord): Promise<void>;
  grantsFor(userId: string): Promise<GrantRecord[]>;
  audit(e: AuditEntry): Promise<void>;
}

/** Verifies a token with the store (server side only). Google's implementation calls the Play Developer API. */
export interface StoreVerifier {
  store: Store;
  verify(token: string, storeProductId: string): Promise<VerifiedPurchase>;
}
