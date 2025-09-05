
<template>
  <header class="px-6 py-4 bg-custom-dark">
    <div class="max-w-7xl mx-auto">
      <!-- デスクトップレイアウト -->
      <div class="hidden md:flex items-center justify-between">
        <!-- ロゴ -->
        <div class="flex items-center">
          <img src="/images/logo.png" alt="SHARE" class="h-10 w-auto" />
        </div>

        <!-- ナビゲーションメニュー -->
        <nav class="flex items-center space-x-8">
          <NuxtLink to="/register" class="text-white hover:text-gray-300 transition-colors duration-200 text-lg font-normal">
            新規登録
          </NuxtLink>
          <NuxtLink to="/login" class="text-white hover:text-gray-300 transition-colors duration-200 text-lg font-normal">
            ログイン
          </NuxtLink>
        </nav>
      </div>

      <!-- モバイルレイアウト -->
      <div class="md:hidden">
        <!-- ロゴ中央配置 -->
        <div class="flex justify-center mb-4">
          <img src="/images/logo.png" alt="SHARE" class="h-8 w-auto" />
        </div>

        <!-- ナビゲーションボタン -->
        <nav class="flex justify-between space-x-4">
          <NuxtLink to="/register" class="flex-1 text-center text-white hover:text-gray-300 transition-colors duration-200 text-lg font-normal py-2">
            新規登録
          </NuxtLink>
          <NuxtLink to="/login" class="flex-1 text-center text-white hover:text-gray-300 transition-colors duration-200 text-lg font-normal py-2">
            ログイン
          </NuxtLink>
        </nav>
      </div>
    </div>
  </header>
</template>
