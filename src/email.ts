import { Actor } from 'apify';

export async function sendEmailNotification(
  recipientEmail: string,
  groupUrl: string,
  postText: string,
): Promise<void> {
  const token = process.env.FULL_APIFY_TOKEN;
  const client = Actor.newClient(token ? { token } : {});
  await client.actor('apify/send-mail').call({
    to: recipientEmail,
    subject: `New post in ${groupUrl}`,
    text: postText,
  });
}
