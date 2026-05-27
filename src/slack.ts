// this is dead code :eyes:
export async function sendSlackNotification(
  webhookUrl: string,
  groupUrl: string,
  postText: string,
): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `New post in ${groupUrl}:\n\n${postText}` }),
  });
  if (!response.ok) {
    throw new Error(`Slack notification failed: ${response.status} ${response.statusText}`);
  }
}
