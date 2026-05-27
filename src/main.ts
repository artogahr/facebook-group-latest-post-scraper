import { Actor, KeyValueStore } from 'apify';
import { PlaywrightCrawler } from 'crawlee';
import type { Input } from './types.js';
import { scrapeLatestPost } from './scraper.js';
import { getLastSeenKey, setLastSeenKey } from './deduplication.js';

await Actor.init();

const input = await Actor.getInput<Input>();
if (!input?.groupUrls?.length || !input.recipientEmail) {
  throw new Error('Input must include groupUrls and recipientEmail');
}

const {
  groupUrls,
  recipientEmail,
  ignoreKeywords = [],
  useResidentialProxy = true,
} = input;

const proxyConfiguration = useResidentialProxy
  ? await Actor.createProxyConfiguration({ groups: ['RESIDENTIAL'] })
  : undefined;

const crawler = new PlaywrightCrawler({
  proxyConfiguration,
  launchContext: {
    launchOptions: {
      args: ['--disable-blink-features=AutomationControlled'],
    },
  },
  requestHandler: async ({ page, request }) => {
    const groupUrl = request.url;
    const post = await scrapeLatestPost(page, groupUrl);
    if (!post) return;

    const lastKey = await getLastSeenKey(groupUrl);
    if (lastKey === post.dedupKey) return;

    const isIgnored = ignoreKeywords.some((kw) =>
      post.text.toLowerCase().includes(kw.toLowerCase()),
    );

    if (!isIgnored) {
      const body = post.url ? `${post.text}\n\n${post.url}` : post.text;
      await Actor.call('apify/send-mail', {
        to: recipientEmail,
        subject: `New post in ${groupUrl}`,
        text: body,
      });
      await Actor.pushData({ groupUrl, postText: post.text, postUrl: post.url });
    }

    // Persist the dedup key only after a successful send. If send-mail throws,
    // the key is left untouched so the retry (or next run) tries again instead
    // of silently treating the post as already-seen.
    await setLastSeenKey(groupUrl, post.dedupKey);
  },
  failedRequestHandler: async ({ page, request }, error) => {
    console.error(`Giving up on ${request.url} after ${request.retryCount} retries:`, error);
    const screenshot = await page.screenshot();
    const store = await KeyValueStore.open();
    await store.setValue(`failed-${request.id}`, screenshot, { contentType: 'image/png' });
  },
});

await crawler.run(groupUrls.map((url) => ({ url })));
await Actor.exit();
