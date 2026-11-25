import type { SpoilerLevel } from './content/schema';

/** safe = spoiler-free (the default), minor = minor gameplay spoilers, all = everything. */
export type SpoilerMode = 'safe' | 'minor' | 'all';
export const SPOILER_MODES: { id: SpoilerMode; label: string; hint: string }[] = [
  { id: 'safe', label: 'Spoiler-free', hint: 'Hide anything that gives story or secrets away' },
  { id: 'minor', label: 'Minor spoilers', hint: 'Show gameplay details, keep story hidden' },
  { id: 'all', label: 'All spoilers', hint: 'Show everything' },
];
export const DEFAULT_SPOILER_MODE: SpoilerMode = 'safe';

export function isSpoilerMode(v: unknown): v is SpoilerMode {
  return v === 'safe' || v === 'minor' || v === 'all';
}

/** Whether the mode allows showing text at this level without a deliberate reveal. */
export function modeAllows(level: SpoilerLevel, mode: SpoilerMode): boolean {
  if (level === 'none') return true;
  if (level === 'minor') return mode === 'minor' || mode === 'all';
  return mode === 'all';
}

export interface DisplayText {
  title: string;
  summary: string;
  /** How-to-unlock tip, when there is one (spoiler tips only after a reveal). */
  tip?: string;
  /** True when protected text exists but is not being shown. */
  concealed: boolean;
}

/**
 * What to show for an objective. Protected text is used only when it's loaded and either the mode
 * allows it or the person revealed this one item. Otherwise the safe fields, which never spoil.
 */
export function displayText(
  o: { safeTitle: string; safeSummary: string; spoilerLevel: SpoilerLevel; hasProtected: boolean; id: string; tip?: string },
  mode: SpoilerMode,
  revealed: ReadonlySet<string>,
  protectedById: Record<string, { title: string; summary: string; tip?: string }> | null,
): DisplayText {
  const tip = o.tip;
  if (!o.hasProtected) return { title: o.safeTitle, summary: o.safeSummary, concealed: false, tip };
  const allowed = modeAllows(o.spoilerLevel, mode) || revealed.has(o.id);
  const p = protectedById?.[o.id];
  if (allowed && p) return { title: p.title, summary: p.summary, concealed: false, tip: p.tip ?? tip };
  return { title: o.safeTitle, summary: o.safeSummary, concealed: true, tip };
}
