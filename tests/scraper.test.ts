// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createHash } from 'crypto';
import { extractDedupKey, scrapeLatestPost } from '../src/scraper.js';

describe('extractDedupKey', () => {
  it('returns sha256 hash of post text', () => {
    const text = 'Free sofa, pickup only';
    const result = extractDedupKey(text);
    const expected = createHash('sha256').update(text).digest('hex');
    expect(result).toBe(expected);
  });
});

describe('scrapeLatestPost', () => {
  function makePage(html: string) {
    document.body.innerHTML = html;
    return {
      waitForSelector: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockImplementation((fn: () => unknown) => Promise.resolve(fn())),
    };
  }

  it('returns null when story element is absent', async () => {
    const page = makePage('<div>no story here</div>');
    const result = await scrapeLatestPost(page as any, 'https://www.facebook.com/groups/test');
    expect(result).toBeNull();
  });

  it('scopes post url to the story element, not the first link on the page', async () => {
    const page = makePage(`
      <a href="/groups/other/posts/9999">unrelated earlier link</a>
      <div data-ad-rendering-role="story_message">
        Post text here
        <a href="/groups/test/posts/1234">story link</a>
      </div>
    `);
    const result = await scrapeLatestPost(page as any, 'https://www.facebook.com/groups/test');
    expect(result?.url).toBe('/groups/test/posts/1234');
  });

  it('extracts post text from story element', async () => {
    const page = makePage(`
      <div data-ad-rendering-role="story_message">Free bicycle, good condition</div>
    `);
    const result = await scrapeLatestPost(page as any, 'https://www.facebook.com/groups/test');
    expect(result?.text).toBe('Free bicycle, good condition');
  });
});
