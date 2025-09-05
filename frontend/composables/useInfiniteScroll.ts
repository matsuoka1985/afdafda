/**
 * 無限スクロール機能を提供するコンポーザブル
 * ページネーションAPIと組み合わせて、ユーザーがスクロールダウンした際に自動でデータを読み込む
 */
export const useInfiniteScroll = () => {
  // === リアクティブ状態管理 ===
  const isLoading = ref(false); // データ読み込み中かどうかの状態
  const hasMore = ref(true); // まだ読み込める次のページが存在するかの状態
  const currentPage = ref(1); // 現在表示中のページ番号

  // === スクロール監視機能 ===
  /**
   * スクロールイベントを監視し、下端に近づいたらコールバックを実行する
   * @param callback - スクロール時に実行される非同期関数
   * @param scrollElement - 監視対象の要素（未指定時はwindow全体）
   * @returns クリーンアップ関数（イベントリスナー削除用）
   */
  const handleScroll = (callback: () => Promise<void>, scrollElement?: HTMLElement) => {
    // スクロールイベントハンドラー関数
    const scrollHandler = async () => {
      let scrollPosition: number; // 現在のスクロール位置
      let documentHeight: number; // コンテンツ全体の高さ

      if (scrollElement) {
        // 特定の要素内でのスクロール（例：モーダル内のリスト）
        scrollPosition = scrollElement.scrollTop + scrollElement.clientHeight;
        documentHeight = scrollElement.scrollHeight;
      } else {
        // ページ全体のスクロール
        scrollPosition = window.innerHeight + window.scrollY;
        documentHeight = document.documentElement.offsetHeight;
      }

      const threshold = 200; // 下端から何px手前でトリガーするかの閾値

      // スクロール位置が下端に近づき、かつローディング中でなく、まだデータがある場合
      if (
        scrollPosition >= documentHeight - threshold &&
        !isLoading.value &&
        hasMore.value
      ) {
        await callback(); // データ読み込みコールバックを実行
      }
    };

    // イベントリスナーを追加（指定要素またはwindow）
    const targetElement = scrollElement || window;
    targetElement.addEventListener('scroll', scrollHandler);

    // クリーンアップ関数を返す（コンポーネント破棄時に使用）
    return () => {
      targetElement.removeEventListener('scroll', scrollHandler);
    };
  };

  // === ページ読み込み機能 ===
  /**
   * 次のページのデータを読み込む汎用関数
   * @param fetchFunction - ページ番号を受け取ってデータを取得するAPI関数
   * @returns 取得したデータと読み込み状態
   */
  const loadNextPage = async <T>(
    fetchFunction: (page: number) => Promise<{
      data: T[]; // 取得したデータ配列
      pagination: {
        has_more_pages?: boolean; // 次のページが存在するか（Laravel形式）
        has_next_page?: boolean; // 次のページが存在するか（汎用形式）
        current_page: number; // 現在のページ番号
      };
    }>
  ) => {
    // 既にローディング中または次のページが存在しない場合は早期リターン
    if (isLoading.value || !hasMore.value) return { data: [], hasMore: false };

    isLoading.value = true; // ローディング状態を開始

    try {
      const nextPage = currentPage.value + 1; // 次のページ番号を計算
      const response = await fetchFunction(nextPage); // APIからデータを取得

      // 取得したレスポンスで状態を更新
      currentPage.value = response.pagination.current_page;
      // LaravelのAPIとその他のAPIの両方に対応（nullish coalescing）
      hasMore.value = response.pagination.has_more_pages ?? response.pagination.has_next_page ?? false;

      // 呼び出し元に返すデータ形式を統一
      return {
        data: response.data,
        hasMore: hasMore.value,
        pagination: response.pagination
      };
    } catch (error) {
      console.error('ページ読み込みエラー:', error);
      throw error; // エラーを再スローして呼び出し元で処理
    } finally {
      isLoading.value = false; // 成功・失敗に関わらずローディング状態を終了
    }
  };

  // === 状態管理機能 ===
  /**
   * 無限スクロールの状態を初期値にリセット
   * 新しい検索条件でデータを読み直す場合などに使用
   */
  const reset = () => {
    currentPage.value = 1; // ページを1に戻す
    hasMore.value = true; // 次のページありに設定
    isLoading.value = false; // ローディング状態をクリア
  };

  /**
   * hasMore状態を手動で設定する
   * 特定の条件でページングを停止したい場合に使用
   * @param value - 設定したいhasMore値
   */
  const setHasMore = (value: boolean) => {
    hasMore.value = value;
  };

  // === 外部公開API ===
  // readonlyでラップしてコンポーザブル外からの直接変更を防止
  return {
    isLoading: readonly(isLoading), // 読み取り専用のローディング状態
    hasMore: readonly(hasMore), // 読み取り専用の次ページ有無状態
    currentPage: readonly(currentPage), // 読み取り専用の現在ページ
    handleScroll, // スクロール監視セットアップ関数
    loadNextPage, // 次ページ読み込み関数
    reset, // 状態リセット関数
    setHasMore // hasMore手動設定関数
  };
};