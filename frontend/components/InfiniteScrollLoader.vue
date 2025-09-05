<script setup lang="ts">
// 無限スクロール用ローダーの状態管理Props
interface Props {
  isLoading: boolean // データ読み込み中かどうか
  hasMore: boolean // まだ読み込める次のページが存在するか
  postsCount: number // 現在表示中の投稿数（0件チェック用）
}

defineProps<Props>();
</script>

<template>
  <!-- 無限スクロール状態表示コンテナ -->
  <div>
    <!-- データ読み込み中の表示 -->
    <div v-if="isLoading" class="text-center py-8">
      <!--
        ローディング状態の条件:
        - v-if="isLoading": データフェッチ中の場合のみ表示
      -->
      <LoadingSpinner size="md" />
      <!-- スピナーアニメーション -->
      <p class="text-gray-400 text-sm mt-2">読み込み中...</p>
      <!-- ローディングテキスト -->
    </div>

    <!-- 全データ読み込み完了の表示 -->
    <div v-else-if="!hasMore && postsCount > 0" class="text-center py-8">
      <!--
        完了状態の条件:
        - v-else-if="!hasMore && postsCount > 0":
          次ページなし かつ 投稿が1件以上ある場合のみ表示
        - !hasMore: 次のページが存在しない
        - postsCount > 0: 投稿が0件の場合は「投稿なし」状態なので除外
      -->
      <p class="text-gray-400 text-sm">すべての投稿を表示しました</p>
      <!-- 完了メッセージ -->
    </div>

    <!--
      表示されないケース:
      1. isLoading=false, hasMore=true: まだ次ページあり（何も表示しない）
      2. isLoading=false, hasMore=false, postsCount=0: 投稿0件（親で別途「投稿なし」表示）
    -->
  </div>
</template>