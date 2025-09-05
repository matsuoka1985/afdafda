<script setup lang="ts">

definePageMeta({ middleware: 'require-auth' }); // 認証必須ページ設定

import type { User, Post, Comment, PostDetailResponse, CommentsSectionComponent, ErrorWithStatus } from '~/types';
import { LAYOUT_HEIGHTS } from '~/constants/layout';

const route = useRoute();
const postId = Number(route.params.id); // URLパラメーターから投稿IDを数値型で取得

const post = ref<Post | null>(null); // 表示する投稿データ
const isPostLoading = ref(true); // 投稿データ取得中の状態
const currentUserId = ref<number | null>(null); // 現在認証中のユーザーID


// const { error: showErrorToast, success: showSuccessToast } = useToast();

const fetchPost = async () => { // 指定IDの投稿詳細をサーバーから取得
  try {
    console.log(' 投稿詳細取得開始 - PostID:', postId);
    const config = useRuntimeConfig();
    const apiBaseUrl = config.public.apiBaseUrl;
    const response = await $fetch<PostDetailResponse>(`${apiBaseUrl}/api/posts/${postId}`, {
      credentials: 'include'
    });

    if (!response || typeof response !== 'object') {
      console.error(' 投稿詳細取得: レスポンスが無効');
      console.error(' レスポンス詳細:', {
        response,
        type: typeof response,
        isNull: response === null
      });
      throw new Error('サーバーからの応答が無効です');
    }

    if (!('success' in response)) { // 'success'プロパティの存在確認
      console.error(' 投稿詳細取得: レスポンスにsuccessプロパティが存在しない');
      console.error(' 利用可能プロパティ:', Object.keys(response));
      throw new Error('サーバーからの応答形式が無効です');
    }

    if (response.success) {
      if (!('post' in response)) { // 投稿データの存在確認
        console.error('成功レスポンスにpostプロパティが存在しない');
        console.error(' 利用可能プロパティ:', Object.keys(response));
        throw new Error('投稿データが取得できませんでした');
      }

      if (!('current_user_id' in response)) { // 現在ユーザーIDの存在確認
        console.error(' 成功レスポンスにcurrent_user_idプロパティが存在しない');
        console.error(' 利用可能プロパティ:', Object.keys(response));
        throw new Error('ユーザー情報が取得できませんでした');
      }

      post.value = response.post; // 画面表示用の投稿データ設定
      currentUserId.value = response.current_user_id; // 権限判定用のユーザーID設定
      console.log(' 投稿詳細取得成功:', response.post);
      console.log(' 現在ユーザーID:', response.current_user_id);
    } else {
      console.error(' 投稿詳細取得失敗:', response);

      const errorMessage = ('error' in response && typeof response.error === 'string')
        ? response.error
        : '投稿の取得に失敗しました';

      throw new Error(errorMessage);
    }
  } catch (error: unknown) {
    console.error(' 投稿詳細取得エラー:', error);

    const errorWithStatus = error as ErrorWithStatus;
    if (errorWithStatus?.status === 404) { // 404エラーの特別処理（Nuxtエラーページ表示）
      console.log('404エラー検出 - Nuxtエラーページに遷移');
      throw createError({
        statusCode: 404,
        statusMessage: '投稿が見つかりません'
      });
    }

    throw error; // その他のエラーは上位に委譲
  }
}


const { likingPosts, handleLike, cleanup: cleanupLike } = useLike();
// const { handleLogout } = useAuth();
const { handlePostDeletedInDetail } = usePostActions(); // 詳細ページ削除処理
const { createMobilePostForDetail } = useMobilePost(); // 詳細ページモバイル投稿

const handlePostLike = () => { // いいねボタンクリック処理
  console.log(' いいねボタンクリック - PostID:', postId);
  handleLike(post.value);
}

const handlePostDeleted = () => { // 投稿削除ボタンクリック処理
  if (!post.value) {
    console.warn(' 削除処理: 投稿データが存在しません');
    return
  }
  console.log(' 投稿削除ボタンクリック - PostID:', postId);
  handlePostDeletedInDetail(postId);
}

