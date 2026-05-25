import { vi, describe, it, expect, afterEach, beforeEach } from 'vitest';
import { sendEmailNotification } from '../src/email.js';
import nodemailer from 'nodemailer';

vi.mock('nodemailer');

describe('sendEmailNotification', () => {
  const mockSendMail = vi.fn().mockResolvedValue({});

  afterEach(() => vi.clearAllMocks());

  beforeEach(() => {
    vi.mocked(nodemailer.createTransport).mockReturnValue({ sendMail: mockSendMail } as any);
  });

  it('sends email with correct fields', async () => {
    await sendEmailNotification(
      'sender@gmail.com',
      'app-password',
      'recipient@gmail.com',
      'https://www.facebook.com/groups/test',
      'Free sofa, pickup only',
    );

    expect(mockSendMail).toHaveBeenCalledWith({
      from: 'sender@gmail.com',
      to: 'recipient@gmail.com',
      subject: 'New post in https://www.facebook.com/groups/test',
      text: 'Free sofa, pickup only',
    });
  });

  it('throws when sendMail fails', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP error'));

    await expect(
      sendEmailNotification(
        'sender@gmail.com',
        'app-password',
        'recipient@gmail.com',
        'https://www.facebook.com/groups/test',
        'Free sofa',
      ),
    ).rejects.toThrow('SMTP error');
  });
});
