import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import type { Post } from '~/types';

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

// confirmのモック
const mockConfirm = vi.fn();
vi.stubGlobal('confirm', mockConfirm);

describe('usePostActions', () => {
  beforeEach(() => {
    // 各テスト前にモックをリセット
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      success: true,
      message: '投稿を削除しました',
      post_id: '1'
    });
    mockConfirm.mockReturnValue(true);
    mockNavigateTo.mockClear();
  });

  describe('投稿削除機能', () => {
    it('ログイン済みユーザーが自分の投稿を削除できる', async () => {
      // arrange
      const inputPostId = 1;
      const inputPosts = ref<Post[]>([
        {
          id: 1,
          body: '削除される投稿',
          user: { id: 1, name: 'テストユーザー' },
          likes_count: 0,
          is_liked: false,
          is_owner: true,
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 2,
          body: '残る投稿',
          user: { id: 1, name: 'テストユーザー' },
          likes_count: 0,
          is_liked: false,
          is_owner: true,
          created_at: '2024-01-01T00:00:00Z'
        }
      ]);

      // act
      const { usePostActions } = await import('~/composables/usePostActions');
      const { handlePostDeletedInList } = usePostActions();
      
      await handlePostDeletedInList(inputPostId, inputPosts);

      // 非同期処理を待つ
      await new Promise(resolve => setTimeout(resolve, 100));

      // assert
      // 削除確認ダイアログが表示されることを確認
      expect(mockConfirm).toHaveBeenCalledWith('この投稿を削除してもよろしいですか？');

      // API呼び出しの確認
      expect(mockFetch).toHaveBeenCalledWith(
        `${process.env.API_BASE_URL || 'http://localhost'}/api/posts/${inputPostId}`,
        expect.objectContaining({
          method: 'DELETE',
          credentials: 'include'
        })
      );

      // 投稿が一覧から削除されていることを確認
      expect(inputPosts.value.length).toBe(1);
      expect(inputPosts.value.find(post => post.id === inputPostId)).toBeUndefined();
    });

    it('ログイン前のユーザーは投稿削除できない', async () => {
      // arrange
      const inputPostId = 1;
      const inputPosts = ref<Post[]>([
        {
          id: 1,
          body: '削除されない投稿',
          user: { id: 1, name: 'テストユーザー' },
          likes_count: 0,
          is_liked: false,
          is_owner: true,
          created_at: '2024-01-01T00:00:00Z'
        }
      ]);

      // APIが401エラーを返すようにモック
      mockFetch.mockRejectedValueOnce({
        status: 401,
        statusText: 'Unauthorized'
      });

      // act
      const { usePostActions } = await import('~/composables/usePostActions');
      const { handlePostDeletedInList } = usePostActions();
      
      await handlePostDeletedInList(inputPostId, inputPosts);

      // 非同期処理を待つ
      await new Promise(resolve => setTimeout(resolve, 100));

      // assert
      // 削除確認ダイアログが表示されることを確認
      expect(mockConfirm).toHaveBeenCalledWith('この投稿を削除してもよろしいですか？');

      // API呼び出しの確認
      expect(mockFetch).toHaveBeenCalledWith(
        `${process.env.API_BASE_URL || 'http://localhost'}/api/posts/${inputPostId}`,
        expect.objectContaining({
          method: 'DELETE',
          credentials: 'include'
        })
      );

      // 投稿が一覧から削除されていないことを確認（ロールバックされた）
      expect(inputPosts.value.length).toBe(1);
      expect(inputPosts.value.find(post => post.id === inputPostId)).toBeDefined();
    });

    it('他ユーザーの投稿は削除できない', async () => {
      // arrange
      const inputPostId = 1;
      const inputPosts = ref<Post[]>([
        {
          id: 1,
          body: '他人の投稿なので削除できません',
          user: { id: 2, name: '他のユーザー' },
          likes_count: 0,
          is_liked: false,
          is_owner: false,
          created_at: '2024-01-01T00:00:00Z'
        }
      ]);

      // APIが403エラーを返すようにモック
      mockFetch.mockRejectedValueOnce({
        status: 403,
        statusText: 'Forbidden'
      });

      // act
      const { usePostActions } = await import('~/composables/usePostActions');
      const { handlePostDeletedInList } = usePostActions();
      
      await handlePostDeletedInList(inputPostId, inputPosts);

      // 非同期処理を待つ
      await new Promise(resolve => setTimeout(resolve, 100));

      // assert
      // 削除確認ダイアログが表示されることを確認
      expect(mockConfirm).toHaveBeenCalledWith('この投稿を削除してもよろしいですか？');

      // API呼び出しの確認
      expect(mockFetch).toHaveBeenCalledWith(
        `${process.env.API_BASE_URL || 'http://localhost'}/api/posts/${inputPostId}`,
        expect.objectContaining({
          method: 'DELETE',
          credentials: 'include'
        })
      );

      // 投稿が一覧から削除されていないことを確認（ロールバックされた）
      expect(inputPosts.value.length).toBe(1);
      expect(inputPosts.value.find(post => post.id === inputPostId)).toBeDefined();
    });
  });
});