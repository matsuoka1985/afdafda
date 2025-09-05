<script setup lang="ts">
// === コンポーネント型定義 ===
// フローティングボタンの表示制御用Props
interface Props {
  hideWhenTyping?: boolean // 入力中にボタンを隠すかどうか（デフォルト: false）
  commentBody?: string // 監視対象のコメント本文（入力判定用）
}

// Props設定（デフォルト値付き）
const props = withDefaults(defineProps<Props>(), {
  hideWhenTyping: false, // 通常は隠さない
  commentBody: '' // 空文字で初期化
});

const emit = defineEmits<{
  click: [] // 引数なしのクリックイベント
}>();

const handleClick = () => {
  emit('click') // 親コンポーネントのイベントハンドラーを呼び出し
};

// === 表示制御ロジック ===
/**
 * ボタンの表示条件を計算するリアクティブプロパティ
 * - hideWhenTyping が false の場合：常に表示
 * - hideWhenTyping が true の場合：commentBody が空の時のみ表示
 */
const shouldShow = computed(() => {
  if (!props.hideWhenTyping) {return true} // 隠す機能が無効なら常に表示
  return !props.commentBody.trim(); // 入力内容がない場合のみ表示（空白文字を除外）
});
</script>

<template>
  <!-- モバイル専用フローティング投稿ボタン -->
  <button
    v-show="shouldShow"
    @click="handleClick"
    class="fixed bottom-6 right-6 w-14 h-14 bg-purple-gradient hover:opacity-90 text-white rounded-full shadow-lg z-50 flex items-center justify-center transition-all md:hidden"
  >
    <!--
      ボタンスタイル解説:
      - fixed: 画面に固定配置
      - bg-purple-gradient: 紫グラデーション背景
      - shadow-lg: 大きな影で浮遊感演出
      - z-50: 最前面に表示
      - md:hidden: デスクトップサイズでは非表示
      - transition-all: 全プロパティのスムーズな変化
    -->
    <img src="/images/feather.png" alt="投稿" class="w-6 h-6" />
    <!-- featherアイコン（投稿） -->
  </button>
</template>