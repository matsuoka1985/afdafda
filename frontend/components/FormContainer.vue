<script setup lang="ts">
// フォームコンテナの設定用Props
interface Props {
  title: string // フォームのタイトル（ヘッダーに表示）
}

defineProps<Props>();

const emit = defineEmits<{
  submit: [event: Event] // フォームsubmitイベントをそのまま転送
}>();

// フォーム送信時の処理（親コンポーネントにイベントを転送）
const handleSubmit = (event: Event) => {
  emit('submit', event) // ネイティブのsubmitイベントを親に渡す
};
</script>

<template>
  <!-- フォーム用カードコンテナ -->
  <div class="bg-white rounded-lg shadow-lg p-8">
    <!--
      - shadow-lg: 大きな影でカード感を演出
    -->

    <!-- フォームタイトル -->
    <h2 class="text-center text-xl font-bold text-gray-900 mb-8">
      {{ title }}
    </h2>

    <!-- メインフォーム -->
    <form @submit="handleSubmit" class="space-y-5">


      <!-- フォーム入力フィールド挿入エリア -->
      <slot />
      <!--
        デフォルトスロット:
        親コンポーネントから入力フィールドを挿入
        例: <input>, <textarea>, <select> など
      -->

      <!-- ボタンエリア -->
      <div class="pt-4 flex justify-center">

        <slot name="button" />
        <!--
          名前付きスロット「button」:
          親コンポーネントから送信ボタンを挿入
          例: <template #button><button>ログイン</button></template>
        -->
      </div>
    </form>
  </div>
</template>