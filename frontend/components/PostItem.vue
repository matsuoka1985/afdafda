<script setup lang="ts">
import type { User, Post } from '~/types';

/**
 * 投稿アイテムコンポーネントのプロパティ
 */
interface Props {
  post: Post // 表示する投稿データ
  currentUserId: number | null // 現在ログインしているユーザーのID（未ログイン時はnull）
  isLiking?: boolean // いいね処理中かどうか（ボタンの無効化に使用）
  showDetailLink?: boolean // 詳細ページへのリンクを表示するか
}


const props = withDefaults(defineProps<Props>(), {
  isLiking: false, // デフォルトはいいね処理中でない
  showDetailLink: true // デフォルトで詳細リンクを表示
});


const emit = defineEmits<{
  like: [postId: number] // いいねボタンクリック時に投稿IDを送信
  delete: [postId: number] // 削除ボタンクリック時に投稿IDを送信
}>();


const handleLike = () => { //いいねボタンクリック時の処理 投稿IDを親コンポーネントに通知
  emit('like', props.post.id);
};


const handleDelete = () => { //削除ボタンクリック時の処理 投稿IDを親コンポーネントに通知
  emit('delete', props.post.id);
};

</script>

<template>
  <!-- 投稿アイテムのメインコンテナ -->
  <article class="border-l border-b border-white p-4 md:p-6">

    <!-- 投稿のヘッダー（ユーザー名とアクションボタン） -->
    <div class="flex items-center space-x-3 mb-2">

      <!-- 投稿者のユーザー名 -->
      <h3 class="text-white font-bold">{{ post.user.name }}</h3>

      <!-- いいねボタン -->
      <button
        @click="handleLike"
        :disabled="isLiking"
        class="flex items-center space-x-1 hover:opacity-80 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <!--
          - :disabled="isLiking": いいね処理中はボタンを無効化
        -->

        <!-- ハートアイコン（いいね状態によって色が変わる） -->
        <img
          src="/images/heart.png"
          alt="いいね"
          :class="[
            'w-4 h-4 md:w-5 md:h-5 transition-all duration-300',
            post.is_liked ? 'filter-red-heart' : 'filter-white-heart'
          ]"
          data-testid="heart-icon"
        />

        <!-- いいね数の表示 -->
        <span class="text-white text-sm">{{ post.likes_count }}</span>

      </button>

      <!-- 削除ボタン（自分の投稿のみ表示） -->
      <button
        v-if="post.is_owner"
        @click="handleDelete"
        class="hover:opacity-80 transition-opacity"
      >
        <!--
          - v-if="post.is_owner": 投稿の所有者の場合のみ表示
        -->
        <img src="/images/cross.png" alt="削除" class="w-4 h-4 md:w-5 md:h-5" />
        <!--
          削除アイコン:
        -->
      </button>

      <!-- 詳細ページへのリンク -->
      <NuxtLink
        v-if="showDetailLink"
        :to="`/posts/${post.id}`"
        class="hover:opacity-80 transition-opacity"
      >
        <!--
          詳細リンクの仕様:
          - v-if="showDetailLink": showDetailLinkがtrueの場合のみ表示
          - :to: 動的ルーティングで投稿詳細ページへのパス生成
        -->
        <img src="/images/detail.png" alt="詳細" class="w-4 h-4 md:w-5 md:h-5" />
        <!--
          詳細アイコン:
        -->
      </NuxtLink>
    </div>

    <!-- 投稿内容のテキスト -->
    <p class="text-white break-words">{{ post.body }}</p>
    <!--
      - break-words: 長い単語を適切に改行（オーバーフロー防止）
    -->
  </article>
</template>