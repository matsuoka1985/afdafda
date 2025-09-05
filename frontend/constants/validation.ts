// アプリケーション全体のバリデーション関連定数

// === 文字数制限 ===
export const CHARACTER_LIMITS = {
  // ユーザーネームの最大文字数
  USER_NAME: 20,
  // パスワードの最小文字数
  PASSWORD_MIN: 6,
  // 投稿内容の最大文字数
  POST_CONTENT: 120,
  // コメント内容の最大文字数  
  COMMENT_CONTENT: 120
} as const;

// === エラーメッセージ ===
export const VALIDATION_MESSAGES = {
  USER_NAME: {
    REQUIRED: 'ユーザーネームを入力してください',
    MAX_LENGTH: `${CHARACTER_LIMITS.USER_NAME}文字以内で入力してください`
  },
  EMAIL: {
    REQUIRED: 'メールアドレスを入力してください',
    INVALID_FORMAT: '正しいメールアドレスを入力してください'
  },
  PASSWORD: {
    REQUIRED: 'パスワードを入力してください', 
    MIN_LENGTH: `${CHARACTER_LIMITS.PASSWORD_MIN}文字以上で入力してください`
  },
  POST_CONTENT: {
    REQUIRED: '投稿内容を入力してください',
    MAX_LENGTH: `${CHARACTER_LIMITS.POST_CONTENT}文字以内で入力してください`
  },
  COMMENT_CONTENT: {
    REQUIRED: 'コメントを入力してください',
    MAX_LENGTH: `${CHARACTER_LIMITS.COMMENT_CONTENT}文字以内で入力してください`
  }
} as const;

// === バリデーション関数 ===
/**
 * 投稿内容の文字数制限チェック
 */
export const isPostContentOverLimit = (text: string): boolean => {
  return text.length > CHARACTER_LIMITS.POST_CONTENT;
};

/**
 * コメント内容の文字数制限チェック
 */
export const isCommentContentOverLimit = (text: string): boolean => {
  return text.length > CHARACTER_LIMITS.COMMENT_CONTENT;
};