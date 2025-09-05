import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import DesktopSidebar from '~/components/DesktopSidebar.vue';

const handleLogoutMock = vi.fn();

// モックの設定
vi.mock('~/composables/useAuth', () => {
  return {
    useAuth: () => {
      return {
        handleLogout: handleLogoutMock
      };
    }
  };
});

// PostFormコンポーネントをモック
vi.mock('~/components/PostForm.vue', () => {
  return {
    default: {
      name: 'PostForm',
      template: '<div data-testid="post-form">PostForm</div>',
      props: ['postBody'],
      emits: ['newPost', 'updateBody']
    }
  };
});

describe('DesktopSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ログアウトボタンをクリックするとhandleLogoutが呼び出される', async () => {
    const wrapper = mount(DesktopSidebar, {
      props: {
        postBody: ''
      },
      global: {
        stubs: {
          NuxtLink: {
            template: '<a><slot /></a>',
            props: ['to']
          }
        }
      }
    });

    // ログアウトボタンを検索（スパンのテキストで特定）
    const buttons = wrapper.findAll('button');
    const logoutButton = buttons.find(button => {
      return button.text().includes('ログアウト');
    });
    
    expect(logoutButton).toBeDefined();
    if (logoutButton) {
      await logoutButton.trigger('click');
      expect(handleLogoutMock).toHaveBeenCalledTimes(1);
    }
  });
});