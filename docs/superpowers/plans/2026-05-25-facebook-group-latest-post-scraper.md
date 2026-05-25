# Facebook Group Latest Post Scraper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Apify actor that monitors a list of Facebook group URLs for new posts and sends Slack notifications when one is found.

**Architecture:** A `PlaywrightCrawler` visits each group URL, extracts the latest post via `[data-ad-rendering-role="story_message"]`, compares it to the last-seen post stored in Apify's Key-Value Store, and sends a Slack webhook notification + saves to dataset if a new, non-ignored post is found. Per-group errors are logged and non-fatal.

**Tech Stack:** Node.js, TypeScript, Crawlee (PlaywrightCrawler), Apify SDK v3, Playwright (Chromium), Vitest

---

## File Structure

- **Create** `package.json` — dependencies and scripts
- **Create** `tsconfig.json` — TypeScript configuration
- **Create** `src/types.ts` — shared types (`Input`, `Post`)
- **Create** `src/slack.ts` — Slack webhook notification
- **Create** `src/deduplication.ts` — KV store read/write for last-seen post per group
- **Create** `src/scraper.ts` — Playwright post extraction + pure `extractDedupKey` helper
- **Create** `src/main.ts` — actor entry point, orchestration
- **Create** `.actor/input_schema.json` — Apify input schema definition
- **Modify** `.actor/actor.json` — add `input` reference
- **Create** `tests/slack.test.ts` — unit tests for Slack notifier
- **Create** `tests/deduplication.test.ts` — unit tests for deduplication
- **Create** `tests/scraper.test.ts` — unit tests for `extractDedupKey`

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/types.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "facebook-group-latest-post-scraper",
  "version": "0.0.1",
  "type": "module",
  "main": "dist/main.js",
  "scripts": {
    "start": "node dist/main.js",
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "apify": "^3",
    "crawlee": "^3"
  },
  "devDependencies": {
    "@types/node": "^20",
    "typescript": "^5",
    "vitest": "^2"
  }
}
```

Note: Playwright is a peer dependency of Crawlee and will be installed automatically.

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create src/types.ts**

```typescript
export interface Input {
  groupUrls: string[];
  slackWebhookUrl: string;
  ignoreKeywords?: string[];
  useResidentialProxy?: boolean;
}

export interface Post {
  dedupKey: string;
  text: string;
  groupUrl: string;
}
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`

Expected: `node_modules/` created with no errors. Playwright browser binaries download automatically.

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json src/types.ts
git commit -m "chore: scaffold project"
```

---

### Task 2: Slack notifier

**Files:**
- Create: `tests/slack.test.ts`
- Create: `src/slack.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/slack.test.ts`:

```typescript
import { vi, describe, it, expect, afterEach } from 'vitest';
import { sendSlackNotification } from '../src/slack.js';

describe('sendSlackNotification', () => {
  afterEach(() => vi.restoreAllMocks());

  it('posts formatted message to webhook URL', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(null, { status: 200 }),
    );

    await sendSlackNotification(
      'https://hooks.slack.com/test',
      'https://www.facebook.com/groups/test',
      'Free sofa, pickup only',
    );

    expect(mockFetch).toHaveBeenCalledWith('https://hooks.slack.com/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'New post in https://www.facebook.com/groups/test:\n\nFree sofa, pickup only',
      }),
    });
  });

  it('throws when Slack responds with non-ok status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(null, { status: 400 }),
    );

    await expect(
      sendSlackNotification(
        'https://hooks.slack.com/test',
        'https://www.facebook.com/groups/test',
        'Free sofa',
      ),
    ).rejects.toThrow('Slack notification failed: 400');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`

Expected: 2 tests fail with `Cannot find module '../src/slack.js'`

- [ ] **Step 3: Create src/slack.ts**

```typescript
export async function sendSlackNotification(
  webhookUrl: string,
  groupUrl: string,
  postText: string,
): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `New post in ${groupUrl}:\n\n${postText}` }),
  });
  if (!response.ok) {
    throw new Error(`Slack notification failed: ${response.status}`);
  }
}
```

