import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import PageHeader from '~/components/PageHeader.vue';

// useAuthのモック
const mockHandleLogout = vi.fn();
vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({
    handleLogout: mockHandleLogout
  })
}));

// NuxtLinkのモック
const NuxtLinkStub = {
  template: '<a><slot /></a>',
  props: ['to']
};

describe('PageHeader - ログアウト機能', () => {
  beforeEach(() => {
    // 各テスト前にモックをリセット
    vi.clearAllMocks();
    mockHandleLogout.mockClear();
  });

  it('ログアウトボタンクリック時にhandleLogoutが呼ばれる', async () => {
    const wrapper = mount(PageHeader, {
      props: {
        title: 'テストページ'
      },
      global: {
        stubs: {
          NuxtLink: NuxtLinkStub
        }
      }
    });

    // ログアウトボタンを見つける（img[alt="ログアウト"]を含むbutton）
    const logoutImage = wrapper.find('img[alt="ログアウト"]');
    expect(logoutImage.exists()).toBe(true);

    const logoutButton = logoutImage.element.closest('button');
    expect(logoutButton).toBeTruthy();

    // ボタンクリック前の状態確認
    expect(mockHandleLogout).not.toHaveBeenCalled();

    // ログアウトボタンをクリック
    await wrapper.find('button').trigger('click');

    // handleLogoutが呼ばれたことを確認
    expect(mockHandleLogout).toHaveBeenCalledTimes(1);
  });

  it('モバイル用ログアウトボタンが正しく設定されている', () => {
    const wrapper = mount(PageHeader, {
      props: {
        title: 'テストページ'
      },
      global: {
        stubs: {
          NuxtLink: NuxtLinkStub
        }
      }
    });

    // ログアウト画像が存在することを確認
    const logoutImage = wrapper.find('img[alt="ログアウト"]');
    expect(logoutImage.exists()).toBe(true);
    expect(logoutImage.attributes('src')).toBe('/images/logout.png');

    // モバイル専用ボタンのクラス確認
    const logoutButton = wrapper.find('button');
    expect(logoutButton.classes()).toContain('md:hidden'); // モバイル専用
  });

  
});