<script setup lang="ts">
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/yup';
import * as yup from 'yup';
import { CHARACTER_LIMITS, VALIDATION_MESSAGES } from '~/constants/validation';
import type { Comment } from '~/types';

/**
 * コメント作成API レスポンスの型定義
 * @interface CommentResponse
 * @property {boolean} success - API呼び出しの成功フラグ
 * @property {Comment} [comment] - 作成されたコメントデータ（成功時のみ）
 * @property {string} [error] - エラーメッセージ（失敗時のみ）
 */
interface CommentResponse {
  success: boolean
  comment?: Comment
  error?: string
}

/**
 * コンポーネントのプロパティ型定義
 * @interface Props
 * @property {number} postId - コメント対象の投稿ID
 * @property {boolean} [disabled] - フォームの無効化フラグ
 * @property {string} [modelValue] - v-modelで双方向バインディングされるコメント内容
 */
interface Props {
  postId: number
  disabled?: boolean
  modelValue?: string
}

// プロパティのデフォルト値を設定
const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  modelValue: ''
});

/**
 * 親コンポーネントに発火するイベントの型定義
 * @event commentCreated - コメント作成成功時に発火、作成されたコメントを渡す
 * @event update:modelValue - v-model更新時に発火、新しい値を渡す
 */
const emit = defineEmits<{
  commentCreated: [comment: Comment]
  'update:modelValue': [value: string]
}>();

// コメント作成中の状態管理（送信ボタンの無効化などに使用）
const isCommenting = ref(false);
// 文字数制限超過フラグ（PostTextareaから受け取る）
const isOverLimit = ref(false);

/**
 * BaseTextarea からの over-limit イベントを受け取り、
 * ローカルの isOverLimit を更新する明示的ハンドラ
 */
const onOverLimit = (over: boolean): void => {
  isOverLimit.value = over;
};

/**
 * yupを使用したバリデーションスキーマの定義（定数を使用）
 * - commentBody: 最大文字数の文字列バリデーション
 * - toTypedSchemaでvee-validate形式に変換
 */
const validationSchema = toTypedSchema(
  yup.object({
    commentBody: yup.string().max(CHARACTER_LIMITS.COMMENT_CONTENT, VALIDATION_MESSAGES.COMMENT_CONTENT.MAX_LENGTH)
  })
);

/**
 * vee-validateのフォーム設定
 * @property {Object} validationSchema - 上記で定義したバリデーションスキーマ
 * @property {boolean} validateOnMount - マウント時のバリデーション実行を無効化
 */
const { errors, defineField, handleSubmit, resetForm, setFieldError } = useForm({
  validationSchema,
  validateOnMount: false
});

/**
 * フォームフィールドの定義
 * defineFieldは[値のref, 属性オブジェクト]のタプルを返す
 * commentBodyAttrsには onBlur, onChange などのイベントハンドラが含まれる
 */
const [commentBody, commentBodyAttrs] = defineField('commentBody');

/**
 * 親コンポーネントからのmodelValue変更を監視してフォームフィールドに同期
 */
watch(() => {
  return props.modelValue;
}, (newValue) => {
  commentBody.value = newValue || '';
}, { immediate: true }); //immediate: trueでマウント時実行も行う（初期値の設定）

/**
 * フォームフィールドの変更を親コンポーネントに通知（v-model）
 * 親側でv-model:shared-comment-bodyのように使用される
 */
watch(commentBody, (newValue) => {
  emit('update:modelValue', newValue || '');
});

/**
 * リアルタイム入力バリデーション
 * エラーが表示されている状態で文字数が制限内になったらエラーをクリア
 * ユーザーが修正した瞬間にエラーが消える
 */
watch(commentBody, () => {
  if (errors.value.commentBody && commentBody.value && commentBody.value.length <= CHARACTER_LIMITS.COMMENT_CONTENT) {
    setFieldError('commentBody', undefined);
  }
});

/**
 * コメント作成処理（メイン機能）
 * handleSubmitはvee-handleSubmitはvee-validateのヘルパー関数で、バリデーション成功時のみ実行される。
 * handleSubmit関数によって、本来実行したい処理をラッピングして使用する。
 */
