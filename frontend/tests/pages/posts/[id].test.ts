import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import PostDetailPage from '~/pages/posts/[id].vue';
import type { Post, PostDetailResponse, User } from '~/types';

// Nuxtのmockを設定
vi.mock('#app', () => ({
  nextTick: vi.fn().mockImplementation(() => { return Promise.resolve(); }),
  useRoute: vi.fn(() => ({
    params: { id: '123' }
  })),
  useHead: vi.fn(),
  createError: vi.fn()
}));

// コンポーザブルのmock
vi.mock('~/composables/useLike', () => ({
  useLike: () => ({
    likingPosts: ref(new Set()),
    handleLike: vi.fn(),
    cleanup: vi.fn()
  })
}));

vi.mock('~/composables/usePostActions', () => ({
  usePostActions: () => ({
    handlePostDeletedInDetail: vi.fn()
  })
}));

vi.mock('~/composables/useMobilePost', () => ({
  useMobilePost: () => ({
    createMobilePostForDetail: vi.fn()
  })
}));

// $fetchのmock
const mockFetch = vi.fn();
global.$fetch = mockFetch as unknown as typeof $fetch;

describe('PostDetailPage', () => {
  // テスト用データ
  const testPostId = 123;
  const expectedUser: User = {
    id: 1,
    name: 'テストユーザー太郎'
  };

  const expectedPost: Post = {
    id: testPostId,
    body: 'これはテスト用の投稿本文です',
    user: expectedUser,
    likes_count: 5,
    created_at: '2025-01-01T00:00:00Z',
    is_liked: true,
    is_owner: true,
    comments_count: 3
  };

  const expectedPostDetailResponse: PostDetailResponse = {
    success: true,
    post: expectedPost,
    current_user_id: expectedUser.id
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトで成功レスポンスを返すように設定
    mockFetch.mockResolvedValue(expectedPostDetailResponse);
    
    // コメント一覧API用のmock（CommentsSection用）
    mockFetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/comments')) {
        return Promise.resolve({
          success: true,
          comments: [],
          pagination: {
            current_page: 1,
            last_page: 1,
            total: 0,
            per_page: 20
          }
        });
      }
      return Promise.resolve(expectedPostDetailResponse);
    });
  });

  it('投稿詳細ページで投稿本文と投稿者名が表示される', async () => {
    // コンポーネントをマウント
    const actual = mount(PostDetailPage);

    // API呼び出しとDOMの更新を待つ
    await new Promise((resolve) => { return setTimeout(resolve, 100); });
    await actual.vm.$nextTick();

    // API呼び出しが行われることを確認
    expect(mockFetch).toHaveBeenCalled();

    // 投稿本文が表示されることを確認
    expect(actual.text()).toContain('これはテスト用の投稿本文です');

    // 投稿者名が表示されることを確認
    expect(actual.text()).toContain('テストユーザー太郎');
  });

  it('いいね済み投稿と未いいね投稿でハートアイコンのスタイルが異なる', async () => {
    // いいね済み投稿データを準備
    const expectedLikedPost: Post = {
      ...expectedPost,
      is_liked: true,
      likes_count: 1
    };
    const expectedLikedPostResponse: PostDetailResponse = {
      ...expectedPostDetailResponse,
      post: expectedLikedPost
    };

    // いいね済み投稿用のmock設定
    mockFetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/comments')) {
        return Promise.resolve({
          success: true,
          comments: [],
          pagination: {
            current_page: 1,
            last_page: 1,
            total: 0,
            per_page: 20
          }
        });
      }
      return Promise.resolve(expectedLikedPostResponse);
    });

    // いいね済み投稿をマウント
    const actualLikedPost = mount(PostDetailPage);
    await new Promise((resolve) => { return setTimeout(resolve, 100); });
    await actualLikedPost.vm.$nextTick();

    // いいね済みハートアイコンのクラス名を取得
    const likedHeartIcon = actualLikedPost.find('[data-testid="heart-icon"]');
    const likedHeartClasses = likedHeartIcon.exists() ? likedHeartIcon.classes() : [];

    // 未いいね投稿データを準備
    const expectedNotLikedPost: Post = {
      ...expectedPost,
      is_liked: false,
      likes_count: 0
    };
    const expectedNotLikedPostResponse: PostDetailResponse = {
      ...expectedPostDetailResponse,
      post: expectedNotLikedPost
    };

    // 未いいね投稿用のmock設定
    mockFetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/comments')) {
        return Promise.resolve({
          success: true,
          comments: [],
          pagination: {
            current_page: 1,
            last_page: 1,
            total: 0,
            per_page: 20
          }
        });
      }
      return Promise.resolve(expectedNotLikedPostResponse);
    });

    // 未いいね投稿をマウント
    const actualNotLikedPost = mount(PostDetailPage);
    await new Promise((resolve) => { return setTimeout(resolve, 100); });
    await actualNotLikedPost.vm.$nextTick();

    // 未いいねハートアイコンのクラス名を取得
    const notLikedHeartIcon = actualNotLikedPost.find('[data-testid="heart-icon"]');
    const notLikedHeartClasses = notLikedHeartIcon.exists() ? notLikedHeartIcon.classes() : [];

    // 2つのハートアイコンのスタイルが異なることを確認
    expect(likedHeartClasses).not.toEqual(notLikedHeartClasses);
  });

  it('ログイン中のユーザー自身の投稿には削除ボタンが表示される', async () => {
    // 自分の投稿データを準備（is_owner: true）
    const expectedOwnPost: Post = {
      ...expectedPost,
      is_owner: true
    };
    const expectedOwnPostResponse: PostDetailResponse = {
      ...expectedPostDetailResponse,
      post: expectedOwnPost
    };

    // 自分の投稿用のmock設定
    mockFetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/comments')) {
        return Promise.resolve({
          success: true,
          comments: [],
          pagination: {
            current_page: 1,
            last_page: 1,
            total: 0,
            per_page: 20
          }
        });
      }
      return Promise.resolve(expectedOwnPostResponse);
    });

    const actual = mount(PostDetailPage);
    await new Promise((resolve) => { return setTimeout(resolve, 100); });
    await actual.vm.$nextTick();

    // 削除ボタンが表示されることを確認
    const deleteButton = actual.find('img[alt="削除"]');
    expect(deleteButton.exists()).toBe(true);
  });

  it('他のユーザーの投稿には削除ボタンが表示されない', async () => {
    // 他のユーザーの投稿データを準備（is_owner: false）
    const expectedOtherPost: Post = {
      ...expectedPost,
      is_owner: false
    };
    const expectedOtherPostResponse: PostDetailResponse = {
      ...expectedPostDetailResponse,
      post: expectedOtherPost
    };

    // 他のユーザーの投稿用のmock設定
    mockFetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/comments')) {
        return Promise.resolve({
          success: true,
          comments: [],
          pagination: {
            current_page: 1,
            last_page: 1,
            total: 0,
            per_page: 20
          }
        });
      }
      return Promise.resolve(expectedOtherPostResponse);
    });

    const actual = mount(PostDetailPage);
    await new Promise((resolve) => { return setTimeout(resolve, 100); });
    await actual.vm.$nextTick();

    // 削除ボタンが表示されないことを確認
    const deleteButton = actual.find('img[alt="削除"]');
    expect(deleteButton.exists()).toBe(false);
  });

  it('投稿詳細でいいね数が0の投稿で数字が正しく表示される', async () => {
    // いいね数0の投稿データを準備
    const expectedZeroLikesPost: Post = {
      ...expectedPost,
      likes_count: 0
    };
    const expectedZeroLikesResponse: PostDetailResponse = {
      ...expectedPostDetailResponse,
      post: expectedZeroLikesPost
    };

    // いいね数0投稿用のmock設定
    mockFetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/comments')) {
        return Promise.resolve({
          success: true,
          comments: [],
          pagination: {
            current_page: 1,
            last_page: 1,
            total: 0,
            per_page: 20
          }
        });
      }
      return Promise.resolve(expectedZeroLikesResponse);
    });

    const actual = mount(PostDetailPage);
    await new Promise((resolve) => { return setTimeout(resolve, 100); });
    await actual.vm.$nextTick();

    // いいね数0が表示されることを確認
    expect(actual.text()).toContain('0');
  });

  it('投稿詳細でいいね数が複数の投稿で数字が正しく表示される', async () => {
    // いいね数15の投稿データを準備
    const expectedMultipleLikesPost: Post = {
      ...expectedPost,
      likes_count: 15
    };
    const expectedMultipleLikesResponse: PostDetailResponse = {
      ...expectedPostDetailResponse,
      post: expectedMultipleLikesPost
    };

    // いいね数15投稿用のmock設定
    mockFetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/comments')) {
        return Promise.resolve({
          success: true,
          comments: [],
          pagination: {
            current_page: 1,
            last_page: 1,
            total: 0,
            per_page: 20
          }
        });
      }
      return Promise.resolve(expectedMultipleLikesResponse);
    });

    const actual = mount(PostDetailPage);
    await new Promise((resolve) => { return setTimeout(resolve, 100); });
    await actual.vm.$nextTick();

    // いいね数15が表示されることを確認
    expect(actual.text()).toContain('15');
  });
});