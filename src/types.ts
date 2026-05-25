export interface Input {
  groupUrls: string[];
  recipientEmail: string;
  senderEmail: string;
  senderPassword: string;
  ignoreKeywords?: string[];
  useResidentialProxy?: boolean;
}

export interface Post {
  dedupKey: string;
  text: string;
  groupUrl: string;
}