const handleNewComment = (newComment: Comment) => { // 新規コメント投稿完了時の処理
  console.log(' 新しいコメント投稿完了:', newComment.id);

  if (post.value) {
    post.value.comments_count = (post.value.comments_count || 0) + 1
    console.log(' コメント数更新:', post.value.comments_count);
  }

  updateCommentsListHeight(); // レイアウト再計算
}

const handleNewPost = (_newPost: Post) => { // デスクトップ投稿完了時のテキストクリア。_newPostは未使用
  console.log(' デスクトップ投稿完了 - テキストクリア実行');
  sharedPostBody.value = '';
};



const headerRef = ref<HTMLElement | null>(null); // ヘッダー要素参照
const postSectionRef = ref<HTMLElement | null>(null); // 投稿詳細セクション要素参照
const commentsSectionRef = ref<HTMLElement | null>(null); // コメントセクション要素参照
const commentsListHeight = ref('auto'); // 動的計算コメントリスト高さ

const showMobileModal = ref(false); // モバイル投稿モーダル表示状態
const isMobilePosting = ref(false); // モバイル投稿処理中フラグ

const sharedPostBody = ref(''); // デスクトップ・モバイル共有投稿テキスト
const commentBody = ref(''); // コメント入力内容（フローティングボタン表示制御用）



const createMobilePost = async () => { // モバイル投稿処理・状態管理

  isMobilePosting.value = true;

  const success = await createMobilePostForDetail(
    sharedPostBody.value,
    () => {
      console.log('モバイル投稿処理完了 - 処理中フラグをリセット');
      isMobilePosting.value = false;
    }
  );

  if (success) { // 成功時は状態リセット・モーダル閉じる
    console.log('モバイル投稿成功 - 状態リセット実行');
    sharedPostBody.value = ''; // 投稿テキストクリア
    showMobileModal.value = false; // モーダル閉じる
  } else {
    console.log(' モバイル投稿失敗 - モーダル継続表示');
  }
}


// コメントリスト表示領域の高さを動的計算（レスポンシブ対応・リサイズ対応）
const updateCommentsListHeight = () => {
  nextTick(() => { // DOM更新後に高さ計算
    if (headerRef.value && postSectionRef.value && commentsSectionRef.value) { // DOM要素存在確認
      const headerHeight = headerRef.value?.offsetHeight || 0;
      const postHeight = postSectionRef.value.offsetHeight;
      const screenHeight = window.innerHeight;

      console.log(' 基本要素の高さ取得:', {
        headerHeight,
        postHeight,
        screenHeight
      });

      const commentsHeaderHeight = (commentsSectionRef.value as CommentsSectionComponent)?.commentsHeaderRef?.offsetHeight || LAYOUT_HEIGHTS.COMMENTS_HEADER;
      const formHeight = (commentsSectionRef.value as CommentsSectionComponent)?.commentFormRef?.offsetHeight || LAYOUT_HEIGHTS.COMMENT_FORM;
      const donutGaugeHeight = LAYOUT_HEIGHTS.DONUT_GAUGE;
      const mobileBottomPadding = window.innerWidth < LAYOUT_HEIGHTS.MOBILE_BREAKPOINT ? LAYOUT_HEIGHTS.MOBILE_BOTTOM_PADDING : 0;

      console.log(' 詳細要素の高さ取得:', {
        commentsHeaderHeight,
        formHeight,
        donutGaugeHeight,
        mobileBottomPadding,
        isMobile: window.innerWidth < LAYOUT_HEIGHTS.MOBILE_BREAKPOINT
      });

      const availableHeight = screenHeight - headerHeight - postHeight - commentsHeaderHeight - formHeight - donutGaugeHeight - mobileBottomPadding;
      const finalHeight = Math.max(availableHeight, LAYOUT_HEIGHTS.MIN_COMMENTS_LIST); // 最小高さ保証
      commentsListHeight.value = `${finalHeight}px`;

      console.log(' 高さ計算デバッグ:', {
        screenHeight,
        headerHeight,
        postHeight,
        commentsHeaderHeight,
        formHeight,
        donutGaugeHeight,
        mobileBottomPadding,
        availableHeight,
        finalHeight,
        commentsListHeightValue: commentsListHeight.value
      });
    } else {
      console.log(' 高さ計算: 要素が見つからない:', {
        headerRef: !!headerRef.value,
        postSectionRef: !!postSectionRef.value,
        commentsSectionRef: !!commentsSectionRef.value
      });
    }
  })
}

