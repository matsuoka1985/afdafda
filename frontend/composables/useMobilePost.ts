// === インポート ===
import type { Post, CreatePostResponse } from '~/types';
import { CHARACTER_LIMITS } from '~/constants/validation';

// === メインコンポーザブル関数 ===
/**
 * モバイル投稿処理を管理するComposable
 *
 * 機能概要:
 * - バリデーション：文字数制限、空文字チェック
 * - API呼び出し：投稿作成リクエスト送信
 * - エラーハンドリング：ネットワークエラー、APIエラー対応
 * - ユーザーフィードバック：成功・失敗通知
 *
 * 使用場面:
 * - 一覧ページ：投稿後にリストに追加
 * - 詳細ページ：投稿後はリスト更新なし
 *
 * 設計思想:
 * - 関数の責任分離：一覧用と詳細用で分けて管理
 */
export const useMobilePost = () => {
  // === 外部機能の取得 ===
  /**
   * トースト通知機能
   * - success: 成功時の緑色通知（アクションボタン付き可能）
   * - error: エラー時の赤色通知
   * ユーザーへの視覚的フィードバックを提供
   */
  const { error: showErrorToast, success: showSuccessToast } = useToast();

  // === 一覧ページ用投稿処理 ===
  /**
   * モバイル投稿処理（一覧ページ用）
   *
   * 特徴:
   * - 投稿成功時にonSuccessコールバックで新しい投稿を一覧に追加
   * - 成功通知に「詳細を見る」リンクを含む
   * - 処理完了時（成功・失敗問わず）にonCompleteを実行
   *
   * 使用例:
   * await createMobilePostForList(
   *   postText,
   *   (newPost) => posts.value.unshift(newPost), // 一覧の先頭に追加
   *   () => isSubmitting.value = false // ローディング状態解除
   * )
   *
   * @param postBody 投稿内容（文字列）
   * @param onSuccess 投稿成功時のコールバック（新しい投稿オブジェクトを受け取る）
   * @param onComplete 処理完了時のコールバック（成功・失敗問わず実行）
   * @returns Promise<boolean> - 成功時true、失敗時false
   */
  const createMobilePostForList = async (
    postBody: string,
    onSuccess?: (post: Post) => void,
    onComplete?: () => void
  ): Promise<boolean> => {
    // === 入力バリデーション ===
    /**
     * 投稿内容の妥当性をチェック
     * APIリクエスト前にクライアントサイドで事前検証
     *
     * チェック項目:
     * 1. null/undefined/空文字チェック
     * 2. 文字数制限チェック（CHARACTER_LIMITS.POST_CONTENT）
     *
     * 早期リターンパターン：
     * - 無効な場合はfalseを返してAPI呼び出しを回避
     * - ネットワーク負荷軽減とレスポンス向上
     */
    if (!postBody || postBody.trim() === '') {
      console.log('投稿内容が空です');
      return false;
    }

    if (postBody.length > CHARACTER_LIMITS.POST_CONTENT) {
      console.log('文字数制限超過:', postBody.length, '>', CHARACTER_LIMITS.POST_CONTENT);
      return false;
    }

    try {
      // === API呼び出し ===
      /**
       * Nuxt Server APIへの投稿作成リクエスト
       *
       * エンドポイント: /api/posts (POST)
       * 対応ファイル: server/api/posts.post.ts
       *
       * リクエスト仕様:
       * - method: POST
       * - body: { body: string } ← 投稿本文
       * - 自動でauth tokenがヘッダーに付与される（Nuxt認証）
       *
       * $fetch:
       * - 自動JSON変換
       * - エラー時は例外をthrow
       */
      console.log(' 投稿作成リクエスト送信:', { body: postBody.trim() });

      const config = useRuntimeConfig();
      const apiBaseUrl = config.public.apiBaseUrl;
      const response = await $fetch<CreatePostResponse>(`${apiBaseUrl}/api/posts`, {
        method: 'POST',
        credentials: 'include',
        body: { body: postBody.trim() } // 前後の空白を除去して送信
      });

      if (response && typeof response === 'object' && 'success' in response) {
        if (response.success && response.post) {
          // === 投稿作成成功時の処理 ===
          console.log(' モバイル投稿作成成功（一覧用）:', response.post);

          // === 成功時のコールバック実行 ===
          /**
           * onSuccessコールバック：一覧ページでの投稿追加処理
           *
           * 典型的な使用例:
           * onSuccess: (newPost) => {
           *   posts.value.unshift(newPost) // 一覧の先頭に新投稿を追加
           * }
           */
          if (onSuccess) {
            onSuccess(response.post);
          }

          // === 成功通知の表示 ===
          /**
           * ユーザーフィードバック：投稿完了を通知
           *
           * 設定値:
           * - メッセージ: '投稿しました！'
           * - 表示時間: 5000ms (5秒)
           * - アクションボタン: '詳細を見る' → 投稿詳細ページに遷移
           */
          showSuccessToast('投稿しました！', 5000, {
            label: '詳細を見る',
            to: `/posts/${response.post.id}`
          });

          return true; // 呼び出し元に成功を通知
        } else {
          // === 投稿作成失敗時の処理 ===
          /**
           * APIが失敗レスポンスを返した場合
           *
           * 失敗例:
           * - バリデーションエラー（サーバーサイド）
           * - 認証エラー
           * - データベースエラー
           * - ビジネスロジックエラー
           */
          console.error(' モバイル投稿作成失敗（一覧用）:', response.error || '不明なエラー');
          showErrorToast('投稿の作成に失敗しました');
          return false;
        }
      } else {
        // === 予期しないレスポンス構造への対応 ===
        /**
         * APIが期待と異なる構造のレスポンスを返した場合
         *
         * 発生例:
         * - API仕様変更
         * - サーバーエラーでHTMLが返される
         * - プロキシエラー
         * - ネットワーク機器による応答改変
         */
        console.error(' 予期しない投稿作成レスポンス構造（一覧用）:', response);
        showErrorToast('投稿の作成に失敗しました');
        return false;
      }
    } catch (error) {
      // === 例外処理（ネットワークエラー等） ===
      /**
       * $fetchが例外をthrowする場合:
       * - ネットワーク接続エラー
       * - タイムアウト
       * - HTTPステータスエラー（4xx, 5xx）
       * - JSONパースエラー

       */
      console.error(' 投稿作成ネットワークエラー:', error);
      showErrorToast('投稿の作成に失敗しました');
      return false;
    } finally {
      // === 後処理（必ず実行） ===
      /**
       * finally句：成功・失敗・例外に関わらず必ず実行
       *
       * onCompleteの典型的用途:
       * - ローディング状態の解除
       * - UI要素の有効化
       * - フォームのリセット
       * - 統計情報の更新
       *
       * 例:
       * onComplete: () => {
       *   isSubmitting.value = false
       *   postContent.value = ''
       * }
       */
      if (onComplete) {
        onComplete();
      }
    }
  };

  // === 詳細ページ用投稿処理 ===
  /**
   * モバイル投稿処理（詳細ページ用）
   *
   * 一覧用との違い:
   * - onSuccessコールバックなし（一覧更新が不要）
   * - 投稿後の画面更新なし（現在のページに留まる想定）
   *
   * 使用場面:
   * - 投稿詳細ページから追加投稿
   * - 単体投稿フォーム
   * - ダイアログ内投稿
   *
   * 使用例:
   * await createMobilePostForDetail(
   *   postText,
   *   () => isSubmitting.value = false
   * )
   *
   * @param postBody 投稿内容（文字列）
   * @param onComplete 処理完了時のコールバック（ローディング解除等）
   * @returns Promise<boolean> - 成功時true、失敗時false
   */
  const createMobilePostForDetail = async (
    postBody: string,
    onComplete?: () => void
  ): Promise<boolean> => {
    // === 入力バリデーション（詳細ページ用） ===
    if (!postBody || postBody.trim() === '') {
      console.log('投稿内容が空です（詳細用）');
      return false;
    }

    if (postBody.length > CHARACTER_LIMITS.POST_CONTENT) {
      console.log('文字数制限超過（詳細用）:', postBody.length, '>', CHARACTER_LIMITS.POST_CONTENT);
      return false;
    }

    try {
      // === API呼び出し（詳細ページ用） ===
      /**
       * 一覧用と同一のAPIエンドポイントを使用
       *
       * 理由:
       * - サーバーサイドでは投稿作成処理は同じ
       * - クライアントサイドの後処理のみが異なる
       * - APIの一貫性とシンプルさを保持
       */
      console.log('投稿作成リクエスト送信（詳細用）:', { body: postBody.trim() });

      const config = useRuntimeConfig();
      const apiBaseUrl = config.public.apiBaseUrl;
      const response = await $fetch<CreatePostResponse>(`${apiBaseUrl}/api/posts`, {
        method: 'POST',
        credentials: 'include',
        body: { body: postBody.trim() }
      });

      // === レスポンスの型安全性チェック（詳細ページ用） ===
      if (response && typeof response === 'object' && 'success' in response) {
        if (response.success && response.post) {
          // === 投稿作成成功時の処理（詳細用） ===
          console.log(' モバイル投稿作成成功（詳細用）:', response.post);

          // === 成功通知（詳細ページ仕様） ===
          /**
           * 詳細ページでの成功通知
           *
           * 一覧用との違い:
           * - onSuccessコールバックなし（一覧更新不要）
           * - 同じ「詳細を見る」リンクを提供（新投稿への遷移）
           */
          showSuccessToast('投稿しました！', 5000, {
            label: '詳細を見る',
            to: `/posts/${response.post.id}`
          });

          // === 投稿詳細ページなので一覧には追加しない ===
          return true;
        } else {
          // === 投稿作成失敗時の処理（詳細用） ===
          console.error('モバイル投稿作成失敗（詳細用）:', response.error || '不明なエラー');
          showErrorToast('投稿の作成に失敗しました');
          return false;
        }
      } else {
        // === 予期しないレスポンス構造への対応（詳細用） ===
        console.error('予期しない投稿作成レスポンス構造（詳細用）:', response);
        showErrorToast('投稿の作成に失敗しました');
        return false;
      }
    } catch (error) {
      // === 例外処理（詳細ページ用） ===
      /**
       * 一覧用と同じ例外処理パターン
       * ネットワークエラーやHTTPエラーへの対応
       */
      console.error(' 投稿作成ネットワークエラー（詳細用）:', error);
      showErrorToast('投稿の作成に失敗しました');
      return false;
    } finally {
      // === 後処理（詳細ページ用） ===
      /**
       * 詳細ページでの完了処理
       *
       * 典型用途:
       * - ローディングスピナーの非表示
       * - フォームの初期化
       * - モーダルの閉じる
       */
      if (onComplete) {
        onComplete();
      }
    }
  };

  // === 外部公開API ===
  /**
   * Composableが提供する関数群
   *
   * 使い分け指針:
   *
   * createMobilePostForList:
   * - 一覧ページでの投稿
   * - 投稿後に一覧を更新したい場合
   * - onSuccessで一覧データの操作が必要
   *
   * createMobilePostForDetail:
   * - 詳細ページでの投稿
   * - 単体投稿フォーム
   * - 一覧更新が不要な場合
   *
   */
  return {
    createMobilePostForList,
    createMobilePostForDetail
  };
};