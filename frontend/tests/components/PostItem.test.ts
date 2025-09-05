import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import PostItem from '~/components/PostItem.vue';
import type { Post } from '~/types';

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
  }))
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

describe('PostItem.vue', () => {
  const mockPost: Post = {
    id: 1,
    body: 'テスト投稿内容',
    user: {
      id: 1,
      name: 'テストユーザー'
    },
    likes_count: 5,
    created_at: '2024-01-01T00:00:00Z',
    is_liked: false,
    is_owner: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('投稿内容が正しく表示される', () => {
    const wrapper = mount(PostItem, {
      props: {
        post: mockPost,
        currentUserId: null
      },
      global: {
        components: {
          NuxtLink: MockNuxtLink,
          RouterLink: MockNuxtLink.components.RouterLink
        }
      }
    });

    // 投稿内容、ユーザー名、いいね数がすべて表示されることを確認
    expect(wrapper.text()).toContain('テスト投稿内容');
    expect(wrapper.text()).toContain('テストユーザー');
    expect(wrapper.text()).toContain('5');
  });

  it('いいねした投稿といいねしていない投稿でハートアイコンのスタイルが異なる', () => {
    // いいねした投稿
    const likedPost: Post = {
      ...mockPost,
      is_liked: true,
      likes_count: 1
    };

    const likedWrapper = mount(PostItem, {
      props: {
        post: likedPost,
        currentUserId: 1
      },
      global: {
        components: {
          NuxtLink: MockNuxtLink,
          RouterLink: MockNuxtLink.components.RouterLink
        }
      }
    });

    // いいねしていない投稿
    const notLikedPost: Post = {
      ...mockPost,
      is_liked: false,
      likes_count: 0
    };

    const notLikedWrapper = mount(PostItem, {
      props: {
        post: notLikedPost,
        currentUserId: 1
      },
      global: {
        components: {
          NuxtLink: MockNuxtLink,
          RouterLink: MockNuxtLink.components.RouterLink
        }
      }
    });

    // 両方のハートアイコンを取得
    const likedHeartIcon = likedWrapper.find('img[alt="いいね"]');
    const notLikedHeartIcon = notLikedWrapper.find('img[alt="いいね"]');

    expect(likedHeartIcon.exists()).toBe(true);
    expect(notLikedHeartIcon.exists()).toBe(true);

    // CSSクラスが異なることを確認
    const likedClasses = likedHeartIcon.classes();
    const notLikedClasses = notLikedHeartIcon.classes();
    
    expect(likedClasses).not.toEqual(notLikedClasses);
  });

  it('ログイン中のユーザーによる投稿には削除マークが表示される', () => {
    const ownPost: Post = {
      ...mockPost,
      is_owner: true
    };

    const wrapper = mount(PostItem, {
      props: {
        post: ownPost,
        currentUserId: 1
      },
      global: {
        components: {
          NuxtLink: MockNuxtLink,
          RouterLink: MockNuxtLink.components.RouterLink
        }
      }
    });

    // 削除ボタンが表示されることを確認
    const deleteButton = wrapper.find('img[alt="削除"]');
    expect(deleteButton.exists()).toBe(true);
  });

  it('各投稿には投稿詳細ページへ行くためのリンクボタンが表示されている', () => {
    const wrapper = mount(PostItem, {
      props: {
        post: mockPost,
        currentUserId: null
      },
      global: {
        components: {
          NuxtLink: MockNuxtLink,
          RouterLink: MockNuxtLink.components.RouterLink
        }
      }
    });

    // NuxtLinkコンポーネントが存在することを確認（showDetailLinkはデフォルトでtrue）
    const detailLink = wrapper.findComponent(MockNuxtLink);
    expect(detailLink.exists()).toBe(true);
    expect(detailLink.props('to')).toBe('/posts/1');
    
    // 詳細アイコンがコンポーネント内に存在することを確認
    const detailIcon = wrapper.find('img[alt="詳細"]');
    expect(detailIcon.exists()).toBe(true);
  });

  it('いいね数が0の投稿で数字が正しく表示される', () => {
    const zeroLikesPost: Post = {
      ...mockPost,
      likes_count: 0
    };

    const wrapper = mount(PostItem, {
      props: {
        post: zeroLikesPost,
        currentUserId: 1
      },
      global: {
        components: {
          NuxtLink: MockNuxtLink,
          RouterLink: MockNuxtLink.components.RouterLink
        }
      }
    });

    // いいね数0が表示されることを確認
    expect(wrapper.text()).toContain('0');
  });

  it('いいね数が複数の投稿で数字が正しく表示される', () => {
    const multipleLikesPost: Post = {
      ...mockPost,
      likes_count: 42
    };

    const wrapper = mount(PostItem, {
      props: {
        post: multipleLikesPost,
        currentUserId: 1
      },
      global: {
        components: {
          NuxtLink: MockNuxtLink,
          RouterLink: MockNuxtLink.components.RouterLink
        }
      }
    });

    // いいね数42が表示されることを確認
    expect(wrapper.text()).toContain('42');
  });

  it('いいねアイコンを押下することでいいねした投稿として登録される', async () => {
    const notLikedPost: Post = {
      ...mockPost,
      is_liked: false,
      likes_count: 0
    };

    const wrapper = mount(PostItem, {
      props: {
        post: notLikedPost,
        currentUserId: 1
      },
      global: {
        components: {
          NuxtLink: MockNuxtLink,
          RouterLink: MockNuxtLink.components.RouterLink
        }
      }
    });

    // いいねボタンを取得
    const likeButton = wrapper.find('button');
    expect(likeButton.exists()).toBe(true);

    // いいねボタンをクリック
    await likeButton.trigger('click');

    // likeイベントが正しい投稿IDで発火されることを確認
    expect(wrapper.emitted('like')).toBeTruthy();
    expect(wrapper.emitted('like')?.[0]).toEqual([1]);
  });

  it('再度いいねアイコンを押下することでいいねを解除できる', async () => {
    const likedPost: Post = {
      ...mockPost,
      is_liked: true,
      likes_count: 1
    };

    const wrapper = mount(PostItem, {
      props: {
        post: likedPost,
        currentUserId: 1
      },
      global: {
        components: {
          NuxtLink: MockNuxtLink,
          RouterLink: MockNuxtLink.components.RouterLink
        }
      }
    });

    // いいねボタンを取得
    const likeButton = wrapper.find('button');
    expect(likeButton.exists()).toBe(true);

    // いいねボタンをクリック（いいね解除）
    await likeButton.trigger('click');

    // likeイベントが正しい投稿IDで発火されることを確認
    expect(wrapper.emitted('like')).toBeTruthy();
    expect(wrapper.emitted('like')?.[0]).toEqual([1]);
  });
});