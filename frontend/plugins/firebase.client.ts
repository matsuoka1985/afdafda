// === Firebase クライアント側プラグイン ===
// ファイル名の .client.ts でクライアント側のみで実行される
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Nuxt プラグイン定義：アプリケーション起動時に自動実行される
export default defineNuxtPlugin(() => {
  // 環境変数から Firebase 設定を取得
  const config = useRuntimeConfig();
  
  // Firebase 設定オブジェクト（環境変数から動的に生成）
  const firebaseConfig = {
    apiKey: config.public.firebaseApiKey,
    authDomain: config.public.firebaseAuthDomain,
    projectId: config.public.firebaseProjectId,
    storageBucket: config.public.firebaseStorageBucket,
    messagingSenderId: config.public.firebaseMessagingSenderId,
    appId: config.public.firebaseAppId,
    measurementId: config.public.firebaseMeasurementId,
  };

  // Firebase アプリの重複初期化を防ぐ条件分岐
  // getApps().length === 0: 既存アプリがない場合のみ新規作成
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  
  // Firebase Authentication インスタンスを取得
  const auth = getAuth(app);

  // Nuxt の依存注入システムに Firebase インスタンスを登録
  return {
    provide: {
      firebaseApp: app,    // $firebaseApp で全コンポーネントからアクセス可能
      firebaseAuth: auth,  // $firebaseAuth で全コンポーネントからアクセス可能
    },
  };
});
