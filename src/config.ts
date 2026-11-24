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
} as const;

/** The future central Nerdy Birdie site. Hidden everywhere until the founder supplies it. */
export const PARENT_SITE_URL = '';

/** Contact for corrections. Empty until the founder supplies one; the page then points to Discord. */
export const CONTACT_EMAIL = '';

/** Search engines may index the site only when this is set at build time (launch, after approval). */
export const INDEXABLE = import.meta.env.PUBLIC_INDEXABLE === 'true';
