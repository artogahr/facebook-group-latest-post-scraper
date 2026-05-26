import { vi, describe, it, expect } from 'vitest';
import { Actor } from 'apify';
import { sendEmailNotification } from '../src/email.js';

vi.mock('apify');

describe('sendEmailNotification', () => {
  it('calls apify/send-mail with correct fields', async () => {
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
});
