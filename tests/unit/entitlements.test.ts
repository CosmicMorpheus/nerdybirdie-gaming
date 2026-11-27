import { describe, expect, it } from 'vitest';
import { applyStoreEvent, grantManually, hasAccess, needsAcknowledgement, recordPurchase, statusFor } from '../../src/lib/entitlements/ledger';
import { memoryRepo } from '../../src/lib/entitlements/memory';
import type { VerifiedPurchase } from '../../src/lib/entitlements/model';
import { fromPlayPurchase, testStoreAllowed, testVerifier } from '../../src/lib/entitlements/stores';

const v = (token: string, state: VerifiedPurchase['state'], over: Partial<VerifiedPurchase> = {}): VerifiedPurchase =>
  ({ store: 'google_play', token, storeProductId: 'pro_unlock', orderId: 'GPA.1', state, acknowledged: false, ...over });

describe('Pro unlock ledger (brief §23 checks that need no store account)', () => {
  it('a verified purchase unlocks Pro for that account only', async () => {
    const repo = memoryRepo();
    const r = await recordPurchase(repo, 'alice', v('tok-1', 'purchased'));
    expect(r.ok && r.status).toBe('owned');
    expect(await hasAccess(repo, 'alice', 'pro')).toBe(true);
    expect(await hasAccess(repo, 'bob', 'pro')).toBe(false);
    // Pro is not a per-guide unlock: no guide grant appears by accident.
    expect(await hasAccess(repo, 'alice', 'guide:gta-vi')).toBe(false);
  });

  it('pending and canceled purchases do not unlock', async () => {
    const repo = memoryRepo();
    const p = await recordPurchase(repo, 'alice', v('tok-p', 'pending'));
    expect(p.ok && p.status).toBe('pending');
    await recordPurchase(repo, 'bob', v('tok-c', 'canceled'));
    expect(await hasAccess(repo, 'alice', 'pro')).toBe(false);
    expect(await statusFor(repo, 'bob', 'pro')).toBe('none');
    // The pending one clears later (store event) and then unlocks.
    await applyStoreEvent(repo, 'google_play', 'tok-p', 'purchased');
    expect(await hasAccess(repo, 'alice', 'pro')).toBe(true);
  });

  it('the same token twice is idempotent, and a token can never belong to two accounts', async () => {
    const repo = memoryRepo();
    await recordPurchase(repo, 'alice', v('tok-dup', 'purchased'));
    const again = await recordPurchase(repo, 'alice', v('tok-dup', 'purchased'));
    expect(again.ok && again.changed).toBe(false);
    const stolen = await recordPurchase(repo, 'mallory', v('tok-dup', 'purchased'));
    expect(stolen).toEqual({ ok: false, reason: 'token-belongs-to-another-account' });
    expect(repo.purchases).toHaveLength(1);
    expect(await hasAccess(repo, 'mallory', 'pro')).toBe(false);
    expect(repo.log.some((e) => e.action === 'purchase.refused')).toBe(true);
  });

  it('a refund or revocation removes access, and a stale "purchased" report cannot bring it back', async () => {
    const repo = memoryRepo();
    await recordPurchase(repo, 'alice', v('tok-r', 'purchased'));
    await applyStoreEvent(repo, 'google_play', 'tok-r', 'refunded');
    expect(await hasAccess(repo, 'alice', 'pro')).toBe(false);
    const replay = await recordPurchase(repo, 'alice', v('tok-r', 'purchased'));
    expect(replay.ok && replay.purchase.state).toBe('refunded');
    expect(await hasAccess(repo, 'alice', 'pro')).toBe(false);
  });

  it('restoring on a new device (same account, same token) keeps ownership without a second purchase', async () => {
    const repo = memoryRepo();
    await recordPurchase(repo, 'alice', v('tok-x', 'purchased'));
    const restored = await recordPurchase(repo, 'alice', v('tok-x', 'purchased', { acknowledged: true }));
    expect(restored.ok && restored.status).toBe('owned');
    expect(repo.purchases).toHaveLength(1);
  });

  it('unknown products are refused; unacknowledged purchases are flagged for acknowledgement', async () => {
    const repo = memoryRepo();
    expect(await recordPurchase(repo, 'alice', v('tok-u', 'purchased', { storeProductId: 'something_else' }))).toEqual({ ok: false, reason: 'unknown-product' });
    const r = await recordPurchase(repo, 'alice', v('tok-a', 'purchased'));
    expect(r.ok && needsAcknowledgement(r.purchase)).toBe(true);
  });

  it('manual grants need a reason, are audited, and are kept apart from purchases', async () => {
    const repo = memoryRepo();
    await expect(grantManually(repo, 'admin-1', 'reviewer', 'pro', '  ')).rejects.toThrow(/reason/);
    await grantManually(repo, 'admin-1', 'reviewer', 'pro', 'Google Play review access');
    expect(await hasAccess(repo, 'reviewer', 'pro')).toBe(true);
    expect(repo.purchases).toHaveLength(0);
    expect(repo.log.at(-1)).toMatchObject({ actor: 'admin-1', action: 'grant.added' });
  });

  it('audit entries never contain the full purchase token', async () => {
    const repo = memoryRepo();
    const token = 'secret-token-abcdefghijklmnop-12345678';
    await recordPurchase(repo, 'alice', v(token, 'purchased'));
    expect(JSON.stringify(repo.log)).not.toContain(token);
  });
});

describe('store adapters', () => {
  it('maps Google Play purchase states, and a consumed purchase never counts as a permanent unlock', () => {
    expect(fromPlayPurchase('t', 'pro_unlock', { purchaseState: 0, acknowledgementState: 1 })).toMatchObject({ state: 'purchased', acknowledged: true });
    expect(fromPlayPurchase('t', 'pro_unlock', { purchaseState: 2 }).state).toBe('pending');
    expect(fromPlayPurchase('t', 'pro_unlock', { purchaseState: 1 }).state).toBe('canceled');
    expect(fromPlayPurchase('t', 'pro_unlock', { purchaseState: 0, consumptionState: 1 }).state).toBe('revoked');
  });

  it('the test store runs only on a staging deploy, never on the production domain', () => {
    const prod = ['gameguides-nerdy-birdie.live', 'nerdybirdiegameguides.netlify.app'];
    expect(testStoreAllowed({}, prod)).toBe(false);
    expect(testStoreAllowed({ NB_ENV: 'staging' }, prod)).toBe(false);
    expect(testStoreAllowed({ NB_ENV: 'staging', NB_TEST_STORE: 'on', URL: 'https://gameguides-nerdy-birdie.live' }, prod)).toBe(false);
    expect(testStoreAllowed({ NB_ENV: 'production', NB_TEST_STORE: 'on', URL: 'https://staging.example.netlify.app' }, prod)).toBe(false);
    expect(testStoreAllowed({ NB_ENV: 'staging', NB_TEST_STORE: 'on', URL: 'https://nb-staging.netlify.app' }, prod)).toBe(true);
  });

  it('the test verifier accepts only well-formed test tokens', async () => {
    const t = testVerifier();
    await expect(t.verify('test-purchased-1', 'pro_unlock')).resolves.toMatchObject({ state: 'purchased', store: 'test' });
    await expect(t.verify('GPA.real-token', 'pro_unlock')).rejects.toThrow();
  });
});
