<script setup lang="ts">
import type { Comment, CommentsResponse } from '~/types';

// コンポーネントのProps型定義
interface Props {
  postId: number // 対象投稿のID
  sharedCommentBody: string // 親コンポーネントと共有するコメント本文
  commentsListHeight: string // コメント一覧の高さ（CSSスタイル）
}

// コンポーネントのEmits型定義
interface Emits {
  (e: 'update:sharedCommentBody', value: string): void // コメント本文の更新イベント
  (e: 'commentCreated', comment: Comment): void // 新規コメント作成イベント
  (e: 'mounted'): void // コンポーネントマウント完了イベント
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const comments = ref<Comment[]>([]); // コメント一覧データ

const { isLoading, hasMore, handleScroll, loadNextPage, reset } = useInfiniteScroll(); // === 無限スクロール機能 ===


// === API関数 ===
const fetchComments = async (page: number = 1) => { // コメント一覧を取得する関数（ページネーション対応）
  try {
    const config = useRuntimeConfig();
    const apiBaseUrl = config.public.apiBaseUrl;
    // NuxtのfetchAPIでコメントデータを取得
    const response = await $fetch<CommentsResponse>(`${apiBaseUrl}/api/posts/${props.postId}/comments`, {
      method: 'GET',
      credentials: 'include',
      query: {
        page: page, // ページ番号
        per_page: 20 // 1ページあたりの取得件数
      }
    })

    // レスポンスの成功判定
    if (response.success) {
      console.log(` コメント一覧取得成功 (ページ${page}):`, response.comments)
      // 無限スクロール用の統一形式でデータを返却
      return {
        data: response.comments,
        pagination: response.pagination
      }
    } else {
      console.error(' コメント一覧取得失敗:', response.error)
      // エラーメッセージがない場合はデフォルトメッセージを使用
      throw new Error(response.error || 'コメントの取得に失敗しました')
    }
  } catch (error) {
    console.error('コメント一覧取得エラー:', error)
    throw error
  }
}

// === データロード関数 ===
// 初期コメントデータを読み込む関数
const loadInitialComments = async () => {
  try {
    reset(); // 無限スクロール状態をリセット（ページ番号、読み込み状態等）

    const result = await fetchComments(1) // 1ページ目を取得
    comments.value = result.data // コメント一覧を更新
  } catch (error) {
    console.error('初期コメント読み込みエラー:', error)
  }
}

// 次のページのコメントを読み込む関数（無限スクロール用）
const loadMoreComments = async () => {
  try {
    // useInfiniteScrollのloadNextPage関数を使用して次ページを取得
    const result = await loadNextPage(fetchComments);
    // 既存のコメント配列に新しいコメントを追加
    comments.value.push(...result.data)
  } catch (error) {
    console.error('追加コメント読み込みエラー:', error);
  }
}

// === イベントハンドラー ===
// 新しいコメントが作成された時の処理
const handleNewComment = (newComment: Comment) => {
  // 新しいコメントを配列の先頭に追加（最新順）
  comments.value.unshift(newComment);
  // 親コンポーネントにコメント作成を通知
  emit('commentCreated', newComment);
}

// 子コンポーネント（CommentForm）の v-model 更新を明示的に受けて、
// 親へ `update:sharedCommentBody` として伝播するハンドラ
const onUpdateSharedCommentBody = (value: string): void => {
  emit('update:sharedCommentBody', value);
};

// === DOM参照 ===
// テンプレート内の要素への参照
const commentScrollRef = ref<HTMLElement | null>(null); // スクロール監視対象の要素
const commentFormRef = ref<HTMLElement | null>(null); // コメントフォーム要素
const commentsHeaderRef = ref<HTMLElement | null>(null); // コメントヘッダー要素

// === ライフサイクル管理 ===
// 無限スクロールのクリーンアップ関数を保持
let cleanupCommentScroll: (() => void) | null = null;

onMounted(async () => { // コンポーネントマウント時の処理
  await loadInitialComments();   // 初期コメントデータの読み込み


  // DOM更新後に実行
  nextTick(() => {
    // スクロール要素が存在する場合、無限スクロールを設定
    if (commentScrollRef.value) {
      cleanupCommentScroll = handleScroll(loadMoreComments, commentScrollRef.value);
    }
    // 親コンポーネントにマウント完了を通知（高さ再計算など）
    emit('mounted');
  })
})

// コンポーネント破棄時のクリーンアップ処理
onUnmounted(() => {
  // 無限スクロールのイベントリスナーを削除
  if (cleanupCommentScroll) {cleanupCommentScroll();}
})

// === 親コンポーネント連携 ===
// 親コンポーネントからアクセス可能な要素を公開
defineExpose({
  commentsHeaderRef, // コメントヘッダー要素
  commentFormRef // コメントフォーム要素
})
</script>

<template>
  <!-- コメントヘッダー: タイトル表示エリア -->
  <div ref="commentsHeaderRef" class="border-l border-b border-white p-4 md:p-6 flex-shrink-0 text-center">
    <h3 class="text-white text-lg md:text-lg font-bold">コメント</h3>
  </div>

  <!-- コメント一覧: スクロール可能なコメント表示エリア -->
  <div
    ref="commentScrollRef"
    class="overflow-y-auto pb-0 md:pb-0 border-white"
    :style="{
      maxHeight: commentsListHeight, // 親から渡される動的な高さ
      minHeight: '200px' // 最小高さを保証
    }"
  >
    <!-- コメントが存在しない場合の表示 -->
    <div v-if="comments.length === 0" class="p-4 md:p-6  border-white">
      <p class="text-gray-400 text-center">まだコメントはありません</p>
    </div>

    <!-- コメント一覧が存在する場合 -->
    <div v-else>
      <!-- 各コメントの表示 -->
      <article
        v-for="comment in comments"
        :key="comment.id"
        class="border-b border-l border-white p-4 md:p-6"
        data-testid="comment-item"
      >
        <!-- コメントヘッダー: ユーザー名 -->
        <div class="mb-2">
          <h4 class="text-white font-bold" data-testid="comment-user-name">{{ comment.user.name }}</h4>
        </div>
        <!-- コメント本文: 改行対応 -->
        <p class="text-white break-words" data-testid="comment-body">{{ comment.body }}</p>
      </article>

      <!-- 無限スクロール用ローダー -->
      <div class="-ml-px">
        <InfiniteScrollLoader
          :is-loading="isLoading"
          :has-more="hasMore"
          :posts-count="comments.length"
        />
      </div>
    </div>
  </div>

  <!-- コメント送信フォーム: 新規コメント作成エリア -->
  <div ref="commentFormRef" class="p-4 md:p-6 pb-24 md:pb-6">
    <CommentForm
      :post-id="postId"
      :model-value="sharedCommentBody"
      @update:model-value="onUpdateSharedCommentBody"
      @comment-created="handleNewComment"
    />
  </div>
</template>