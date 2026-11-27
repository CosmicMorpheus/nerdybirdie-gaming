/**
 * Site settings: the one file to edit for links and names.
 * Never put a link here that hasn't been checked. An empty string means "not configured" and the
 * site shows an honest unavailable state instead of a broken link.
 */
export const SITE_NAME = 'Nerdy Birdie Gaming Guides';

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
export const PARENT_SITE_URL = 'https://nerdy-birdie.com/';

/** Contact for corrections. Empty until the founder supplies one; the page then points to Discord. */
export const CONTACT_EMAIL = '';

/** Search engines may index the site only when this is set at build time (launch, after approval). */
export const INDEXABLE = import.meta.env.PUBLIC_INDEXABLE === 'true';

/**
 * Brand images. Masters supplied by the founder live in assets/brand/supplied-<date>/ (never edited); these are web-sized
 * copies. Nerdy Birdie logo updated 2026-11-25 (assets/brand/supplied-2026-11-25/nerdy-birdie-logo.webp).
 * To swap one, replace the file at the same path or point the setting at a new file.
 */
export const BRAND = {
  /** Header mark (40px): the bird from the logo, cropped above the wordmark so it stays legible this small. */
  mark: { src: '/brand/nerdy-birdie-mark-96.webp', src2x: '/brand/nerdy-birdie-mark-192.webp' },
  /** Full Nerdy Birdie logo with wordmark: footer (96px). */
  logo: { src: '/brand/nerdy-birdie-logo-192.webp', src2x: '/brand/nerdy-birdie-logo-384.webp' },
  /** Large full logo for the About page. */
  fullLogo: '/brand/nerdy-birdie-logo-512.webp',
  fullLogo2x: '/brand/nerdy-birdie-logo-1024.webp',
  /** COZMC wordmark (912×241 master), shown 28–36px tall. */
  cozmcWordmark: { src: '/brand/cozmc/cozmc-wordmark-36.webp', src2x: '/brand/cozmc/cozmc-wordmark-72.webp', ratio: 912 / 241 },
  /** COZMC mascots (128px masters), shown at 64px. */
  cozmcMascotWave: '/brand/cozmc/cozmc-mascot-wave.webp',
  cozmcMascotFist: '/brand/cozmc/cozmc-mascot-fist.webp',
  /** "Brick by Brick, WE Build." banner: still image (transparent) and the animated version as a short looping video
   * on the footer colour (master: assets/brand/supplied-2026-11-25/brick-by-brick-animated.gif). */
  brickByBrick: { src: '/brand/brick-by-brick.webp', small: '/brand/brick-by-brick-680.webp', width: 1274, height: 149, video: '/brand/brick-by-brick.mp4', videoWidth: 960, videoHeight: 106 },
} as const;

/** Videos still in the review queue are shown (clearly labelled) on preview builds only, never once the site is indexable. */
export const SHOW_UNREVIEWED_MEDIA = !INDEXABLE;

/** Hosts allowed to embed Twitch players (Twitch requires every host to be listed). Add the production domain at launch. */
export const TWITCH_PARENTS = ['localhost', 'gameguides-nerdy-birdie.live', 'www.gameguides-nerdy-birdie.live', 'nerdybirdiegameguides.netlify.app'] as const;

/**
 * ASK "COZMC" server features (question queue, live AI research, approved overrides). OFF by default: ASK then runs
 * entirely in the player's browser, searches the published guide, and sends nothing anywhere (founder decision, option A).
 * Turning it on also needs ASK_SERVER_ENABLED=on in Netlify, a privacy page update and founder approval.
 */
export const ASK_SERVER = import.meta.env.PUBLIC_ASK_SERVER === 'true';

/**
 * Daily guide updates (What's New creator feed, docs/DAILY_FEED.md). The panel only reads the nb-feed function; the
 * daily check itself is switched by Netlify env vars on the staging project. On by default for the private preview,
 * OFF for an indexable (public) build unless PUBLIC_DISCOVERY_FEED=true. PUBLIC_DISCOVERY_FEED=false hides it anywhere.
 */
const FEED_FLAG = import.meta.env.PUBLIC_DISCOVERY_FEED;
export const DISCOVERY_FEED = FEED_FLAG === 'true' || (FEED_FLAG !== 'false' && !INDEXABLE);
/** Guide sections that show their discoveries: every section the daily check can sort videos into (founder, 24 Nov). */
export const DISCOVERY_SECTIONS: readonly string[] = ['walkthrough', 'robberies', 'exploration', 'side-missions', 'money', 'vehicles', 'weapons', 'collectibles', 'secrets', 'settings', 'tips'];
