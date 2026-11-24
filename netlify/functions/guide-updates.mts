import type { Config } from '@netlify/functions';
import { approve, getHistory, getOverrides, listQueue, saveDraft, setStatus, undo } from '../../src/lib/ask/queue.ts';
import { isEditor, json, store } from '../lib/shared.mts';

/** Private Guide Updates queue (editor token required). GET = list; POST {action, id, draft?, note?}. */
/** Off unless the founder turns ASK server features on (ASK_SERVER_ENABLED=on); otherwise nothing is stored or served. */
const enabled = () => process.env.ASK_SERVER_ENABLED === 'on';

export default async (req: Request) => {
  if (!enabled()) return json({ error: 'ASK server features are switched off' }, 404);
  if (!isEditor(req)) return json({ error: 'Editor token required' }, 401);
  const s = store();
  if (req.method === 'GET') return json({ items: await listQueue(s), overrides: await getOverrides(s), history: await getHistory(s) });
  const b = (await req.json().catch(() => ({}))) as { action?: string; id?: string; draft?: unknown; note?: string };
  if (!b.id) return json({ error: 'id required' }, 400);
  switch (b.action) {
    case 'save': return json(await saveDraft(s, b.id, b.draft));
    case 'approve': return json(await approve(s, b.id, b.draft));
    case 'dismiss': return json(await setStatus(s, b.id, 'dismissed', b.note));
    case 'verify': return json(await setStatus(s, b.id, 'needs-verification', b.note));
    case 'reopen': return json(await setStatus(s, b.id, 'open', b.note));
    case 'undo': return json({ ok: await undo(s, b.id) });
    default: return json({ error: 'unknown action' }, 400);
  }
};
export const config: Config = { path: '/api/guide-updates' };
