import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { extractDedupKey } from '../src/scraper.js';

describe('extractDedupKey', () => {
  it('returns sha256 hash of post text', () => {
    const text = 'Free sofa, pickup only';
    const result = extractDedupKey(text);
    const expected = createHash('sha256').update(text).digest('hex');
    expect(result).toBe(expected);
  });
});