- [ ] **Step 4: Build and run tests**

Run: `npm run build && npm test`

Expected: 2 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/slack.ts tests/slack.test.ts
git commit -m "feat: add slack notifier"
```

---

### Task 3: Deduplication

**Files:**
- Create: `tests/deduplication.test.ts`
- Create: `src/deduplication.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/deduplication.test.ts`:

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { KeyValueStore } from 'apify';
import { getLastSeenKey, setLastSeenKey } from '../src/deduplication.js';

vi.mock('apify');

describe('deduplication', () => {
  const mockStore = {
    getValue: vi.fn(),
    setValue: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(KeyValueStore.open).mockResolvedValue(mockStore as any);
    mockStore.getValue.mockReset();
    mockStore.setValue.mockReset();
  });

  it('returns null when no key is stored for group', async () => {
    mockStore.getValue.mockResolvedValueOnce(null);

    const result = await getLastSeenKey('https://www.facebook.com/groups/free.stuff.in.prague');

    expect(result).toBeNull();
    expect(mockStore.getValue).toHaveBeenCalledWith('last-post-free.stuff.in.prague');
  });

  it('returns the stored dedup key for group', async () => {
    mockStore.getValue.mockResolvedValueOnce('/groups/free.stuff.in.prague/posts/123456');

    const result = await getLastSeenKey('https://www.facebook.com/groups/free.stuff.in.prague');

    expect(result).toBe('/groups/free.stuff.in.prague/posts/123456');
  });

  it('stores dedup key under the correct KV key', async () => {
    mockStore.setValue.mockResolvedValueOnce(undefined);

    await setLastSeenKey(
      'https://www.facebook.com/groups/free.stuff.in.prague',
      '/groups/free.stuff.in.prague/posts/789',
    );

    expect(mockStore.setValue).toHaveBeenCalledWith(
      'last-post-free.stuff.in.prague',
      '/groups/free.stuff.in.prague/posts/789',
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`

Expected: 3 tests fail with `Cannot find module '../src/deduplication.js'`

- [ ] **Step 3: Create src/deduplication.ts**

```typescript
import { KeyValueStore } from 'apify';

function groupUrlToKey(groupUrl: string): string {
  const match = groupUrl.match(/\/groups\/([^/?#]+)/);
  return `last-post-${match?.[1] ?? Buffer.from(groupUrl).toString('base64').slice(0, 20)}`;
}

export async function getLastSeenKey(groupUrl: string): Promise<string | null> {
  const store = await KeyValueStore.open();
  return store.getValue<string>(groupUrlToKey(groupUrl));
}

export async function setLastSeenKey(groupUrl: string, dedupKey: string): Promise<void> {
  const store = await KeyValueStore.open();
  await store.setValue(groupUrlToKey(groupUrl), dedupKey);
}
```

- [ ] **Step 4: Build and run tests**

Run: `npm run build && npm test`

Expected: all 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/deduplication.ts tests/deduplication.test.ts
git commit -m "feat: add deduplication"
```

---

### Task 4: Scraper

**Files:**
- Create: `tests/scraper.test.ts`
- Create: `src/scraper.ts`

- [ ] **Step 1: Write failing tests for the pure helper**

Create `tests/scraper.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { extractDedupKey } from '../src/scraper.js';

