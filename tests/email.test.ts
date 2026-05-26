import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Actor } from 'apify';
import { sendEmailNotification } from '../src/email.js';

vi.mock('apify');
vi.mock('apify-client', () => {
  const mockCall = vi.fn().mockResolvedValue({});
  const mockActor = vi.fn().mockReturnValue({ call: mockCall });
  const ApifyClient = vi.fn().mockImplementation(() => ({ actor: mockActor }));
  return { ApifyClient };
});

describe('sendEmailNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.FULL_APIFY_TOKEN;
  });

  it('uses Actor.call when FULL_APIFY_TOKEN is not set', async () => {
    vi.mocked(Actor.call).mockResolvedValueOnce({} as any);

    await sendEmailNotification(
      'recipient@gmail.com',
      'https://www.facebook.com/groups/test',
      'Free sofa, pickup only',
    );

    expect(Actor.call).toHaveBeenCalledWith('apify/send-mail', {
      to: 'recipient@gmail.com',
      subject: 'New post in https://www.facebook.com/groups/test',
      text: 'Free sofa, pickup only',
    });
  });

  it('uses ApifyClient with FULL_APIFY_TOKEN when set', async () => {
    process.env.FULL_APIFY_TOKEN = 'test-token';
    const { ApifyClient } = await import('apify-client');

    await sendEmailNotification(
      'recipient@gmail.com',
      'https://www.facebook.com/groups/test',
      'Free sofa, pickup only',
    );

    expect(ApifyClient).toHaveBeenCalledWith({ token: 'test-token' });
    expect(Actor.call).not.toHaveBeenCalled();
  });
});
