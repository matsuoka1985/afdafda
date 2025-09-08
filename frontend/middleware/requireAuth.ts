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

      const config = useRuntimeConfig();
      const apiBaseUrl = config.apiBaseUrlServer;
      
      // Nuxt3推奨方法でクッキー取得を試行
      let cookieHeader = ''
      
      try {
        // 方法1: useCookie でauth_jwtクッキーを取得
        const authJwtCookie = useCookie('auth_jwt', {
          default: () => null,
          httpOnly: true,
          secure: true,
          sameSite: 'none'
        })
        
        if (authJwtCookie.value) {
          cookieHeader = `auth_jwt=${authJwtCookie.value}`
          console.log(' [AUTH MIDDLEWARE SERVER] ✅ useCookie経由でクッキー取得成功')
        } else {
          console.log(' [AUTH MIDDLEWARE SERVER] ❌ useCookie経由でクッキー取得失敗')
        }
      } catch (error) {
        console.log(' [AUTH MIDDLEWARE SERVER] ❌ useCookie エラー:', error)
      }
      
      // 方法2: 従来通りヘッダーからも取得を試行（フォールバック）
      if (!cookieHeader) {
        cookieHeader = event.node.req.headers.cookie || ''
        console.log(' [AUTH MIDDLEWARE SERVER] フォールバック: req.headers.cookie 使用')
      }
      
      // 詳細なデバッグ情報
      console.log(' [AUTH MIDDLEWARE SERVER] 🍪 クッキー詳細分析:')
      console.log('  - クッキーヘッダー存在:', !!cookieHeader)
      console.log('  - クッキーヘッダー長さ:', cookieHeader.length)
      console.log('  - auth_jwt含有:', cookieHeader.includes('auth_jwt'))
      console.log('  - 生クッキー内容:', JSON.stringify(cookieHeader))
      
      // ブラウザからVercel SSRに送られた生のクッキーヘッダーを確認
      const rawCookieFromBrowser = event.node.req.headers.cookie || ''
      console.log(' [AUTH MIDDLEWARE SERVER] 🔍 ブラウザ→Vercel SSR 生クッキーヘッダー:')
      console.log('  - 存在:', !!rawCookieFromBrowser)
      console.log('  - 長さ:', rawCookieFromBrowser.length)
      console.log('  - 内容:', JSON.stringify(rawCookieFromBrowser))
      console.log('  - auth_jwt含有:', rawCookieFromBrowser.includes('auth_jwt'))
      
      // 全てのリクエストヘッダーを確認
      console.log(' [AUTH MIDDLEWARE SERVER] 📋 全リクエストヘッダー:')
      const headers = event.node.req.headers
      Object.keys(headers).forEach(key => {
        if (key.toLowerCase().includes('cookie') || key.toLowerCase().includes('auth')) {
          console.log(`  - ${key}: ${JSON.stringify(headers[key])}`)
        }
      })
      console.log(' [AUTH MIDDLEWARE SERVER] 🌐 リクエスト情報:')
      console.log('  - URL:', event.node.req.url)
      console.log('  - Method:', event.node.req.method)
      console.log('  - User-Agent:', event.node.req.headers['user-agent']?.substring(0, 50))
      console.log(' [AUTH MIDDLEWARE SERVER] ⚙️ API呼び出し設定:')
      console.log('  - API Base URL:', apiBaseUrl)
      console.log('  - 送信予定クッキー:', cookieHeader ? 'あり' : 'なし')
      
      console.log(' [AUTH MIDDLEWARE SERVER] API呼び出し情報:', {
        api_url: `${apiBaseUrl}/api/auth/check`,
        sending_cookies: !!cookieHeader,
        cookie_length: cookieHeader.length
      })

      const authCheck = await $fetch(`${apiBaseUrl}/api/auth/check`, { // Laravel直接呼び出し
        headers: {
          'Cookie': cookieHeader
        },
        credentials: 'include' // クロスドメインでクッキー送信を有効化
      })

      console.log(' [AUTH MIDDLEWARE SERVER] API レスポンス詳細:', {
        response_type: typeof authCheck,
        response_keys: authCheck && typeof authCheck === 'object' ? Object.keys(authCheck) : 'N/A',
        response_value: authCheck
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
    
    // クライアントサイドでのクッキー状況を確認
    console.log(' [AUTH MIDDLEWARE CLIENT] 🍪 クライアントサイドクッキー確認:')
    console.log('  - Document.cookie:', document.cookie)
    console.log('  - auth_jwt含有:', document.cookie.includes('auth_jwt'))
    console.log(' [AUTH MIDDLEWARE CLIENT] 🌐 リクエスト情報:')
    console.log('  - API URL:', `${apiBaseUrl}/api/auth/check`)
    console.log('  - Current Origin:', window.location.origin)
    
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