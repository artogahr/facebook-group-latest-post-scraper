import { Actor, KeyValueStore } from 'apify';
import { PlaywrightCrawler } from 'crawlee';
import type { Input } from './types.js';
import { scrapeLatestPost } from './scraper.js';
import { getLastSeenKey, setLastSeenKey } from './deduplication.js';

await Actor.init();
// this is usually banged so you don't deal with the null
// like so: (await Actor.getInput<Input>())! -- yeah its ugly but its the current standard
const input = await Actor.getInput<Input>();
if (!input?.groupUrls?.length || !input.recipientEmail) {
  throw new Error('Input must include groupUrls and recipientEmail');
}

const {
  groupUrls,
  recipientEmail,
  ignoreKeywords = [], // wasn't this defaulted to [] in the input schema?
  useResidentialProxy = true, // same here
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
      await Actor.call('apify/send-mail', { // actor ID is usually more reliable (although i'll doubt they'll ever migrate this one)
        to: recipientEmail,
        subject: `New post in ${groupUrl}`,
        text: body,
      }); // does it throw on a failure? or you get an ActorRun object with a status of "FAILED"?
      // also in that case you can do Actor.exit(1) or do Actor.setStatusMessage (or both)
      await Actor.pushData({ groupUrl, postText: post.text, postUrl: post.url });
    }

    // Persist the dedup key only after a successful send. If send-mail throws,
    // the key is left untouched so the retry (or next run) tries again instead
    // of silently treating the post as already-seen.
    await setLastSeenKey(groupUrl, post.dedupKey);
  },
  failedRequestHandler: async ({ page, request }, error) => {
    // this is being run even if the Actor.call to send-mail fails (which i doubt actually happens as i said above)
    // shouldn't this only be done for the actual scrape?
    console.error(`Giving up on ${request.url} after ${request.retryCount} retries:`, error);
    const screenshot = await page.screenshot();
    const store = await KeyValueStore.open();
    // this is good, debugging is always a pain here so setting stuff like this is great.
    // its usually better to have it set in a developer owned kv store using one of your API keys
    // since you don't get to know which of your users runs failed, also why should the user pay for this storage?
    await store.setValue(`failed-${request.id}`, screenshot, { contentType: 'image/png' });
  },
});

await crawler.run(groupUrls.map((url) => ({ url })));
await Actor.exit();
