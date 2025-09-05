<script setup lang="ts">
/**
 * 汎用入力フィールドコンポーネント
 * v-model対応、エラー表示、バリデーション機能付きの再利用可能な入力コンポーネント
 */

//  入力フィールドの設定オプション
interface Props {
  name: string                 // 必須:  input のname属性とid属性に使用
  type?: string               // input のtype属性（text, password, email など）
  placeholder?: string        // プレースホルダーテキスト
  modelValue?: string         // v-model で双方向バインディングする値
  errorMessage?: string       // バリデーションエラー時に表示するメッセージ
  maxlength?: number         // 入力可能最大文字数
  minlength?: number         // 入力必須最小文字数
  disabled?: boolean         // 入力無効化フラグ
}

// Emit型定義 - 親コンポーネントに送信するイベント
interface Emits {
  (e: 'update:modelValue', value: string): void;  // v-model用イベント（入力値変更時）
  (e: 'blur'): void;                             // フィールドからフォーカスが外れた時のイベント
}

// Props設定とデフォルト値定義
const props = withDefaults(defineProps<Props>(), {
  type: 'text',          // デフォルトはテキスト入力
  placeholder: '',       // デフォルトはプレースホルダーなし
  modelValue: '',        // デフォルトは空文字
  errorMessage: '',      // デフォルトはエラーなし
  disabled: false        // デフォルトは入力可能
});

const emit = defineEmits<Emits>();

/**
 * 入力時のハンドラー関数
 * ユーザーが文字を入力する度に呼ばれ、親コンポーネントにv-modelで値を送信
 */
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;  // EventからHTMLInputElementに型変換
  emit('update:modelValue', target.value);          // 入力値を親コンポーネントに送信（v-model）
};

/**
 * ブラー時のハンドラー関数
 * 入力フィールドからフォーカスが外れた時に呼ばれる（バリデーション実行などに使用）
 */
const handleBlur = () => {
  emit('blur');  // ブラーイベントを親コンポーネントに送信
};

/**
 * 動的CSSクラスを生成するComputed
 * エラー状態に応じて境界線の色を変更する
 */
const inputClass = computed(() => {
  // 全入力フィールド共通の基本スタイル（幅100%、パディング、角丸、フォーカス効果など）
  const baseClass = 'w-full px-4 py-3 border rounded-lg focus:outline-none transition-colors duration-200 text-base bg-white';

  // エラーメッセージがある場合は赤色の境界線、ない場合は黒色の境界線
  const borderClass = props.errorMessage
    ? 'border-red-400 focus:border-red-500'  // エラー時: 赤境界線、フォーカス時はより濃い赤
    : 'border-black focus:border-gray-600';   // 正常時: 黒境界線、フォーカス時はグレー

  return `${baseClass} ${borderClass}`;
})
</script>

<template>
  <!--
    汎用入力フィールドのテンプレート
    入力フィールド本体とエラーメッセージ表示エリアをセットで提供
  -->
  <div>
    <!-- メインの入力フィールド -->
    <input
      :id="name"
      :name="name"
      :type="type"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :minlength="minlength"
      :disabled="disabled"
      :value="modelValue"
      @input="handleInput"
      @blur="handleBlur"
      :class="inputClass"
    />

    <!-- エラーメッセージ表示エリア（エラーがある場合のみ表示） -->
    <div v-if="errorMessage" class="text-red-500 text-sm mt-2 px-4">
      {{ errorMessage }}  <!-- バリデーションエラーメッセージを表示 -->
    </div>
  </div>
</template>
