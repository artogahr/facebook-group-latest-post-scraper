export interface Input {
  groupUrls: string[];
  slackWebhookUrl: string;
  ignoreKeywords?: string[];
  useResidentialProxy?: boolean;
}

export interface Post {
  dedupKey: string;
  text: string;
  groupUrl: string;
}
