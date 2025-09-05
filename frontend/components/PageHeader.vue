<script setup lang="ts">
interface Props {
  title: string
}

defineProps<Props>();

// 認証機能
const { handleLogout } = useAuth();

// ヘッダー要素のref
const headerRef = ref<HTMLElement | null>(null);

// 親コンポーネントからアクセスできるようにexpose
defineExpose({
  offsetHeight: computed(() =>{
    return headerRef.value?.offsetHeight || 0;
  }
)
});
</script>

<template>
  <header ref="headerRef" class="bg-custom-dark border-b border-l border-white p-4 md:p-6 flex-shrink-0">
    <!-- モバイル用ロゴ -->
    <div class="flex justify-center mb-2 md:hidden">
      <NuxtLink to="/">
        <img src="/images/logo.png" alt="SHARE" class="w-20 h-auto object-contain hover:opacity-80 transition-opacity cursor-pointer" />
      </NuxtLink>
    </div>
    <div class="flex justify-between items-center">
      <h1 class="text-white text-xl font-bold">{{ title }}</h1>
      <!-- モバイル用ログアウトボタン -->
      <button @click="handleLogout" class="hover:opacity-80 transition-opacity md:hidden">
        <img src="/images/logout.png" alt="ログアウト" class="w-6 h-6" />
      </button>
    </div>
  </header>
</template>