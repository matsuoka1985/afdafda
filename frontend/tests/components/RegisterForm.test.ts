import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, createApp } from 'vue';
import { configure } from 'vee-validate';
import RegisterForm from '~/components/RegisterForm.vue';

// VeeValidateの設定。テスト環境においても以下を設定しないと
configure({
  validateOnBlur: true,
  validateOnChange: false,
  validateOnInput: false,
  validateOnModelUpdate: false,
});

// Firebase認証のモック
const mockCreateUserWithEmailAndPassword = vi.fn();

vi.mock('firebase/auth', async () => {
  const actual = await vi.importActual('firebase/auth');
  return {
    ...actual,
    createUserWithEmailAndPassword: mockCreateUserWithEmailAndPassword
  };
});

// $fetchをグローバルにモック  
const mockFetch = vi.fn();
(globalThis as any).$fetch = mockFetch;

// Nuxtアプリケーションのモック
vi.mock('#app', () => ({
  useNuxtApp: () => ({
    $firebaseAuth: {
      onAuthStateChanged: vi.fn()
    }
  })
}));

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // $fetchのデフォルトレスポンスを設定（個々のテストで上書きされる）
    mockFetch.mockResolvedValue({ success: true });
  });
  describe('コンポーネントの基本動作', () => {
    it('RegisterFormコンポーネントが正しくマウントされ、フォーム要素が存在する', async () => {
      const wrapper = mount(RegisterForm);

      // 基本的なコンポーネントの存在確認
      expect(wrapper.find('form').exists()).toBe(true);
      expect(wrapper.find('input[name="name"]').exists()).toBe(true);
      expect(wrapper.find('input[name="email"]').exists()).toBe(true);
      expect(wrapper.find('input[name="password"]').exists()).toBe(true);
      expect(wrapper.find('button[type="submit"]').exists()).toBe(true);

      // フォームタイトルの確認
      expect(wrapper.text()).toContain('新規登録');

      // 入力フィールドの操作確認
      const nameInput = wrapper.find('input[name="name"]');
      await nameInput.setValue('テストユーザー');
      expect((nameInput.element as HTMLInputElement).value).toBe('テストユーザー');
    });
  });

  describe('ユーザーネームのバリデーション', () => {
    it('ユーザーネーム入力欄を触った後に空でblurすると、バリデーションメッセージが表示される', async () => {
      const wrapper = mount(RegisterForm);

      const nameInput = wrapper.find('input[name="name"]');

      // 1. 入力欄に値を入れて「触った」状態にする
      await nameInput.setValue('test'); // 入力値を設定
      await nameInput.trigger('input'); // 入力イベントをトリガー
      await nextTick();

      // VueとVeeValidateの処理を完全に待つ
      await new Promise(resolve => setTimeout(resolve, 100));

      // 2. 空に戻してblur（フォーカスを外す）
      await nameInput.setValue('');
      await nameInput.trigger('blur');
      await nextTick();

      // VeeValidateのバリデーション処理を待つ
      await new Promise((resolve) => {
        return setTimeout(resolve, 100);
      });

      // VeeValidateのバリデーションメッセージが表示されることを期待
      expect(wrapper.text()).toContain('ユーザーネームを入力してください');
    });

    it('ユーザーネーム入力欄に21文字以上を入力してblurすると、文字数制限バリデーションメッセージが表示される', async () => {
      const wrapper = mount(RegisterForm);

      const nameInput = wrapper.find('input[name="name"]');

      // 1. 入力欄に21文字（制限超過）を設定
      await nameInput.setValue('これは二十一文字を超える長いユーザーネームです'); // 21文字以上の入力値を設定
      await nameInput.trigger('input'); // 入力イベントをトリガー
      await nameInput.trigger('blur'); // blurイベントをトリガー
      await nextTick();

      // VeeValidateのバリデーション処理を待つ
      await new Promise((resolve) => {
        return setTimeout(resolve, 100);
      });

      // VeeValidateのバリデーションメッセージが表示されることを期待
      expect(wrapper.text()).toContain('20文字以内で入力してください');
    });
  });

  describe('メールアドレスのバリデーション', () => {
    it('メールアドレス入力欄を触った後に空でblurすると、バリデーションメッセージが表示される', async () => {
      const wrapper = mount(RegisterForm);

      const emailInput = wrapper.find('input[name="email"]');

      // 1. 入力欄に値を入れて「触った」状態にする
      await emailInput.setValue('test@example.com'); // 入力値を設定
      await emailInput.trigger('input'); // 入力イベントをトリガー
      await nextTick();

      // VueとVeeValidateの処理を完全に待つ
      await new Promise(resolve => setTimeout(resolve, 100));

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
      const wrapper = mount(RegisterForm);

      const emailInput = wrapper.find('input[name="email"]');

      // 1. 入力欄に不正なメールアドレス形式を入力
      await emailInput.setValue('invalid-email'); // 不正な形式の入力値を設定
      await emailInput.trigger('input'); // 入力イベントをトリガー
      await emailInput.trigger('blur'); // blurイベントをトリガー
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
      const wrapper = mount(RegisterForm);

      const passwordInput = wrapper.find('input[name="password"]');

      // 1. 入力欄に値を入れて「触った」状態にする
      await passwordInput.setValue('password123'); // 入力値を設定
      await passwordInput.trigger('input'); // 入力イベントをトリガー
      await nextTick();

      // VueとVeeValidateの処理を完全に待つ
      await new Promise(resolve => setTimeout(resolve, 100));

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
      const wrapper = mount(RegisterForm);

      const passwordInput = wrapper.find('input[name="password"]');

      // 1. 入力欄に6文字未満の値を入れて「触った」状態にする
      await passwordInput.setValue('12345'); // 5文字の入力値を設定
      await passwordInput.trigger('input'); // 入力イベントをトリガー
      await passwordInput.trigger('blur'); // blurイベントをトリガー
      await nextTick();

      // VeeValidateのバリデーション処理を待つ
      await new Promise((resolve) => {
        return setTimeout(resolve, 100);
      });

      // VeeValidateのバリデーションメッセージが表示されることを期待
      expect(wrapper.text()).toContain('6文字以上で入力してください');
    });
  });

  describe('新規登録処理', () => {
    it('正しい入力でフォーム送信すると2つのAPIが順次呼ばれる', async () => {
      // beforeEachでクリアされるので、ここで$fetchモックを再設定
      mockFetch.mockReset();
      
      // Firebase認証成功をモック
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        getIdToken: vi.fn().mockResolvedValue('valid-jwt-token')
      };

      mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({
        user: mockUser
      });

      // $fetchを段階的にモック
      mockFetch
        .mockResolvedValueOnce({ 
          success: true, 
          user: { id: 1, firebase_uid: 'test-uid', name: 'テストユーザー', email: 'test@example.com' }
        }) // 1回目: /api/auth/register
        .mockResolvedValueOnce({ 
          success: true, 
          user: { uid: 'test-uid', email: 'test@example.com' }
        }); // 2回目: /api/auth/verify-token

      const wrapper = mount(RegisterForm);

      // フォームに正しい値を入力
      await wrapper.find('input[name="name"]').setValue('テストユーザー');
      await wrapper.find('input[name="email"]').setValue('test@example.com');
      await wrapper.find('input[name="password"]').setValue('password123');

      // バリデーション完了を待つ
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      // フォーム送信
      await wrapper.find('form').trigger('submit');
      await nextTick();

      // 非同期処理を待つ
      await new Promise(resolve => setTimeout(resolve, 500));

      // $fetchが2回呼ばれたことを確認
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // 1回目: Laravel register API
      const [registerUrl, registerOptions] = mockFetch.mock.calls[0];
      expect(registerUrl).toContain('/api/auth/register');
      expect(registerOptions?.method).toBe('POST');
      expect(registerOptions?.body).toEqual({
        firebase_uid: 'test-uid',
        name: 'テストユーザー',
        email: 'test@example.com',
        password: 'password123'
      });

      // 2回目: Laravel verify-token API  
      const [verifyUrl, verifyOptions] = mockFetch.mock.calls[1];
      expect(verifyUrl).toContain('/api/auth/verify-token');
      expect(verifyOptions?.method).toBe('POST');
      expect(verifyOptions?.body).toEqual({
        idToken: 'valid-jwt-token'
      });
      expect(verifyOptions?.credentials).toBe('include');

      // Firebase認証が正しく呼ばれたことを確認
      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledTimes(1);

      // 成功時にsuccessイベントが発火されることを確認
      expect(wrapper.emitted('success')).toBeTruthy();
    });
  });
});