// レイアウト関連の定数定義
export const LAYOUT_HEIGHTS = {
  // コメントセクション関連
  COMMENTS_HEADER: 88,
  COMMENT_FORM: 168,
  DONUT_GAUGE: 56,
  
  // レスポンシブ関連
  MOBILE_BOTTOM_PADDING: 32,
  MOBILE_BREAKPOINT: 768, // Tailwind CSS の md ブレークポイント
  
  // 最小高さ保証
  MIN_COMMENTS_LIST: 200
} as const

// 型安全性のためのtype定義
export type LayoutHeightKey = keyof typeof LAYOUT_HEIGHTS