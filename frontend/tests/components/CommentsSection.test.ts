import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import CommentsSection from '~/components/CommentsSection.vue';
import type { Comment, CommentsResponse } from '~/types';

// Nuxtのmockを設定
const mockApiBaseUrl = process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost';
vi.mock('#app', () => ({
  nextTick: vi.fn().mockImplementation(() => { return Promise.resolve(); }),
  useRuntimeConfig: vi.fn(() => ({
    public: {
      apiBaseUrl: mockApiBaseUrl
    }
  }))
}));

// グローバルコンポーザブルのmock
vi.mock('~/composables/useInfiniteScroll', () => ({
  useInfiniteScroll: () => ({
    isLoading: ref(false),
    hasMore: ref(true),
    handleScroll: vi.fn().mockReturnValue(() => { return {}; }),
    loadNextPage: vi.fn(),
    reset: vi.fn()
  })
}));

// $fetchのmock - Mock型として適切に定義
const mockFetch = vi.fn();
global.$fetch = mockFetch as unknown as typeof $fetch;

describe('CommentsSection', () => {
  // テスト用のデータ
  const testPostId = 123;
  const comments: Comment[] = [
    {
      id: 1,
      body: 'これはテスト用のコメント本文です',
      user: {
        id: 1,
        name: 'テストユーザー太郎'
      },
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 2,
      body: '別のコメント本文',
      user: {
        id: 2,
        name: 'テストユーザー花子'
      },
      created_at: '2025-01-01T01:00:00Z'
    }
  ];

  const testCommentsResponse: CommentsResponse = {
    success: true,
    comments: comments,
    pagination: {
      current_page: 1,
      last_page: 1,
      total: 2,
      per_page: 20
    }
  };

  const defaultProps = {
    postId: testPostId,
    sharedCommentBody: '',
    commentsListHeight: '400px'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトで成功レスポンスを返すように設定
    mockFetch.mockResolvedValue(testCommentsResponse);
  });

  it('投稿に紐付く全コメントが取得できる', async () => {
    // コンポーネントをマウント
    const wrapper = mount(CommentsSection, {
      props: defaultProps
    });

    // API呼び出しとDOMの更新を待つ
    await new Promise((resolve) => { return setTimeout(resolve, 100); });
    await wrapper.vm.$nextTick();
    
    // APIが正しいパラメータで呼ばれることを確認
    expect(mockFetch).toHaveBeenCalledWith(`${mockApiBaseUrl}/api/posts/${testPostId}/comments`, {
      method: 'GET',
      credentials: 'include',
      query: {
        page: 1,
        per_page: 20
      }
    });

    // コメント一覧が表示されることを確認
    const commentElements = wrapper.findAll('[data-testid="comment-item"]');
    expect(commentElements).toHaveLength(comments.length);
  });

  it('コメント本文が表示される', async () => {
    // コンポーネントをマウント
    const wrapper = mount(CommentsSection, {
      props: defaultProps
    });

    // API呼び出しとDOMの更新を待つ
    await new Promise((resolve) => { return setTimeout(resolve, 100); });
    await wrapper.vm.$nextTick();

    // 各コメントの本文が表示されることを確認
    const commentBodies = wrapper.findAll('[data-testid="comment-body"]');
    expect(commentBodies[0].text()).toBe('これはテスト用のコメント本文です');
    expect(commentBodies[1].text()).toBe('別のコメント本文');
  });

  it('コメント投稿者名が表示される', async () => {
    // コンポーネントをマウント
    const wrapper = mount(CommentsSection, {
      props: defaultProps
    });

    // API呼び出しとDOMの更新を待つ
    await new Promise((resolve) => { return setTimeout(resolve, 100); });
    await wrapper.vm.$nextTick();

    // 各コメントの投稿者名が表示されることを確認
    const commentUserNames = wrapper.findAll('[data-testid="comment-user-name"]');
    expect(commentUserNames[0].text()).toBe('テストユーザー太郎');
    expect(commentUserNames[1].text()).toBe('テストユーザー花子');
  });

  it('コメントが存在しない場合は適切なメッセージが表示される', async () => {
    // 空のコメント配列を返すようにmockを設定
    const emptyResponse: CommentsResponse = {
      success: true,
      comments: [],
      pagination: {
        current_page: 1,
        last_page: 0,
        total: 0,
        per_page: 20
      }
    };
    mockFetch.mockResolvedValueOnce(emptyResponse);

    const wrapper = mount(CommentsSection, {
      props: defaultProps
    });

    await wrapper.vm.$nextTick();

    // 「まだコメントはありません」メッセージが表示されることを確認
    expect(wrapper.text()).toContain('まだコメントはありません');
    
    // コメント要素が存在しないことを確認
    const commentElements = wrapper.findAll('[data-testid="comment-item"]');
    expect(commentElements).toHaveLength(0);
  });

  it('APIエラー時は適切にエラーハンドリングされる', async () => {
    // API呼び出しでエラーを発生させる
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { return; });
    mockFetch.mockRejectedValueOnce(new Error('ネットワークエラー'));

    const wrapper = mount(CommentsSection, {
      props: defaultProps
    });

    // エラー処理を待つ
    await new Promise((resolve) => { return setTimeout(resolve, 100); });
    await wrapper.vm.$nextTick();

    // エラーがコンソールに出力されることを確認
    expect(consoleErrorSpy).toHaveBeenCalledWith('初期コメント読み込みエラー:', expect.any(Error));
    
    consoleErrorSpy.mockRestore();
  });
});