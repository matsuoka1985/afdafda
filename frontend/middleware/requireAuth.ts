// 認証必須ページ用ミドルウェア（未認証はログインページにリダイレクト）
export default defineNuxtRouteMiddleware(async (to, from) => {
  if (import.meta.server) { // SSRでの事前認証チェック（ページフラッシュ防止）
    try {
      console.log('[AUTH MIDDLEWARE SERVER] 認証必須ページ - 認証チェック開始')

      const event = useRequestEvent(); // Nuxtリクエストイベント取得（Cookie、ヘッダー等へのアクセス用）

      if (!event || !event.node || !event.node.req || !event.node.req.headers) { // eventオブジェクトの型ガード
        console.error(' [AUTH MIDDLEWARE SERVER] リクエストイベントまたはヘッダー取得不可')
        console.error(' [AUTH MIDDLEWARE SERVER] event詳細:', {
          hasEvent: !!event, // eventオブジェクトの存在確認
          hasNode: !!(event?.node), // event.nodeプロパティの存在確認
          hasReq: !!(event?.node?.req), // HTTPリクエストオブジェクトの存在確認
          hasHeaders: !!(event?.node?.req?.headers) // リクエストヘッダーオブジェクトの存在確認
        })
        return navigateTo('/login');
      }

      const cookieHeader = event.node.req.headers.cookie || '' // HTTPリクエストからCookieヘッダーを取得
      console.log(' [AUTH MIDDLEWARE SERVER] Cookie header:', cookieHeader.includes('auth_jwt') ? 'JWT あり' : 'JWT なし')

      const config = useRuntimeConfig();
      const apiBaseUrl = config.apiBaseUrlServer;
      
      const authCheck = await $fetch(`${apiBaseUrl}/api/auth/check`, { // Laravel直接呼び出し
        headers: {
          'Cookie': cookieHeader
        }
      })

      if (!authCheck || typeof authCheck !== 'object') { // authCheckオブジェクトの型ガード
        console.error(' [AUTH MIDDLEWARE SERVER] 認証チェックレスポンスが無効')
        console.error(' [AUTH MIDDLEWARE SERVER] レスポンス詳細:', {
          authCheck, // 実際のレスポンス内容
          type: typeof authCheck,
          isNull: authCheck === null
        })
        return navigateTo('/login');
      }

      if (!('authenticated' in authCheck)) { // 'authenticated'プロパティの存在確認
        console.error(' [AUTH MIDDLEWARE SERVER] 認証チェックレスポンスにauthenticatedプロパティが存在しない')
        console.error(' [AUTH MIDDLEWARE SERVER] 利用可能プロパティ:', Object.keys(authCheck))
        return navigateTo('/login');
      }

      console.log(' [AUTH MIDDLEWARE SERVER] 認証チェック結果:', authCheck)

      if (!authCheck.authenticated) { // 未認証の場合はログインページにリダイレクト
        console.log(' [AUTH MIDDLEWARE SERVER] 未認証 - ログインページにリダイレクト')
        return navigateTo('/login')
      } else {
        console.log(' [AUTH MIDDLEWARE SERVER] 認証済み - ページ表示許可')
      }
    } catch (error) {
      // フェールセーフ設計：エラー時は制限的に動作（ログイン要求）
      console.error(' [AUTH MIDDLEWARE SERVER] 認証チェックエラー:', error)
      console.error(' [AUTH MIDDLEWARE SERVER] エラー詳細:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      })
      return navigateTo('/login') // エラー時は安全側に倒してログイン要求
    }
    return
  }

  console.log(' [AUTH MIDDLEWARE CLIENT] クライアントサイド認証チェック開始') // SPA遷移時のフォールバック認証チェック

  try {
    const config = useRuntimeConfig();
    const apiBaseUrl = config.public.apiBaseUrl;
    
    const authCheck = await $fetch(`${apiBaseUrl}/api/auth/check`, { // Laravel直接呼び出し
      credentials: 'include' // HTTP-Only Cookie送信
    })

    if (!authCheck || typeof authCheck !== 'object') { // authCheckオブジェクトの型ガード
      console.error(' [AUTH MIDDLEWARE CLIENT] 認証チェックレスポンスが無効')
      console.error(' [AUTH MIDDLEWARE CLIENT] レスポンス詳細:', {
        authCheck,
        type: typeof authCheck,
        isNull: authCheck === null
      })
      await navigateTo('/login');
      return;
    }

    if (!('authenticated' in authCheck)) { // 'authenticated'プロパティの存在確認
      console.error(' [AUTH MIDDLEWARE CLIENT] 認証チェックレスポンスにauthenticatedプロパティが存在しない')
      console.error(' [AUTH MIDDLEWARE CLIENT] 利用可能プロパティ:', Object.keys(authCheck))
      await navigateTo('/login');
      return;
    }

    console.log(' [AUTH MIDDLEWARE CLIENT] 認証チェック結果:', authCheck)

    if (!authCheck.authenticated) { // 未認証の場合はログインページにリダイレクト
      console.log(' [AUTH MIDDLEWARE CLIENT] 未認証 - ログインページにリダイレクト');
      await navigateTo('/login');
      return;
    }
  } catch (error) {
    // エラー時は制限的に動作（セキュリティ最優先）
    console.error(' [AUTH MIDDLEWARE CLIENT] 認証チェックエラー:', error);
    console.error(' [AUTH MIDDLEWARE CLIENT] エラー詳細:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    await navigateTo('/login') // エラー時は安全側に倒してログイン要求
  }
})