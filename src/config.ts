/**
 * Site settings: the one file to edit for links and names.
 * Never put a link here that hasn't been checked. An empty string means "not configured" and the
 * site shows an honest unavailable state instead of a broken link.
 */
export const SITE_NAME = 'Nerdy Birdie Gaming';

/** Proposed, not final (docs/DECISIONS.md). */
export const TAGLINE = 'Play Smarter. Discover More.';

export const COZMC = {
  /** Checked 2026-11-24 via Discord's invite API: server "C0ZMC", expires_at null (never expires). */
  discord: 'https://discord.gg/VBeBE7MSSq',
  /** Approved in docs/02_PRODUCT_SPEC.md. */
  site: 'https://cozmc.us/',
  /** The GTA help channel invite, once it exists. Empty = ASK "COZMC" offers the main server invite instead. */
  gtaHelpChannel: '',
} as const;

/** The future central Nerdy Birdie site. Hidden everywhere until the founder supplies it. */
export const PARENT_SITE_URL = '';

/** Contact for corrections. Empty until the founder supplies one; the page then points to Discord. */
export const CONTACT_EMAIL = '';

/** Search engines may index the site only when this is set at build time (launch, after approval). */
export const INDEXABLE = import.meta.env.PUBLIC_INDEXABLE === 'true';

/**
 * Brand images. Masters supplied by the founder on 2026-11-24 live in assets/brand/supplied-2026-11-24/ (never edited);
 * these are web-sized copies. To swap one, replace the file at the same path or point the setting at a new file.
 */
export const BRAND = {
  /** Round Nerdy Birdie logo: header (40px) and footer (96px). */
  mark: { src: '/brand/nerdy-birdie-round-96.webp', src2x: '/brand/nerdy-birdie-round-192.webp' },
  /** Large round logo for the About page. */
  fullLogo: '/brand/nerdy-birdie-round-512.webp',
  /** COZMC wordmark (912×241 master), shown 28–36px tall. */
  cozmcWordmark: { src: '/brand/cozmc/cozmc-wordmark-36.webp', src2x: '/brand/cozmc/cozmc-wordmark-72.webp', ratio: 912 / 241 },
  /** COZMC mascots (128px masters), shown at 64px. */
  cozmcMascotWave: '/brand/cozmc/cozmc-mascot-wave.webp',
  cozmcMascotFist: '/brand/cozmc/cozmc-mascot-fist.webp',
  /** "Brick by Brick, WE Build." banner: cropped to the lettering, black background made transparent. */
  brickByBrick: { src: '/brand/brick-by-brick.webp', width: 1274, height: 149 },
} as const;

/** Videos still in the review queue are shown (clearly labelled) on preview builds only, never once the site is indexable. */
export const SHOW_UNREVIEWED_MEDIA = !INDEXABLE;

/** Hosts allowed to embed Twitch players (Twitch requires every host to be listed). Add the production domain at launch. */
export const TWITCH_PARENTS = ['localhost', 'nerdybirdie-gaming-preview.netlify.app'] as const;