onMounted(async () => { // コンポーネント初期化・データ取得・レイアウト計算
  console.log(' 投稿詳細ページマウント開始');

  try {
    console.log(' 投稿データ取得開始 - ローディング状態セット');
    isPostLoading.value = true;

    await fetchPost(); // API呼び出しで投稿詳細とユーザーID取得
    console.log('投稿データ取得完了');

  } catch (error) {
    console.error(' ページ読み込みエラー:', error);
    const errorWithStatus = error as ErrorWithStatus;
    console.error(' エラー詳細:', {
      message: errorWithStatus?.message,
      status: errorWithStatus?.status,
      stack: errorWithStatus?.stack
    });
  } finally {
    console.log(' ローディング完了 - UI状態更新');
    isPostLoading.value = false;

    nextTick(() => { // DOM更新完了後にレイアウト計算実行
      console.log(' 初期レイアウト計算実行');
      updateCommentsListHeight();
    })
  }

  console.log(' ウィンドウリサイズイベントリスナー設定');
  window.addEventListener('resize', updateCommentsListHeight) // リサイズ対応

  console.log(' 投稿詳細ページマウント完了');
})

onUnmounted(() => { // リソース解放・メモリリーク防止

  window.removeEventListener('resize', updateCommentsListHeight) // リサイズイベント削除

  cleanupLike(); // いいね機能の進行中処理中断・状態クリア

});

useHead({ // SEO・ソーシャル共有対応のメタデータ設定
  title: computed(() => { // 投稿データ取得後に動的更新
    if (post.value) {
      const userName = post.value.user.name;
      return `${userName}の投稿 - SHARE`;
    }
    return '投稿詳細 - SHARE';
  })
});
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
      <div class="flex-1 flex flex-col min-w-0">
        <main class="flex-1 flex flex-col">
          <!-- コンテンツエリア -->
          <div class="flex flex-col">
            <!-- ヘッダー -->
            <PageHeader ref="headerRef" title="コメント" />

            <!-- 投稿詳細セクション -->
            <section ref="postSectionRef" class="flex-shrink-0">
              <PostItem
                v-if="post"
                :post="post"
                :current-user-id="currentUserId"

                :is-liking="likingPosts.has(post?.id || 0)"
                :show-detail-link="false"
                :is-mobile="false"
                @like="handlePostLike"
                @delete="handlePostDeleted"
              />
            </section>

            <!-- コメントセクション -->
            <CommentsSection
              v-if="!isPostLoading"
              ref="commentsSectionRef"
              :post-id="postId"
              :shared-comment-body="commentBody"
              :comments-list-height="commentsListHeight"
              @update:shared-comment-body="commentBody = $event"
              @comment-created="handleNewComment"
              @mounted="updateCommentsListHeight"
            />

            <!-- ローディング時はコメントセクション全体をローディング表示 -->
            <div v-else class="flex-1 flex items-center justify-center">
              <div class="flex flex-col items-center py-16">
                <LoadingSpinner size="lg" />
                <p class="text-gray-400 text-sm mt-4">読み込み中...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>

    <!-- フローティング投稿ボタン（モバイルのみ、コメント入力時は非表示） -->
    <FloatingPostButton
      :hide-when-typing="true"
      :comment-body="commentBody"
      @click="showMobileModal = true"
    />

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
