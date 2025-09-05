<script setup lang="ts">
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/yup';
import * as yup from 'yup';
import { CHARACTER_LIMITS, VALIDATION_MESSAGES } from '~/constants/validation';
import type { PostResponse } from '~/types';


interface Props {
  postBody: string // 投稿内容（デスクトップ版とモバイル版で共有される状態）
}

const props = defineProps<Props>();


const emit = defineEmits<{
  newPost: [post: any] // 新しい投稿が作成された時に投稿データを送信
  updateBody: [body: string] // 投稿内容が変更された時に親の状態を更新
}>();

const isPosting = ref(false); // 投稿処理中かどうか（送信ボタンの無効化などに使用）
const isOverLimit = ref(false); // 文字数制限を超過しているかどうか（BaseTextareaから受け取る）

/**
 * Yupを使用したバリデーションスキーマ定義
 * 投稿内容の最大文字数制限を設定
 */
const validationSchema = toTypedSchema(
  yup.object({
    body: yup.string().max(CHARACTER_LIMITS.POST_CONTENT, VALIDATION_MESSAGES.POST_CONTENT.MAX_LENGTH)
  })
);

// === VeeValidateフォーム設定 ===
/**
 * フォームのバリデーション、エラー管理、送信処理を一元管理
 */
const { errors, defineField, handleSubmit, resetForm, setFieldError } = useForm({
  validationSchema, // 上記で定義したバリデーションスキーマを適用
  validateOnMount: false // マウント時はバリデーションを実行しない
});

// フォームフィールドの定義（refの代替としてVeeValidateで管理）
const [body, bodyAttrs] = defineField('body');

// === プロップスとフォームの同期処理 ===
/**
 * 親コンポーネントから渡されるpostBodyの変更を監視
 * デスクトップ版とモバイル版で投稿内容を同期するため
 */
watch(() => { return props.postBody}, (newValue) => {
  body.value = newValue; // 親からの変更をフォームフィールドに反映
}, { immediate: true }); // 初期値も即座に適用

/**
 * フォームフィールドの変更を親コンポーネントに通知
 * デスクトップ版への同期のため
 */
watch(body, (newValue) => {
  emit('updateBody', newValue || ''); // nullやundefinedの場合は空文字を送信
});

/**
 * 入力時のリアルタイムエラークリア機能
 * ユーザーが文字数制限内に修正した瞬間にエラーメッセージを消す
 */
watch(body, () => {
  if (errors.value.body && body.value && body.value.length <= CHARACTER_LIMITS.POST_CONTENT) {
    setFieldError('body', undefined); // エラーメッセージをクリア
  }
});

/**
 * BaseTextareaから文字数制限超過状態を受け取るハンドラー
 * @param isOver - 文字数制限を超過しているかどうか
 */
const handleOverLimit = (isOver: boolean) => {
  isOverLimit.value = isOver; // 超過状態を更新（送信ボタンの無効化に使用）
};

// === 投稿作成処理 ===
/**
 * 投稿作成のメイン処理
 * VeeValidateのhandleSubmitでバリデーション後に実行される
 */
const createPost = handleSubmit(async () => {
  // === 事前バリデーション ===
  // 空文字・空白のみの入力チェック
  if (!body.value || body.value.trim() === '') {
    setFieldError('body', VALIDATION_MESSAGES.POST_CONTENT.REQUIRED);
    return;
  }

  // 文字数制限チェック（Yupでも実行されるが念のため）
  if (body.value.length > CHARACTER_LIMITS.POST_CONTENT) {
    setFieldError('body', VALIDATION_MESSAGES.POST_CONTENT.MAX_LENGTH);
    return;
  }

  // バリデーション成功時はエラーメッセージをクリア
  setFieldError('body', undefined);

  // === API通信処理 ===
  isPosting.value = true; // 投稿中状態に変更（UIの無効化）
  try {
    const config = useRuntimeConfig();
    const apiBaseUrl = config.public.apiBaseUrl;
    // 投稿作成APIを呼び出し
    const response = await $fetch<PostResponse>(`${apiBaseUrl}/api/posts`, {
      method: 'POST',
      credentials: 'include',
      body: { body: body.value.trim() }
    });

    // === レスポンス処理 ===
    // レスポンスの構造が正しいかチェック
    if (response && typeof response === 'object' && 'success' in response) {
      if (response.success && response.post) {
        // === 投稿成功時の処理 ===
        emit('newPost', response.post); // 親コンポーネントに新しい投稿を通知
        emit('updateBody', ''); // 共有している投稿内容をクリア
        resetForm(); // フォームの状態をリセット

        // 成功トーストを表示
        const { postCreated } = useToast();
        postCreated(response.post.id);
      } else {
        // === API がエラーレスポンスを返した場合 ===
        const { error: showErrorToast } = useToast();
        showErrorToast(response.error || '投稿の作成に失敗しました');
      }
    } else {
      // === レスポンス構造が予期しない形の場合 ===
      console.error('予期しないレスポンス構造:', response);
      const { error: showErrorToast } = useToast();
      showErrorToast('投稿の作成に失敗しました');
    }
  } catch (error: any) {
    // === 認証エラー時のリダイレクト処理 ===
    if (error.status === 401) {
      console.log('認証エラーによりログインページにリダイレクト');
      await navigateTo('/login');
      return;
    }
    
    // === ネットワークエラーやその他の例外処理 ===
    console.error('投稿作成エラー:', error);
    const { error: showErrorToast } = useToast();
    showErrorToast('投稿の作成に失敗しました');
  } finally {
    // === 必ず実行される後処理 ===
    isPosting.value = false; // 投稿中状態を解除（UIの有効化）
  }
});
</script>

<template>
  <!-- 投稿フォームのメインコンテナ -->
  <div class="flex-1 flex flex-col">


    <!-- フォームタイトル -->
    <h2 class="text-white text-lg mb-4">シェア</h2>


    <!-- 投稿作成フォーム -->
    <form @submit.prevent="createPost" class="flex-1 flex flex-col">
      <!--
        フォーム送信の処理:
        - createPost: VeeValidateのhandleSubmitでラップされた投稿処理関数
        - flex-1 flex-col: 残りスペースを使用し、縦方向レイアウト
      -->

      <!-- 投稿内容入力エリア -->
      <BaseTextarea
        v-model="body"
        :disabled="isPosting"
        placeholder="今何してる？"
        height="h-32"
        :error="errors.body"
        class="mb-4"
        @over-limit="handleOverLimit"
      />
      <!--
        BaseTextareaの設定:
        - v-model="body": VeeValidateのdefineFieldで管理されるリアクティブ値とバインド
        - :disabled="isPosting": 投稿処理中は入力を無効化
        - :error="errors.body": VeeValidateのバリデーションエラーメッセージを表示
        - @over-limit="handleOverLimit": 文字数制限超過状態をhandleOverLimit関数で受け取る
      -->

      <!-- フォームフッター（送信ボタンエリア） -->
      <div class="flex justify-end">

        <!-- 投稿送信ボタン -->
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
          - :disabled="isPosting || isOverLimit":
            投稿処理中 または 文字数制限超過時にボタンを無効化
          - :loading="isPosting": 投稿処理中はローディング状態を表示
          - loading-text: ローディング中に表示するテキスト
          - size="md": ボタンサイズ（中サイズ）
          - スロット: "シェアする" ボタンラベル
        -->
      </div>
    </form>
  </div>
</template>