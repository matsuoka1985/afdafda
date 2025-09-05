<script setup lang="ts">
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/yup';
import * as yup from 'yup';
import { CHARACTER_LIMITS, VALIDATION_MESSAGES } from '~/constants/validation'; // バリデーション定数

// === コンポーネント型定義 ===
// 親コンポーネントから受け取るProps
interface Props {
  show: boolean; // モーダル表示状態
  postBody: string; // デスクトップ版と同期される投稿本文
  isPosting?: boolean; // 投稿処理中フラグ
}

// 親コンポーネントに送信するイベント
interface Emits {
  (e: 'close'): void // モーダルを閉じる
  (e: 'update:postBody', value: string): void // 投稿本文の更新（デスクトップ版との同期）
  (e: 'submit'): void // 投稿実行
}

// Props設定（デフォルト値付き）
const props = withDefaults(defineProps<Props>(), {
  isPosting: false // デフォルトは投稿中でない状態
});

const emit = defineEmits<Emits>();

// 文字数超過の状態を管理（BaseTextareaから受け取る）
const isOverLimit = ref(false);

// Yupを使用したバリデーションスキーマ定義（定数を使用）
const validationSchema = toTypedSchema(
  yup.object({
    mobileBody: yup.string().max(CHARACTER_LIMITS.POST_CONTENT, VALIDATION_MESSAGES.POST_CONTENT.MAX_LENGTH)
  })
);

// VeeValidateのフォーム管理機能を初期化
const { errors, defineField, handleSubmit, resetForm, setFieldError } = useForm({
  validationSchema, // 上記のバリデーションスキーマを適用
  validateOnMount: false // マウント時はバリデーションしない
});

// フォームフィールドを定義（refの代わり）
const [mobileBody, mobileBodyAttrs] = defineField('mobileBody');



// === デスクトップ版との同期機能 ===
// 親から渡されるpostBodyの変更を監視してフォームに反映
watch(() =>{ return props.postBody}, (newValue) => {
  mobileBody.value = newValue // デスクトップでの入力をモバイル版に同期
}, { immediate: true }); // 初期値も即反映

// モバイル版フォームの変更を親に通知（デスクトップ版に同期）
watch(mobileBody, (newValue) => {
  emit('update:postBody', newValue || ''); // nullやundefinedが渡らないよう空文字をフォールバック
});

/**
 * モーダルを閉じる処理
 * 入力内容がある場合は確認ダイアログを表示して意図しない消失を防ぐ
 */
const closeModal = () => {
  // 入力内容がある場合は確認ダイアログを表示
  if (props.postBody && props.postBody.trim()) {
    const shouldDiscard = confirm('入力内容を破棄しますか？');
    if (!shouldDiscard) {
      return; // キャンセル時は何もしない（モーダル継続）
    }
  }

  // 入力内容が空か、破棄を選択した場合
  resetForm(); // VeeValidateのフォーム状態をリセット
  emit('close'); // 親コンポーネントにモーダル終了を通知
};

/**
 * 投稿処理（バリデーション付き）
 * VeeValidateのhandleSubmitでバリデーション後に実行
 */
const submitPost = handleSubmit(async () => {
  // 必須入力チェック（空文字・空白のみを除外）
  if (!props.postBody || props.postBody.trim() === '') {
    setFieldError('mobileBody', VALIDATION_MESSAGES.POST_CONTENT.REQUIRED); // エラーメッセージ設定
    return;
  }

  // 文字数制限チェック（定数を使用）
  if (props.postBody.length > CHARACTER_LIMITS.POST_CONTENT) {
    return; // バリデーションエラーは既にYupスキーマで処理済み
  }

  // バリデーション通過時、親コンポーネントに投稿実行を委譲
  emit('submit');
})
</script>

<template>
  <!-- モバイル専用投稿モーダル（レスポンシブ対応） -->
  <div v-if="show" class="fixed inset-0 z-50 md:hidden">
    <!--
      モーダルコンテナの構造:
      - v-if="show": showプロップがtrueの時のみ表示
      - fixed inset-0: 画面全体をカバーする固定位置
      - z-50: 他の要素より前面に表示（高いz-index）
      - md:hidden: デスクトップサイズ（768px以上）では非表示
    -->

    <!-- モーダル背景オーバーレイ（クリックで閉じる） -->
    <div class="absolute inset-0 bg-black/60" @click="closeModal"></div>
    <!--
      背景オーバーレイの仕様:
      - absolute inset-0: 親要素いっぱいに広がる
      - @click="closeModal": 背景クリック時にモーダルを閉じる
    -->

    <!-- モーダルダイアログ本体 -->
    <div class="absolute inset-x-4 top-1/2 -translate-y-1/2 bg-custom-dark rounded-lg p-6">
      <!--
        ダイアログボックスの配置とスタイル:
        - inset-x-4: 左右に16px（1rem）のマージン
        - top-1/2 -translate-y-1/2: 縦方向センタリング
        - bg-custom-dark: カスタムダークテーマ背景色
      -->

      <!-- モーダルヘッダー（タイトルと閉じるボタン） -->
      <div class="flex justify-between items-center mb-4">


        <!-- モーダルタイトル -->
        <h2 class="text-white text-lg font-medium">シェア</h2>


        <!-- 閉じるボタン（×アイコン） -->
        <button @click="closeModal" class="text-gray-400 hover:text-white">
          <!--
            閉じるボタンの仕様:
            - @click="closeModal": クリック時にモーダルを閉じる処理

          -->
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          <!--
            ×アイコン（SVG）:
            - stroke="currentColor": 親要素のtext-colorを継承
            - パス: 対角線2本でX印を描画
          -->
        </button>
      </div>

      <!-- 投稿フォーム -->
      <form @submit.prevent="submitPost">
        <!--
          フォーム送信の処理:
          - @submit.prevent="submitPost": フォーム送信をキャッチし、デフォルト動作を無効化
          - submitPost: VeeValidateのhandleSubmitでラップされた送信処理関数
        -->

        <!-- テキストエリア（投稿内容入力） -->
        <BaseTextarea
          v-model="mobileBody"
          :disabled="isPosting"
          placeholder="今何してる？"
          height="h-32"
          :error="errors.mobileBody"
          @over-limit="isOverLimit = $event"
          class="mb-4"
        />
        <!--
          BaseTextareaの設定:
          - v-model="mobileBody": VeeValidateのdefineFieldで定義されたリアクティブ値とバインド
          - :disabled="isPosting": 投稿中は入力無効化
          - :error="errors.mobileBody": VeeValidateのバリデーションエラーメッセージを表示
          - @over-limit: BaseTextareaから文字数超過状態を受信
        -->

        <!-- フォームフッター（投稿ボタン） -->
        <div class="flex justify-end">

          <!-- 投稿実行ボタン -->
          <BaseButton
            type="submit"
            :disabled="isPosting || isOverLimit"
            :loading="isPosting"
            loading-text="投稿中..."
            size="md"
          >
            シェアする
          </BaseButton>
          <!--
            BaseButtonの設定:
            - type="submit": フォーム送信ボタンとして動作
            - :disabled="isPosting || isOverLimit": 投稿中 または 文字数超過時は無効化
            - :loading="isPosting": 投稿中はローディング状態を表示
            - loading-text: ローディング中に表示するテキスト
            - スロット: "シェアする" ボタンラベル
          -->
        </div>
      </form>
    </div>
  </div>
</template>