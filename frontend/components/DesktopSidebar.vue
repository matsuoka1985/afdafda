<script setup lang="ts">
import type { Post } from '~/types';

interface Props {
  postBody: string // 投稿フォームの本文（親コンポーネントと状態を共有）
}

const props = defineProps<Props>();

// 親コンポーネントに送信するイベント
const emit = defineEmits<{
  newPost: [post: Post] // 新しい投稿が作成された時のイベント
  'update:postBody': [body: string] // v-model: 投稿本文が更新された時のイベント(モバイル版と入力内容を共有するため)
}>();

// 認証関連のコンポーザブルからログアウト機能を取得
const { handleLogout } = useAuth();

// === イベントハンドラー ===
// PostFormコンポーネントから新規投稿イベントを受け取り、親に転送
const handleNewPost = (post: Post) => {
  emit('newPost', post); // 親コンポーネントに投稿データを通知
}

// PostFormコンポーネントから投稿本文更新イベントを受け取り、親に転送
const handleUpdateBody = (body: string) => {
  emit('update:postBody', body); // v-model: 親コンポーネントに更新された本文を通知
}

</script>

<template>
  <!-- デスクトップ用左サイドバー: 固定幅320px、縦方向レイアウト -->
  <aside class="w-80 bg-custom-dark p-6 flex flex-col flex-shrink-0">

    <!-- アプリケーションロゴエリア -->
    <NuxtLink to="/">
      <!-- ロゴ画像（ホームページへのリンク） -->
      <img
        src="/images/logo.png"
        alt="SHARE"
        class="w-32 h-auto mb-8 object-contain hover:opacity-80 transition-opacity cursor-pointer"
      />
    </NuxtLink>

    <!-- メインナビゲーションメニュー -->
    <nav class="space-y-4 mb-8">
      <!-- ホームページへのリンク -->
      <NuxtLink to="/" class="flex items-center space-x-3 text-white text-lg hover:text-gray-300">
        <img src="/images/home.png" alt="ホーム" class="w-6 h-6" />
        <span>ホーム</span>
      </NuxtLink>

      <!-- ログアウトボタン -->
      <button
        @click="handleLogout"
        class="flex items-center space-x-3 text-white text-lg hover:text-gray-300"
      >
        <img src="/images/logout.png" alt="ログアウト" class="w-6 h-6" />
        <span>ログアウト</span>
      </button>
    </nav>

    <!-- 投稿作成フォームエリア -->

    <PostForm
      :postBody="props.postBody"
      @newPost="handleNewPost"
      @updateBody="handleUpdateBody"
    />
    <!--
      PostFormコンポーネントへのデータバインディング:
      - :postBody: 親から受け取った投稿本文を子に渡す
      - @newPost: 新規投稿作成イベントをハンドリング
      - @updateBody: 投稿本文更新イベントをハンドリング
    -->
  </aside>
</template>