import type { PurchaseState, StoreVerifier, VerifiedPurchase } from './model';

/**
 * Google Play: map the Play Developer API's one-time product purchase (purchases.products.get) to our states.
 * purchaseState 0 = purchased, 1 = canceled, 2 = pending; acknowledgementState 1 = acknowledged.
 * The HTTP call itself needs the founder's Play Console service account and is added with the Android milestone.
 */
export interface PlayProductPurchase {
  purchaseState?: number;
  acknowledgementState?: number;
  consumptionState?: number;
  orderId?: string;
  productId?: string;
}

export function fromPlayPurchase(token: string, storeProductId: string, r: PlayProductPurchase): VerifiedPurchase {
  const state: PurchaseState = r.purchaseState === 0 ? 'purchased' : r.purchaseState === 2 ? 'pending' : 'canceled';
  // A consumed purchase is not a permanent unlock (we never consume Pro); treat it as revoked rather than owned.
  const finalState: PurchaseState = state === 'purchased' && r.consumptionState === 1 ? 'revoked' : state;
  return { store: 'google_play', token, storeProductId: r.productId ?? storeProductId, orderId: r.orderId ?? null, state: finalState, acknowledged: r.acknowledgementState === 1 };
}

/**
 * Where the test store may run: a staging deploy only, never production. Requires NB_ENV=staging and NB_TEST_STORE=on,
 * and refuses outright if the site URL is the production domain.
 */
export function testStoreAllowed(env: Record<string, string | undefined>, productionHosts: readonly string[]): boolean {
  if (env.NB_ENV !== 'staging' || env.NB_TEST_STORE !== 'on') return false;
  const url = env.URL ?? env.SITE_URL ?? '';
  let host = '';
  try { host = new URL(url).hostname; } catch { return false; }
  return !productionHosts.includes(host);
}

/**
 * Test store for proving the entitlement flow before Android exists. Tokens look like `test-<state>-<anything>`,
 * e.g. `test-purchased-1`, `test-pending-2`. Construct it only when testStoreAllowed() is true.
 */
export function testVerifier(): StoreVerifier {
  return {
    store: 'test',
    async verify(token, storeProductId) {
      const m = /^test-(purchased|pending|canceled)-[A-Za-z0-9]{1,40}$/.exec(token);
      if (!m) throw new Error('Not a test token');
      return { store: 'test', token, storeProductId, orderId: `TEST.${token}`, state: m[1] as PurchaseState, acknowledged: false };
    },
  };
}
