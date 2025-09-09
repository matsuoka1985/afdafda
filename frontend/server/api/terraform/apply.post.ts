export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  
  const {
    GITHUB_TOKEN,
    GITHUB_OWNER,
    GITHUB_REPO,
  } = config

  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    throw createError({
      statusCode: 500,
      statusMessage: 'GitHub設定が不足しています'
    })
  }

  try {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/terraform-apply.yml/dispatches`
    
    console.log('[dispatch] url:', url)
    console.log('[env-proxy] HTTP_PROXY:', process.env.HTTP_PROXY)
    console.log('[env-proxy] HTTPS_PROXY:', process.env.HTTPS_PROXY)
    console.log('[env-proxy] ALL_PROXY:', process.env.ALL_PROXY)
    
    const response = await $fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: {
        ref: 'main',
        inputs: {
          trigger_source: 'UI',
          confirm_apply: 'UI_TRIGGERED'
        }
      }
    })

    const workflowUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/terraform-apply.yml`

    return {
      success: true,
      data: {
        message: 'Terraform Apply ワークフロー開始成功（テスト・デプロイも自動実行されます）',
        workflowUrl
      }
    }
  } catch (error: any) {
    console.error('GitHub API Error:', error)
    
    throw createError({
      statusCode: error.status || 500,
      statusMessage: `GitHub API呼び出し失敗: ${error.data?.message || error.message}`
    })
  }
})