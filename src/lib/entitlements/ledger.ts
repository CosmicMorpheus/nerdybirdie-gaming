import type { AuditEntry, EntitlementStatus, Grant, PurchaseRecord, PurchaseState, Repo, Store, VerifiedPurchase } from './model';
import { PRODUCTS, productForStoreId } from './model';

export type RecordResult =
  | { ok: true; purchase: PurchaseRecord; status: EntitlementStatus; changed: boolean }
  | { ok: false; reason: 'unknown-product' | 'token-belongs-to-another-account' | 'store-mismatch' };

const UNLOCKS: ReadonlySet<PurchaseState> = new Set(['purchased']);

/**
 * Record a verified purchase for a signed-in user. Idempotent: the same token again just updates its state.
 * A token already tied to another account is refused, so one purchase can never create two owners.
 */
export async function recordPurchase(repo: Repo, userId: string, v: VerifiedPurchase, now = new Date()): Promise<RecordResult> {
  const product = productForStoreId(v.store, v.storeProductId);
  if (!product) return { ok: false, reason: 'unknown-product' };
  const at = now.toISOString();
  const existing = await repo.findPurchase(v.store, v.token);
  if (existing && existing.userId !== userId) {
    await audit(repo, { at, actor: userId, action: 'purchase.refused', target: tokenRef(v.store, v.token), detail: 'token belongs to another account' });
    return { ok: false, reason: 'token-belongs-to-another-account' };
  }
  if (existing && existing.productId !== product.id) return { ok: false, reason: 'store-mismatch' };
  // A purchase that has been refunded or revoked never comes back to life from a stale client report.
  const state = existing && isFinal(existing.state) ? existing.state : v.state;
  const purchase: PurchaseRecord = {
    ...v, state, userId, productId: product.id, acknowledged: v.acknowledged || Boolean(existing?.acknowledged),
    createdAt: existing?.createdAt ?? at, updatedAt: at,
  };
  const changed = !existing || existing.state !== purchase.state || existing.acknowledged !== purchase.acknowledged;
  if (changed) {
    await repo.savePurchase(purchase);
    await audit(repo, { at, actor: userId, action: existing ? 'purchase.updated' : 'purchase.recorded', target: tokenRef(v.store, v.token), detail: purchase.state });
  }
  return { ok: true, purchase, status: await statusFor(repo, userId, product.grants[0]), changed };
}

/**
 * Apply a state change reported by the store itself (refund, revocation, pending → purchased), e.g. from Google's
 * Real-time Developer Notifications or the daily reconciliation. Unknown tokens are ignored (logged).
 */
export async function applyStoreEvent(repo: Repo, store: Store, token: string, state: PurchaseState, now = new Date()): Promise<PurchaseRecord | undefined> {
  const at = now.toISOString();
  const p = await repo.findPurchase(store, token);
  if (!p) { await audit(repo, { at, actor: `store:${store}`, action: 'event.unknown-token', target: tokenRef(store, token), detail: state }); return undefined; }
  if (p.state === state || isFinal(p.state)) return p;
  const next = { ...p, state, updatedAt: at };
  await repo.savePurchase(next);
  await audit(repo, { at, actor: `store:${store}`, action: 'purchase.state', target: tokenRef(store, token), detail: `${p.state} → ${state}` });
  return next;
}

/** Manual access for support or store reviewers. Always traceable to an admin and a reason; never counted as revenue. */
export async function grantManually(repo: Repo, adminId: string, userId: string, grant: Grant, reason: string, now = new Date()) {
  if (!reason.trim()) throw new Error('A reason is required for a manual grant');
  const at = now.toISOString();
  await repo.saveGrant({ userId, grant, grantedBy: adminId, reason: reason.trim(), active: true, createdAt: at });
  await audit(repo, { at, actor: adminId, action: 'grant.added', target: `${userId}:${grant}`, detail: reason.trim() });
}

/** The one question the server asks before returning anything Pro-only. */
export async function statusFor(repo: Repo, userId: string, grant: Grant): Promise<EntitlementStatus> {
  if ((await repo.grantsFor(userId)).some((g) => g.active && g.grant === grant)) return 'owned';
  const productIds = new Set(PRODUCTS.filter((p) => p.grants.includes(grant)).map((p) => p.id));
  const mine = (await repo.purchasesFor(userId)).filter((p) => productIds.has(p.productId));
  if (mine.some((p) => UNLOCKS.has(p.state))) return 'owned';
  if (mine.some((p) => p.state === 'pending')) return 'pending';
  return 'none';
}

export const hasAccess = async (repo: Repo, userId: string, grant: Grant) => (await statusFor(repo, userId, grant)) === 'owned';

/** Purchases the server still has to acknowledge with the store (Google refunds unacknowledged purchases after a deadline). */
export const needsAcknowledgement = (p: PurchaseRecord) => p.state === 'purchased' && !p.acknowledged;

const isFinal = (s: PurchaseState) => s === 'refunded' || s === 'revoked';
/** Audit entries never hold the full token. */
const tokenRef = (store: Store, token: string) => `${store}:…${token.slice(-8)}`;
const audit = (repo: Repo, e: AuditEntry) => repo.audit(e);
