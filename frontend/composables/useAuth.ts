// Firebase認証のUser型をインポート
import type { User } from 'firebase/auth';

/**
 * Firebase認証状態を管理するコンポーザブル
 * ログイン状態の監視、認証チェック、リダイレクト処理を提供
 */
export const useAuth = () => {
  const user = ref<User | null>(null); // 現在ログイン中のユーザー情報（Firebase User型）
  const loading = ref(true); // 認証状態チェック中かどうかのローディング状態

  // === 認証状態監視機能 ===
  /**
   * Firebase認証状態を監視し、状態変更を検出する
   * 一度だけ実行されるワンタイム監視（継続監視ではない）
   * @returns Promise<User | null> - 認証済みユーザーまたはnull
   */
  const checkAuthState = () => {
    const { $firebaseAuth } = useNuxtApp(); // NuxtアプリからFirebase Auth インスタンスを取得

    return new Promise<User | null>((resolve) => {
      // Firebase認証状態変更の監視を開始
      const unsubscribe = $firebaseAuth.onAuthStateChanged((firebaseUser: User | null) => {
        user.value = firebaseUser; // ユーザー状態を更新
        loading.value = false; // ローディング状態を終了
        console.log('認証状態確認:', firebaseUser ? 'ログイン中' : 'ログアウト中');
        resolve(firebaseUser); // Promiseを解決
        unsubscribe(); // 一度確認したら監視を停止（メモリリーク防止）
      });
    });
  };

  // === リダイレクト機能 ===
  /**
   * ログイン中のユーザーを指定ページにリダイレクト
   * 使用例: ログインページでログイン済みユーザーをホームに飛ばす
   * @param redirectTo - リダイレクト先のパス（デフォルト: '/'）
   * @returns boolean - リダイレクトが実行されたかどうか
   */
  const redirectIfAuthenticated = async (redirectTo: string = '/') => {
    await checkAuthState(); // 最新の認証状態を確認

    if (user.value) { // ログイン中の場合
      await navigateTo(redirectTo) // 指定ページにリダイレクト
      return true; // リダイレクト実行を返却
    }
    return false; // リダイレクト未実行を返却
  }

  /**
   * 未ログインユーザーを指定ページにリダイレクト
   * 使用例: 認証が必要なページで未ログインユーザーをログインページに飛ばす
   * @param redirectTo - リダイレクト先のパス（デフォルト: '/login'）
   * @returns boolean - リダイレクトが実行されたかどうか
   */
  const redirectIfNotAuthenticated = async (redirectTo: string = '/login') => {
    await checkAuthState(); // 最新の認証状態を確認

    if (!user.value) { // 未ログインの場合
      await navigateTo(redirectTo); // 指定ページにリダイレクト
      return true; // リダイレクト実行を返却
    }
    return false; // リダイレクト未実行を返却
  }

  // === ログアウト機能 ===
  /**
   * ログアウト処理を実行
   * サーバーサイドでのセッション削除 + ログインページへリダイレクト
   */
  const handleLogout = async () => {
    try {
      // サーバーサイドのログアウトAPI呼び出し（Nuxtサーバーにおいてhttp onlyクッキーを削除）
      const config = useRuntimeConfig();
      const apiBaseUrl = config.public.apiBaseUrl;
      await $fetch(`${apiBaseUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      // ログアウト成功時、ログインページにリダイレクト
      await navigateTo('/login');
    } catch (error) {
      console.error('ログアウトエラー:', error) // エラーログ出力（監視用）
      // エラーが発生してもログイン画面に遷移（フェイルセーフ）
      await navigateTo('/login');
    }
  }

  // === 外部公開API ===
  // readonlyでラップして外部からの直接変更を防止
  return {
    user: readonly(user), // 読み取り専用のユーザー状態
    loading: readonly(loading), // 読み取り専用のローディング状態
    checkAuthState, // 認証状態確認関数
    redirectIfAuthenticated, // ログイン中ユーザーリダイレクト関数
    redirectIfNotAuthenticated, // 未ログインユーザーリダイレクト関数
    handleLogout // ログアウト処理関数
  };
};