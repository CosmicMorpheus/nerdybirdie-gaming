import type { Config } from '@netlify/functions';
import { getOverrides } from '../../src/lib/ask/queue.ts';
import { json, store } from '../lib/shared.mts';

/**
 * Approved guide changes, live before the next site build. Public (it's published content).
 * GET → entries without spoiler details; GET ?protected=1 → spoiler details only (fetched on reveal).
 */
/** Off unless the founder turns ASK server features on (ASK_SERVER_ENABLED=on); otherwise nothing is stored or served. */
const enabled = () => process.env.ASK_SERVER_ENABLED === 'on';

export default async (req: Request) => {
  if (!enabled()) return json({ error: 'ASK server features are switched off' }, 404);
  const o = await getOverrides(store());
  if (new URL(req.url).searchParams.get('protected') === '1')
    return json(Object.fromEntries(Object.values(o).filter((x) => x.entry.details).map((x) => [x.entry.id, { title: x.entry.title, summary: x.entry.details!.summary, steps: x.entry.details!.steps }])));
  return json(Object.values(o).map(({ entry: { details, ...e }, approvedAt, version }) => ({ ...e, hasDetails: !!details, approvedAt, version })));
};
export const config: Config = { path: '/api/guide-overrides' };
