import { createHash } from 'crypto';
import type { Page } from 'playwright';
import type { Post } from './types.js';

export function extractDedupKey(permalink: string | null, text: string): string {
  if (permalink) return permalink;
  return createHash('sha256').update(text).digest('hex');
}

export async function scrapeLatestPost(page: Page, groupUrl: string): Promise<Post | null> {
  await page.waitForSelector('[data-ad-rendering-role="story_message"]', { timeout: 15000 });

  const result = await page.evaluate(() => {
    const storyEl = document.querySelector('[data-ad-rendering-role="story_message"]');
    if (!storyEl) return null;

    const text = storyEl.textContent?.trim() ?? '';
    const container =
      storyEl.closest('div[role="article"]') ??
      storyEl.closest('[data-pagelet]') ??
      storyEl.parentElement?.parentElement?.parentElement;
    const permalink =
      container
        ?.querySelector('a[href*="/groups/"][href*="/posts/"]')
        ?.getAttribute('href') ?? null;

    return { text, permalink };
  });

  if (!result) return null;

  return {
    dedupKey: extractDedupKey(result.permalink, result.text),
    text: result.text,
    groupUrl,
  };
}
