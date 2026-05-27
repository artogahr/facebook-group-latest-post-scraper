// apify-cli can generate this for you - apify actor generate-schema-types
export interface Input {
  groupUrls: string[];
  recipientEmail: string;
  ignoreKeywords?: string[];
  useResidentialProxy?: boolean;
}

export interface Post {
  dedupKey: string;
  text: string;
  url: string | null;
  groupUrl: string;
}
