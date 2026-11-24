import { describe, expect, it } from 'vitest';
import { embedUrl, fmtTime, parseTime, parseVideoUrl, watchUrl } from '../../src/lib/video';

describe('video URLs', () => {
  it('parses the supported providers', () => {
    expect(parseVideoUrl('https://www.youtube.com/watch?v=LTbw8B0DQHA&t=49s')).toEqual({ provider: 'youtube', id: 'LTbw8B0DQHA', start: 49 });
    expect(parseVideoUrl('https://youtu.be/dTXD4m4qomY?t=850')).toEqual({ provider: 'youtube', id: 'dTXD4m4qomY', start: 850 });
    expect(parseVideoUrl('https://www.twitch.tv/videos/2936019533?t=1h2m3s')).toEqual({ provider: 'twitch', id: '2936019533', kind: 'video', start: 3723 });
    expect(parseVideoUrl('https://www.tiktok.com/@nahvwz/video/7711078016968822046')).toEqual({ provider: 'tiktok', id: '7711078016968822046', start: null });
  });
  it('rejects channels, live streams, other hosts and non-https', () => {
    for (const u of ['https://www.youtube.com/@PowerPyx', 'https://www.twitch.tv/darkviperau', 'https://www.twitch.tv/darkviperau/videos',
      'http://youtube.com/watch?v=LTbw8B0DQHA', 'https://evil.example/watch?v=LTbw8B0DQHA', 'javascript:alert(1)', 'not a url'])
      expect(parseVideoUrl(u), u).toBeNull();
  });
  it('builds embeds only from fixed templates', () => {
    const yt = parseVideoUrl('https://www.youtube.com/watch?v=LTbw8B0DQHA')!;
    expect(embedUrl(yt, 49, [])).toBe('https://www.youtube-nocookie.com/embed/LTbw8B0DQHA?autoplay=1&rel=0&start=49');
    const tw = parseVideoUrl('https://www.twitch.tv/videos/2936019533')!;
    expect(embedUrl(tw, 3723, ['localhost', 'nerdybirdie-gaming-preview.netlify.app'])).toBe(
      'https://player.twitch.tv/?video=v2936019533&parent=localhost&parent=nerdybirdie-gaming-preview.netlify.app&autoplay=true&time=1h2m3s');
    expect(embedUrl(parseVideoUrl('https://www.tiktok.com/@a.b/video/7711078016968822046')!, null, [])).toBe('https://www.tiktok.com/player/v1/7711078016968822046?autoplay=0&rel=0');
    expect(watchUrl('https://www.youtube.com/watch?v=LTbw8B0DQHA', yt, 89)).toBe('https://www.youtube.com/watch?v=LTbw8B0DQHA&t=89s');
  });
  it('time formats', () => {
    expect(parseTime('14:10')).toBe(850);
    expect(parseTime('850s')).toBe(850);
    expect(fmtTime(49)).toBe('0:49');
    expect(fmtTime(850)).toBe('14:10');
    expect(fmtTime(3723)).toBe('1:02:03');
  });
});
