<script setup lang="ts">
const { toasts, removeToast, getToastStyles } = useToast();
</script>

<template>
  <!-- トースト通知のメインコンテナ（画面右上に固定表示） -->
  <div class="toast-container">
    <!-- 各トースト通知をループで表示 + アニメーション効果 -->
    <Transition
      v-for="toast in toasts"
      :key="toast.id"
      name="toast"
      appear
    >
      <!--
        個別トースト通知の表示制御:
        - v-if="!toast.isRemoving": 削除処理中は非表示
        - :class="getToastStyles(toast.type)": トースト種類別スタイル適用（成功/エラー/警告など）
        - class="toast-item": 基本スタイル適用
      -->
      <div
        v-if="!toast.isRemoving"
        :class="getToastStyles(toast.type)"
        class="toast-item"
      >
        <!-- メッセージ本体エリア -->
        <div class="flex-1">
          <!-- メインメッセージテキスト表示 -->
          <span>{{ toast.message }}</span>

          <!-- アクションボタンエリア（オプション：アクションがある場合のみ表示） -->
          <div v-if="toast.action" class="mt-2">
            <!--
              リンク型アクション:
              - v-if="toast.action.to": ページ遷移用のアクション
              - :to="toast.action.to": 遷移先URL
              - @click="removeToast(toast.id)": リンククリック時にトースト削除
            -->
            <NuxtLink
              v-if="toast.action.to"
              :to="toast.action.to"
              class="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition-colors"
              @click="removeToast(toast.id)"
            >
              {{ toast.action.label }}
            </NuxtLink>

            <!--
              ボタン型アクション:
              - v-else-if="toast.action.action": JavaScript関数実行用のアクション
              - @click="toast.action.action(); removeToast(toast.id)":
                1. 指定された関数を実行
                2. トースト通知を削除
            -->
            <button
              v-else-if="toast.action.action"
              @click="toast.action.action(); removeToast(toast.id)"
              class="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition-colors"
            >
              {{ toast.action.label }}
            </button>
          </div>
        </div>

        <!-- 閉じるボタン：クリックでトースト削除 -->
        <button
          @click="removeToast(toast.id)"
          class="text-white hover:text-gray-300 transition-colors"
        >
          ✕
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.toast-item {
  pointer-events: auto;
}

/* ふわっとしたエレガントなアニメーション */
.toast-enter-active {
  transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-leave-active {
  transition: all 0.6s cubic-bezier(0.55, 0, 0.1, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-15px) translateX(20px) scale(0.92);
  filter: blur(0.5px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-12px) translateX(25px) scale(0.94);
  filter: blur(1px);
}

/* ふわっとしたホバー効果 */
.toast-container :deep(.px-4) {
  transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.toast-container :deep(.px-4):hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
}

/* ふわっとした影 */
.toast-container :deep(.shadow-lg) {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04);
}
</style>