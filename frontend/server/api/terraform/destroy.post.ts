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
    const response = await $fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/terraform-destroy.yml/dispatches`,
      {
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
            confirm_destroy: 'UI_TRIGGERED'
          }
        }
      }
    )

    const workflowUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/terraform-destroy.yml`

    return {
      success: true,
      data: {
        message: 'Terraform Destroy ワークフロー開始成功',
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