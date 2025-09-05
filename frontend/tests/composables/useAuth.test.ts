import { describe, it, expect, vi, beforeEach } from 'vitest';

// $fetchをグローバルにモック
const mockFetch = vi.fn();
(globalThis as any).$fetch = mockFetch;

// vi.mockファクトリー内では外部変数を参照できないため、ファクトリー内で直接定義
vi.mock('#app/composables/router', () => ({
  navigateTo: vi.fn()
}));

// 環境変数からAPIベースURLを取得
const mockApiBaseUrl = process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost';

vi.mock('#app', () => ({
  useNuxtApp: () => ({
    $firebaseAuth: {
      onAuthStateChanged: vi.fn()
    }
  }),
  useRuntimeConfig: vi.fn(() => ({
    public: {
      apiBaseUrl: mockApiBaseUrl
    }
  }))
}));

// useAuthをモック定義後にインポート
import { useAuth } from '~/composables/useAuth';

describe('useAuth', () => {
  beforeEach(() => {
    // 各テスト前にモックをリセット
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('handleLogout', () => {
    it('ログアウト成功時にログインページにリダイレクトする', async () => {
      // Laravel APIの成功レスポンスをモック
      mockFetch.mockResolvedValueOnce({ success: true });

      // モック関数を動的に取得
      const { navigateTo } = await vi.importMock('#app/composables/router');

      const { handleLogout } = useAuth();

      // ログアウト実行
      await handleLogout();

      // 結果の確認
      expect(mockFetch).toHaveBeenCalledWith(`${mockApiBaseUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(navigateTo).toHaveBeenCalledWith('/login');
      expect(navigateTo).toHaveBeenCalledTimes(1);
    });

    it('ログアウトAPIエラー時でもログインページにリダイレクトする', async () => {
      // Laravel APIのエラーをモック
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // モック関数を動的に取得
      const { navigateTo } = await vi.importMock('#app/composables/router');

      const { handleLogout } = useAuth();

      // ログアウト実行
      await handleLogout();

      // 結果の確認
      expect(mockFetch).toHaveBeenCalledWith(`${mockApiBaseUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(navigateTo).toHaveBeenCalledWith('/login');
      expect(navigateTo).toHaveBeenCalledTimes(1);
    });
  });
});