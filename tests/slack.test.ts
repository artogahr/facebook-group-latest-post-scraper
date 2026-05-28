import { describe, it, expect } from 'vitest';
import { buildSlackMessage } from '../src/slack.js';

describe('buildSlackMessage', () => {
  it('formats group URL and post text into a Slack message', () => {
    expect(buildSlackMessage('https://www.facebook.com/groups/example', 'Hello world')).toEqual({
      text: 'New post in https://www.facebook.com/groups/example:\n\nHello world',
    });
  });

  it('includes a post URL when appended to postText', () => {
    const postText = 'Check this out\n\nhttps://www.facebook.com/groups/example/posts/123';
    expect(buildSlackMessage('https://www.facebook.com/groups/example', postText)).toEqual({
      text: `New post in https://www.facebook.com/groups/example:\n\n${postText}`,
    });
  });
});
