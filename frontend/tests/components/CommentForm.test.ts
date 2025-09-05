import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { configure } from 'vee-validate';
import CommentForm from '~/components/CommentForm.vue';

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

// navigateToをグローバルにモック
const mockNavigateTo = vi.fn();
vi.stubGlobal('navigateTo', mockNavigateTo);

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
    success: vi.fn(),
    error: vi.fn()
  })
}));

describe('CommentForm', () => {
  beforeEach(() => {
    // 各テスト前にモックをリセット
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      success: true,
      comment: {
        id: 1,
        body: 'テストコメント',
        user: {
          id: 1,
          name: 'テストユーザー'
        }
      }
    });
    mockNavigateTo.mockClear();
  });

  describe('コメント送信機能', () => {
    it('ログイン済みのユーザーはコメントを送信できる', async () => {
      // arrange
      const inputPostId = 1;
      const inputCommentBody = '';
      const inputText = 'これはテストコメントです';

      // act
      const actual = mount(CommentForm, {
        props: {
          postId: inputPostId,
          modelValue: inputCommentBody
        }
      });

      // コメント内容を入力
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
        `${process.env.API_BASE_URL || 'http://localhost'}/api/posts/${inputPostId}/comments`,
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: {
            body: inputText
          }
        })
      );

      // 成功イベントの確認
      expect(actual.emitted('commentCreated')).toBeTruthy();
      expect(actual.emitted('update:modelValue')).toBeTruthy();
    });

    it('ログイン前のユーザーはコメントを送信できない', async () => {
      // arrange
      const inputPostId = 1;
      const inputCommentBody = '';
      const inputText = 'これはテストコメントです';


      // APIが401エラーを返すようにモック
      mockFetch.mockRejectedValueOnce({
        status: 401,
        statusText: 'Unauthorized'
      });

      // act
      const actual = mount(CommentForm, {
        props: {
          postId: inputPostId,
          modelValue: inputCommentBody
        }
      });

      // コメント内容を入力
      const textarea = actual.find('textarea');
      await textarea.setValue(inputText);
      await nextTick();

      // フォーム送信
      await actual.find('form').trigger('submit');
      await nextTick();

      // 非同期処理を待つ（認証エラー処理のため長めに待機）
      await new Promise(resolve => setTimeout(resolve, 500));

      // assert
      // API呼び出しの確認
      expect(mockFetch).toHaveBeenCalledWith(
        `${process.env.API_BASE_URL || 'http://localhost'}/api/posts/${inputPostId}/comments`,
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: {
            body: inputText
          }
        })
      );

      // 成功イベントが発火されていないことを確認（認証エラーのため）
      expect(actual.emitted('commentCreated')).toBeFalsy();
    });

    it('コメント内容が未入力の場合バリデーションメッセージが表示される', async () => {
      // arrange
      const inputPostId = 1;
      const inputCommentBody = '';

      // act
      const actual = mount(CommentForm, {
        props: {
          postId: inputPostId,
          modelValue: inputCommentBody
        }
      });

      // フォーム送信（空の状態で）
      await actual.find('form').trigger('submit');
      await nextTick();

      // 非同期処理を待つ
      await new Promise(resolve => setTimeout(resolve, 100));

      // assert
      // バリデーションエラーメッセージの表示確認
      const errorMessage = actual.find('.text-red-500');
      expect(errorMessage.exists()).toBe(true);
      expect(errorMessage.text()).toBe('コメントを入力してください');

      // API呼び出しがされていないことを確認
      expect(mockFetch).not.toHaveBeenCalled();

      // 成功イベントが発火されていないことを確認
      expect(actual.emitted('commentCreated')).toBeFalsy();
    });

    it('コメント内容が120文字を超過した場合バリデーションメッセージが表示される', async () => {
      // arrange
      const inputPostId = 1;
      const inputCommentBody = '';
      const inputText = 'あ'.repeat(121); // 121文字の文字列

      // act
      const actual = mount(CommentForm, {
        props: {
          postId: inputPostId,
          modelValue: inputCommentBody
        }
      });

      // 121文字のテキストを入力
      const textarea = actual.find('textarea');
      await textarea.setValue(inputText);
      await nextTick();

      // フォーム送信
      await actual.find('form').trigger('submit');
      await nextTick();

      // 非同期処理を待つ
      await new Promise(resolve => setTimeout(resolve, 100));

      // assert
      // 入力時点でバリデーションメッセージが表示されることを確認
      expect(actual.text()).toContain('120文字以内で入力してください');

      // 送信ボタンが無効化されていることを確認
      const submitButton = actual.find('button[type="submit"]');
      expect(submitButton.attributes('disabled')).toBeDefined();

      // API呼び出しがされていないことを確認
      expect(mockFetch).not.toHaveBeenCalled();

      // 成功イベントが発火されていないことを確認
      expect(actual.emitted('commentCreated')).toBeFalsy();
    });
  });
});