const createComment = handleSubmit(async () => {
  // 追加の手動バリデーション（submit時のみ）
  const body = commentBody.value || '';

  // 空文字チェック（trim()で空白のみの入力も除外）定数を使用
  if (!body || body.trim() === '') {
    setFieldError('commentBody', VALIDATION_MESSAGES.COMMENT_CONTENT.REQUIRED);
    return;
  }

  // 文字数制限チェック（yupでも行われるが念のため）定数を使用
  if (body.length > CHARACTER_LIMITS.COMMENT_CONTENT) {
    return;
  }

  // 送信中状態に変更（UI無効化）
  isCommenting.value = true;
  try {
    /**
     * コメント作成APIの呼び出し
     * $fetch: Nuxtのfetchラッパー（自動でJSONパース等を行う）
     * 型パラメータでレスポンスの型を指定
     */
    const config = useRuntimeConfig();
    const apiBaseUrl = config.public.apiBaseUrl;
    const response = await $fetch<CommentResponse>(`${apiBaseUrl}/api/posts/${props.postId}/comments`, {
      method: 'POST',
      credentials: 'include',
      body: { body: body.trim() }
    });

    // 型ガード：レスポンスの形式チェック
    if (!response || typeof response.success !== 'boolean') {
      throw new Error('Invalid API response');
    }

    // 成功時の処理
    if (response && response.success && response.comment) {
      emit('commentCreated', response.comment); // 親に新しいコメントを通知
      resetForm(); // フォームのリセット
      emit('update:modelValue', ''); // 共有状態もクリア（親のv-modelを空に）

      // 成功トースト表示
      const { success } = useToast();
      success('コメントしました！');
    } else {
      // API エラーレスポンス（success: falseの場合）
      const errorMessage = response?.error || 'コメントの作成に失敗しました';
      const { error: showErrorToast } = useToast();
      showErrorToast(errorMessage);
    }
  } catch (error: any) {
    // 認証エラー時のリダイレクト処理
    if (error.status === 401) {
      console.log('認証エラーによりログインページにリダイレクト');
      await navigateTo('/login');
      return;
    }
    
    // ネットワークエラーやその他の例外処理
    console.error('コメント作成エラー:', error);
    const { error: showErrorToast } = useToast();
    showErrorToast('ネットワークエラーが発生しました');
  } finally {
    // 送信状態を元に戻す（成功・失敗に関わらず実行）
    isCommenting.value = false;
  }
});
</script>

<template>
  <!--
    コメント作成フォーム
    @submit.prevent: フォーム送信時のページリロードを防止し、createCommentを実行
  -->
  <form @submit.prevent="createComment" class="space-y-4">
    <!--
      BaseTextarea: 汎用テキストエリアコンポーネント
      - v-model: commentBodyとの双方向バインディング
      - disabled: フォーム無効時 OR コメント送信中に入力を無効化
      - error: バリデーションエラーメッセージを表示
      - @over-limit: 文字数超過状態をisOverLimitで受け取る
    -->
    <BaseTextarea
      v-model="commentBody"
      :disabled="disabled || isCommenting"
      placeholder="コメントを入力..."
      height="h-16"
      :error="errors.commentBody"
      @over-limit="onOverLimit"
    />

    <!-- 送信ボタンエリア -->
    <div class="flex justify-end">
      <!--
        BaseButton: カスタムボタンコンポーネント
        - type="submit": フォーム送信ボタンとして動作
        - disabled条件:
          - 文字数超過状態
          - props.disabledがtrue
          - コメント送信中
        - loading: 送信中のローディング状態
        - loading-text: ローディング中に表示するテキスト
        - 空文字でもボタンは押せるようにし、バリデーションメッセージを表示する仕様に変更
      -->
      <BaseButton
        type="submit"
        :disabled="isOverLimit || disabled || isCommenting"
        :loading="isCommenting"
        loading-text="コメント中..."
        size="md"
      >
        コメント
      </BaseButton>
    </div>
  </form>
</template>