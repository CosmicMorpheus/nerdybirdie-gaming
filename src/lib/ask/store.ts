/** Minimal key/value JSON store. Netlify Blobs in production; in-memory in tests and the demo. */
export interface JsonStore {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

export class MemoryStore implements JsonStore {
  data = new Map<string, string>();
  async get<T>(key: string) { const v = this.data.get(key); return v === undefined ? null : (JSON.parse(v) as T); }
  async set(key: string, value: unknown) { this.data.set(key, JSON.stringify(value)); }
  async delete(key: string) { this.data.delete(key); }
  async list(prefix: string) { return [...this.data.keys()].filter((k) => k.startsWith(prefix)).sort(); }
}
