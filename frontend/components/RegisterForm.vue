<script setup lang="ts">
import { useForm, useIsFieldTouched } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/yup';
import * as yup from 'yup';
import { CHARACTER_LIMITS, VALIDATION_MESSAGES } from '~/constants/validation';
import type { RegisterResponse, VerifyTokenResponse } from '~/types';

// === イベント型定義 ===
/**
 * 新規登録が正常完了した際に 'success' イベントを発火
 */
interface Emits {
  (e: 'success'): void // 新規登録完了時のイベント
}

const emit = defineEmits<Emits>();

// === フォームバリデーション設定 ===
/**
 * VeeValidateとYupを使用したフォーム管理設定
 * - バリデーションルール定義
 * - エラーメッセージ管理
 * - フィールド状態管理を一元化
 */
const { errors, defineField, handleSubmit, meta, submitCount } = useForm({
  validationSchema: toTypedSchema(
    yup.object({
      // ユーザーネームのバリデーション
      name: yup
        .string() // 文字列型
        .required(VALIDATION_MESSAGES.USER_NAME.REQUIRED) // 必須入力チェック
        .max(CHARACTER_LIMITS.USER_NAME, VALIDATION_MESSAGES.USER_NAME.MAX_LENGTH), // 最大文字制限

      // メールアドレスのバリデーション
      email: yup
        .string() // 文字列型
        .required(VALIDATION_MESSAGES.EMAIL.REQUIRED) // 必須入力チェック
        .email(VALIDATION_MESSAGES.EMAIL.INVALID_FORMAT), // メールアドレス形式チェック

      // パスワードのバリデーション
      password: yup
        .string() // 文字列型
        .required(VALIDATION_MESSAGES.PASSWORD.REQUIRED) // 必須入力チェック
        .min(CHARACTER_LIMITS.PASSWORD_MIN, VALIDATION_MESSAGES.PASSWORD.MIN_LENGTH) // 最小文字制限
    })
  ),
  validateOnMount: false,
  keepValuesOnUnmount: true
});

// === フォームフィールド定義 ===
/**
 * VeeValidateのdefineFieldを使用してリアクティブなフォームフィールドを作成
 */
const [name, nameAttrs] = defineField('name', {
  validateOnInput: true,
  validateOnChange: false,
  validateOnBlur: true,
  validateOnModelUpdate: false
});

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
const nameTouched = useIsFieldTouched('name');
const emailTouched = useIsFieldTouched('email');
const passwordTouched = useIsFieldTouched('password');

// エラーメッセージの表示制御（blur後 or 送信後のみ表示。入力で即時消える）
const nameErrorToShow = computed(() => {
  if (nameTouched.value || submitCount.value > 0) {
    return errors.value.name || '';
  }
  return '';
});

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
  const nameShown = (nameTouched.value || submitCount.value > 0) && !!errors.value.name;
  const emailShown = (emailTouched.value || submitCount.value > 0) && !!errors.value.email;
  const passwordShown = (passwordTouched.value || submitCount.value > 0) && !!errors.value.password;
  return nameShown || emailShown || passwordShown;
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

const isLoading = ref<boolean>(false); // 新規登録処理中フラグ（送信ボタンの無効化、ローディング表示制御）
const errorMessage = ref<string>('');  // API エラーメッセージ表示用（ユーザーへのフィードバック）

// === 環境設定 ===
/**
 * サーバーサイドとクライアントサイドで異なるAPI基底URLを使用
 * - サーバーサイド（Nuxtコンテナ内）: http://nginx
 * - クライアントサイド（ブラウザ）: http://localhost
 */
const config = useRuntimeConfig();
const getApiBaseUrl = () => {
  // サーバーサイド（SSR）とクライアントサイドで適切なURLを返す
  if (import.meta.server) {
    return config.apiBaseUrlServer; // サーバーサイド用URL（Dockerコンテナ間通信）
  } else {
    return config.public.apiBaseUrl; // クライアントサイド用URL（ブラウザ→外部API）
  }
}

// === メイン新規登録処理 ===
/**
 * 新規登録フォーム送信処理
 * VeeValidateのhandleSubmitでラップすることで、バリデーション通過後のみ実行される
 *
 * 処理フロー:
 * 1. Firebase Authentication で認証情報作成
 * 2. Laravel API でユーザーデータ保存
 * 3. Firebase Admin SDK でトークン検証
 * 4. HTTP-Only Cookie 設定
 * 5. 成功時は親コンポーネントに通知
 *
 * @param values - バリデーション済みフォーム値 {name, email, password}
 */
