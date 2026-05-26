import { Actor } from 'apify';
import { ApifyClient } from 'apify-client';

export async function sendEmailNotification(
  recipientEmail: string,
  groupUrl: string,
  postText: string,
): Promise<void> {
  const token = process.env.FULL_APIFY_TOKEN;
  if (token) {
    const client = new ApifyClient({ token });
    await client.actor('apify/send-mail').call({
      to: recipientEmail,
      subject: `New post in ${groupUrl}`,
      text: postText,
    });
  } else {
    await Actor.call('apify/send-mail', {
      to: recipientEmail,
      subject: `New post in ${groupUrl}`,
      text: postText,
    });
  }
}
