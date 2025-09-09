<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">
          Terraform 操作パネル
        </h1>
        <p class="text-sm text-gray-600">
          インフラの構築・削除を行います
        </p>
      </div>

      <div class="space-y-4">
        <!-- Apply ボタン -->
        <button
          @click="triggerWorkflow('apply')"
          :disabled="loading !== null"
          :class="[
            'w-full flex items-center justify-center px-4 py-3 rounded-md font-medium transition-colors',
            loading === 'apply'
              ? 'bg-blue-100 text-blue-700 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          ]"
        >
          <span class="mr-2">{{ loading === 'apply' ? '⏳' : '▶️' }}</span>
          {{ loading === 'apply' ? '構築中...' : 'インフラ構築 (Apply → Test → Deploy)' }}
        </button>

        <!-- Destroy ボタン -->
        <button
          @click="triggerWorkflow('destroy')"
          :disabled="loading !== null"
          :class="[
            'w-full flex items-center justify-center px-4 py-3 rounded-md font-medium transition-colors',
            loading === 'destroy'
              ? 'bg-red-100 text-red-700 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white'
          ]"
        >
          <span class="mr-2">{{ loading === 'destroy' ? '⏳' : '🗑️' }}</span>
          {{ loading === 'destroy' ? '削除中...' : 'インフラ削除 (Destroy)' }}
        </button>
      </div>

      <!-- ステータス表示 -->
      <div v-if="status" :class="[
        'mt-6 p-4 rounded-md',
        status.includes('エラー') || status.includes('失敗')
          ? 'bg-red-50 border border-red-200'
          : status.includes('成功')
          ? 'bg-green-50 border border-green-200'
          : 'bg-blue-50 border border-blue-200'
      ]">
        <div class="flex items-start">
          <span class="mr-2 mt-0.5 flex-shrink-0">
            {{ status.includes('エラー') || status.includes('失敗') 
              ? '❌' 
              : status.includes('成功')
              ? '✅'
              : '⏳' }}
          </span>
          <p :class="[
            'text-sm font-medium',
            status.includes('エラー') || status.includes('失敗')
              ? 'text-red-800'
              : status.includes('成功')
              ? 'text-green-800'
              : 'text-blue-800'
          ]">
            {{ status }}
          </p>
        </div>
      </div>

      <!-- GitHub Actions リンク -->
      <div v-if="workflowUrl" class="mt-4">
        <a 
          :href="workflowUrl" 
          target="_blank" 
          class="text-sm text-blue-600 hover:text-blue-800 flex items-center"
        >
          <span class="mr-1">🔗</span>
          GitHub Actions で進捗確認
        </a>
      </div>

      <!-- 注意事項 -->
      <div class="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <h3 class="text-sm font-medium text-yellow-800 mb-2">注意事項</h3>
        <ul class="text-xs text-yellow-700 space-y-1">
          <li>• Apply: インフラ構築 → テスト実行 → アプリデプロイの順で自動実行</li>
          <li>• Destroy: 全てのリソースを削除します（復元不可）</li>
          <li>• 実行後はGitHub Actionsで進捗を確認してください</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
const status = ref('')
const loading = ref(null)
const workflowUrl = ref('')

const config = useRuntimeConfig()

const triggerWorkflow = async (type) => {
  loading.value = type
  status.value = 'ワークフロー開始中...'
  workflowUrl.value = ''
  
  try {
    const { data, error } = await $fetch(`/api/terraform/${type}`, { 
      method: 'POST'
    })
    
    if (error) {
      status.value = `エラー: ${error}`
    } else {
      status.value = data.message
      if (data.workflowUrl) {
        workflowUrl.value = data.workflowUrl
      }
    }
  } catch (error) {
    status.value = `ネットワークエラー: ${error}`
  } finally {
    loading.value = null
  }
}

useHead({
  title: 'Terraform 操作パネル',
  meta: [
    { name: 'description', content: 'GitHub Actions経由でTerraformの操作を行う管理画面' }
  ]
})
</script>

<style scoped>
/* 追加のスタイルがあればここに */
</style>