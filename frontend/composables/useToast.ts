// トースト通知に付随するアクション（ボタン）の定義
export interface ToastAction {
  label: string        // ボタンに表示するテキスト
  to?: string         // 遷移先URL（Vue Router使用）
  action?: () => void // クリック時に実行する関数
}

// 表示される通知1つ分のデータ構造
export interface Toast {
  id: string                                    // 一意識別子（削除・管理用）
  message: string                               // 表示メッセージ本文
  type: 'success' | 'error' | 'warning' | 'info' // 通知の種類（色・アイコンに影響）
  duration?: number                             // 表示時間（ミリ秒）
  action?: ToastAction                          // アクションボタン（オプション）
  isRemoving?: boolean                          // 削除アニメーション中フラグ
}

// トーストシステム全体の設定型
export interface ToastConfig {
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center' // 画面での表示位置
  defaultDuration: number  // デフォルト表示時間（ミリ秒）
  maxToasts: number       // 同時表示可能な最大通知数
  styles: {               // 各通知タイプのTailwind CSSクラス
    success: string       // 成功通知のスタイル
    error: string         // エラー通知のスタイル
    warning: string       // 警告通知のスタイル
    info: string         // 情報通知のスタイル
    base: string         // 全通知共通のベーススタイル
  }
}

const defaultConfig: ToastConfig = {
  position: 'top-right',
  defaultDuration: 3000,  // 3秒表示
  maxToasts: 5,           // 最大5件同時表示
  styles: {
    base: 'px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 min-w-80 max-w-96',
    success: 'bg-purple-gradient text-white',  // アプリのテーマカラー
    error: 'bg-red-600 text-white',
    warning: 'bg-yellow-600 text-white',
    info: 'bg-blue-600 text-white'
  }
};

const toasts = ref<Toast[]>([]); // 現在表示中のトースト一覧
const config = ref<ToastConfig>(defaultConfig); // トーストシステムの現在設定

export const useToast = () => {
  const updateConfig = (newConfig: Partial<ToastConfig>) => {
    config.value = { ...config.value, ...newConfig };
  };

  // トースト通知を表示する核心機能
  const showToast = (message: string, type: Toast['type'] = 'info', duration?: number, action?: ToastAction) => {
    const finalDuration = duration ?? config.value.defaultDuration; // Nullish coalescing演算子でデフォルト値適用
    const id = Date.now().toString(); // タイムスタンプベースのID生成
    
    const toast: Toast = {
      id,
      message,
      type,
      duration: finalDuration,
      action
    };

    if (toasts.value.length >= config.value.maxToasts) { // 表示上限制御
      toasts.value.shift(); // 最古のトーストを削除（FIFO方式）
    }

    toasts.value.push(toast); // 新しいトーストを配列末尾に追加

    setTimeout(() => { // 自動削除タイマー設定
      removeToast(id);
    }, finalDuration);

    return id; // 手動削除用にIDを返却
  };

  // 指定IDのトーストを削除する機能（アニメーション対応の2段階削除）
  const removeToast = (id: string) => {
    const toast = toasts.value.find(t => t.id === id);
    
    if (toast) {
      toast.isRemoving = true; // Phase 1: 削除アニメーション開始
      
      setTimeout(() => { // Phase 2: アニメーション完了後に実際の削除
        const index = toasts.value.findIndex(t => t.id === id);
        if (index > -1) {
          toasts.value.splice(index, 1); // 配列から削除→DOM更新
        }
      }, 600); // leave アニメーションの時間に合わせる
    }
  };

  // 通知タイプ別のヘルパー関数
  const success = (message: string, duration?: number, action?: ToastAction) => 
    showToast(message, 'success', duration, action);

  const error = (message: string, duration?: number, action?: ToastAction) => 
    showToast(message, 'error', duration, action);

  const warning = (message: string, duration?: number, action?: ToastAction) => 
    showToast(message, 'warning', duration, action);

  const info = (message: string, duration?: number, action?: ToastAction) => 
    showToast(message, 'info', duration, action);

  // 指定したトーストタイプのCSSクラスを取得
  const getToastStyles = (type: Toast['type']) => {
    const baseStyles = config.value.styles.base;      // 共通レイアウト
    const typeStyles = config.value.styles[type];     // タイプ固有色
    return `${baseStyles} ${typeStyles}`;              // スペース区切りで結合
  };

  // 業務固有のヘルパー関数
  const postCreated = (postId: number) => success('投稿しました！', 5000, {
    label: '詳細を見る',
    to: `/posts/${postId}`
  });

  const commentCreated = () => success('コメントしました！');

  return {
    toasts: readonly(toasts),        // 現在のトースト一覧（読み取り専用）
    config: readonly(config),        // 現在の設定（読み取り専用）
    updateConfig,                    // 設定の動的更新
    removeToast,                     // 手動削除
    getToastStyles,                  // CSS クラス取得
    showToast,                       // 汎用表示
    success,                         // 成功通知
    error,                           // エラー通知
    warning,                         // 警告通知
    info,                           // 情報通知
    postCreated,                     // 投稿成功通知
    commentCreated                   // コメント成功通知
  };
};