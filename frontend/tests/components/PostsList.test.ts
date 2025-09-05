import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PostsList from '~/components/PostsList.vue';
import type { Post } from '~/types';

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

describe('PostsList.vue', () => {
  const mockPosts: Post[] = [
    {
      id: 1,
      body: '1つ目の投稿',
      user: {
        id: 1,
        name: 'ユーザー1'
      },
      likes_count: 2,
      created_at: '2024-01-01T00:00:00Z',
      is_liked: false,
      is_owner: false
    },
    {
      id: 2,
      body: '2つ目の投稿',
      user: {
        id: 2,
        name: 'ユーザー2'
      },
      likes_count: 5,
      created_at: '2024-01-02T00:00:00Z',
      is_liked: true,
      is_owner: true
    },
    {
      id: 3,
      body: '3つ目の投稿',
      user: {
        id: 3,
        name: 'ユーザー3'
      },
      likes_count: 0,
      created_at: '2024-01-03T00:00:00Z',
      is_liked: false,
      is_owner: false
    }
  ];

  it('全投稿を取得できる', () => {
    const wrapper = mount(PostsList, {
      props: {
        posts: mockPosts,
        currentUserId: 1,
        likingPosts: new Set<number>(),
        isInitialLoading: false,
        isLoading: false,
        hasMore: false
      },
      global: {
        components: {
          NuxtLink: MockNuxtLink,
          RouterLink: MockNuxtLink.components.RouterLink
        }
      }
    });

    // 全投稿の内容とユーザー名が表示されることを確認
    const wrapperText = wrapper.text();
    
    mockPosts.forEach((post) => {
      expect(wrapperText).toContain(post.body);
      expect(wrapperText).toContain(post.user.name);
    });
  });
});