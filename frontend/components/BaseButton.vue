<script setup lang="ts">
/**
 * 汎用ボタンコンポーネント
 * ローディング状態、無効化、サイズ、バリアントを設定可能な再利用可能ボタン
 */

interface Props {
  type?: 'button' | 'submit' | 'reset'  // HTMLボタンのtype属性（デフォルト: button）
  loading?: boolean                       // ローディング状態（true時はクリック無効化）
  disabled?: boolean                      // 無効状態（true時はクリック無効化）
  loadingText?: string                    // ローディング時に表示するテキスト
  variant?: 'primary' | 'secondary'      // ボタンの見た目バリアント（primary: 紫グラデーション, secondary: グレー）
  size?: 'sm' | 'md' | 'lg'             // ボタンのサイズ（小、中、大）
}

interface Emits {
  (e: 'click', event: MouseEvent): void  // クリックイベント（MouseEventオブジェクトも一緒に送信）。emitの戻り値は常にvoid。
}

// Props設定とデフォルト値定義
const props = withDefaults(defineProps<Props>(), {
  type: 'button',           // デフォルトはbuttonタイプ
  loading: false,           // デフォルトはローディングなし
  disabled: false,          // デフォルトは有効状態
  loadingText: '処理中...',  // デフォルトのローディングテキスト
  variant: 'primary',       // デフォルトはprimaryスタイル
  size: 'md'               // デフォルトは中サイズ
})

const emit = defineEmits<Emits>();

/**
 * クリックハンドラー関数
 * ローディング中または無効化されている場合はクリックイベントを発火しない
 */
const handleClick = (event: MouseEvent) => {
  // ローディング中でも無効化されてもいない場合のみクリックイベントを親に送信
  if (!props.loading && !props.disabled) {
    emit('click', event);
  }
}

/**
 * 動的なCSSクラスを生成するComputed
 * props の値に応じて適切なTailwindCSSクラスを組み合わせる
 */
const buttonClass = computed(() => {
  // 全ボタン共通の基本スタイル
  const baseClass = 'font-medium rounded-full transition-all duration-200 focus:outline-none shadow-lg transform border border-black';

  // サイズ別のパディングとテキストサイズ設定
  const sizeClasses = {
    sm: 'py-2 px-8 text-sm',     // 小: 縦8px 横32px 文字小
    md: 'py-3 px-12 text-base',  // 中: 縦12px 横48px 文字中
    lg: 'py-4 px-16 text-lg'     // 大: 縦16px 横64px 文字大
  };

  // バリアント別の色とホバー効果設定
  const variantClasses = {
    // primary: 紫グラデーション背景、白文字、ホバー時透明度変更、無効時グレー
    primary: 'bg-purple-gradient text-white hover:opacity-90 disabled:bg-gray-600 disabled:opacity-50 disabled:hover:opacity-50',
    // secondary: 薄いグレー背景、濃いグレー文字、ホバー時背景変更、無効時透明度変更
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:bg-gray-300 disabled:opacity-50'
  };

  // 現在のpropsに基づいて適切なクラスを取得
  const sizeClass = sizeClasses[props.size];
  const variantClass = variantClasses[props.variant];

  // 全てのクラスを結合して返す
  return `${baseClass} ${sizeClass} ${variantClass}`;
});
</script>

<template>
  <!--
    汎用ボタンのテンプレート
    動的なクラス、無効化状態、クリックハンドラーを設定
  -->
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="buttonClass"
    @click="handleClick"
  >
    <!-- ローディング中でない場合: スロットコンテンツ（親から渡されたボタンテキスト等）を表示 -->
    <span v-if="!loading">
      <slot />
    </span>

    <!-- ローディング中の場合: loadingTextを表示 -->
    <span v-else>
      {{ loadingText }}
    </span>
  </button>
</template>