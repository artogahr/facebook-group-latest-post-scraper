import { Actor } from 'apify';
import { PlaywrightCrawler } from 'crawlee';
import type { Input } from './types.js';
import { scrapeLatestPost } from './scraper.js';
import { getLastSeenKey, setLastSeenKey } from './deduplication.js';
import { sendEmailNotification } from './email.js';

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
  requestHandler: async ({ page, request }) => {
    const groupUrl = request.url;
    try {
      const post = await scrapeLatestPost(page, groupUrl);
      if (!post) return;

      const lastKey = await getLastSeenKey(groupUrl);
      if (lastKey === post.dedupKey) return;

      await setLastSeenKey(groupUrl, post.dedupKey);

      const isIgnored = ignoreKeywords.some((kw) =>
        post.text.toLowerCase().includes(kw.toLowerCase()),
      );
      if (isIgnored) return;

      await sendEmailNotification(recipientEmail, groupUrl, post.text);
      await Actor.pushData({ groupUrl, postText: post.text });
    } catch (err) {
      console.error(`Failed to process ${groupUrl}:`, err);
    }
  },
});

await crawler.run(groupUrls.map((url) => ({ url })));
await Actor.exit();
