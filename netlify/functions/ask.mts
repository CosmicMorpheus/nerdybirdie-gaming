import type { Config, Context } from '@netlify/functions';
import { createHash } from 'node:crypto';
import { ask } from '../../src/lib/ask/engine.ts';
import { isSpoilerMode } from '../../src/lib/spoilers.ts';
import { askConfig, guideIndex, json, researcher, store } from '../lib/shared.mts';

/** POST /api/ask {question, spoilerMode} → answer. Free; no account needed. */
/** Off unless the founder turns ASK server features on (ASK_SERVER_ENABLED=on); otherwise nothing is stored or served. */
const enabled = () => process.env.ASK_SERVER_ENABLED === 'on';

export default async (req: Request, context: Context) => {
  if (!enabled()) return json({ error: 'ASK server features are switched off' }, 404);
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const body = (await req.json().catch(() => null)) as { question?: unknown; spoilerMode?: unknown } | null;
  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  if (question.length < 3 || question.length > 300) return json({ error: 'Ask a question between 3 and 300 characters.' }, 400);
  const mode = isSpoilerMode(body?.spoilerMode) ? body!.spoilerMode : 'safe';
  // Visitors are counted for usage limits by a daily salted hash of their IP; the IP itself is never stored.
  const visitor = createHash('sha256').update(`${context.ip}|${new Date().toISOString().slice(0, 10)}|${process.env.ASK_SALT ?? 'nbg'}`).digest('hex').slice(0, 16);
  const { docs, sectionLabels } = await guideIndex(new URL(req.url).origin);
  const help = process.env.GTA_HELP_CHANNEL_URL || 'https://discord.gg/VBeBE7MSSq';
  const result = await ask(question, mode, visitor, {
    store: store(), docs, sectionLabels, researcher: researcher(), config: askConfig,
    community: { label: process.env.GTA_HELP_CHANNEL_URL ? 'Ask in the COZMC GTA help channel' : 'Ask in the COZMC Discord', href: help },
  });
  return json(result);
};
export const config: Config = { path: '/api/ask' };
