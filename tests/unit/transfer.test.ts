import { describe, expect, it } from 'vitest';
import { emptyProgress, setCompleted, setNote, setPrefs } from '../../src/lib/progress/model';
import { decodeTransfer, encodeTransfer, transferLink } from '../../src/lib/progress/transfer';

describe('transfer link', () => {
  it('round-trips progress through a compressed code and a link', async () => {
    let p = setCompleted(emptyProgress(), 'gta-vi|map', 'gta-vi:map:collectible-card-086', true);
    p = setNote(setPrefs(p, { spoilerMode: 'minor' }), 'gta-vi|guides', 'gta-vi:entry:x', 'try at night');
    const code = await encodeTransfer(p);
    expect(code.startsWith('z.')).toBe(true);
    const r = await decodeTransfer(transferLink('https://example.com', code));
    expect(r.ok && r.progress.contexts).toEqual(p.contexts);
    expect(r.ok && r.progress.prefs.spoilerMode).toBe('minor');
  });
  it('stays reasonably short even with a lot of progress', async () => {
    let p = emptyProgress();
    for (let i = 0; i < 2500; i++) p = setCompleted(p, 'gta-vi|map', `gta-vi:map:collectible-card-${i}`, true, new Date(1764000000000 + i * 1000));
    expect((await encodeTransfer(p)).length).toBeLessThan(60_000);
  });
  it('rejects junk and damaged codes without throwing', async () => {
    expect(await decodeTransfer('hello')).toMatchObject({ ok: false });
    expect(await decodeTransfer('z.AAAA')).toMatchObject({ ok: false });
    expect(await decodeTransfer('j.' + btoa('{"schemaVersion":2}'))).toMatchObject({ ok: false });
  });
});
