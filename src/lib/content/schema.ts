import { z } from 'zod';

/* Shared vocab, from docs/04_CONTENT_AND_MEDIA.md */
export const VerificationStatus = z.enum([
  'official_confirmed',
  'independently_verified',
  'community_reported',
  'unverified',
  'outdated_or_patched',
]);
export const PublicationStatus = z.enum(['draft', 'review', 'approved', 'retired']);
export const SpoilerLevel = z.enum(['none', 'minor', 'major']);
export type SpoilerLevel = z.infer<typeof SpoilerLevel>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD');
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'lowercase-with-dashes');
const httpsUrl = z.url({ protocol: /^https$/ });

export const Platform = z.strictObject({
  id: slug,
  label: z.string().min(1),
  shortLabel: z.string().min(1),
  family: z.enum(['xbox', 'playstation', 'pc', 'nintendo', 'other']),
  achievementSystem: z.enum(['xbox-achievements', 'playstation-trophies', 'steam', 'none']),
  /** What the platform calls its objectives: "Achievements", "Trophies". */
  objectiveNoun: z.string().min(1),
});
export type Platform = z.infer<typeof Platform>;

export const Source = z.strictObject({
  id: slug,
  url: httpsUrl,
  publisher: z.string().min(1),
  title: z.string().min(1),
  checkedAt: isoDate,
  /** The exact claim this source supports. */
  supportedClaim: z.string().min(1),
  official: z.boolean(),
});
export type Source = z.infer<typeof Source>;

export const Category = z.strictObject({ id: slug, label: z.string().min(1) });

export const Game = z.strictObject({
  schemaVersion: z.literal(1),
  id: slug,
  title: z.string().min(1),
  shortTitle: z.string().min(1),
  summary: z.string().min(1),
  availability: z.strictObject({
    status: z.enum(['released', 'announced', 'unknown']),
    date: isoDate.nullable(),
    sourceIds: z.array(slug),
  }),
  /** Platforms in display order. The first is the tracker's default. */
  platforms: z
    .array(
      z.strictObject({
        platformId: slug,
        verificationStatus: VerificationStatus,
        checkedAt: isoDate,
        sourceIds: z.array(slug).min(1),
      }),
    )
    .min(1),
  /** Achievement/trophy categories. */
  categories: z.array(Category).min(1),
  /** Guide sections, in display order (from the original brief's site structure). */
  guideCategories: z.array(Category.extend({ blurb: z.string().min(1) })).min(1),
  sources: z.array(Source),
});
export type Game = z.infer<typeof Game>;

export const Objective = z.strictObject({
  /** Immutable, namespaced by game: `gta-vi:xbox:...`. Never reuse or rename. */
  id: z.string().regex(/^[a-z0-9-]+:[a-z0-9:-]+$/),
  gameId: slug,
  platformIds: z.array(slug).min(1),
  kind: z.enum(['achievement', 'trophy', 'completion', 'challenge']),
  category: slug,
  /** Always safe to show, index and put in metadata. */
  safeTitle: z.string().min(1),
  safeSummary: z.string(),
  spoilerLevel: SpoilerLevel,
  /** The platform marks it hidden/secret. */
  hidden: z.boolean(),
  missable: z.union([z.boolean(), z.literal('unknown')]),
  points: z.number().int().nonnegative().nullable(),
  /** Spoiler text. Never rendered into pages; served separately and fetched on reveal. */
  protected: z.strictObject({ title: z.string().min(1), summary: z.string() }).nullable(),
  sourceIds: z.array(slug),
  verificationStatus: VerificationStatus,
  publicationStatus: PublicationStatus,
  checkedAt: isoDate.nullable(),
  founderVerifiedAt: isoDate.nullable(),
  revision: z.number().int().min(1),
});
export type Objective = z.infer<typeof Objective>;

/** What the browser gets: the protected text stripped out. */
export type PublicObjective = Omit<Objective, 'protected'> & { hasProtected: boolean; draft: boolean };

/** How sure we are. Shown on every entry. Rumors are never presented as confirmed. */
export const EntryVerification = z.enum(['confirmed', 'unconfirmed', 'rumor']);
export type EntryVerification = z.infer<typeof EntryVerification>;

/** Where an entry's facts came from. One entry can cite several pages. */
export const EntrySource = z.strictObject({
  publisher: z.string().min(1),
  title: z.string().min(1),
  url: httpsUrl,
  /** The date someone last opened this page and checked the claim. */
  checkedAt: isoDate,
  /** Optional: which part of the entry this page supports. */
  supports: z.string().optional(),
});

/**
 * One guide entry: a tip, a walkthrough mission, a money method, a weapon, a vehicle, a collectible, a video...
 * Every entry is checkable. Text in title/summary/steps/facts must be spoiler-free; anything that spoils goes in `details`.
 */
export const Entry = z.strictObject({
  /** Permanent: `gta-vi:entry:<slug>`. Never rename, or players lose the tick. */
  id: z.string().regex(/^[a-z0-9-]+:entry:[a-z0-9-]+$/),
  gameId: slug,
  slug,
  /** A guide section id from game.json guideCategories. */
  category: slug,
  title: z.string().min(1),
  summary: z.string().min(1),
  /** Step-by-step instructions, in our own words. */
  steps: z.array(z.string().min(1)),
  /** Type-specific details, e.g. { label: 'Available from', value: 'Chapter 3' }. */
  facts: z.array(z.strictObject({ label: z.string().min(1), value: z.string().min(1) })),
  chapter: z.number().int().positive().nullable(),
  mode: z.enum(['story', 'online', 'any']),
  /** none / minor ("Mild") / major. Mild and Major entries need `details`. */
  spoilerLevel: SpoilerLevel,
  /** Spoiler content: never rendered into the page; loaded only when the viewer reveals it. */
  details: z.strictObject({ summary: z.string().min(1), steps: z.array(z.string().min(1)) }).nullable(),
  verification: EntryVerification,
  sources: z.array(EntrySource).min(1),
  platformNote: z.string().nullable(),
  gameVersion: z.string().nullable(),
  videoIds: z.array(slug),
  /** Related achievement/trophy ids in the tracker. */
  objectiveIds: z.array(z.string()),
  /** draft = hidden from the public site. */
  status: z.enum(['draft', 'published']),
});
export type Entry = z.infer<typeof Entry>;

/** A YouTube video. Loaded only when the viewer presses play; always credited. */
export const Video = z.strictObject({
  id: slug,
  provider: z.literal('youtube'),
  youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  /** Spoiler-safe title we write; the creator's own title can be a spoiler. */
  safeTitle: z.string().min(1),
  creator: z.string().min(1),
  channelUrl: httpsUrl,
  startSeconds: z.number().int().nonnegative().nullable(),
  spoilerLevel: SpoilerLevel,
  embedAllowed: z.boolean(),
  checkedAt: isoDate,
});
export type Video = z.infer<typeof Video>;

/** What the browser gets: spoiler details removed. */
export type PublicEntry = Omit<Entry, 'details'> & { hasDetails: boolean };
