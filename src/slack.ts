export function buildSlackMessage(groupUrl: string, postText: string): { text: string } {
  return { text: `New post in ${groupUrl}:\n\n${postText}` };
}

export async function sendSlackNotification(
  webhookUrl: string,
  groupUrl: string,
  postText: string,
): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildSlackMessage(groupUrl, postText)),
  });
  if (!response.ok) {
    throw new Error(`Slack notification failed: ${response.status} ${response.statusText}`);
  }
}
