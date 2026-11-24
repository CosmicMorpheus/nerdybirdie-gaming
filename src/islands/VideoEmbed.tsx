import { useState } from 'preact/hooks';

interface Props { youtubeId: string; title: string; creator: string; channelUrl: string; startSeconds: number | null; embedAllowed: boolean }

/**
 * Click-to-play YouTube. Nothing loads from YouTube (no iframe, no thumbnail) until the viewer presses play.
 * Uses youtube-nocookie.com. Always credits the creator and links to the original.
 */
export default function VideoEmbed({ youtubeId, title, creator, channelUrl, startSeconds, embedAllowed }: Props) {
  const [on, setOn] = useState(false);
  const t = startSeconds ? `&start=${startSeconds}` : '';
  const watch = `https://www.youtube.com/watch?v=${youtubeId}${startSeconds ? `&t=${startSeconds}s` : ''}`;
  return (
    <figure class="video">
      {on && embedAllowed ? (
        <iframe src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0${t}`} title={`${title} by ${creator}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin" />
      ) : (
        <div class="video-cover scanlines">
          <span class="hud-label">Video · {creator}</span>
          <strong>{title}</strong>
          {embedAllowed
            ? <button type="button" class="btn btn-primary" onClick={() => setOn(true)}>▶ Play video<span class="sr-only"> (loads YouTube)</span></button>
            : <a class="btn btn-primary" href={watch} target="_blank" rel="noopener">Watch on YouTube ↗</a>}
          <span class="small muted">Plays from YouTube. Nothing loads until you press play.</span>
        </div>
      )}
      <figcaption class="small muted">
        Video by <a href={channelUrl} target="_blank" rel="noopener">{creator}</a> · <a href={watch} target="_blank" rel="noopener">Watch on YouTube ↗</a>
        {startSeconds ? ` (from ${Math.floor(startSeconds / 60)}:${String(startSeconds % 60).padStart(2, '0')})` : ''}
      </figcaption>
    </figure>
  );
}
