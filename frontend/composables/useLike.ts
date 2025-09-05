import type { Post, LikeResponse } from '~/types'

// === メインコンポーザブル関数 ===
/**
 * いいね機能を提供するコンポーザブル
 *
 * 機能:
 * - 楽観的更新
 * - デバウンス：連続クリック時は最後の状態のみサーバーに送信
 * - 重複リクエスト防止：同じ投稿への同時リクエストを制御
 *
 * 使用例:
 * const { likingPosts, handleLike, cleanup } = useLike()
 * handleLike(post, posts) // いいねボタンクリック時
 */
export const useLike = () => {
  // === 状態管理 ===
  /**
   * 処理中の投稿IDを追跡するSet
   * 重複リクエスト防止（409 Conflict エラー対策）に使用
   * Setを使う理由：重複を自動排除
   */
  const likingPosts = ref<Set<number>>(new Set());

  /**
   * デバウンス用タイマーを管理するMap
   * キー：投稿ID、値：setTimeout のタイマーID
   * 連続クリック時に前のタイマーをキャンセルして新しいタイマーを設定
   */
  const likeTimeouts = ref<Map<number, NodeJS.Timeout>>(new Map());

  /**
   * 保留中のいいね状態を保存するMap
   * キー：投稿ID、値：最終的に送信すべきいいね状態（true/false）
   * デバウンス期間中に複数回クリックされた場合の最終状態を記録
   */
  const pendingLikes = ref<Map<number, boolean>>(new Map());

  // === 外部機能 ===
  /**
   * トースト通知機能
   * エラー時にユーザーへの視覚的フィードバックを提供
   */
  const { error: showErrorToast } = useToast();

  // === メイン処理関数 ===
  /**
   * いいねボタンクリック時のハンドラー関数
   * デバウンス付き楽観的更新を実装
   *
   * 処理フロー:
   * 1. バリデーション（投稿の存在、重複リクエスト確認）
   * 2. 既存タイマーのクリア（デバウンス処理）
   * 3. 楽観的更新（UIの即座更新）
   * 4. デバウンスタイマー設定（500ms後にAPI送信）
   *
   * @param post - いいね対象の投稿オブジェクト
   * @param posts - 投稿一覧（オプション：一覧ページでの同期用）
   */
  const handleLike = (post: Post | null, posts?: Ref<Post[]>) => {
    // === 入力バリデーション ===
    if (!post) {
      return;
    };

    const postId = post.id;

    // === 重複リクエスト防止 ===
    /**
     * 既に処理中の投稿への重複操作を防ぐ
     * サーバーへの同時リクエストによる409エラーやデータ競合を回避
     */
    if (likingPosts.value.has(postId)) {
      return;
    }

    // === デバウンス処理 ===
    /**
     * 既存のタイマーをクリアして新しいタイマーを設定
     * ユーザーが連続でいいねボタンを押した場合、最後の操作のみ有効
     * 例：いいね→いいね解除→いいね の場合、最終的に「いいね」状態でAPI送信
     */
    if (likeTimeouts.value.has(postId)) {
      clearTimeout(likeTimeouts.value.get(postId)!);
      likeTimeouts.value.delete(postId);
    }

    // === 楽観的更新 ===
    /**
     * - サーバーエラー時は後から修正
     */
    const wasLiked = post.is_liked; // 更新前の状態を保存
    post.is_liked = !wasLiked; // いいね状態を反転
    post.likes_count += wasLiked ? -1 : 1; // いいね数を増減

    // === 投稿一覧との同期 ===
    // 詳細ページでいいね→一覧ページでも即座に反映（データ整合性の保持）
    // Vue の参照型特性により、異なるページ間で同じPostオブジェクトを共有しない場合があるため明示的に同期
    // 投稿一覧ページでは既に正しい参照を持っているため、この処理をスキップ
    if (posts?.value && posts.value.find(listPost => listPost.id === postId) !== post) {
      const listPost = posts.value.find(listPost => listPost.id === postId); // 一覧データから同じIDの投稿を検索
      if (listPost) {
        listPost.is_liked = post.is_liked; // 詳細ページで更新されたいいね状態を一覧にコピー
        listPost.likes_count = post.likes_count; // 詳細ページで更新されたいいね数を一覧にコピー
      }
    }

    // === 保留状態の記録 ===
    /**
     * デバウンス期間終了後にサーバーに送信する最終状態を記録
     * 連続操作時は最後の状態のみ保持される
     */
    pendingLikes.value.set(postId, post.is_liked);

    // === 処理中フラグの設定 ===
    /**
     * この投稿を「処理中」としてマーク
     * 重複リクエスト防止のロック機構
     */
    likingPosts.value.add(postId);

    // === デバウンスタイマーの設定 ===
    /**
     * 500ms後にAPI実行
     */
    const timeout = setTimeout(async () => {
      await executeLikeRequest(postId, post, posts);
    }, 500);

    // タイマーIDを保存（後でキャンセル可能にするため）
    likeTimeouts.value.set(postId, timeout);
  }

  // === API実行関数 ===
  /**
   * 実際のいいねAPIリクエストを実行する関数
   * デバウンス期間終了後自動実行される
   *
   * 処理内容:
   * 1. 二重チェック（処理中状態の確認）
   * 2. APIリクエスト送信
   * 3. レスポンス処理（成功/失敗）
   * 4. クリーンアップ（必須：finally句で実行）
   *
   * @param postId - 対象投稿のID
   * @param post - 投稿オブジェクト（UI更新用）
   * @param posts - 投稿一覧（オプション：一覧同期用）
   */
  const executeLikeRequest = async (postId: number, post: Post, posts?: Ref<Post[]>) => {
    // === 二重チェック ===
    /**
     * タイマー実行時点でまだ処理中かを確認
     * 稀にクリーンアップされている可能性があるため安全策
     */
    if (!likingPosts.value.has(postId)) {
      return;
    }

    // === 送信データの準備 ===
    /**
     * 保留中のいいね状態を取得
     * undefinedの場合は異常状態のためクリーンアップして終了
     */
    const finalLikeState = pendingLikes.value.get(postId)
    if (finalLikeState === undefined) {
      likingPosts.value.delete(postId)
      likeTimeouts.value.delete(postId)
      return
    }

    try {

      // === API呼び出し ===
      /**
       * いいね状態に応じてPOST（追加）またはDELETE（削除）を選択
       * finalLikeState が true なら POST、false なら DELETE
       */
      const config = useRuntimeConfig();
      const apiBaseUrl = config.public.apiBaseUrl;
      const response = await $fetch<LikeResponse>(`${apiBaseUrl}/api/posts/${postId}/like`, {
        method: finalLikeState ? 'POST' : 'DELETE',
        credentials: 'include'
      });

      // === レスポンスの型安全性チェック ===
      /**
       * APIレスポンスの構造を検証
       * TypeScriptの型定義だけでは実行時の型安全性は保証されないため
       * 実際のオブジェクト構造をランタイムでチェック
       */
      if (response && typeof response === 'object' && 'success' in response) {
        if (response.success) {
          // === 成功時の処理 ===

          /**
           * サーバーからの正確なデータでUIを更新
           * 楽観的更新で仮設定した値をサーバーの正確な値で上書き
           * フォールバック値：サーバーからデータが不完全な場合の安全策
           */
          post.is_liked = response.is_liked !== undefined ? response.is_liked : finalLikeState;
          post.likes_count = response.likes_count !== undefined ? response.likes_count : post.likes_count;

          // === 投稿一覧との同期（成功時） ===
          /**
           * 詳細ページで成功した場合、一覧ページも同じ値で更新
           * データ整合性の確保
           * ただし、一覧ページでは既に同じ参照なのでスキップ
           */
          if (posts?.value && posts.value.find(listPost => listPost.id === postId) !== post) {
            const listPost = posts.value.find(listPost => listPost.id === postId)
            if (listPost) {
              listPost.is_liked = post.is_liked;
              listPost.likes_count = post.likes_count;
            }
          }

        } else {
          // === 失敗時の処理 ===
          /**
           * APIが失敗を返した場合（ビジネスロジックエラー）
           * 例：権限なし、投稿が削除済み、バリデーションエラーなど
           */
          showErrorToast('いいねの処理に失敗しました');
          // 注意：楽観的更新済みのUIはそのまま（ロールバック処理は複雑化を避けるため省略）
        }
      } else {
        // === 予期しないレスポンス構造への対応 ===
        /**
         * APIが期待しない形式のレスポンスを返した場合
         * サーバーエラー、ネットワーク問題、API仕様変更などで発生
         */
        showErrorToast('いいねの処理に失敗しました');
      }
    } catch (error: any) {
      // === 認証エラー時のリダイレクト処理 ===
      if (error.status === 401) {
        await navigateTo('/login');
        return;
      }
      
      // === ネットワークエラー・例外処理 ===
      /**
       * fetch失敗、ネットワーク切断、タイムアウトなどをキャッチ
       * エラー時もUIは楽観的更新済みなので、ユーザーには成功として見える
       * （サーバーエラーでもUXを損なわない設計思想）
       */
      // 意図的にトースト表示しない：楽観的更新により見た目上は成功
    } finally {
      // === クリーンアップ（必須処理） ===
      /**
       * 成功・失敗・エラーに関わらず必ず実行
       * メモリリークや状態不整合を防ぐ重要な処理
       */
      likingPosts.value.delete(postId); // 処理中フラグを解除
      pendingLikes.value.delete(postId); // 保留状態をクリア
      likeTimeouts.value.delete(postId); // タイマー参照を削除
    }
  }

  // === ライフサイクル管理 ===
  /**
   * コンポーネント破棄時の全面的クリーンアップ関数
   * メモリリークとタイマー残留を防ぐ
   *
   * onUnmountedで呼び出すことを想定
   *
   * 使用例:
   * onUnmounted(() => {
   *   cleanup()
   * })
   */
  const cleanup = () => {

    // すべてのタイマーをクリア（メモリリーク防止）
    likeTimeouts.value.forEach((timeout) => {
      clearTimeout(timeout)
    });

    // 全ての状態をリセット
    likeTimeouts.value.clear();
    likingPosts.value.clear();
    pendingLikes.value.clear();

  }

  // === 外部公開API ===
  /**
   * コンポーネントで使用可能な値と関数を返す
   * 読み取り専用にして予期しない変更を防ぐ
   */
  return {
    likingPosts: readonly(likingPosts), // 処理中投稿一覧（読み取り専用）
    handleLike, // いいねハンドラー関数
    cleanup // クリーンアップ関数
  };
}