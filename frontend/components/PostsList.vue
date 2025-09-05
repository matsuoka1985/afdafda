<script setup lang="ts">
import type { Post } from '~/types' // 投稿データの型定義

/**
 * 投稿一覧コンポーネントのプロパティ
 */
interface Props {
  posts: Post[] // 表示する投稿データの配列
  currentUserId: number | null // 現在ログインしているユーザーのID（未ログイン時はnull）
  likingPosts: ReadonlySet<number> // いいね処理中の投稿IDのセット（重複クリック防止）。ReadonlySetで読み取り専用として扱う。
  isInitialLoading: boolean // 初回データ読み込み中かどうか（LoadingState表示制御）
  isLoading: boolean // 追加データ読み込み中かどうか（InfiniteScrollLoader表示制御）
  hasMore: boolean // まだ読み込める投稿があるかどうか（無限スクロール制御）
}

const props = defineProps<Props>();


const emit = defineEmits<{
  like: [postId: number]; // いいねボタンクリック時に投稿IDを送信
  delete: [postId: number]; // 削除ボタンクリック時に投稿IDを送信
  mounted: []; // コンポーネントマウント完了時に通知（親でスクロール設定など）
}>();

// === DOM参照 ===
/**
 * 投稿一覧のスクロール要素への参照
 * 親コンポーネントから無限スクロールの制御などに使用される
 */
const scrollRef = ref<HTMLElement | null>(null);

/**
 * いいねボタンクリック時の処理
 * PostItemからのいいねイベントを親コンポーネントに中継
 * @param postId - いいねされた投稿のID
 */
const handlePostLike = (postId: number) => {
  emit('like', postId)
};

/**
 * 削除ボタンクリック時の処理
 * PostItemからの削除イベントを親コンポーネントに中継
 * @param postId - 削除された投稿のID
 */
const handlePostDeleted = (postId: number) => {
  emit('delete', postId)
};

// === ライフサイクル ===
/**
 * コンポーネントマウント時の処理
 * 親コンポーネントにマウント完了を通知
 * 親側で無限スクロールの設定やDOM操作が必要な場合に使用
 */
onMounted(() => {
  emit('mounted')
});

// === 外部アクセス用のAPI ===
/**
 * 親コンポーネントからアクセスできるようにexpose
 * scrollRef: スクロール要素への参照（スクロール位置制御など）
 */
defineExpose({
  scrollRef
});
</script>

<template>
  <!-- 投稿一覧のメインコンテナ: スクロール可能エリア -->
  <div
    ref="scrollRef"
    class="flex-1 overflow-y-auto -webkit-overflow-scrolling-touch min-h-0"
  >
    <!--
      スクロールコンテナの仕様:
      - ref="scrollRef": DOM要素への参照（親コンポーネントからアクセス可能）
      - flex-1: 親要素内で可能な限り拡張
      - overflow-y-auto: 縦方向のスクロールを有効化
      - -webkit-overflow-scrolling-touch: iOSでの慣性スクロールを有効化
      - min-h-0: 最小高を0（Flexboxでのスクロールに必要）
    -->

    <!-- 初回ローディング状態 -->
    <LoadingState v-if="isInitialLoading" />
    <!--
      初回ローディングの表示条件:
      - v-if="isInitialLoading": 初回データ取得中のみ表示
      - スピナーやスケルトンスクリーンを表示
    -->

    <!-- 投稿が0件の状態 -->
    <EmptyState v-else-if="posts.length === 0" />
    <!--
      空状態の表示条件:
      - v-else-if="posts.length === 0": 初回ローディング完了 かつ 投稿が0件
      - 「まだ投稿がありません」などのメッセージを表示
    -->

    <!-- 投稿一覧と無限スクロール -->
    <div v-else>
      <!--
        投稿一覧表示の条件:
        - v-else: 初回ローディング完了 かつ 投稿が1件以上ある
      -->

      <!-- 投稿アイテムのリスト -->
      <PostItem
        v-for="post in posts"
        :key="post.id"
        :post="post"
        :current-user-id="currentUserId"
        :is-liking="likingPosts.has(post.id)"
        @like="handlePostLike"
        @delete="handlePostDeleted"
      />
      <!--
        PostItemコンポーネントの設定:
        - :current-user-id="currentUserId": 現在ユーザーID（削除ボタン表示制御）
        - :is-liking="likingPosts.has(post.id)": この投稿がいいね処理中かチェック
        - @like="handlePostLike": いいねイベントをハンドラーで受け取り
        - @delete="handlePostDeleted": 削除イベントをハンドラーで受け取り
      -->

      <!-- 無限スクロール用ローダー -->
      <InfiniteScrollLoader
        :is-loading="isLoading"
        :has-more="hasMore"
        :posts-count="posts.length"
      />
      <!--
        InfiniteScrollLoaderコンポーネントの設定:
        - :is-loading="isLoading": 追加データ読み込み中かどうか
        - :has-more="hasMore": まだ読み込めるデータがあるか
        - :posts-count="posts.length": 現在表示中の投稿数（空状態判定用）

        表示パターン:
        - ローディング中: スピナー + 「読み込み中...」
        - 全データ読み込み完了: 「すべての投稿を表示しました」
        - まだデータあり: 何も表示しない（スクロールで次ページ取得）
      -->
    </div>
  </div>
</template>