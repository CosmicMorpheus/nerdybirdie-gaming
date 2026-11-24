/**
 * Live research with Claude + server-side web search. SERVER ONLY (Netlify Functions): the API key never reaches the browser.
 * Every returned source must be a URL the web search actually returned; anything else is dropped, and a claim that
 * loses all its sources becomes "uncertain". The model answers through a strict `submit_answer` tool.
 */
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { Findings, Researcher } from './research';

const Submit = z.object({
  answer: z.string().max(600),
  spoilerDetail: z.string().max(600).nullable(),
  spoilerLevel: z.enum(['none', 'minor', 'major']),
  reports: z.array(z.object({ claim: z.string().max(300), sources: z.array(z.number().int().min(0)) })).max(8),
  disagreements: z.array(z.string().max(400)).max(5),
  uncertain: z.array(z.string().max(300)).max(5),
  sources: z.array(z.object({ url: z.url({ protocol: /^https?$/ }), safeTitle: z.string().max(140), publisher: z.string().max(80), creator: z.string().max(80).nullable(), kind: z.enum(['official', 'guide', 'creator', 'community']) })).max(8),
  proposed: z.object({ title: z.string().max(120), summary: z.string().max(400), steps: z.array(z.string().max(300)).max(10), facts: z.array(z.object({ label: z.string().max(60), value: z.string().max(200) })).max(10), category: z.string().max(40) }).nullable(),
  platform: z.string().max(80).nullable(),
  patch: z.string().max(40).nullable(),
});

const SUBMIT_TOOL = {
  name: 'submit_answer',
  description: 'Return the final answer for the player. Call this exactly once, after searching.',
  strict: true,
  input_schema: {
    type: 'object', additionalProperties: false,
    required: ['answer', 'spoilerDetail', 'spoilerLevel', 'reports', 'disagreements', 'uncertain', 'sources', 'proposed', 'platform', 'patch'],
    properties: {
      answer: { type: 'string', description: 'Shortest useful spoiler-safe answer (max ~60 words). Say plainly if nothing reliable was found.' },
      spoilerDetail: { type: ['string', 'null'], description: 'Any story-revealing part (mission names, characters, plot). null if none.' },
      spoilerLevel: { type: 'string', enum: ['none', 'minor', 'major'] },
      reports: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['claim', 'sources'], properties: { claim: { type: 'string' }, sources: { type: 'array', items: { type: 'integer' }, description: 'Indexes into sources' } } } },
      disagreements: { type: 'array', items: { type: 'string' }, description: 'Each specific disagreement between sources, in plain language, naming who says what.' },
      uncertain: { type: 'array', items: { type: 'string' } },
      sources: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['url', 'safeTitle', 'publisher', 'creator', 'kind'], properties: {
        url: { type: 'string', description: 'Exact URL from the web search results' }, safeTitle: { type: 'string', description: 'Spoiler-free link title you write' },
        publisher: { type: 'string' }, creator: { type: ['string', 'null'] }, kind: { type: 'string', enum: ['official', 'guide', 'creator', 'community'] } } } },
      proposed: { type: ['object', 'null'], additionalProperties: false, required: ['title', 'summary', 'steps', 'facts', 'category'], properties: {
        title: { type: 'string' }, summary: { type: 'string', description: 'Original wording; never copy source text' }, steps: { type: 'array', items: { type: 'string' } },
        facts: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['label', 'value'], properties: { label: { type: 'string' }, value: { type: 'string' } } } },
        category: { type: 'string', enum: ['tips', 'walkthrough', 'money', 'vehicles', 'weapons', 'collectibles', 'side-missions', 'secrets', 'settings', 'videos'] } } },
      platform: { type: ['string', 'null'] }, patch: { type: ['string', 'null'] },
    },
  },
} as const;

const SYSTEM = `You research Grand Theft Auto VI (released 19 Nov 2026 on PS5 and Xbox Series X|S) questions for a free fan guide.
Rules:
- Only state what a source you found says. Never invent a location, map pin, unlock condition, reward, URL or source.
- Prefer Rockstar (rockstargames.com, support.rockstargames.com) for official changes; established guides or firsthand gameplay video for discoveries. Credit video creators.
- Do not confuse GTA V or GTA Online content with GTA VI.
- If sources disagree, describe exactly who says what. If nothing reliable is found, say so.
- Keep "answer" spoiler-free; put mission names, characters or plot in "spoilerDetail".
- Write in your own words; do not copy sentences from sources.
- Finish by calling submit_answer once.`;

export class AnthropicResearcher implements Researcher {
  readonly label = 'Claude + web search';
  private client: Anthropic;
  constructor(private opts: { model: string; maxUses: number; domains: string[]; effort?: 'low' | 'medium' | 'high' }) {
    this.client = new Anthropic(); // reads ANTHROPIC_API_KEY from the server environment
  }

  async research(question: string, guideContext: string, spoilerMode: string): Promise<Findings | null> {
    const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content:
      `Player question: ${question}\nPlayer's spoiler setting: ${spoilerMode}\nWhat our guide already says: ${guideContext}\nFind only what our guide is missing.` }];
    const seen = new Set<string>();
    for (let turn = 0; turn < 5; turn++) {
      const res = await this.client.beta.messages.create({
        model: this.opts.model,
        max_tokens: 16000,
        system: SYSTEM,
        output_config: { effort: this.opts.effort ?? 'low' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        tools: [
          { type: 'web_search_20260209', name: 'web_search', max_uses: this.opts.maxUses, allowed_domains: this.opts.domains },
          SUBMIT_TOOL as unknown as Anthropic.Beta.BetaTool,
        ],
        messages,
      } as Anthropic.Beta.MessageCreateParamsNonStreaming);
      for (const b of res.content) {
        if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) for (const r of b.content) if ('url' in r) seen.add(r.url);
      }
      if (res.stop_reason === 'refusal') return null;
      const call = res.content.find((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use' && b.name === 'submit_answer');
      if (call) return this.clean(call.input, seen);
      messages.push({ role: 'assistant', content: res.content });
      if (res.stop_reason !== 'pause_turn') messages.push({ role: 'user', content: 'Call submit_answer now with what you found (or report that nothing reliable was found).' });
    }
    return null;
  }

  /** Validate and drop any source the search didn't return. */
  private clean(input: unknown, seen: Set<string>): Findings | null {
    const p = Submit.safeParse(input);
    if (!p.success) return null;
    const d = p.data;
    const keep = d.sources.map((s, i) => ({ s, i })).filter(({ s }) => seen.has(s.url));
    const remap = new Map(keep.map(({ i }, j) => [i, j]));
    const reports = d.reports.map((r) => ({ claim: r.claim, sources: r.sources.filter((i) => remap.has(i)).map((i) => remap.get(i)!) }));
    const uncertain = [...d.uncertain, ...reports.filter((r) => r.sources.length === 0).map((r) => `Unsourced: ${r.claim}`)];
    const today = new Date().toISOString().slice(0, 10);
    return {
      answer: d.answer, spoilerDetail: d.spoilerDetail, spoilerLevel: d.spoilerLevel,
      reports: reports.filter((r) => r.sources.length), disagreements: d.disagreements, uncertain,
      sources: keep.map(({ s }) => ({ publisher: s.publisher, title: s.safeTitle, url: s.url, checkedAt: today, creator: s.creator, kind: s.kind })),
      proposed: keep.length ? d.proposed : null, platform: d.platform, patch: d.patch,
    };
  }
}
