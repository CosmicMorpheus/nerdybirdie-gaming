import config from '../../content/ask/config.json' with { type: 'json' };
import { AnthropicResearcher } from '../../src/lib/ask/anthropic.ts';
import { blobStore } from '../../src/lib/ask/blobs.ts';
import type { AskDoc } from '../../src/lib/ask/retrieve.ts';

export { config as askConfig };
export const store = () => blobStore();

/** Live search only when an API key is configured on the server (Netlify env var ANTHROPIC_API_KEY). */
export function researcher() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new AnthropicResearcher({ model: process.env.ASK_COZMC_MODEL || config.model, maxUses: config.limits.maxWebSearchesPerQuestion, domains: config.trustedSearchDomains });
}

let cache: { at: number; data: { docs: AskDoc[]; sectionLabels: Record<string, string> } } | null = null;
/** The published guide index, built with the site (same content players see). Cached for 5 minutes per instance. */
export async function guideIndex(origin: string) {
  if (cache && Date.now() - cache.at < 300_000) return cache.data;
  const r = await fetch(`${origin}/data/gta-vi/ask-index.json`);
  if (!r.ok) throw new Error(`ask-index ${r.status}`);
  cache = { at: Date.now(), data: await r.json() };
  return cache.data;
}

export const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

/** Constant-time check of the editor token (Netlify env var GUIDE_ADMIN_TOKEN). */
export function isEditor(req: Request): boolean {
  const want = process.env.GUIDE_ADMIN_TOKEN ?? '';
  const got = (req.headers.get('authorization') ?? '').replace(/^Bearer /, '');
  if (want.length < 24 || got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
}
