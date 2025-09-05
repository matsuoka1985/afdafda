import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { configure } from 'vee-validate';
import PostForm from '~/components/PostForm.vue';

// VeeValidateの設定
configure({
  validateOnBlur: true,
  validateOnChange: false,
  validateOnInput: false,
  validateOnModelUpdate: false,
});

// $fetchをグローバルにモック
const mockFetch = vi.fn();
(globalThis as any).$fetch = mockFetch;

// Nuxtのグローバル関数をモック
vi.mock('#app', () => ({
  useRuntimeConfig: () => ({
    public: {
      apiBaseUrl: process.env.API_BASE_URL || 'http://localhost'
    }
  }),
}));

vi.mock('~/composables/useToast', () => ({
  useToast: () => ({
    postCreated: vi.fn(),
    error: vi.fn()
  })
}));

describe('PostForm', () => {
  beforeEach(() => {
    // 各テスト前にモックをリセット
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      success: true,
      post: {
        id: 1,
        body: 'テスト投稿',
        user: {
          id: 1,
          name: 'テストユーザー'
        }
      }
    });
  });

  describe('投稿送信機能', () => {
    it('ログイン済みのユーザーは投稿を送信できる', async () => {
      // arrange
      const inputPostBody = '';
      const inputText = 'これはテスト投稿です';

      // act
      const actual = mount(PostForm, {
        props: {
          postBody: inputPostBody
        }
      });

      // 投稿内容を入力
      const textarea = actual.find('textarea');
      await textarea.setValue(inputText);
      await nextTick();

      // フォーム送信
      await actual.find('form').trigger('submit');
      await nextTick();

      // 非同期処理を待つ
      await new Promise(resolve => setTimeout(resolve, 100));

      // assert
      // API呼び出しの確認
      expect(mockFetch).toHaveBeenCalledWith(
        `${process.env.API_BASE_URL || 'http://localhost'}/api/posts`,
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: {
            body: inputText
          }
        })
      );

      // 成功イベントの確認
      expect(actual.emitted('newPost')).toBeTruthy();
      expect(actual.emitted('updateBody')).toBeTruthy();

      // トースト表示の確認は省略（モック関数の呼び出しは個別に確認しない）
    });

    it('投稿内容が未入力の場合バリデーションメッセージが表示される', async () => {
      // arrange
      const inputPostBody = '';

      // act
      const actual = mount(PostForm, {
        props: {
          postBody: inputPostBody
        }
      });

      // フォーム送信を試みる（内容は空のまま）
      await actual.find('form').trigger('submit');
      await nextTick();

      // VeeValidateのバリデーション処理を待つ
      await new Promise(resolve => setTimeout(resolve, 100));

      // assert
      // バリデーションメッセージが表示されることを確認
      expect(actual.text()).toContain('投稿内容を入力してください');
      
      // フォームが送信されていないことを確認
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('投稿が120文字を超過した場合入力時にバリデーションメッセージが表示される', async () => {
      // arrange
      const inputPostBody = '';
      const inputText = 'a'.repeat(121); // 121文字の文字列

      // act
      const actual = mount(PostForm, {
        props: {
          postBody: inputPostBody
        }
      });

      // 121文字以上の投稿を入力
      const textarea = actual.find('textarea');
      await textarea.setValue(inputText);
      await nextTick();

      // VeeValidateのバリデーション処理を待つ
      await new Promise(resolve => setTimeout(resolve, 100));

      // assert
      // 入力時点でバリデーションメッセージが表示されることを確認
      expect(actual.text()).toContain('120文字以内で入力してください');
    });

    it('ログイン前のユーザーは投稿を送信できない', async () => {
      // arrange
      const inputPostBody = '';
      const inputText = 'これはテスト投稿です';
      
      // 401認証エラーをモック
      mockFetch.mockRejectedValueOnce({
        status: 401,
        message: 'Unauthorized'
      });

      // act
      const actual = mount(PostForm, {
        props: {
          postBody: inputPostBody
        }
      });

      // 投稿内容を入力
      const textarea = actual.find('textarea');
      await textarea.setValue(inputText);
      await nextTick();

      // フォーム送信
      await actual.find('form').trigger('submit');
      await nextTick();

      // 非同期処理を待つ
      await new Promise(resolve => setTimeout(resolve, 100));

      // assert
      // API呼び出しは試行される
      expect(mockFetch).toHaveBeenCalledWith(
        `${process.env.API_BASE_URL || 'http://localhost'}/api/posts`,
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: {
            body: inputText
          }
        })
      );
      
      // 投稿成功イベントは発火されない（認証エラーのため）
      expect(actual.emitted('newPost')).toBeFalsy();
    });
  });
});