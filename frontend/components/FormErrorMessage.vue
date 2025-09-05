<script setup lang="ts">
// エラーメッセージ表示用のProps
interface Props {
  message?: string // 表示するエラーメッセージ（任意）
  centered?: boolean // テキストを中央揃えにするか（デフォルト: true）
}

// Props設定（デフォルト値付き）
const props = withDefaults(defineProps<Props>(), {
  message: '', // 空文字で初期化（エラーなし状態）
  centered: true // デフォルトは中央揃え
});
</script>

<template>
  <!-- エラーメッセージ表示エリア -->
  <div
    v-if="message"
    class="text-red-500 text-sm px-4"
    :class="{ 'text-center': centered }"
  >
    <!--
      条件付き表示・スタイル解説:
      - v-if="message": エラーメッセージがある場合のみ表示
      - :class="{ 'text-center': centered }": centeredがtrueの場合のみ中央揃え適用
    -->
    {{ message }}
    <!-- 親コンポーネントから渡されたエラーメッセージを表示 -->
  </div>
</template>