const onSubmit = handleSubmit(async (values) => {
  try {
    // === 初期化処理 ===
    isLoading.value = true;  // ローディング開始（ボタン無効化、スピナー表示）
    errorMessage.value = ''; // 前回のエラーメッセージをクリア

    // === Firebase Authentication による認証情報作成 ===
    /**
     * Nuxtプラグインから Firebase Auth インスタンスを取得
     * plugins/firebase.client.ts で初期化されたインスタンス
     */
    const { $firebaseAuth } = useNuxtApp();
    const auth = $firebaseAuth;

    /**
     * Firebase Auth SDK の動的インポート
     * 必要な時だけインポートしてバンドルサイズを最適化
     */
    const { createUserWithEmailAndPassword } = await import('firebase/auth');

    /**
     * Firebase Authentication でメール・パスワード認証のユーザーを作成
     * 成功時: UserCredential オブジェクトを返す（user情報 + 認証情報）
     * 失敗時: FirebaseError を投げる（メール重複、パスワード弱すぎなど）
     */
    const userCredential = await createUserWithEmailAndPassword(
      auth,           // Firebase Auth インスタンス
      values.email,   // バリデーション済みメールアドレス
      values.password // バリデーション済みパスワード
    );

    const firebaseUser = userCredential.user; // Firebase ユーザーオブジェクト

    // === デバッグ用ログ出力 ===
    console.log(' Firebase認証成功:', {
      uid: firebaseUser.uid,                 // Firebase 固有のユーザーID
      email: firebaseUser.email,             // メールアドレス
      displayName: firebaseUser.displayName  // 表示名（初期はnull）
    });

    /**
     * Firebase ID トークンを取得
     * このトークンを使用してLaravel側でユーザー認証を行う
     * JWT形式で署名付き、有効期限は1時間
     */
    const idToken = await firebaseUser.getIdToken();
    console.log('Firebase IDトークン:', idToken);

    // === Laravel API でのユーザーデータ保存 ===
    /**
     * Laravel バックエンドにユーザー情報を送信してDBに保存
     * Firebase UIDと紐づけてアプリケーション固有のユーザーデータを管理
     */
    const response = await $fetch<RegisterResponse>(
      `${getApiBaseUrl()}/api/auth/register`,
       {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json' // JSON形式でデータ送信
      },
      body: {
        firebase_uid: firebaseUser.uid, // Firebase UID（主キーとして使用）
        name: values.name,              // ユーザーネーム
        email: values.email,            // メールアドレス
        password: values.password       // パスワード（Laravel側でハッシュ化）
      }
    });

    // デバッグ用：APIレスポンスをコンソールに表示
    console.log(' Laravel API レスポンス:', response);

    // === レスポンス処理 ===
    /**
     * API レスポンスの型安全性チェック
     *
     */
    if (response && typeof response === 'object' && 'success' in response) {
      if (response.success) {
        console.log('Laravel新規登録成功!', response.user || response);

        // === Firebase Admin SDK によるトークン検証とセッション設定 ===
        /**
         * セキュリティ強化のため、Firebase Admin SDK でトークンを検証
         * 成功時は HTTP-Only Cookie でセッション管理を行う
         *
         *
         * 1. クライアント側のFirebaseトークンだけでは偽装可能
         * 2. サーバー側でトークンの正当性を検証
         * 3. HTTP-Only Cookie でXSS攻撃を防止
         */
        try {
          const verifyResponse = await $fetch<VerifyTokenResponse>(`${getApiBaseUrl()}/api/auth/verify-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              idToken: idToken // Firebase ID トークンをサーバーに送信
            },
            credentials: 'include' // Cookie を含めてリクエスト送信（HTTP-Only Cookie受信用）
          });

          // === 検証レスポンス処理 ===
          if (verifyResponse && typeof verifyResponse === 'object' && 'success' in verifyResponse) {
            if (verifyResponse.success) {
              // === 検証成功時の処理 ===
              console.log(' Firebase Admin SDK 検証成功 + HTTP-Only Cookie設定完了')
              console.log(' 検証済みユーザー:', verifyResponse.user)

              /**
               * 古いクライアントサイドCookieを削除
               * セキュリティ向上のため、クライアント側でトークンを保持しない
               */
              const oldAuthCookie = useCookie('firebase-auth-token')
              oldAuthCookie.value = null

              /**
               * 新規登録完了を親コンポーネントに通知
               * 親側でリダイレクト処理などが実行される
               */
              emit('success');
              return;
            } else {
              // === 検証失敗時の処理 ===
              console.log(' Firebase Admin SDK 検証失敗:', verifyResponse.error);
              errorMessage.value = verifyResponse.error || 'トークンの検証に失敗しました';
              isLoading.value = false;
            }
          } else {
            // === 予期しないレスポンス構造への対応 ===
            console.error('予期しない検証レスポンス構造:', verifyResponse);
            errorMessage.value = 'トークンの検証に失敗しました';
            isLoading.value = false;
          }
        } catch (verifyError) {
          // === 検証API呼び出し時のエラーハンドリング ===
          console.error('Firebase Admin SDK 検証エラー:', verifyError);
          errorMessage.value = 'セキュリティ検証に失敗しました';
          isLoading.value = false;
        }

      } else {
        // === Laravel登録APIがエラーレスポンスを返した場合 ===
        /**
         * API側で業務ロジックエラーが発生した場合の処理
         * 例: メールアドレス重複、バリデーションエラーなど
         */
        console.log('Laravel新規登録失敗:', response.error);
        errorMessage.value = response.error || '登録に失敗しました';
        isLoading.value = false;
      }
    } else {
      // === 予期しないレスポンス構造への対応 ===
      /**
       * API仕様と異なるレスポンス形式が返された場合の防御的処理
       * サーバーエラー、ネットワーク問題などで発生する可能性
       */
      console.error('予期しない登録レスポンス構造:', response);
      errorMessage.value = '登録に失敗しました';
      isLoading.value = false;
    }

  } catch (error: any) {
    // === 全体的な例外処理 ===
    /**
     * 以下のようなエラーをキャッチ:
     * - Firebase Authentication エラー（パスワード弱い、メール形式不正など）
     * - ネットワークエラー（API接続失敗）
     * - その他の予期しないエラー
     */
    console.error('Registration error:', error);
    errorMessage.value = 'エラーが発生しました。もう一度お試しください。';
    isLoading.value = false;
  }
})
</script>

<template>
  <!-- 新規登録フォームのメインコンテナ -->
  <FormContainer title="新規登録" @submit="onSubmit">
    <!--
      FormContainer の役割:
      - フォーム全体のレイアウト管理
      - タイトル表示
      - submit イベントの管理
      - 共通のスタイリング適用
    -->

    <!-- ユーザーネーム入力フィールド -->
    <BaseInput
      name="name"
      type="text"
      placeholder="ユーザーネーム"
      v-model="name"
      v-bind="nameAttrs"
      :error-message="nameErrorToShow"
    />
    <!--
      BaseInput の設定:
      - name="name": フォーム識別子
      - v-model="name": VeeValidateのdefineFieldと双方向バインディング
      - :error-message="nameErrorToShow": バリデーションの表示制御済みエラーメッセージ
    -->

    <!-- メールアドレス入力フィールド -->
    <BaseInput
      name="email"
      type="email"
      placeholder="メールアドレス"
      v-model="email"
      v-bind="emailAttrs"
      :error-message="emailErrorToShow"
    />


    <!-- パスワード入力フィールド -->
    <BaseInput
      name="password"
      type="password"
      placeholder="パスワード"
      v-model="password"
      v-bind="passwordAttrs"
      :error-message="passwordErrorToShow"
      :minlength="6"
    />


    <!-- API エラーメッセージ表示エリア -->
    <FormErrorMessage :message="errorMessage" />
    <!--
      API エラーメッセージコンポーネント:
      - :message="errorMessage": リアクティブなエラーメッセージ
      - Firebase認証エラー、Laravel APIエラーなどを表示
      - フォームバリデーションエラーとは別の汎用エラー表示
    -->

    <!-- 送信ボタンエリア（スロット） -->
    <template #button>
      <!--
        FormContainer の button スロット:
        - フォーム下部にボタンを配置
        - 統一されたレイアウト管理
      -->
      <BaseButton
        type="submit"
        :loading="isLoading"
        loading-text="送信中..."
        :disabled="isSubmitDisabled"
      >
        新規登録
      </BaseButton>
      <!--
        送信ボタンの設定:
        - type="submit": フォーム送信ボタン（Enterキーでも動作）
        - :loading="isLoading": 処理中はローディング状態を表示
        - loading-text: ローディング中のテキスト表示
        - :disabled は BaseButton 内部で loading に基づいて自動制御
        - スロット: "新規登録" ボタンラベル
      -->
    </template>
  </FormContainer>
</template>