<script setup lang="ts">

// === ページ設定 ===
// ゲスト専用ミドルウェア - 認証済みユーザーは自動でホームにリダイレクト
definePageMeta({
  middleware: 'guest-only'
});

// === イベントハンドラー ===
// ログイン成功時の処理：ホーム画面への遷移
const handleLoginSuccess = async () => {
  // navigateTo: Nuxt標準のページ遷移関数（Vue Routerの push() に相当）
  await navigateTo('/');
};

// === SEO・メタデータ設定 ===
useHead({
  title: 'ログイン - SHARE'
});

</script>

<template>
  <!-- 認証画面専用のレイアウトコンポーネント -->
  <AuthLayout>
    <!--
      LoginForm コンポーネント
      @success: カスタムイベントリスナー（ログイン成功時に発火）
      子コンポーネント → 親コンポーネントへの通信パターン
    -->
    <LoginForm @success="handleLoginSuccess" />
  </AuthLayout>
</template>