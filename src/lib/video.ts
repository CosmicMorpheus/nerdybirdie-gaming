/**
 * Video providers. Embeds are built only from these fixed templates using a parsed id, never from pasted HTML.
 * Docs: YouTube https://developers.google.com/youtube/player_parameters · Twitch https://dev.twitch.tv/docs/embed/video-and-clips/
 *       TikTok https://developers.tiktok.com/docs/en/embed-player
 */
export type Provider = 'youtube' | 'twitch' | 'tiktok';
export interface ParsedVideo { provider: Provider; id: string; kind?: 'video' | 'clip'; start: number | null }

/** "1h2m3s", "850s", "850", "14:10" → seconds. */
export function parseTime(t: string | null | undefined): number | null {
  if (!t) return null;
  if (/^\d+$/.test(t)) return Number(t);
  const hms = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (hms && hms[0]) return Number(hms[1] ?? 0) * 3600 + Number(hms[2] ?? 0) * 60 + Number(hms[3] ?? 0);
  const colon = t.split(':').map(Number);
  if (colon.length >= 2 && colon.every((n) => Number.isInteger(n) && n >= 0)) return colon.reduce((a, n) => a * 60 + n, 0);
  return null;
}

/** Parse a supported video URL. Returns null for anything else (channels, live streams, unknown hosts). */
export function parseVideoUrl(raw: string): ParsedVideo | null {
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.replace(/^www\.|^m\./, '');
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const id = u.pathname === '/watch' ? u.searchParams.get('v') : u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? { provider: 'youtube', id, start: parseTime(u.searchParams.get('t') ?? u.searchParams.get('start')) } : null;
  }
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1);
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? { provider: 'youtube', id, start: parseTime(u.searchParams.get('t')) } : null;
  }
  if (host === 'twitch.tv') {
    const v = u.pathname.match(/^\/videos\/(\d+)$/)?.[1];
    if (v) return { provider: 'twitch', id: v, kind: 'video', start: parseTime(u.searchParams.get('t')) };
    const clip = u.pathname.match(/^\/[A-Za-z0-9_]+\/clip\/([A-Za-z0-9_-]+)$/)?.[1];
    return clip ? { provider: 'twitch', id: clip, kind: 'clip', start: null } : null;
  }
  if (host === 'clips.twitch.tv') {
    const clip = u.pathname.slice(1);
    return /^[A-Za-z0-9_-]+$/.test(clip) ? { provider: 'twitch', id: clip, kind: 'clip', start: null } : null;
  }
  if (host === 'tiktok.com') {
    const id = u.pathname.match(/^\/@[A-Za-z0-9._]+\/video\/(\d{8,25})$/)?.[1];
    return id ? { provider: 'tiktok', id, start: null } : null;
  }
  return null;
}

const hms = (s: number) => `${Math.floor(s / 3600)}h${Math.floor((s % 3600) / 60)}m${s % 60}s`;

/** Embed URL from a fixed template. Autoplay stays off except right after the viewer presses play (YouTube/Twitch). */
export function embedUrl(p: ParsedVideo, start: number | null, parents: readonly string[], afterClick = true): string {
  if (p.provider === 'youtube') return `https://www.youtube-nocookie.com/embed/${p.id}?autoplay=${afterClick ? 1 : 0}&rel=0${start ? `&start=${start}` : ''}`;
  if (p.provider === 'twitch') {
    const par = parents.map((h) => `&parent=${encodeURIComponent(h)}`).join('');
    return p.kind === 'clip'
      ? `https://clips.twitch.tv/embed?clip=${p.id}${par}&autoplay=${afterClick}`
      : `https://player.twitch.tv/?video=v${p.id}${par}&autoplay=${afterClick}${start ? `&time=${hms(start)}` : ''}`;
  }
  return `https://www.tiktok.com/player/v1/${p.id}?autoplay=0&rel=0`;
}

/** Link to the original at the right moment. */
export function watchUrl(canonical: string, p: ParsedVideo, start: number | null): string {
  if (!start) return canonical;
  if (p.provider === 'youtube') return `https://www.youtube.com/watch?v=${p.id}&t=${start}s`;
  if (p.provider === 'twitch' && p.kind === 'video') return `https://www.twitch.tv/videos/${p.id}?t=${hms(start)}`;
  return canonical;
}

export const fmtTime = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}:` : '') + `${String(Math.floor((s % 3600) / 60)).padStart(s >= 3600 ? 2 : 1, '0')}:${String(s % 60).padStart(2, '0')}`;
