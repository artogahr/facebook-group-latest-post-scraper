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
