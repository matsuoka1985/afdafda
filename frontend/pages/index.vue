<script setup lang="ts">

// 認証必須ページの設定 - 未認証時はログインページにリダイレクト
definePageMeta({
  middleware: 'require-auth'
});

import type { User, Post, PostsListResponse, PostsListComponent } from '~/types';

// === 環境別API URL設定 ===
/**
 * SSR時とクライアント時で異なるAPI URLを使い分け
 * - SSR: Dockerコンテナ間通信用URL
 * - クライアント: ブラウザから外部APIへのアクセス用URL
 */
const config = useRuntimeConfig();
const getApiBaseUrl = () => {
  // import.meta.server でSSRかクライアントかを判定
  if (import.meta.server) {
    return config.apiBaseUrlServer;// SSR用：http://nginx など
  } else {
    return config.public.apiBaseUrl; // クライアント用：http://localhost など
  }
};

const posts = ref<Post[]>([]); // 投稿一覧データ
const isInitialLoading = ref(true); // 初回ローディング状態
const currentUserId = ref<number | null>(null); // 認証中ユーザーのID

// === 無限スクロール機能 ===
const { isLoading, hasMore, handleScroll, loadNextPage, reset } = useInfiniteScroll();

// === トースト通知機能 ===
const { error: showErrorToast, success: showSuccessToast } = useToast();

// === 投稿一覧取得関数（ページネーション対応） ===
const fetchPosts = async (page: number = 1) => {
  try {
    // $fetch: （認証Cookie自動送信）
    const response = await $fetch<PostsListResponse>(`${getApiBaseUrl()}/api/posts?page=${page}&per_page=20`, {
      // method: 'GET' デフォルトでGETなので省略可能。記述すると型エラーとなる。
      headers: {
        'Accept': 'application/json'
      },
      credentials: 'include' // Cookieを送信
    });

    if (!response || typeof response !== 'object') {
      console.error(' 投稿一覧取得: レスポンスが無効');
      console.error(' レスポンス詳細:', {
        response,
        type: typeof response,
        isNull: response === null
      });
      throw new Error('サーバーからの応答が無効です');
    }

    // 'success' プロパティの存在確認（in演算子でプロパティ存在チェック）
    if (!('success' in response)) {
      console.error(' 投稿一覧取得: レスポンスにsuccessプロパティが存在しない');
      console.error(' 利用可能プロパティ:', Object.keys(response));
      throw new Error('サーバーからの応答形式が無効です');
    }

    if (response.success) {
      // 成功レスポンスの必須プロパティ検証
      if (!('posts' in response)) {
        console.error(' 成功レスポンスにpostsプロパティが存在しない');
        console.error(' 利用可能プロパティ:', Object.keys(response));
        throw new Error('投稿データが取得できませんでした');
      }

      if (!('current_user_id' in response)) {
        console.error(' 成功レスポンスにcurrent_user_idプロパティが存在しない');
        console.error(' 利用可能プロパティ:', Object.keys(response));
        throw new Error('ユーザー情報が取得できませんでした');
      }

      if (!('pagination' in response)) {
        console.error(' 成功レスポンスにpaginationプロパティが存在しない');
        console.error(' 利用可能プロパティ:', Object.keys(response));
        throw new Error('ページネーション情報が取得できませんでした');
      }

      currentUserId.value = response.current_user_id;

      return {
        data: response.posts,
        pagination: response.pagination
      };
    } else {
      // HTTPステータス200だがAPIレベルでエラーの場合
      console.error(' 投稿一覧取得失敗:', response);

      // 条件演算子（三項演算子）とAND演算子でエラーメッセージを型安全に取得
      const errorMessage = ('error' in response && typeof response.error === 'string')
        ? response.error
        : '投稿一覧の取得に失敗しました';

      throw new Error(errorMessage);
    }

  } catch (error) {
    console.error('投稿一覧取得エラー:', error);
    throw error;
  }
}

// === 初期データ読み込み ===
const loadInitialPosts = async () => {
  try {
    isInitialLoading.value = true;
    reset(); // 無限スクロール状態をリセット

    const result = await fetchPosts(1); // 1ページ目を取得
    // 各投稿オブジェクトをリアクティブにして設定
    posts.value = result.data.map(post => reactive(post));
  } catch (error) {
    console.error('初期投稿読み込みエラー:', error);
  } finally {
    // try/catch問わず必ず実行される
    isInitialLoading.value = false;
  }
}

// === 追加データ読み込み（無限スクロール用） ===
const loadMore = async () => {
  try {
    // loadNextPage: useInfiniteScrollのComposable関数
    const result = await loadNextPage(fetchPosts);
    // 追加データの各オブジェクトをリアクティブにして配列に結合（重複排除）
    const existingIds = new Set(posts.value.map(post => post.id));
    const newPosts = result.data
      .filter(post => !existingIds.has(post.id)) // 既存IDと重複しない投稿のみ
      .map(post => reactive(post));
    
    posts.value.push(...newPosts);
  } catch (error) {
    console.error('追加投稿読み込みエラー:', error);
  }
}


