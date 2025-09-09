// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  plugins: ["~/plugins/firebase.client.ts"],
  css: ['~/assets/css/main.css'],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  runtimeConfig: {
    // GitHub API設定（サーバーサイド専用）
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_OWNER: process.env.GITHUB_OWNER,
    GITHUB_REPO: process.env.GITHUB_REPO,
    
    // サーバーサイド専用の設定（環境に応じて動的切り替え）
    apiBaseUrlServer: (() => {
      // Vercel本番環境では外部APIアクセス
      if (process.env.VERCEL_ENV === 'production' || 
          (process.env.NODE_ENV === 'production' && !process.env.NUXT_API_BASE_URL_SERVER)) {
        return 'https://smatsuoka.click'
      }
      // ローカル開発環境ではDocker内部通信
      return process.env.NUXT_API_BASE_URL_SERVER || 'http://nginx'
    })(),
    
    public: {
      firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID,
      firebaseMeasurementId: process.env.NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
      // クライアントサイド用の設定（環境に応じて動的切り替え）
      apiBaseUrl: (() => {
        // Vercel本番環境では外部APIアクセス
        if (process.env.VERCEL_ENV === 'production' || 
            (process.env.NODE_ENV === 'production' && !process.env.NUXT_PUBLIC_API_BASE_URL)) {
          return 'https://smatsuoka.click'
        }
        // ローカル開発環境ではlocalhostアクセス
        return process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost'
      })(),
    },
  },
});
