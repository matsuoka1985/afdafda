<script setup lang="ts">
import { useForm, useIsFieldTouched } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/yup';
import * as yup from 'yup';
import { CHARACTER_LIMITS, VALIDATION_MESSAGES } from '~/constants/validation';
import type { LoginResponse } from '~/types';

// emit で親へ成功イベントを送るための型定義
interface Emits {
  (e: 'success'): void
}

const emit = defineEmits<Emits>();

// VeeValidateを使用したフォーム管理設定
const { errors, defineField, handleSubmit, meta, submitCount } = useForm({
  validationSchema: toTypedSchema(
    yup.object({
      // メールアドレスのバリデーション
      email: yup
        .string()
        .required(VALIDATION_MESSAGES.EMAIL.REQUIRED)
        .email(VALIDATION_MESSAGES.EMAIL.INVALID_FORMAT),

      // パスワードのバリデーション
      password: yup
        .string()
        .required(VALIDATION_MESSAGES.PASSWORD.REQUIRED)
        .min(CHARACTER_LIMITS.PASSWORD_MIN, VALIDATION_MESSAGES.PASSWORD.MIN_LENGTH)
    })
  ),
  validateOnMount: false,
  keepValuesOnUnmount: true,

});

// フォームフィールド定義
const [email, emailAttrs] = defineField('email', {
  validateOnInput: true,
  validateOnChange: false,
  validateOnBlur: true,
  validateOnModelUpdate: false
});

const [password, passwordAttrs] = defineField('password', {
  validateOnInput: true,
  validateOnChange: false,
  validateOnBlur: true,
  validateOnModelUpdate: false
});

// 各フィールドのtouched状態（blur済みか）
const emailTouched = useIsFieldTouched('email');
const passwordTouched = useIsFieldTouched('password');

// 状態管理
const isLoading = ref<boolean>(false); // 送信中フラグ
const errorMessage = ref<string>('');  // API からのエラー表示用

// === 環境設定 ===
const config = useRuntimeConfig();
const getApiBaseUrl = () => {
  if (import.meta.server) {
    return config.apiBaseUrlServer;
  } else {
    return config.public.apiBaseUrl;
  }
}

// エラーメッセージの表示制御（blur後 or 送信後のみ表示。入力で即時消える）
const emailErrorToShow = computed(() => {
  if (emailTouched.value || submitCount.value > 0) {
    return errors.value.email || '';
  }
  return '';
});

const passwordErrorToShow = computed(() => {
  if (passwordTouched.value || submitCount.value > 0) {
    return errors.value.password || '';
  }
  return '';
});

// 表示対象のエラーがあるか（未検証のエラーは無視）
const hasShownError = computed(() => {
  const emailShown = (emailTouched.value || submitCount.value > 0) && !!errors.value.email;
  const passwordShown = (passwordTouched.value || submitCount.value > 0) && !!errors.value.password;
  return emailShown || passwordShown;
});

// 送信可否（バリデエラーまたは送信中で無効化）
const isSubmitDisabled = computed(() => {
  if (isLoading.value) {
    return true;
  }
  if (meta.value.pending) {
    return true; // バリデーション中は押せない
  }
  return hasShownError.value;
});

// 送信処理
const onSubmit = handleSubmit(async (values) => {

  try {
    isLoading.value = true;
    errorMessage.value = '';

    // === Firebase Authentication処理 ===
    // NuxtアプリからFirebase Authインスタンスを取得
    const { $firebaseAuth } = useNuxtApp(); // plugins/firebase.client.ts で初期化されたインスタンス
    const auth = $firebaseAuth; // Firebase Auth インスタンス（認証サービスの入口）

    // Firebase Authentication SDK の動的インポート
    // 必要な時だけインポートしてバンドルサイズを最適化
    const { signInWithEmailAndPassword } = await import('firebase/auth');

    // Firebase でメール・パスワード認証を実行
    const userCredential = await signInWithEmailAndPassword(
      auth, // Firebase Auth インスタンス
      values.email, // フォームから入力されたメールアドレス
      values.password // フォームから入力されたパスワード
    );
    // 戻り値: UserCredential オブジェクト（認証結果 + ユーザー情報）

    // Firebase ユーザーオブジェクトを取得
    const firebaseUser = userCredential.user; // User型（uid, email, displayName等を含む）

    // Firebase認証情報をコンソールに表示
    console.log('Firebase ログイン成功:', {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName
    });

    // Firebase IDトークンを取得
    const idToken = await firebaseUser.getIdToken();
    console.log('Firebase IDトークン:', idToken);

    // Laravel API直接呼び出しでHttpOnly Cookieを設定
    const response = await $fetch<LoginResponse>(`${getApiBaseUrl()}/api/auth/verify-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        idToken: idToken
      },
      credentials: 'include' // HTTP-Only Cookie受信用
    });

    // APIレスポンスをコンソールに表示
    console.log('Laravel API レスポンス:', response);

    if (response.success) {
      console.log('ログイン成功! HttpOnly Cookie設定完了:', response.user);
      
      // ログイン成功をemitで親コンポーネントに通知
      emit('success');

    } else {
      console.log('ログイン失敗:', response.error);
      errorMessage.value = response.error || 'ログインに失敗しました';
      isLoading.value = false;
    }

  } catch (error) {
    console.error('Login error:', error);
    errorMessage.value = 'メールアドレスまたはパスワードが正しくありません';
    isLoading.value = false;
  }
});
</script>

<template>
  <FormContainer title="ログイン" @submit="onSubmit">
    <!-- BaseInput: 共通入力コンポーネント。v-model は modelValue / update:modelValue を内部で扱う -->
    <!-- メールアドレス -->
    <BaseInput
      name="email"
      type="email"
      placeholder="メールアドレス"
      v-model="email"
      v-bind="emailAttrs"
      :error-message="emailErrorToShow"
    />

    <!-- パスワード -->
    <BaseInput
      name="password"
      type="password"
      placeholder="パスワード"
      v-model="password"
      v-bind="passwordAttrs"
      :error-message="passwordErrorToShow"
      :minlength="6"
    />

    <!-- エラーメッセージ -->
    <FormErrorMessage :message="errorMessage" />

    <template #button>
      <!-- BaseButton はスロットでラベル、loading prop でスピナー制御 -->
      <BaseButton
        type="submit"
        :loading="isLoading"
        loading-text="ログイン中..."
        :disabled="isSubmitDisabled"
      >
        ログイン
      </BaseButton>
    </template>
  </FormContainer>
</template>