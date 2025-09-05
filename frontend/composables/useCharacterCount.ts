// === インポート ===
import { CHARACTER_LIMITS, VALIDATION_MESSAGES } from '~/constants/validation';

// === 設定インターフェース定義 ===
/**
 * 文字数カウント機能の設定オブジェクト
 * ドーナツゲージ表示や色分けのカスタマイズに使用
 */
export interface CharacterCountConfig {
  maxLength: number // 最大文字数制限
  warningThreshold: number // 警告表示する残り文字数（この数字以下で警告色）
  colors: {
    normal: string // 通常時の色（青色）
    warning: string // 警告時の色（黄色：残り文字数が少ない）
    error: string // エラー時の色（赤色：文字数超過）
  }
  gauge: {
    radius: number // SVGドーナツゲージの半径
    strokeWidth: number // ゲージの線の太さ
    size: number // ゲージ全体のサイズ（width/height）
  }
}

// === デフォルト設定 ===
/**
 * 文字数カウント機能のデフォルト設定
 * 投稿フォームやコメントフォームで共通利用
 */
const defaultConfig: CharacterCountConfig = {
  maxLength: CHARACTER_LIMITS.POST_CONTENT, // 投稿内容の文字数制限
  warningThreshold: 10, // 残り10文字以下で警告表示
  colors: {
    normal: '#3b82f6',   // 青色（Tailwind blue-500）
    warning: '#f59e0b',  // 黄色（Tailwind yellow-500）
    error: '#ef4444'     // 赤色（Tailwind red-500）
  },
  gauge: {
    radius: 16, // 半径16px
    strokeWidth: 3, // 線の太さ3px
    size: 36 // 全体サイズ36px×36px
  }
}

// === グローバル設定（リアクティブ） ===
/**
 * コンポーザブル内で共有される設定オブジェクト
 */
const config = ref<CharacterCountConfig>(defaultConfig);

// === メインコンポーザブル関数 ===
/**
 * 文字数カウント機能を提供するコンポーザブル
 *
 * @param text - カウント対象のテキスト（リアクティブ）
 * @param initialMaxLength - 初期の最大文字数（デフォルト：120文字）
 * @returns 文字数関連の計算結果とユーティリティ関数
 *
 * 使用例:
 * const postText = ref('')
 * const { currentLength, remainingChars, gaugeColor, validate } = useCharacterCount(postText, 120)
 */
export const useCharacterCount = (
  text: Ref<string | undefined> = ref(''), // カウント対象テキスト（未定義の場合は空文字として扱う）
  initialMaxLength: number = CHARACTER_LIMITS.POST_CONTENT // 初期最大文字数
) => {
  // === 初期化処理 ===
  /**
   * 呼び出し時に指定された最大文字数で設定を更新
   * これにより投稿用（120文字）とコメント用（120文字）で使い分けが可能
   */
  config.value = { ...config.value, maxLength: initialMaxLength };


  // === リアクティブ計算プロパティ ===
  /**
   * 現在の文字数
   * textが未定義またはnullの場合は0を返す
   */
  const currentLength = computed(() => text.value?.length || 0);

  /**
   * 残り文字数（最大文字数 - 現在文字数）
   * 負の値の場合は文字数超過状態
   */
  const remainingChars = computed(() => config.value.maxLength - currentLength.value);

  /**
   * 警告状態の判定
   * 残り文字数が警告閾値以下かつ0以上の場合にtrue
   * 例：残り10文字以下で警告表示
   */
  const isNearLimit = computed(() => remainingChars.value <= config.value.warningThreshold && remainingChars.value >= 0);

  /**
   * 文字数超過状態の判定
   * 残り文字数が負の値の場合にtrue
   */
  const isOverLimit = computed(() => remainingChars.value < 0);

  // === ゲージ表示関連の計算 ===
  /**
   * ゲージの色を状況に応じて変更
   * 優先順位：エラー > 警告 > 通常
   */
  const gaugeColor = computed(() => {
    if (isOverLimit.value) {return config.value.colors.error} // 文字数超過：赤色
    if (isNearLimit.value) {return config.value.colors.warning} // 警告状態：黄色
    return config.value.colors.normal // 通常状態：青色
  });

  /**
   * ゲージの進捗率（パーセンテージ）
   * 現在文字数 ÷ 最大文字数 × 100
   * 100%を超えないように制限
   */
  const gaugePercentage = computed(() => {
    const percentage = (currentLength.value / config.value.maxLength) * 100;
    return Math.min(percentage, 100); // 100%でキャップ
  });

  // === SVGドーナツゲージの計算 ===
  /**
   * 円の周囲長を計算（SVGの描画に必要）
   * 公式：2πr（2 × 円周率 × 半径）
   */
  const circumference = computed(() => 2 * Math.PI * config.value.gauge.radius);

  /**
   * SVGのstroke-dasharrayプロパティ用の値を計算
   * ドーナツゲージの進捗表示に使用
   *
   * 計算方法：
   * 1. 進捗率に応じた円弧の長さを算出
   * 2. "進捗長 周囲長" の形式で返す
   * 3. SVGが進捗分だけ線を描画し、残りは空白にする
   */
  const strokeDasharray = computed(() => {
    const progress = (gaugePercentage.value / 100) * circumference.value;
    return `${progress} ${circumference.value}`;
  });

  // === バリデーション関数 ===
  /**
   * 入力値の妥当性チェック
   * VeeValidateなどのバリデーションライブラリと組み合わせて使用
   *
   * @param value - 検証する文字列
   * @returns エラーメッセージ（妥当な場合はundefined）
   */
  const validate = (value: string): string | undefined => {
    // 空文字・空白のみチェック
    if (!value || value.trim() === '') {
      return '入力してください';
    }
    // 文字数超過チェック
    if (value.length > config.value.maxLength) {
      return `${config.value.maxLength}文字以内で入力してください`;
    }
    // 妥当な場合はundefinedを返す
    return undefined;
  }

  // === 戻り値 ===
  /**
   * コンポーネントで使用可能な値と関数を返す
   * readonlyでconfigを読み取り専用にして意図しない変更を防ぐ
   */
  return {
    config: readonly(config), // 設定オブジェクト（読み取り専用）
    currentLength, // 現在の文字数
    remainingChars, // 残り文字数
    isNearLimit, // 警告状態フラグ
    isOverLimit, // 文字数超過フラグ
    gaugeColor, // ゲージの色
    gaugePercentage, // ゲージの進捗率
    circumference, // 円の周囲長
    strokeDasharray, // SVGドーナツゲージ用の描画データ
    validate // バリデーション関数
  }
}