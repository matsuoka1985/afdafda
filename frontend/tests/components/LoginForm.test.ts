import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { configure } from 'vee-validate';
import LoginForm from '~/components/LoginForm.vue';

// VeeValidateの設定
configure({
  validateOnBlur: true,
  validateOnChange: false,
  validateOnInput: false,
  validateOnModelUpdate: false,
});

// $fetchをグローバルにモック（RegisterFormと同じ方式）
const mockFetch = vi.fn();
(globalThis as any).$fetch = mockFetch;

const mockSignInWithEmailAndPassword = vi.fn();

// Firebase Auth インスタンスのモック
const mockFirebaseAuth = {
  onAuthStateChanged: vi.fn()
};

// Nuxtアプリケーションのモック
vi.mock('#app', () => ({
  useNuxtApp: () => ({
    $firebaseAuth: mockFirebaseAuth
  })
}));

// Firebase認証のモック
vi.mock('firebase/auth', async () => {
  const actual = await vi.importActual('firebase/auth');
  return {
    ...actual,
    signInWithEmailAndPassword: mockSignInWithEmailAndPassword
  };
});

describe('LoginForm', () => {
  beforeEach(() => {
    // 各テスト前にモックをリセット
    vi.clearAllMocks();
    // Firebase認証モックもリセット
    mockSignInWithEmailAndPassword.mockClear();
    // $fetchのデフォルトレスポンスを設定
    mockFetch.mockResolvedValue({ success: true });
  });

  describe('コンポーネントの基本動作', () => {
    it('LoginFormコンポーネントが正しくマウントされ、フォーム要素が存在する', async () => {
      const wrapper = mount(LoginForm);

      // 基本的なコンポーネントの存在確認
      expect(wrapper.find('form').exists()).toBe(true);
      expect(wrapper.find('input[name="email"]').exists()).toBe(true);
      expect(wrapper.find('input[name="password"]').exists()).toBe(true);
      expect(wrapper.find('button[type="submit"]').exists()).toBe(true);

      // フォームタイトルの確認
      expect(wrapper.text()).toContain('ログイン');

      // 入力フィールドの操作確認
      const emailInput = wrapper.find('input[name="email"]');
      await emailInput.setValue('test@example.com');
      expect((emailInput.element as HTMLInputElement).value).toBe('test@example.com');
    });
  });

  describe('メールアドレスのバリデーション', () => {
    it('メールアドレス入力欄を触った後に空でblurすると、バリデーションメッセージが表示される', async () => {
      const wrapper = mount(LoginForm);

      const emailInput = wrapper.find('input[name="email"]');

      // 1. 入力欄に値を入れて「触った」状態にする
      await emailInput.setValue('test@example.com');
      await emailInput.trigger('input');
      await nextTick();

      // VueとVeeValidateの処理を完全に待つ
      await new Promise((resolve) => {
        return setTimeout(resolve, 100);
      });

      // 2. 空に戻してblur（フォーカスを外す）
      await emailInput.setValue('');
      await emailInput.trigger('blur');
      await nextTick();

      // VeeValidateのバリデーション処理を待つ
      await new Promise((resolve) => {
        return setTimeout(resolve, 100);
      });

      // VeeValidateのバリデーションメッセージが表示されることを期待
      expect(wrapper.text()).toContain('メールアドレスを入力してください');
    });

    it('メールアドレス入力欄に不正な形式を入力してblurすると、形式バリデーションメッセージが表示される', async () => {
      const wrapper = mount(LoginForm);

      const emailInput = wrapper.find('input[name="email"]');

      // 1. 入力欄に不正なメールアドレス形式を入力
      await emailInput.setValue('invalid-email');
      await emailInput.trigger('input');
      await emailInput.trigger('blur');
      await nextTick();

      // VeeValidateのバリデーション処理を待つ
      await new Promise((resolve) => {
        return setTimeout(resolve, 100);
      });

      // VeeValidateのバリデーションメッセージが表示されることを期待
      expect(wrapper.text()).toContain('正しいメールアドレスを入力してください');
    });
  });

  describe('パスワードのバリデーション', () => {
    it('パスワード入力欄を触った後に空でblurすると、バリデーションメッセージが表示される', async () => {
      const wrapper = mount(LoginForm);

      const passwordInput = wrapper.find('input[name="password"]');

      // 1. 入力欄に値を入れて「触った」状態にする
      await passwordInput.setValue('password123');
      await passwordInput.trigger('input');
      await nextTick();

      // VueとVeeValidateの処理を完全に待つ
      await new Promise((resolve) => {
        return setTimeout(resolve, 100);
      });

      // 2. 空に戻してblur（フォーカスを外す）
      await passwordInput.setValue('');
      await passwordInput.trigger('blur');
      await nextTick();

      // VeeValidateのバリデーション処理を待つ
      await new Promise((resolve) => {
        return setTimeout(resolve, 100);
      });

      // VeeValidateのバリデーションメッセージが表示されることを期待
      expect(wrapper.text()).toContain('パスワードを入力してください');
    });

    it('パスワード入力欄に6文字未満を入力してblurすると、文字数バリデーションメッセージが表示される', async () => {
      const wrapper = mount(LoginForm);

      const passwordInput = wrapper.find('input[name="password"]');

      // 1. 入力欄に6文字未満の値を入れて「触った」状態にする
      await passwordInput.setValue('12345');
      await passwordInput.trigger('input');
      await passwordInput.trigger('blur');
      await nextTick();

      // VeeValidateのバリデーション処理を待つ
      await new Promise((resolve) => {
        return setTimeout(resolve, 100);
      });

      // VeeValidateのバリデーションメッセージが表示されることを期待
      expect(wrapper.text()).toContain('6文字以上で入力してください');
    });
  });

  describe('ログイン処理', () => {
    it('認証情報が間違っている場合エラーメッセージが表示される', async () => {
      // Firebase認証エラーをモック
      mockSignInWithEmailAndPassword.mockRejectedValueOnce({
        code: 'auth/user-not-found',
        message: 'Firebase: Error (auth/user-not-found).'
      });

      const wrapper = mount(LoginForm);

      // フォームに値を入力
      await wrapper.find('input[name="email"]').setValue('wrong@example.com');
      await wrapper.find('input[name="password"]').setValue('wrongpassword');

      // フォーム送信
      await wrapper.find('form').trigger('submit');
      await nextTick();

      // 長めの待機時間でエラー処理を待つ
      await new Promise((resolve) => {
        return setTimeout(resolve, 500);
      });

      // 実際に表示されるエラーメッセージを期待
      expect(wrapper.text()).toContain('メールアドレスまたはパスワードが正しくありません');
    });

    it('Laravel API がエラーレスポンスを返した場合、エラーメッセージが表示される', async () => {
      // Firebase認証成功をモック
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        getIdToken: vi.fn().mockResolvedValue('valid-jwt-token')
      };

      mockSignInWithEmailAndPassword.mockResolvedValueOnce({
        user: mockUser
      });

      // Laravel APIエラーレスポンスをモック
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({
        success: false,
        error: 'トークンが無効です'
      });

      const wrapper = mount(LoginForm);

      // フォームに値を入力
      await wrapper.find('input[name="email"]').setValue('test@example.com');
      await wrapper.find('input[name="password"]').setValue('password123');

      // フォーム送信
      await wrapper.find('form').trigger('submit');
      await nextTick();

      // 非同期処理を待つ
      await new Promise((resolve) => {
        return setTimeout(resolve, 500);
      });

      // Laravel APIのエラーメッセージが表示されることを確認
      expect(wrapper.text()).toContain('トークンが無効です');
    });

    it('ローディング中はボタンが無効化され、ローディングテキストが表示される', async () => {
      // Firebase認証を遅延実行させるためのPromiseを作成
      let resolveFirebase: (value: any) => void;
      const firebasePromise = new Promise((resolve) => {
        resolveFirebase = resolve;
      });

      mockSignInWithEmailAndPassword.mockImplementationOnce(() => firebasePromise);

      const wrapper = mount(LoginForm);

      // フォームに値を入力
      await wrapper.find('input[name="email"]').setValue('test@example.com');
      await wrapper.find('input[name="password"]').setValue('password123');

      // バリデーション完了を待つ
      await nextTick();
      await new Promise((resolve) => {
        return setTimeout(resolve, 100);
      });

      // フォーム送信
      await wrapper.find('form').trigger('submit');
      
      // Vue の反応性システムの更新を待つ
      await nextTick();
      await new Promise((resolve) => {
        return setTimeout(resolve, 50);
      });

      // ローディング状態の確認
      expect(wrapper.text()).toContain('ログイン中...');
      
      // Firebase認証を完了してクリーンアップ
      resolveFirebase!({
        user: {
          uid: 'test-uid',
          email: 'test@example.com',
          getIdToken: vi.fn().mockResolvedValue('valid-jwt-token')
        }
      });

      await nextTick();
    });

    it('正しい認証情報でログインが成功すると成功イベントが発火される', async () => {
      // Firebase認証成功をモック
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        getIdToken: vi.fn().mockResolvedValue('valid-jwt-token')
      };

      mockSignInWithEmailAndPassword.mockResolvedValueOnce({
        user: mockUser
      });

      // Laravel API成功をモック
      mockFetch.mockResolvedValueOnce({
        success: true,
        user: {
          uid: 'test-uid',
          email: 'test@example.com'
        }
      });

      const wrapper = mount(LoginForm);

      // フォームに正しい値を入力
      const emailInput = wrapper.find('input[name="email"]');
      const passwordInput = wrapper.find('input[name="password"]');

      await emailInput.setValue('test@example.com');
      await passwordInput.setValue('password123');

      // バリデーションが完了するのを待つ
      await nextTick();
      await new Promise((resolve) => {
        return setTimeout(resolve, 100);
      });

      // モックの呼び出し回数を確認（フォーム送信前）
      const callCountBefore = mockSignInWithEmailAndPassword.mock.calls.length;

      // フォーム送信
      await wrapper.find('form').trigger('submit');
      await nextTick();

      // 非同期処理を待つ
      await new Promise((resolve) => {
        return setTimeout(resolve, 500);
      });

      // successイベントが発火されることを確認
      expect(wrapper.emitted('success')).toBeTruthy();

      // Firebase認証がこのテストで1回だけ呼ばれたことを確認
      const callCountAfter = mockSignInWithEmailAndPassword.mock.calls.length;
      expect(callCountAfter - callCountBefore).toBe(1);

      // Firebase認証が正しいメール・パスワードで呼ばれたことを確認
      const firebaseCall = mockSignInWithEmailAndPassword.mock.calls[0];
      expect(firebaseCall[1]).toBe('test@example.com'); // メールアドレス
      expect(firebaseCall[2]).toBe('password123'); // パスワード

      // Laravel APIが正しいパラメータで呼ばれたことを確認
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/verify-token'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: { idToken: 'valid-jwt-token' },
        credentials: 'include'
      });
    });
  });
});