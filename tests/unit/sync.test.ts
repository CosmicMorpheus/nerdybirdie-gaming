import { describe, expect, it } from 'vitest';
import { emptyProgress, setCompleted, type Progress } from '../../src/lib/progress/model';
import { syncOnce, type Remote, type RemoteDoc } from '../../src/lib/account/sync';

/** In-memory server with one row per user and version checks, standing in for the database + access rules. */
class FakeServer {
  rows = new Map<string, RemoteDoc>();
  for(user: string): Remote {
    return {
      pull: async () => (this.rows.has(user) ? structuredClone(this.rows.get(user)!) : null),
      push: async (data: Progress, expected) => {
        const cur = this.rows.get(user);
        if ((cur?.version ?? null) !== expected) return 'conflict';
        const version = (cur?.version ?? 0) + 1;
        this.rows.set(user, { data: structuredClone(data), version });
        return version;
      },
    };
  }
}
const K = 'gta-vi|map';
const at = (s: string) => new Date(s);

describe('account sync', () => {
  it('a tick on one device is there after signing in on another', async () => {
    const server = new FakeServer();
    const phone = setCompleted(emptyProgress(), K, 'gta-vi:map:collectible-card-086', true, at('2026-11-24T10:00:00Z'));
    await syncOnce(phone, server.for('alice'));
    const { merged } = await syncOnce(emptyProgress(), server.for('alice')); // fresh browser, same account
    expect(merged.contexts[K]!.completed['gta-vi:map:collectible-card-086']).toBeTruthy();
  });
  it('an untick syncs too, and refresh keeps it', async () => {
    const server = new FakeServer();
    let p = setCompleted(emptyProgress(), K, 'gta-vi:map:a', true, at('2026-11-24T10:00:00Z'));
    await syncOnce(p, server.for('alice'));
    p = setCompleted(p, K, 'gta-vi:map:a', false, at('2026-11-24T10:05:00Z'));
    await syncOnce(p, server.for('alice'));
    const other = setCompleted(emptyProgress(), K, 'gta-vi:map:a', true, at('2026-11-24T09:00:00Z')); // stale device
    const { merged } = await syncOnce(other, server.for('alice'));
    expect(merged.contexts[K]!.completed['gta-vi:map:a']).toBeUndefined();
  });
  it('two devices writing at the same time keep both changes', async () => {
    const server = new FakeServer();
    const remote = server.for('alice');
    // Device B writes between A's pull and push: A gets a conflict, re-merges and retries.
    const realPull = remote.pull;
    let once = true;
    remote.pull = async () => {
      const doc = await realPull();
      if (once) { once = false; await syncOnce(setCompleted(emptyProgress(), K, 'gta-vi:map:b', true, at('2026-11-24T10:01:00Z')), server.for('alice')); }
      return doc;
    };
    const { merged } = await syncOnce(setCompleted(emptyProgress(), K, 'gta-vi:map:a', true, at('2026-11-24T10:00:00Z')), remote);
    expect(Object.keys(merged.contexts[K]!.completed).sort()).toEqual(['gta-vi:map:a', 'gta-vi:map:b']);
    expect(Object.keys((server.rows.get('alice')!.data as Progress).contexts[K]!.completed).sort()).toEqual(['gta-vi:map:a', 'gta-vi:map:b']);
  });
  it("players' rows are separate", async () => {
    const server = new FakeServer();
    await syncOnce(setCompleted(emptyProgress(), K, 'gta-vi:map:a', true), server.for('alice'));
    const { merged } = await syncOnce(emptyProgress(), server.for('bob'));
    expect(merged.contexts[K]).toBeUndefined();
  });
  it('gives up with a clear error if the server keeps conflicting', async () => {
    const remote: Remote = { pull: async () => null, push: async () => 'conflict' };
    await expect(syncOnce(emptyProgress(), remote, 2)).rejects.toThrow(/Couldn't sync/);
  });
});
