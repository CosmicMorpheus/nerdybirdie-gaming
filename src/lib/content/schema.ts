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
  /** Our guide's release state on the Games page (separate from the game's own release). */
  guideStatus: z.enum(['coming-soon', 'preview', 'available', 'archived']).default('available'),
  /** Featured on the home page. If no game is featured, every guide that isn't coming soon is shown. */
  featured: z.boolean().default(false),
  /**
   * Who can use this guide. Founder decision A (27 Nov 2026): every guide is free. `premium` is reserved for a possible
   * per-guide unlock (grant `guide:<id>` in src/lib/entitlements/model.ts) and is rejected by the validator until a
   * server-side entitlement check exists and the founder approves paid guides (docs/MONETIZATION.md).
   */
  access: z
    .strictObject({ tier: z.enum(['free', 'premium']), grant: z.string().regex(/^guide:[a-z0-9-]+$/).optional() })
    .default({ tier: 'free' }),
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
  /** Optional note under the platform list on the game page, e.g. why a platform isn't listed. Must be sourced like any fact. */
  platformNote: z.string().min(1).optional(),
  /** Achievement/trophy categories. */
  categories: z.array(Category).min(1),
  /** Guide sections, in display order (from the original brief's site structure). */
  guideCategories: z.array(Category.extend({ blurb: z.string().min(1) })).min(1),
  sources: z.array(Source),
});
export type Game = z.infer<typeof Game>;

/** A game guide's public update history (content/games/<id>/updates.json), newest first. Spoiler-safe text only. */
export const GameUpdates = z.strictObject({
  schemaVersion: z.literal(1),
  updates: z.array(z.strictObject({ date: isoDate, title: z.string().min(1), items: z.array(z.string().min(1)).min(1) })),
});
export type GameUpdate = z.infer<typeof GameUpdates>['updates'][number];

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
  /** PlayStation trophy grade. */
  grade: z.enum(['platinum', 'gold', 'silver', 'bronze']).nullable().optional(),
  /** Spoiler text. Never rendered into pages; served separately and fetched on reveal. */
  protected: z.strictObject({ title: z.string().min(1), summary: z.string(), tip: z.string().min(1).optional() }).nullable(),
  /** How to unlock it, in our own words. Spoiler-free (spoiler tips go in protected.tip). */
  tip: z.string().min(1).optional(),
  /** Links to our own guides, checklists or map filters (site paths only). */
  links: z.array(z.strictObject({ label: z.string().min(1), href: z.string().regex(/^\/[A-Za-z0-9\-_/?=#&.,]*$/) })).optional(),
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
  /** Map pins for this entry (gta-vi:map:...). Empty = no verified location yet, so "Show on map" is unavailable. */
  mapPinIds: z.array(z.string().regex(/^[a-z0-9-]+:map:[a-z0-9-]+$/)),
  /** Related achievement/trophy ids in the tracker. */
  objectiveIds: z.array(z.string()),
  /** draft = hidden from the public site. */
  status: z.enum(['draft', 'published']),
  /** Needs a purchase or subscription (e.g. GTA+, a special edition). Shown as "Paid / optional". */
  paid: z.boolean().optional(),
});
export type Entry = z.infer<typeof Entry>;

/**
 * A creator video (YouTube, Twitch or TikTok). One record per video, with a separate start time ("moment")
 * for each guide entry or map pin it shows. Nothing loads from the provider until the viewer presses play.
 */
export const Video = z.strictObject({
  id: slug,
  /** Canonical link to the original (a single video, clip or post; never a channel or live stream). */
  url: httpsUrl,
  /** Our spoiler-safe title. The creator's own title can be a spoiler, so it isn't shown by default. */
  title: z.string().min(1),
  creator: z.string().min(1),
  channelUrl: httpsUrl,
  spoilerLevel: SpoilerLevel,
  /** review = queued until someone opens it and checks it; approved = shown; rejected = never shown. */
  status: z.enum(['review', 'approved', 'rejected']),
  availability: z.enum(['available', 'unavailable', 'unknown']),
  /** Date someone last watched it and confirmed the moments. null until reviewed. */
  checkedAt: isoDate.nullable(),
  /** Editor notes: where the link came from, what still needs checking. Not shown publicly. */
  notes: z.string(),
  moments: z.array(z.strictObject({
    /** A guide entry id (gta-vi:entry:...) or map pin id (gta-vi:map:...). */
    target: z.string().regex(/^[a-z0-9-]+:(entry|map):[a-z0-9-]+$/),
    start: z.number().int().nonnegative().nullable(),
    label: z.string().min(1),
    /** True once someone has watched this moment and confirmed it shows the target. */
    verified: z.boolean(),
  })),
});
export type Video = z.infer<typeof Video>;

/** What the browser gets: spoiler details removed. */
export type PublicEntry = Omit<Entry, 'details'> & { hasDetails: boolean };

/** A trusted YouTube creator the daily check follows (content/games/<game>/creators/youtube.json). */
export const Creator = z.strictObject({
  channelId: z.string().regex(/^UC[A-Za-z0-9_-]{22}$/),
  handle: z.string().regex(/^@[A-Za-z0-9._-]{3,30}$/),
  name: z.string().min(1).max(80),
  focus: z.string().min(1).max(300),
  status: z.enum(['approved', 'paused']),
  addedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export const CreatorsFile = z.strictObject({ note: z.string().optional(), creators: z.array(Creator) });
export type Creator = z.infer<typeof Creator>;
