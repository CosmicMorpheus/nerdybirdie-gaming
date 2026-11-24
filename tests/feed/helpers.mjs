export const A = 'UC' + 'a'.repeat(22);
export const B = 'UC' + 'b'.repeat(22);
export const t0 = Date.parse('2026-01-01T10:17:00Z');
export const day = 86400000;
export function memoryStore() {
  let entry = null, serial = 0;
  return {
    async read() { return structuredClone(entry); },
    async write(tag, data) {
      if (tag !== entry?.etag) return false;
      entry = { etag: String(++serial), data: structuredClone(data) }; return true;
    }
  };
}
export function video(id = 'sample00001', channel = A, title = 'GTA VI vehicle guide (test fixture)') {
  return { id, snippet: { title, channelId: channel, channelTitle: 'Test creator',
    publishedAt: '2025-12-30T05:00:00Z' }, status: { privacyStatus: 'public', uploadStatus: 'processed' } };
}
