import type { Post, DeleteResponse, RestoreResponse } from "~/types";

// 投稿の削除・復元処理（楽観的更新、ロールバック、復元機能付き）
export const usePostActions = () => {
  const { error: showErrorToast, success: showSuccessToast } = useToast();

  // 一覧ページ用削除処理（楽観的更新＋復元機能付き）
  const handlePostDeletedInList = async (postId: number, posts: Ref<Post[]>) => {
    if (!confirm("この投稿を削除してもよろしいですか？")){ return;}

    const targetIndex = posts.value.findIndex(post => post.id === postId); // 削除対象の位置を特定
    if (targetIndex === -1) {
      console.warn("削除対象の投稿が見つかりません:", postId);
      return;
    }

    const targetPost = posts.value[targetIndex]; // 復元用に投稿データを保存
    posts.value = posts.value.filter(post => post.id !== postId); // UI上で即座に削除（楽観的更新）

    try {
      const config = useRuntimeConfig();
      const apiBaseUrl = config.public.apiBaseUrl;
      const response = await $fetch<DeleteResponse>(`${apiBaseUrl}/api/posts/${postId}`, {
        method: "DELETE", // DELETEメソッドで削除API実行
        credentials: 'include'
      });

      if (response && typeof response === "object" && "success" in response) { // レスポンス型ガード
        if (response.success) {
          showSuccessToast("投稿を削除しました", 8000, { // 8秒間の復元可能期間
            label: "復元しますか？",
            action: () => restorePostInList(postId, targetPost, targetIndex, posts)
          });
        } else {
          posts.value.splice(targetIndex, 0, targetPost); // 楽観的更新をロールバック（元の位置に復元）
          showErrorToast("投稿の削除に失敗しました");
        }
      } else {
        posts.value.splice(targetIndex, 0, targetPost); // 楽観的更新をロールバック
        showErrorToast("投稿の削除に失敗しました");
      }
    } catch (error: any) {
      posts.value.splice(targetIndex, 0, targetPost); // 楽観的更新をロールバック（必須）

      if (error.status === 401) {
        console.log('認証エラーによりログインページにリダイレクト');
        await navigateTo('/login');
        return;
      } else if (error.status === 403) {
        showErrorToast("他のユーザーの投稿は削除できません"); // 権限エラー
      } else if (error.status === 404) {
        showErrorToast("投稿が見つかりません"); // リソース不存在
      } else {
        showErrorToast("ネットワークエラーが発生しました"); // その他のエラー
      }
    }
  };

  // 詳細ページ用削除処理（楽観的更新なし、復元機能付き、削除後にトップ遷移）
  const handlePostDeletedInDetail = async (postId: number) => {
    if (!confirm("この投稿を削除してもよろしいですか？")) {return;}

    try {
      const config = useRuntimeConfig();
      const apiBaseUrl = config.public.apiBaseUrl;
      const response = await $fetch<DeleteResponse>(`${apiBaseUrl}/api/posts/${postId}`, {
        method: "DELETE", // 楽観的更新なし（詳細ページは削除後に画面遷移）
        credentials: 'include'
      });

      if (response && typeof response === "object" && "success" in response) { // レスポンス型ガード
        if (response.success) {
          setTimeout(async () => {
            await navigateTo("/"); // トップページ遷移を先に実行
            showSuccessToast("投稿を削除しました", 8000, { // 遷移後にトースト表示
              label: "復元しますか？",
              action: () => restorePostInDetail(postId)
            });
          }, 0);
        } else {
          showErrorToast("投稿の削除に失敗しました");
        }
      } else {
        showErrorToast("投稿の削除に失敗しました");
      }
    } catch (error: any) {
      if (error.status === 401) {
        console.log('認証エラーによりログインページにリダイレクト');
        await navigateTo('/login');
        return;
      } else if (error.status === 403) {
        showErrorToast("他のユーザーの投稿は削除できません"); // 権限エラー
      } else if (error.status === 404) {
        showErrorToast("投稿が見つかりません"); // リソース不存在
      } else {
        showErrorToast("ネットワークエラーが発生しました"); // その他のエラー
      }
    }
  };

  // 一覧用復元処理（元の位置にUI復元）
  const restorePostInList = async (postId: number, post: Post, originalIndex: number, posts: Ref<Post[]>) => {
    try {
      const config = useRuntimeConfig();
      const apiBaseUrl = config.public.apiBaseUrl;
      const response = await $fetch<RestoreResponse>(`${apiBaseUrl}/api/posts/${postId}/restore`, {
        method: "POST",
        credentials: 'include'
      });

      if (response && typeof response === "object" && "success" in response) { // レスポンス型ガード
        if (response.success) {
          posts.value.splice(originalIndex, 0, post); // 元の位置に投稿を復元（配列操作）
          showSuccessToast("投稿を復元しました");
        } else {
          showErrorToast("投稿の復元に失敗しました");
        }
      } else {
        showErrorToast("投稿の復元に失敗しました");
      }
    } catch (error: any) {
      if (error.status === 401) {
        console.log('認証エラーによりログインページにリダイレクト');
        await navigateTo('/login');
        return;
      }
      showErrorToast("投稿の復元でエラーが発生しました");
    }
  };

  // 詳細ページ用復元処理（UI配列操作なし、復元後に詳細ページ遷移）
  const restorePostInDetail = async (postId: number) => {
    try {
      const config = useRuntimeConfig();
      const apiBaseUrl = config.public.apiBaseUrl;
      const response = await $fetch<RestoreResponse>(`${apiBaseUrl}/api/posts/${postId}/restore`, {
        method: "POST",
        credentials: 'include'
      });

      if (response && typeof response === "object" && "success" in response) {
        if (response.success) {
          showSuccessToast("投稿を復元しました");
          await navigateTo(`/posts/${postId}`); // 復元された投稿の詳細ページに遷移
        } else {
          showErrorToast("投稿の復元に失敗しました");
        }
      } else {
        showErrorToast("投稿の復元に失敗しました");
      }
    } catch (error: any) {
      if (error.status === 401) {
        console.log('認証エラーによりログインページにリダイレクト');
        await navigateTo('/login');
        return;
      }
      showErrorToast("投稿の復元でエラーが発生しました");
    }
  };

  // 各機能の使い分け: handlePostDeletedInList(一覧用楽観更新), handlePostDeletedInDetail(詳細用遷移), restorePostInList(一覧復元), restorePostInDetail(詳細復元)
  return {
    handlePostDeletedInList,
    handlePostDeletedInDetail,
    restorePostInList,
    restorePostInDetail
  };
};