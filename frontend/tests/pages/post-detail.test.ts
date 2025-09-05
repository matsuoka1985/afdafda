import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import PostItem from '~/components/PostItem.vue';
import type { Post, User } from '~/types';
import { useLike } from '~/composables/useLike';

// $fetchをモック
const mockFetch = vi.fn();
global.$fetch = mockFetch as unknown as typeof $fetch;

// useRuntimeConfigをモック
const mockApiBaseUrl = process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost';
vi.mock('#app', () => ({
  useRuntimeConfig: vi.fn(() => ({
    public: {
      apiBaseUrl: mockApiBaseUrl
    }
  })),
  definePageMeta: vi.fn(),
  nextTick: vi.fn().mockImplementation(() => Promise.resolve()),
  useRoute: vi.fn(() => ({
    params: { id: '1' }
  })),
  useHead: vi.fn(),
  createError: vi.fn(),
  computed: vi.fn((fn) => ({ value: fn() }))
}));

// 各種コンポーザブルをモック
vi.mock('~/composables/useToast', () => ({
  useToast: () => ({
    error: vi.fn(),
    success: vi.fn()
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

// NuxtLinkコンポーネントとRouterLinkの両方をモック
const MockNuxtLink = {
  name: 'NuxtLink',
  template: '<router-link :to="to" v-bind="$attrs"><slot /></router-link>',
  props: ['to'],
  components: {
    RouterLink: {
      name: 'RouterLink',
      template: '<a :href="to" v-bind="$attrs"><slot /></a>',
      props: ['to']
    }
  }
};

// CommentsSection コンポーネントをモック
const MockCommentsSection = {
  name: 'CommentsSection',
  template: '<div>Comments Section Mock</div>',
  props: ['postId', 'sharedCommentBody', 'commentsListHeight'],
  emits: ['update:sharedCommentBody', 'comment-created', 'mounted']
};

// useLikeコンポーザブルは実際のものを使用（統合テスト）
vi.mock('~/composables/useLike', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/composables/useLike')>();
  return {
    ...actual
  };
});

describe('PostDetailPage - いいね機能統合テスト（PostItemコンポーネント）', () => {
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
    is_owner: false,
    comments_count: 0
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset testPost for each test
    testPost.is_liked = false;
    testPost.likes_count = 0;
  });

  it('投稿詳細ページでいいねアイコンを押すことで、いいねした投稿として登録でき、スタイルが変化する', async () => {
    // いいねAPI呼び出しのレスポンス（useLikeが期待する形式）
    mockFetch.mockResolvedValueOnce({
      success: true,
      is_liked: true,
      likes_count: 1,
      message: 'いいねしました'
    });

    // useLikeコンポーザブルをセットアップ
    const { likingPosts, handleLike } = useLike();
    
    const wrapper = mount(PostItem, {
      props: {
        post: testPost,
        currentUserId: 1,
        showDetailLink: false, // 投稿詳細ページでは詳細リンク非表示
        isLiking: likingPosts.value.has(testPost.id)
      },
      global: {
        components: {
          NuxtLink: MockNuxtLink,
          RouterLink: MockNuxtLink.components.RouterLink
        }
      }
    });

    // いいね前のハートアイコンのスタイルを確認
    const heartIconBefore = wrapper.find('img[alt="いいね"]');
    expect(heartIconBefore.exists()).toBe(true);
    const stylesBefore = heartIconBefore.classes();

    // いいねボタンを探す（PostItem内のいいねボタン）
    const allButtons = wrapper.findAll('button');
    const likeButton = allButtons.find(button => 
      button.text().includes('0') && 
      button.classes().includes('flex') && 
      button.classes().includes('items-center')
    );
    expect(likeButton).toBeDefined();
    if (!likeButton) {
      throw new Error('いいねボタンが見つかりません');
    }

    // いいねボタンをクリック - これによりPostItemがlikeイベントを発火
    await likeButton.trigger('click');
    
    // PostItemからのlikeイベントを手動でuseLikeに転送（統合テスト的にhandleLikeを呼び出し）
    const emittedEvents = wrapper.emitted('like');
    expect(emittedEvents).toBeTruthy();
    expect(emittedEvents?.[0]).toEqual([1]);
    
    // 実際のいいね処理を実行
    handleLike(testPost);
    
    // useLikeのデバウンス（500ms）+ バッファ時間待機
    await new Promise(resolve => setTimeout(resolve, 600));
    await wrapper.vm.$nextTick();

    // $fetchが正しいエンドポイントに呼ばれることを確認
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(`${mockApiBaseUrl}/api/posts/1/like`, {
      method: 'POST',
      credentials: 'include'
    });

    // いいね数が増加して表示されることを確認
    await wrapper.vm.$nextTick();
    
    // testPostオブジェクトが更新されていることを確認
    expect(testPost.likes_count).toBe(1);
    expect(testPost.is_liked).toBe(true);
    
    // コンポーネントのプロパティを更新してUI反映
    await wrapper.setProps({
      post: { ...testPost }
    });
    await wrapper.vm.$nextTick();
    
    expect(wrapper.text()).toContain('1');

    // いいね後のハートアイコンのスタイルを確認
    const heartIconAfter = wrapper.find('img[alt="いいね"]');
    expect(heartIconAfter.exists()).toBe(true);
    const stylesAfter = heartIconAfter.classes();

    // スタイルが変化していることを確認
    expect(stylesAfter).not.toEqual(stylesBefore);
  });

  it('投稿詳細ページでいいね済みといいねしていない投稿でハートアイコンの色が異なる', () => {
    // いいねしていない投稿でのハートアイコンのスタイルを取得
    const notLikedWrapper = mount(PostItem, {
      props: {
        post: testPost,
        currentUserId: 1,
        showDetailLink: false
      },
      global: {
        components: {
          NuxtLink: MockNuxtLink,
          RouterLink: MockNuxtLink.components.RouterLink
        }
      }
    });
    
    const notLikedHeartIcon = notLikedWrapper.find('img[alt="いいね"]');
    expect(notLikedHeartIcon.exists()).toBe(true);
    const notLikedClasses = notLikedHeartIcon.classes();

    // いいね済みの投稿データ
    const likedPost: Post = {
      id: 1,
      body: 'テスト投稿',
      user: testUser,
      likes_count: 1,
      created_at: '2024-01-01T00:00:00Z',
      is_liked: true,
      is_owner: false,
      comments_count: 0
    };

    // いいね済み状態でのハートアイコンのスタイルを取得
    const likedWrapper = mount(PostItem, {
      props: {
        post: likedPost,
        currentUserId: 1,
        showDetailLink: false
      },
      global: {
        components: {
          NuxtLink: MockNuxtLink,
          RouterLink: MockNuxtLink.components.RouterLink
        }
      }
    });

    const likedHeartIcon = likedWrapper.find('img[alt="いいね"]');
    expect(likedHeartIcon.exists()).toBe(true);
    const likedClasses = likedHeartIcon.classes();

    // 両者のスタイル（CSSクラス）が異なることを確認
    expect(likedClasses).not.toEqual(notLikedClasses);
  });

  it('投稿詳細ページで再度いいねアイコンを押すことでいいねを解除できる', async () => {
    // 最初にいいね済み状態の投稿を作成
    const likedPost: Post = {
      id: 1,
      body: 'テスト投稿',
      user: testUser,
      likes_count: 1,
      created_at: '2024-01-01T00:00:00Z',
      is_liked: true,
      is_owner: false,
      comments_count: 0
    };

    // いいね解除API呼び出しのレスポンス
    mockFetch.mockResolvedValueOnce({
      success: true,
      is_liked: false,
      likes_count: 0,
      message: 'いいねを解除しました'
    });

    // useLikeコンポーザブルをセットアップ
    const { likingPosts, handleLike } = useLike();
    
    const wrapper = mount(PostItem, {
      props: {
        post: likedPost,
        currentUserId: 1,
        showDetailLink: false,
        isLiking: likingPosts.value.has(likedPost.id)
      },
      global: {
        components: {
          NuxtLink: MockNuxtLink,
          RouterLink: MockNuxtLink.components.RouterLink
        }
      }
    });

    // いいね前（いいね済み状態）のハートアイコンのスタイルを確認
    const heartIconBefore = wrapper.find('img[alt="いいね"]');
    expect(heartIconBefore.exists()).toBe(true);
    const stylesBefore = heartIconBefore.classes();
    expect(stylesBefore).toContain('filter-red-heart');

    // いいねボタンを探す（PostItem内のいいねボタン）
    const allButtons = wrapper.findAll('button');
    const likeButton = allButtons.find(button => 
      button.text().includes('1') && 
      button.classes().includes('flex') && 
      button.classes().includes('items-center')
    );
    expect(likeButton).toBeDefined();
    if (!likeButton) {
      throw new Error('いいねボタンが見つかりません');
    }

    // いいねボタンをクリック（いいね解除）
    await likeButton.trigger('click');
    
    // PostItemからのlikeイベントを確認し、useLikeに転送
    const emittedEvents = wrapper.emitted('like');
    expect(emittedEvents).toBeTruthy();
    expect(emittedEvents?.[0]).toEqual([1]);
    
    // 実際のいいね解除処理を実行
    handleLike(likedPost);
    
    // useLikeのデバウンス（500ms）+ バッファ時間待機
    await new Promise(resolve => setTimeout(resolve, 600));
    await wrapper.vm.$nextTick();

    // $fetchが正しいエンドポイントに呼ばれることを確認
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(`${mockApiBaseUrl}/api/posts/1/like`, {
      method: 'DELETE',
      credentials: 'include'
    });

    // いいね数が減少していることを確認
    expect(likedPost.likes_count).toBe(0);
    expect(likedPost.is_liked).toBe(false);
    
    // コンポーネントのプロパティを更新してUI反映
    await wrapper.setProps({
      post: { ...likedPost }
    });
    await wrapper.vm.$nextTick();
    
    expect(wrapper.text()).toContain('0');

    // いいね解除後のハートアイコンのスタイルを確認
    const heartIconAfter = wrapper.find('img[alt="いいね"]');
    expect(heartIconAfter.exists()).toBe(true);
    const stylesAfter = heartIconAfter.classes();
    expect(stylesAfter).toContain('filter-white-heart');

    // スタイルが変化していることを確認
    expect(stylesAfter).not.toEqual(stylesBefore);
  });
});