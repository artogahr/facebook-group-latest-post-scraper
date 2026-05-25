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
