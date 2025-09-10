<template>
  <div class="min-h-screen bg-custom-dark">
    <main class="flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-md">
        <!-- カードデザイン -->
        <div class="bg-white rounded-lg shadow-lg p-8">
          <!-- タイトル -->
          <h2 class="text-center text-xl font-bold text-gray-900 mb-8">
            Laravelデプロイ 操作パネル
          </h2>

          <!-- 説明文 -->
          <p class="text-center text-sm text-gray-600 mb-6">
            TerraformによるAWSリソースの構築・削除を行います
          </p>

      <div class="space-y-4">
        <!-- Apply ボタン -->
        <button
          @click="triggerWorkflow('apply')"
          :disabled="loading !== null"
          :class="[
            'w-full flex items-center justify-center px-4 py-3 rounded-full font-medium transition-all duration-200 shadow-lg border border-black',
            loading === 'apply'
              ? 'bg-gray-600 text-white opacity-50 cursor-not-allowed'
              : 'bg-purple-gradient text-white hover:opacity-90'
          ]"
        >
          {{ loading === 'apply' ? '構築中...' : 'インフラ構築 (Apply → Test → Deploy)' }}
        </button>

        <!-- Destroy ボタン -->
        <button
          @click="triggerWorkflow('destroy')"
          :disabled="loading !== null"
          :class="[
            'w-full flex items-center justify-center px-4 py-3 rounded-full font-medium transition-all duration-200 shadow-lg border border-black',
            loading === 'destroy'
              ? 'bg-gray-600 text-white opacity-50 cursor-not-allowed'
              : 'bg-purple-gradient text-white hover:opacity-90'
          ]"
        >
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

      <!-- GitHub Actions リンク -->
      <div v-if="workflowUrl" class="mt-4">
        <a
          :href="workflowUrl"
          target="_blank"
          class="text-sm text-blue-600 hover:text-blue-800 flex items-center"
        >
          GitHub Actions で進捗確認
        </a>
      </div>

      <div class="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <ul class="text-xs text-yellow-700 space-y-1">
          <li>• Apply: インフラ構築 → テスト実行 → アプリデプロイの順で自動実行</li>
          <li>• Destroy: 全てのリソースを削除します</li>
          <li>• 実行後はGitHub Actionsで進捗を確認してください</li>
        </ul>
          </div>
        </div>
      </div>
    </main>
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
