# Facebook Group Latest Post Scraper

Monitors one or more Facebook groups and sends you an email when a new post appears. Useful if you're in groups where Facebook's own notifications are unreliable (free stuff groups, local buy/sell, etc.).

## How it works

Each run visits the group pages, grabs the latest post, and compares it against the last seen post stored in Apify's Key-Value Store. If it's new, it sends an email via `apify/send-mail` and saves the post to the dataset. If nothing changed, it exits quietly.

Meant to be run on a schedule. Only works with public groups.

## Input

| Field | Type | Required | Description |
|---|---|---|---|
| `groupUrls` | string[] | ✅ | Facebook group URLs to monitor |
| `recipientEmail` | string | ✅ | Where to send notifications (must be your Apify account email) |
| `ignoreKeywords` | string[] | | Skip posts containing these words, e.g. `["reserved", "taken", "gone"]` |
| `useResidentialProxy` | boolean | | Use residential proxies (default: `true`, recommended for Facebook) |

## Setup

1. Deploy to Apify and approve `apify/send-mail` permissions when prompted
2. Set `recipientEmail` to your Apify account email
3. Create a schedule to run it periodically

## Notes

- Deduplication is based on post text content, not the URL (Facebook's post URLs include tracking parameters that change on every load)
- The first run will always send an email for whatever the current latest post is
