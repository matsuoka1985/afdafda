<template>
  <div class="min-h-screen bg-custom-dark">
    <!-- ヘッダー -->
    <AuthHeader />

    <!-- メインコンテンツ -->
    <main class="flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-md">
        <!-- フォームコンテンツ -->
        <slot />
      </div>
    </main>
  </div>
</template>