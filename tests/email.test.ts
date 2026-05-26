import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Actor } from 'apify';
import { sendEmailNotification } from '../src/email.js';

vi.mock('apify');

const mockActorCall = vi.fn().mockResolvedValue({});
const mockActor = vi.fn().mockReturnValue({ call: mockActorCall });
vi.mocked(Actor.newClient).mockReturnValue({ actor: mockActor } as any);

describe('sendEmailNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Actor.newClient).mockReturnValue({ actor: mockActor } as any);
    mockActor.mockReturnValue({ call: mockActorCall });
    mockActorCall.mockResolvedValue({});
  });

  afterEach(() => {
    delete process.env.FULL_APIFY_TOKEN;
  });

  it('calls apify/send-mail with correct fields', async () => {
    await sendEmailNotification(
      'recipient@gmail.com',
      'https://www.facebook.com/groups/test',
      'Free sofa, pickup only',
    );

    expect(mockActor).toHaveBeenCalledWith('apify/send-mail');
    expect(mockActorCall).toHaveBeenCalledWith({
      to: 'recipient@gmail.com',
      subject: 'New post in https://www.facebook.com/groups/test',
      text: 'Free sofa, pickup only',
    });
  });

  it('passes FULL_APIFY_TOKEN to newClient when set', async () => {
    process.env.FULL_APIFY_TOKEN = 'test-token';

    await sendEmailNotification(
      'recipient@gmail.com',
      'https://www.facebook.com/groups/test',
      'Free sofa, pickup only',
    );

    expect(Actor.newClient).toHaveBeenCalledWith({ token: 'test-token' });
  });

  it('passes empty options to newClient when FULL_APIFY_TOKEN is not set', async () => {
    await sendEmailNotification(
      'recipient@gmail.com',
      'https://www.facebook.com/groups/test',
      'Free sofa, pickup only',
    );

    expect(Actor.newClient).toHaveBeenCalledWith({});
  });
});
