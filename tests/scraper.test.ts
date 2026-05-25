import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { extractDedupKey } from '../src/scraper.js';

describe('extractDedupKey', () => {
  it('returns permalink when available', () => {
    const result = extractDedupKey('/groups/test/posts/123', 'some text');
    expect(result).toBe('/groups/test/posts/123');
  });

  it('falls back to sha256 hash of text when no permalink', () => {
    const text = 'Free sofa, pickup only';
    const result = extractDedupKey(null, text);
    const expected = createHash('sha256').update(text).digest('hex');
    expect(result).toBe(expected);
  });
});
