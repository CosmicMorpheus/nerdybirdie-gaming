import { contextKey } from '../lib/progress/model';
import { tally } from '../lib/progress/totals';
import { GUIDES_CONTEXT } from './Hud';
import { useProgress } from './useProgress';

interface G { slug: string; title: string; summary: string; stepIds: string[]; checkedAt: string | null; draft: boolean }
interface Props { gameId: string; base: string; categories: { id: string; label: string; blurb: string; guides: G[] }[] }

/** Guides as a quest board: every section, its guides, and how far you've got in each. */
export default function GuideBoard({ gameId, base, categories }: Props) {
  const { progress, ready } = useProgress();
  const done = progress.contexts[contextKey(gameId, GUIDES_CONTEXT)]?.completed ?? {};
  return (
    <div class="board">
      {categories.map((c) => {
        const t = tally(c.guides.flatMap((g) => g.stepIds), done);
        return (
          <section key={c.id} class={`quest${c.guides.length ? '' : ' locked'}`} aria-labelledby={`q-${c.id}`}>
            <header>
              <h2 id={`q-${c.id}`}>{c.label}</h2>
              {c.guides.length === 0 ? <span class="badge-px">Coming soon</span>
                : t.percent === 100 ? <span class="stamp">Cleared</span>
                : <span class="badge-px">{ready ? `${t.done}/${t.total}` : '…'}</span>}
            </header>
            <p class="small muted">{c.blurb}</p>
            {c.guides.length > 0 && (
              <ul>
                {c.guides.map((g) => {
                  const gt = tally(g.stepIds, done);
                  return (
                    <li key={g.slug}>
                      <a href={`${base}${g.slug}/`}>
                        <strong>{g.title}</strong>
                        <span class="small muted">{g.summary}</span>
                        <span class="bar" aria-hidden="true"><i style={{ width: `${gt.percent ?? 0}%` }} /></span>
                        <span class="small muted">{gt.percent === 100 ? '★ Cleared' : `${gt.done}/${gt.total} steps`}{g.checkedAt ? ` · checked ${g.checkedAt}` : ''}{g.draft ? ' · DRAFT' : ''}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