describe('extractDedupKey', () => {
  it('returns permalink when available', () => {
    const result = extractDedupKey('/groups/test/posts/123', 'some text');
    expect(result).toBe('/groups/test/posts/123');
  });

  it('falls back to sha256 hash of text when no permalink', () => {
    const text = 'Free sofa, pickup only';
    const result = extractDedupKey(null, text);
    const expected = createHash('sha256').update(text).digest('hex');
    expect(result).toBe(expected);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`

Expected: 2 tests fail with `Cannot find module '../src/scraper.js'`

- [ ] **Step 3: Create src/scraper.ts**

```typescript
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
```

- [ ] **Step 4: Build and run tests**

Run: `npm run build && npm test`

Expected: all 7 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/scraper.ts tests/scraper.test.ts
git commit -m "feat: add scraper"
```

---

### Task 5: Input schema and main orchestration

**Files:**
- Create: `.actor/input_schema.json`
- Modify: `.actor/actor.json`
- Create: `src/main.ts`

- [ ] **Step 1: Create .actor/input_schema.json**

```json
{
  "title": "Facebook Group Latest Post Scraper",
  "type": "object",
  "schemaVersion": 1,
  "properties": {
    "groupUrls": {
      "title": "Group URLs",
      "type": "array",
      "description": "List of Facebook group URLs to monitor",
      "items": { "type": "string" },
      "editor": "stringList"
    },
    "slackWebhookUrl": {
      "title": "Slack Webhook URL",
      "type": "string",
      "description": "Slack Incoming Webhook URL",
      "editor": "textfield"
    },
    "ignoreKeywords": {
      "title": "Ignore Keywords",
      "type": "array",
      "description": "Posts containing any of these words (case-insensitive) will be skipped",
      "items": { "type": "string" },
      "editor": "stringList",
      "default": []
    },
    "useResidentialProxy": {
      "title": "Use Residential Proxy",
      "type": "boolean",
      "description": "Use Apify residential proxies to avoid being blocked by Facebook",
      "default": true
    }
  },
  "required": ["groupUrls", "slackWebhookUrl"]
}
```

- [ ] **Step 2: Update .actor/actor.json**

Replace contents with:

```json
{
  "actorSpecification": 1,
  "name": "facebook-group-latest-post-scraper",
  "version": "0.0",
  "buildTag": "latest",
  "environmentVariables": {},
  "input": "./input_schema.json"
}
```

- [ ] **Step 3: Create src/main.ts**

```typescript
import { Actor } from 'apify';
import { PlaywrightCrawler } from 'crawlee';
import type { Input } from './types.js';
import { scrapeLatestPost } from './scraper.js';
import { getLastSeenKey, setLastSeenKey } from './deduplication.js';
import { sendSlackNotification } from './slack.js';

await Actor.init();

const input = await Actor.getInput<Input>();
if (!input?.groupUrls?.length || !input.slackWebhookUrl) {
  throw new Error('Input must include groupUrls and slackWebhookUrl');
}

const {
  groupUrls,
  slackWebhookUrl,
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

      await sendSlackNotification(slackWebhookUrl, groupUrl, post.text);
      await Actor.pushData({ groupUrl, postText: post.text });
    } catch (err) {
      console.error(`Failed to process ${groupUrl}:`, err);
    }
  },
});

await crawler.run(groupUrls.map((url) => ({ url })));
await Actor.exit();
```

- [ ] **Step 4: Build**

Run: `npm run build`

Expected: `dist/` directory created, no TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add .actor/input_schema.json .actor/actor.json src/main.ts
git commit -m "feat: add main orchestration and input schema"
```

---

### Task 6: Smoke test

- [ ] **Step 1: Create local input**

Create `storage/key_value_stores/default/INPUT.json`:

```json
{
  "groupUrls": ["https://www.facebook.com/groups/free.stuff.in.prague"],
  "slackWebhookUrl": "https://hooks.slack.com/services/YOUR/REAL/WEBHOOK",
  "ignoreKeywords": ["reserved", "taken", "gone"],
  "useResidentialProxy": false
}
```

Replace `slackWebhookUrl` with a real webhook. Use `https://webhook.site` to get a free inspection URL if you don't have a Slack app set up yet. Set `useResidentialProxy` to `false` for local testing.

- [ ] **Step 2: Run the actor**

Run: `npm run build && npm start`

Expected: Actor navigates to the group, logs the extracted post text, sends a notification to the webhook URL, saves an entry to `storage/datasets/default/`, and exits cleanly.

- [ ] **Step 3: Verify deduplication**

Run: `npm start`

Expected: Actor runs but does NOT send another notification and does NOT add another dataset entry (same post detected via KV store).
