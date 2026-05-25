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
