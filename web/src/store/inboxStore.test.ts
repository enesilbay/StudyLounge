import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn(() => Promise.resolve({ data: {} }));
vi.mock('../lib/api', () => ({ api: { post, get: vi.fn() } }));

const { useInboxStore } = await import('./inboxStore');

describe('inboxStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useInboxStore.getState().reset();
    post.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it('keeps at most three toasts and removes them after a few seconds', () => {
    const { pushToast } = useInboxStore.getState();
    ['bir', 'iki', 'üç', 'dört'].forEach((title) => pushToast({ title }));

    expect(useInboxStore.getState().toasts.map((toast) => toast.title)).toEqual(['iki', 'üç', 'dört']);
    vi.advanceTimersByTime(6000);
    expect(useInboxStore.getState().toasts).toHaveLength(0);
  });

  it('counts each unread sender once and marks them read on the server', () => {
    const { addUnread, markRead } = useInboxStore.getState();
    addUnread(5);
    addUnread(5);
    addUnread(7);
    expect(useInboxStore.getState().unreadFrom).toEqual([5, 7]);

    markRead(5);
    expect(useInboxStore.getState().unreadFrom).toEqual([7]);
    expect(post).toHaveBeenCalledWith('/messages/dm/5/read');
  });
});
