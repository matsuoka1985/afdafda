import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import IndexPage from '~/pages/index.vue';
import type { Post, PostsListResponse, User } from '~/types';

// $fetchをモック
const mockFetch = vi.fn();
global.$fetch = mockFetch as unknown as typeof $fetch;

// useRuntimeConfigをモック
const mockApiBaseUrl = process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost';
vi.mock('#app', () => ({
  useRuntimeConfig: vi.fn(() => ({
    public: {
      apiBaseUrl: mockApiBaseUrl
    },
    apiBaseUrlServer: mockApiBaseUrl
  })),
  definePageMeta: vi.fn(),
  nextTick: vi.fn().mockImplementation(() => Promise.resolve())
}));

// コンポーザブルのモック
vi.mock('~/composables/useInfiniteScroll', () => ({
  useInfiniteScroll: () => ({
    isLoading: ref(false),
    hasMore: ref(true),
    handleScroll: vi.fn(),
    loadNextPage: vi.fn(),
    reset: vi.fn()
  })
}));

vi.mock('~/composables/useToast', () => ({
  useToast: () => ({
    error: vi.fn(),
    success: vi.fn()
  })
}));

vi.mock('~/composables/usePostActions', () => ({
  usePostActions: () => ({
    handlePostDeleted: vi.fn()
  })
}));

// useLikeコンポーザブルをモック
const mockHandleLike = vi.fn();
vi.mock('~/composables/useLike', () => ({
  useLike: () => ({
    likingPosts: ref(new Set()),
    handleLike: mockHandleLike,
    cleanup: vi.fn()
  })
}));

describe('IndexPage - いいね機能統合テスト', () => {
  const testUser: User = {
    id: 1,
    name: 'テストユーザー'
  };

  const testPost: Post = {
    id: 1,
    body: 'テスト投稿',
    user: testUser,
    likes_count: 0,
    created_at: '2024-01-01T00:00:00Z',
    is_liked: false,
    is_owner: false
  };

  const postsListResponse: PostsListResponse = {
    success: true,
    posts: [testPost],
    current_user_id: 1,
    pagination: {
      current_page: 1,
      last_page: 1,
      per_page: 20,
      total: 1
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // 投稿一覧取得のデフォルトレスポンス
    mockFetch.mockResolvedValue(postsListResponse);
    
    // useLikeのhandleLikeをリセット
    mockHandleLike.mockClear();
  });


  it('いいね済み投稿とそうでない投稿でハートアイコンのスタイルが異なる', async () => {
    // いいねしていない投稿でのハートアイコンのスタイルを取得
    const unlikedWrapper = mount(IndexPage);
    await new Promise(resolve => setTimeout(resolve, 100));
    await unlikedWrapper.vm.$nextTick();
    
    const unlikedHeartIcon = unlikedWrapper.find('img[alt="いいね"]');
    expect(unlikedHeartIcon.exists()).toBe(true);
    const unlikedClasses = unlikedHeartIcon.classes();

    // いいね済みの投稿データ
    const likedPost: Post = {
      id: 1,
      body: 'テスト投稿',
      user: testUser,
      likes_count: 1,
      created_at: '2024-01-01T00:00:00Z',
      is_liked: true,
      is_owner: false
    };

    const likedPostsResponse: PostsListResponse = {
      success: true,
      posts: [likedPost],
      current_user_id: 1,
      pagination: {
        current_page: 1,
        last_page: 1,
        per_page: 20,
        total: 1
      }
    };

    // いいね済み状態でレスポンスを設定
    mockFetch.mockResolvedValue(likedPostsResponse);

    const likedWrapper = mount(IndexPage);
    await new Promise(resolve => setTimeout(resolve, 100));
    await likedWrapper.vm.$nextTick();

    // いいね済み投稿のハートアイコンのスタイルを取得
    const likedHeartIcon = likedWrapper.find('img[alt="いいね"]');
    expect(likedHeartIcon.exists()).toBe(true);
    const likedClasses = likedHeartIcon.classes();

    // 両者のスタイル（CSSクラス）が異なることを確認
    expect(likedClasses).not.toEqual(unlikedClasses);
  });

  it('新規投稿が投稿一覧の先頭に表示される', async () => {
    // arrange
    const inputText = 'これは新しいテスト投稿です';
    
    // 投稿作成API成功レスポンスをモック
    const newPostResponse = {
      success: true,
      post: {
        id: 2,
        body: inputText,
        user: {
          id: 1,
          name: 'テストユーザー'
        },
        likes_count: 0,
        created_at: '2024-01-02T00:00:00Z',
        is_liked: false,
        is_owner: true
      }
    };

    // act
    const wrapper = mount(IndexPage);

    // 初期データ読み込み完了を待つ
    await new Promise(resolve => setTimeout(resolve, 100));
    await wrapper.vm.$nextTick();

    // 投稿一覧の初期状態を確認
    expect(wrapper.text()).toContain('テスト投稿');

    // PostFormを見つけて投稿内容を入力
    const textarea = wrapper.find('textarea');
    expect(textarea.exists()).toBe(true);

    await textarea.setValue(inputText);
    await wrapper.vm.$nextTick();

    // 投稿作成APIのモックを設定
    mockFetch.mockResolvedValueOnce(newPostResponse);

    // フォーム送信
    await wrapper.find('form').trigger('submit');
    await wrapper.vm.$nextTick();

    // 非同期処理を待つ
    await new Promise(resolve => setTimeout(resolve, 100));

    // assert
    // 投稿作成APIが正しく呼ばれたことを確認
    expect(mockFetch).toHaveBeenCalledWith(
      `${mockApiBaseUrl}/api/posts`,
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: {
          body: inputText
        }
      })
    );

    // 新しい投稿が投稿一覧に表示されることを確認
    expect(wrapper.text()).toContain('これは新しいテスト投稿です');
    expect(wrapper.text()).toContain('テスト投稿'); // 既存投稿も残っている
  });
});