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
  categories: z.array(Category).min(1),
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
