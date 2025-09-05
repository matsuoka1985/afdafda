<script setup lang="ts">
// ローディングスピナーのサイズ設定Props
interface Props {
  size?: 'sm' | 'md' | 'lg' // スピナーサイズ（小・中・大、デフォルト: md）
}

// Props設定（デフォルト値付き）
const props = withDefaults(defineProps<Props>(), {
  size: 'md' // 中サイズをデフォルトに設定
})

// === サイズ管理 ===
/**
 * サイズに応じたCSSクラスを動的に生成するリアクティブプロパティ
 * Tailwind CSSのユーティリティクラスでサイズを制御
 */
const sizeClasses = computed(() => {
  const sizes = {
    sm: 'h-4 w-4',   // 16px × 16px（小）
    md: 'h-8 w-8',   // 32px × 32px（中）
    lg: 'h-12 w-12'  // 48px × 48px（大）
  }
  return sizes[props.size] // 指定されたサイズのクラスを返す
})
</script>

<template>
  <!-- ローディングスピナー -->
  <div
    class="animate-spin rounded-full border-2 border-white border-t-transparent mx-auto"
    :class="sizeClasses"
  >
    <!--
      スピナーアニメーションスタイル:
      - animate-spin: CSS回転アニメーション（無限ループ）
      - border-white: 白色の境界線
      - border-t-transparent: 上部境界線のみ透明（回転効果の作成）
      - :class="sizeClasses": 動的にサイズクラスを適用

      仕組み:
      1. 円形のdivに白い境界線を設定
      2. 上部だけ透明にして「欠け」を作成
      3. animate-spinで回転させることで回転スピナー効果
    -->
  </div>
</template>
