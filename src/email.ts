import { Actor } from 'apify';

export async function sendEmailNotification(
  recipientEmail: string,
  groupUrl: string,
  postText: string,
): Promise<void> {
  await Actor.call('apify/send-mail', {
    to: recipientEmail,
    subject: `New post in ${groupUrl}`,
    text: postText,
  });
}
