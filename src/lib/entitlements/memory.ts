import type { AuditEntry, GrantRecord, PurchaseRecord, Repo, Store } from './model';

/** In-memory ledger for tests and local demos. The real one is Supabase (supabase/migrations/…_entitlements.sql). */
export function memoryRepo(): Repo & { log: AuditEntry[]; purchases: PurchaseRecord[] } {
  const purchases: PurchaseRecord[] = [];
  const grants: GrantRecord[] = [];
  const log: AuditEntry[] = [];
  const key = (s: Store, t: string) => `${s}\u0000${t}`;
  return {
    purchases, log,
    async findPurchase(store, token) { return purchases.find((p) => key(p.store, p.token) === key(store, token)); },
    async savePurchase(p) {
      const i = purchases.findIndex((x) => key(x.store, x.token) === key(p.store, p.token));
      if (i >= 0) purchases[i] = p; else purchases.push(p);
    },
    async purchasesFor(userId) { return purchases.filter((p) => p.userId === userId); },
    async saveGrant(g) { grants.push(g); },
    async grantsFor(userId) { return grants.filter((g) => g.userId === userId); },
    async audit(e) { log.push(e); },
  };
}
