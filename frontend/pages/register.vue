<script setup lang="ts">
// ゲスト専用ページ - ログイン済みの場合はリダイレクト
definePageMeta({
  middleware: 'guest-only'
});

// 登録成功時のハンドラー
const handleRegistrationSuccess = async () => {
  // 登録成功 - ホーム画面にリダイレクト
  await navigateTo('/');
};

// ページタイトル設定
useHead({
  title: '新規登録 - SHARE'
});
</script>

<template>
  <AuthLayout>
    <!-- 登録フォーム -->
    <RegisterForm @success="handleRegistrationSuccess" />
  </AuthLayout>
</template>
