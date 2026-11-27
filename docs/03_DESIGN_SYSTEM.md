# Visual design brief — Vice City Premium

## Desired feel
Independent, polished gaming editorial publication plus useful software; premium tropical night atmosphere, cinematic sunset imagery, generous spacing, crisp typography, high-resolution optimized visuals. Not an official Rockstar site; no imitation of its logos or proprietary interface. Restrained motion, minimal glow, no oversaturated neon or gratuitous cards. User should find an answer in seconds while playing.

## Three visual layers
| Layer | Proposed tokens | Usage |
|---|---|---|
| Global Nerdy Birdie | #060A13 cosmic black, #08C7DB cyan, #8BFF25 green, #FFA500 gold, #7138EF violet | small brand identity accents, global nav, future game library |
| GTA VI | #0B101B midnight, #1B2030 slate, #ED6BA6 pink, #FFAA76 sunset, #F5F3F0 pearl | hero, game navigation, guides and tracker |
| COZMC | Superseded 2026-11-27 by COZMC's live brand (cozmc.us v3): #070707 black, #8DFF6A phosphor green, #5865F2 Discord blurple, #59E6FF cyan, #F1EFE6 text; Silkscreen + Saira. Original proposal was purple/coral | distinct community panel and link treatments |
Tokens are starting values, not contrast guarantees. Test foreground/background pairings. Proposed font pairing Space Grotesk headings, Inter body; use licensed fonts with fallbacks. Use consistent 4/8px spacing rhythm, readable 16px default body, comfortable line heights, constrained reading width, clear focus and hover, intentional responsive breakpoints. Target WCAG 2.2 AA. Use scalable icons and actual labels, not color alone.

## Logo
Original `assets/brand/Cosmic Nerdy Birdie Logo.png` is approved. Preserve original without distortion/recolor/cropping that loses identity. Use proportionate modest header mark with adjacent accessible brand name, larger full logo in about/footer as appropriate. Generate optimized derivatives without modifying master; compact mascot/favicon design requires approval if altering artwork. Future parent link is configurable, not guessed. Game title and user goals dominate page hierarchy.

## Homepage concept (desktop)
Global header: logo + Nerdy Birdie Gaming | Games | My Progress | Guides | Updates | Search | COZMC Discord. Mobile: compact brand, search, accessible menu with both community links.
Hero: wide authorized tropical city/game image with contrast-controlled text overlay or adjacent content. Eyebrow: featured game. H1: Grand Theft Auto VI. Short promise, confirmed platform labels, primary Explore Guides and secondary My Progress. No spoilers.
Next: resume progress panel (separate achievements and completion) and quick links for achievements, money, vehicles, weapons, collectibles, settings. Search prominent, include safe suggestions. Display only working sections; use clearly marked planned states for map or unavailable data.
Next: latest verified guides with image, safe title, summary, source status and freshness. Community: distinct COZMC treatment (cozmc.us v3 branding; originally proposed as deep purple/coral) with approved COZMC assets, "We Are All COZMC", copy "Connect with fellow gamers, share discoveries and grow with our community." Two separate CTAs: Join the COZMC Discord and Explore COZMC.US. Footer: About, corrections, privacy, unofficial disclaimer, both community links, future parent site only when confirmed.

## Guide/trackers
Desktop: breadcrumbs, title, spoiler/platform controls, useful summary and sources, sticky local category navigation if content warrants; main column with numbered steps, photos/map screenshots and video reveal. Tracker: category count, progress, search, status filter, checkboxes with generous hit area and keyboard support, export/reset in secondary actions. Mobile: single column, compact header, visible spoiler setting, large tap targets, no horizontal overflow, avoid sticky elements occupying too much viewport. Use empty, loading, stale and error states. No fake buttons or placeholder links in release.

## Visual QA
Capture actual homepage, tracker, guide and mobile navigation at ~390, 768, 1024, 1440px widths; additionally test 320px reflow and 200% zoom. Check spacing, line wrapping, pixel clarity, image cropping, contrast, focus, keyboard navigation, reduced motion and target size. If browser unavailable, state not visually verified and provide reproducible test steps. Avoid full-size original images in every page, autoplay media and layout shift. Use responsive srcsets, width/height, appropriate compression, lazy loading below fold. No actual game artwork is bundled; research only with applicable permission.
