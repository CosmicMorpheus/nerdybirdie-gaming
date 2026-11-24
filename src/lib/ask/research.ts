import type { AskSource } from './retrieve';

/** What outside research returned for one question. Every source here was actually returned by the search. */
export interface Findings {
  /** Short, spoiler-safe answer to the missing detail. */
  answer: string;
  /** Story-revealing part, shown only after the player chooses to reveal it. */
  spoilerDetail: string | null;
  spoilerLevel: 'none' | 'minor' | 'major';
  /** Claims from outside sources, each tied to source indexes. */
  reports: { claim: string; sources: number[] }[];
  /** Plain-language description of each specific disagreement between sources. */
  disagreements: string[];
  /** What is still uncertain. */
  uncertain: string[];
  sources: (AskSource & { kind: 'official' | 'guide' | 'creator' | 'community' })[];
  /** Draft guide entry fields, for the review queue (never published without approval). */
  proposed: { title: string; summary: string; steps: string[]; facts: { label: string; value: string }[]; category: string } | null;
  platform: string | null;
  patch: string | null;
}

export interface Researcher {
  readonly label: string;
  research(question: string, guideContext: string, spoilerMode: string): Promise<Findings | null>;
}

/**
 * TEST DATA ONLY. Canned outside-source results for the demo and tests, keyed by a word in the question.
 * Every value is clearly fake ("Example Guide Site", example.com) and never reaches the real site.
 */
export class TestResearcher implements Researcher {
  readonly label = 'TEST researcher (canned test data)';
  calls = 0;
  constructor(private canned: Record<string, Findings>) {}
  async research(question: string) {
    this.calls++;
    const key = Object.keys(this.canned).find((k) => question.toLowerCase().includes(k));
    return key ? structuredClone(this.canned[key]!) : null;
  }
}
