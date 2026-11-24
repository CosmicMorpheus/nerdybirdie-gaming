/** Netlify Blobs adapter for the JsonStore interface. SERVER ONLY. */
import { getStore } from '@netlify/blobs';
import type { JsonStore } from './store';

export function blobStore(name = 'ask-cozmc'): JsonStore {
  const s = getStore({ name, consistency: 'strong' });
  return {
    get: async <T,>(key: string) => ((await s.get(key, { type: 'json' })) as T | null),
    set: async (key: string, value: unknown) => { await s.setJSON(key, value); },
    delete: async (key: string) => { await s.delete(key); },
    list: async (prefix: string) => (await s.list({ prefix })).blobs.map((b) => b.key).sort(),
  };
}
