# Facebook Group Latest Post Scraper — Design Spec

## Overview

An Apify actor that periodically checks a list of Facebook group URLs for new posts. When a new post is detected, it sends a Slack notification and saves the post to Apify's dataset. Designed to be lightweight and run on a schedule, compensating for Facebook's unreliable push notifications.

---

## Input Schema

```ts
{
  groupUrls: string[]       // List of Facebook group URLs to monitor
  slackWebhookUrl: string   // Slack Incoming Webhook URL
  ignoreKeywords: string[]  // Optional, default []. Case-insensitive. Posts containing any of these words are skipped.
  useResidentialProxy: boolean // Optional, default true. Uses Apify residential proxies.
}
```

---

## Scraping

- **Crawler:** `PlaywrightCrawler` from Crawlee (Node.js / TypeScript)
- **Browser:** Chromium (headless)
- **Proxy:** Apify residential proxy pool when `useResidentialProxy` is true
- **Target element:** `[data-ad-rendering-role="story_message"]` — the first post's content block, present in the DOM even behind the login modal
- **Login modal:** Ignored — content is accessible beneath it without interaction
- **Post deduplication key:** The post's permalink (`/groups/.../posts/...`) extracted from an anchor tag near the post element. Falls back to a SHA-256 hash of the post text if no permalink is found.
- **Post text:** Full text content of the `story_message` element

---

## Deduplication via Key-Value Store

For each group URL, a key is derived from the URL path (e.g. `free.stuff.in.prague`) and used to store the last seen post's deduplication key in Apify's default Key-Value Store.

Per-run flow for each group:

1. Scrape the latest post (permalink + text)
2. Load the stored deduplication key for this group from KV store
3. If **same as stored** → skip, move to next group
4. If **different or no stored value**:
   - Check post text against `ignoreKeywords` (case-insensitive substring match)
   - If keyword match → update KV store, skip notification and dataset write
   - If no match → send Slack notification, save to dataset, update KV store

---

## Output

**Apify Dataset** — one entry per new (non-ignored) post:
```ts
{
  groupUrl: string
  postText: string
}
```

**Slack Notification** — sent to `slackWebhookUrl` via HTTP POST:
```
New post in <group URL>:

<post text>
```

---

## Tech Stack

- **Runtime:** Node.js with TypeScript
- **Framework:** Crawlee + Apify SDK
- **Browser automation:** Playwright (Chromium)
- **Proxy:** Apify Proxy (residential)
- **HTTP client for Slack:** Native `fetch`