// === 各種Composable機能の取得 ===
// 分割代入でComposableから必要な機能のみ抽出
const { likingPosts, handleLike, cleanup: cleanupLike } = useLike();
const { handlePostDeletedInList } = usePostActions();
const { createMobilePostForList } = useMobilePost();

// === イベントハンドラー関数 ===
// いいね処理：IDから投稿オブジェクトを検索してComposableに渡す
const handlePostLike = (postId: number) => {
  // Array.find()で該当投稿を検索
  const post = posts.value.find(p => p.id === postId);
  handleLike(post || null, posts); // undefinedをnullに変換してComposableに渡す
};

// 削除処理：投稿IDを指定してリストから削除（楽観的更新）
const handlePostDeleted = (postId: number) => {
  handlePostDeletedInList(postId, posts);
};

// 新規投稿追加：配列の先頭に新しい投稿を挿入
const handleNewPost = (newPost: Post) => {
  // 重複チェック：同じIDの投稿が既に存在する場合は追加しない
  const existingPost = posts.value.find(post => post.id === newPost.id);
  if (existingPost) {
    return;
  }
  posts.value.unshift(reactive(newPost)); // リアクティブにして配列の先頭に追加
};

// === 無限スクロール用クリーンアップ関数 ===
// 型注釈：関数またはnullを格納する変数
let cleanup: (() => void) | null = null;

// === ライフサイクル：マウント時処理 ===
onMounted(async () => {
  // 初期データ読み込み
  await loadInitialPosts();

  // DOM更新完了後にスクロールイベント設定
  nextTick(() => {
    // オプショナルチェーン（?.）でDOM参照の安全なアクセス
    if (desktopScrollRef.value?.scrollRef) {
      // 無限スクロールのイベントリスナー設定
      cleanup = handleScroll(loadMore, desktopScrollRef.value.scrollRef);
    } else {
      console.warn(' desktopScrollRef not found, infinite scroll not set up');
    }
  });
});

// === ライフサイクル：アンマウント時処理 ===
onUnmounted(() => {
  // 無限スクロールのイベントリスナー削除（メモリリーク防止）
  if (cleanup) cleanup();

  cleanupLike();   // いいね機能のクリーンアップ

});

// === SEO・メタデータ設定 ===
useHead({
  title: 'ホーム - SHARE'
});

// === DOM参照用のref ===
const headerRef = ref<HTMLElement | null>(null); // ヘッダー要素の参照

// PostsList コンポーネントへの参照（無限スクロール用）
const desktopScrollRef = ref<PostsListComponent | null>(null);

// === 共有状態管理 ===
const sharedPostBody = ref(''); // デスクトップとモバイルで共有する投稿テキスト

// === モバイルモーダル状態 ===
const showMobileModal = ref(false); // モーダル表示/非表示
const isMobilePosting = ref(false); // 投稿処理中フラグ

// === モバイル投稿処理 ===
const createMobilePost = async () => {
  isMobilePosting.value = true; // 処理中フラグを立てる

  // Composableの関数を呼び出し（コールバック関数を渡す）
  await createMobilePostForList(
    sharedPostBody.value, // 投稿内容
    (newPost) => { // 成功時コールバック
      handleNewPost(newPost); // 新投稿を一覧に追加
      sharedPostBody.value = ''; // 入力内容クリア
      showMobileModal.value = false; // モーダル閉じる
    },
    () => { // 完了時コールバック（成功/失敗問わず）
      isMobilePosting.value = false; // 処理中フラグをリセット
    }
  );
};

</script>

<template>
  <div class="h-screen bg-custom-dark overflow-hidden">
    <div class="h-full flex flex-col md:flex-row">
      <!-- サイドバー（デスクトップのみ） -->
      <DesktopSidebar
        class="hidden md:block"
        v-model:post-body="sharedPostBody"
        @new-post="handleNewPost"
      />

      <!-- メインコンテンツ -->
      <main class="flex-1 flex flex-col min-w-0  h-full">
        <!-- ヘッダー -->
        <PageHeader ref="headerRef" title="ホーム" />

        <!-- 投稿一覧 -->
        <PostsList
          ref="desktopScrollRef"
          :posts="posts"
          :current-user-id="currentUserId"
          :liking-posts="likingPosts"
          :is-initial-loading="isInitialLoading"
          :is-loading="isLoading"
          :has-more="hasMore"
          @like="handlePostLike"
          @delete="handlePostDeleted"
        />
      </main>
    </div>

    <!-- フローティング投稿ボタン（モバイルのみ） -->
    <FloatingPostButton @click="showMobileModal = true" />

    <!-- モバイル投稿モーダル -->
    <MobilePostModal
      :show="showMobileModal"
      v-model:post-body="sharedPostBody"
      :is-posting="isMobilePosting"
      @close="showMobileModal = false"
      @submit="createMobilePost"
    />

    <ToastContainer />
  </div>
</template>
