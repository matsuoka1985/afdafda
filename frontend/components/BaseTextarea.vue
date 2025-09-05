<script setup lang="ts">
import { CHARACTER_LIMITS } from '~/constants/validation';

/**
 * 汎用テキストエリアコンポーネントのプロパティ定義
 * 文字数制限、バリデーション、視覚的フィードバック機能を持つ
 */
interface Props {
  modelValue?: string          // v-modelで双方向バインディングされる値
  placeholder?: string         // プレースホルダーテキスト
  disabled?: boolean          // 無効化フラグ
  height?: string             // 高さ（Tailwindクラス: h-16, h-32など）
  maxLength?: number          // 最大文字数制限
  showCharacterCount?: boolean // 文字数カウンター表示フラグ
  showLabel?: boolean         // ラベル表示フラグ
  label?: string              // ラベルテキスト
  error?: string              // 外部から渡されるエラーメッセージ
}

/**
 * プロパティのデフォルト値設定（定数を使用）
 * 汎用的な設定値を提供し、各使用箇所で必要に応じてオーバーライド
 */
const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '何か入力してください...',
  disabled: false,
  height: 'h-32',              // 投稿用のデフォルト高さ
  maxLength: CHARACTER_LIMITS.POST_CONTENT, // アプリ全体の文字数制限
  showCharacterCount: true,    // デフォルトで文字数表示
  showLabel: false,
  label: '',
  error: undefined
});

/**
 * 親コンポーネントに発火するイベントの型定義
 * @event update:modelValue - v-model更新時（双方向バインディング）
 * @event blur - フォーカス離脱時
 * @event focus - フォーカス取得時
 * @event overLimit - 文字数制限超過状態変更時
 */
const emit = defineEmits<{
  'update:modelValue': [value: string];
  'blur': []; //引数を受け取らない。
  'focus': []; //引数を受け取らない。
  'overLimit': [isOver: boolean];
}>();

/**
 * 内部状態管理用のリアクティブ参照
 * propsのmodelValueと同期される実際の入力値
 */
const textRef = ref(props.modelValue || '');

// 文字数カウント機能の初期化: useCharacterCount から必要な機能を取得（props.maxLength を渡す）
const {
  currentLength,    // 現在の文字数
  remainingChars,   // 残り文字数
  isNearLimit,      // 警告表示する文字数に近いか
  isOverLimit,      // 制限を超過しているか
  gaugeColor,       // ドーナツゲージの色
  strokeDasharray,  // SVGドーナツゲージの描画用データ
  config: charConfig // 文字数制限設定
} = useCharacterCount(textRef, props.maxLength);

/**
 * 親コンポーネントからのmodelValue変更を内部状態に同期
 * v-modelの親→子方向の更新を処理
 */
watch(() => {
  return props.modelValue;
}, (newValue) => {
  textRef.value = newValue || '';
});

/**
 * 内部状態の変更を親コンポーネントに通知
 * v-modelの子→親方向の更新を処理（双方向バインディング）
 */
watch(textRef, (newValue) => {
  emit('update:modelValue', newValue);
});

/**
 * 文字数超過状態の変更を親に通知
 * 親コンポーネントでボタンの無効化等に使用される
 * immediate: trueでマウントによるレンダリング時の状態も通知
 */
watch(isOverLimit, (isOver) => {
  emit('overLimit', isOver);
}, { immediate: true });

/**
 * フォーカス取得イベントハンドラー
 * 親コンポーネントでUI状態の制御に使用される可能性がある
 */
const handleFocus = () => {
  emit('focus');
};

/**
 * フォーカス離脱イベントハンドラー
 * バリデーション実行やUI状態リセットに使用される可能性がある
 */
const handleBlur = () => {
  emit('blur');
};

/**
 * エラー状態の判定
 * 外部エラー（props.error）または文字数超過でエラーとみなす
 * UIのスタイル制御に使用
 */
const hasError = computed(() => {
  return !!(props.error) || isOverLimit.value;
});

/**
 * 表示するエラーメッセージの決定
 * 優先順位: 外部エラー > 文字数超過エラー > エラーなし
 */
const errorMessage = computed(() => {
  if (props.error) {
    return props.error;
  }
  if (isOverLimit.value) {
    return `${charConfig.value.maxLength}文字以内で入力してください`;
  }
  return '';
});
</script>

<template>
  <div class="space-y-2">
    <!-- ラベル -->
    <label v-if="showLabel && label" class="block text-white text-sm font-medium">
      {{ label }}
    </label>

    <!-- テキストエリア -->
    <div
      class="border-2 rounded-lg transition-colors"
      :class="{
        'border-white focus-within:border-purple-500': !hasError,
        'border-red-500 focus-within:border-red-500': hasError
      }"
    >
      <textarea
        v-model="textRef"
        :disabled="disabled"
        :placeholder="placeholder"
        :class="[
          'w-full bg-transparent text-white placeholder-gray-400 resize-none outline-none p-4 border-none focus:outline-none focus:ring-0',
          height
        ]"
        @focus="handleFocus"
        @blur="handleBlur"
      ></textarea>
    </div>

    <!-- 文字数ゲージ -->
    <div v-if="showCharacterCount && currentLength > 0" class="flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <!-- ドーナツゲージ -->
        <div class="relative">
          <svg :width="charConfig.gauge.size" :height="charConfig.gauge.size" class="transform -rotate-90">
            <!-- 背景の円 -->
            <circle
              :cx="charConfig.gauge.size / 2"
              :cy="charConfig.gauge.size / 2"
              :r="charConfig.gauge.radius"
              stroke="#374151"
              :stroke-width="charConfig.gauge.strokeWidth"
              fill="none"
            />
            <!-- プログレス円 -->
            <circle
              :cx="charConfig.gauge.size / 2"
              :cy="charConfig.gauge.size / 2"
              :r="charConfig.gauge.radius"
              :stroke="gaugeColor"
              :stroke-width="charConfig.gauge.strokeWidth"
              fill="none"
              stroke-linecap="round"
              :stroke-dasharray="strokeDasharray"
              :stroke-dashoffset="0"
              class="transition-all duration-300"
            />
          </svg>
        </div>

        <!-- 文字数表示 -->
        <span
          v-if="isNearLimit || isOverLimit"
          :class="{
            'text-yellow-500': isNearLimit && !isOverLimit,
            'text-red-500': isOverLimit
          }"
          class="text-sm font-medium"
        >
          {{ remainingChars }}
        </span>
      </div>
    </div>

    <!-- エラーメッセージ -->
    <div class="h-6">
      <p v-if="errorMessage" class="text-red-500 text-sm">{{ errorMessage }}</p>
    </div>
  </div>
</template>