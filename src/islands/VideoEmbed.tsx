import { useState } from 'preact/hooks';
import { TWITCH_PARENTS } from '../config';
import { embedUrl, fmtTime, watchUrl, type ParsedVideo } from '../lib/video';

export interface VideoLike {
  url: string;
  title: string;
  creator: string;
  channelUrl: string;
  parsed: ParsedVideo;
  unreviewed: boolean;
  availability: 'available' | 'unavailable' | 'unknown';
}
interface Props { video: VideoLike; start: number | null; label?: string }

const NAME = { youtube: 'YouTube', twitch: 'Twitch', tiktok: 'TikTok' } as const;

/**
 * Click-to-play creator video (YouTube, Twitch or TikTok). Nothing is requested from the provider (no iframe,
 * no thumbnail, no title) until the viewer presses play. The link to the original is always shown, so the guide
 * still works with an ad blocker, an expired VOD or a removed clip.
 */
export default function VideoEmbed({ video, start, label }: Props) {
  const [on, setOn] = useState(false);
  const p = video.parsed;
  const watch = watchUrl(video.url, p, start);
  const parents = typeof location !== 'undefined' && !TWITCH_PARENTS.includes(location.hostname as never) ? [...TWITCH_PARENTS, location.hostname] : [...TWITCH_PARENTS];
  const canEmbed = video.availability !== 'unavailable';
  return (
    <figure class={`video video-${p.provider}`}>
      {video.unreviewed && <p class="video-flag">Not yet checked by Nerdy Birdie. Shown on the preview only.</p>}
      {on && canEmbed ? (
        <iframe src={embedUrl(p, start, parents)} title={`${video.title} by ${video.creator} (${NAME[p.provider]})`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerpolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" />
      ) : (
        <div class="video-cover scanlines">
          <span class="hud-label">{NAME[p.provider]} · {video.creator}{start !== null ? ` · from ${fmtTime(start)}` : ''}</span>
          <strong>{label ?? video.title}</strong>
          {canEmbed
            ? <button type="button" class="btn btn-primary" onClick={() => setOn(true)}>▶ Play{start !== null ? ` from ${fmtTime(start)}` : ''}<span class="sr-only"> (loads {NAME[p.provider]})</span></button>
            : <p class="small">This video is no longer available to embed.</p>}
          <span class="small muted">Plays from {NAME[p.provider]}. Nothing loads until you press play.</span>
        </div>
      )}
      <figcaption class="small muted">
        Video by <a href={video.channelUrl} target="_blank" rel="noopener">{video.creator}</a> · <a href={watch} target="_blank" rel="noopener">Watch on {NAME[p.provider]} ↗</a>
      </figcaption>
    </figure>
  );
}
