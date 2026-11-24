import { normalize } from '../search';

/** What kind of answer the player wants. Same subject + different intent = different question. */
export type Intent = 'location' | 'unlock' | 'keep' | 'missable' | 'money' | 'howto' | 'info';

const RULES: [Intent, RegExp][] = [
  ['keep', /\b(keep|stay|stays|still have|lose|lost|after (the )?mission|garage it|save it)\b/],
  ['missable', /\b(missable|miss it|miss out|permanently)\b/],
  ['location', /\b(where|location|located|find|spawn|spawns|spawning|found)\b/],
  ['unlock', /\b(unlock|unlocks|unlocked|requirement|requirements|prerequisite|available from|how do i get|how to get|obtain)\b/],
  ['money', /\b(money|cash|earn|payout|make \$|grind)\b/],
  ['howto', /\b(how (do|to|can)|what('s| is) the best way)\b/],
];

const STOP = new Set(('a an the is are was were do does did can could i you me my we our in on at to of for from with and or it its this that these those ' +
  'where location located find found spawn spawns spawning get obtain how what which when who why there here please gta gta6 vi game ' +
  'unlock unlocks unlocked keep still have lose lost after mission missable miss out permanently money cash earn best way does dose').split(' '));

export function intentOf(question: string): Intent {
  const q = ` ${normalize(question)} `;
  for (const [intent, re] of RULES) if (re.test(q)) return intent;
  return 'info';
}

/** The words that name what the question is about ("comet", "jack hearts card"). */
export function subjectTokens(question: string): string[] {
  return normalize(question).split(' ').filter((w) => w.length > 1 && !STOP.has(w));
}

/**
 * Grouping key for the Guide Updates queue. "Where does the Comet spawn?" and "Where can I find the Comet?" share a key;
 * "Can I keep the Comet after the mission?" does not. If the question matched a guide item, its id is the subject.
 */
export function clusterKey(question: string, matchedId?: string | null): string {
  const subject = matchedId ?? (subjectTokens(question).slice(0, 4).sort().join('-') || 'general');
  return `${intentOf(question)}:${subject}`;
}
