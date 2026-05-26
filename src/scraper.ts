import { createHash } from 'crypto';
import type { Page } from 'playwright';
import type { Post } from './types.js';

export function extractDedupKey(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export async function scrapeLatestPost(page: Page, groupUrl: string): Promise<Post | null> {
  await page.waitForSelector('[data-ad-rendering-role="story_message"]', { timeout: 30000 });

  const result = await page.evaluate(() => {
    const storyEl = document.querySelector('[data-ad-rendering-role="story_message"]');
    if (!storyEl) return null;

    const text = storyEl.textContent?.trim() ?? '';
    const linkEl = document.querySelector('a[href*="/posts/"], a[href*="/permalink/"]');
    const url = linkEl?.getAttribute('href') ?? null;
    return { text, url };
  });

  if (!result) return null;

  return {
    dedupKey: extractDedupKey(result.text),
    text: result.text,
    url: result.url,
    groupUrl,
  };
}
