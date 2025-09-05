<?php

namespace App\Services;

use App\Contracts\FirebaseAuthInterface;
use App\Repositories\PostRepositoryInterface;
use App\Repositories\UserRepositoryInterface;
use Illuminate\Support\Facades\Log;
use Exception;

class PostService
{
    private $postRepository;
    private $userRepository;
    private $firebaseAuth;

    public function __construct(
        PostRepositoryInterface $postRepository,
        UserRepositoryInterface $userRepository,
        FirebaseAuthInterface $firebaseAuth
    ) {
        $this->postRepository = $postRepository;
        $this->userRepository = $userRepository;
        $this->firebaseAuth = $firebaseAuth;
    }

    /**
     * 認証されたユーザーIDを取得（任意）
     */
    private function getCurrentUserId(?string $jwt): ?int
    {
        if (empty($jwt)) {
            return null;
        }

        try {
            $verifiedIdToken = $this->firebaseAuth->verifyIdToken($jwt);
            $firebaseUid = $verifiedIdToken->claims()->get('sub');
            $user = $this->userRepository->findByFirebaseUid($firebaseUid);

            // ユーザーが見つからない場合は自動作成
            if (!$user) {
                $firebaseUser = $this->firebaseAuth->getUser($firebaseUid);
                $email = $firebaseUser->email;

                if ($email) {
                    $displayName = $firebaseUser->displayName
                        ?: (strpos($email, '@') !== false ? strstr($email, '@', true) : 'User');

                    $user = $this->userRepository->create([
                        'firebase_uid' => $firebaseUid,
                        'name' => $displayName,
                        'email' => $email,
                        'email_verified_at' => $firebaseUser->emailVerified ? now() : null,
                    ]);
                }
            }

            return $user ? $user->id : null;
        } catch (Exception $e) {
            return null;
        }
    }

    /**
     * 投稿データを整形
     */
    private function formatPostData($post, ?int $currentUserId): array
    {
        $isLiked = false;
        $isOwner = false;

        if ($currentUserId) {
            $isLiked = $post->likes->contains('user_id', $currentUserId);
            $isOwner = $post->user_id === $currentUserId;
        }

        return [
            'id' => $post->id,
            'body' => $post->body,
            'user' => [
                'id' => $post->user->id,
                'name' => $post->user->name,
                'email' => $post->user->email,
            ],
            'likes_count' => $post->likes_count,
            'is_liked' => $isLiked,
            'is_owner' => $isOwner,
        ];
    }

    /**
     * 投稿一覧を取得
     */
    public function getPosts(int $page, int $perPage, ?string $jwt): array
    {
        $currentUserId = $this->getCurrentUserId($jwt);
        $posts = $this->postRepository->getPaginatedWithUserAndLikes($perPage, $page);

        $postsData = $posts->getCollection()->map(function ($post) use ($currentUserId) {
            return $this->formatPostData($post, $currentUserId);
        });

        return [
            'success' => true,
            'posts' => $postsData,
            'current_user_id' => $currentUserId,
            'pagination' => [
                'current_page' => $posts->currentPage(),
                'last_page' => $posts->lastPage(),
                'per_page' => $posts->perPage(),
                'total' => $posts->total(),
                'has_next_page' => $posts->hasMorePages(),
            ]
        ];
    }

    /**
     * 投稿を作成
     */
    public function createPost(array $postData, string $jwt): array
    {
        $verifiedIdToken = $this->firebaseAuth->verifyIdToken($jwt);
        $firebaseUid = $verifiedIdToken->claims()->get('sub');

        $user = $this->userRepository->findByFirebaseUid($firebaseUid);
        if (!$user) {
            throw new Exception('ユーザーが見つかりません');
        }

        $post = $this->postRepository->create([
            'user_id' => $user->id,
            'body' => $postData['body'],
        ]);

        Log::info('投稿作成成功', [
            'post_id' => $post->id,
            'firebase_uid' => $firebaseUid
        ]);

        $createdPost = $this->postRepository->findWithUserAndLikes($post->id);

        return [
            'success' => true,
            'message' => '投稿を作成しました',
            'post' => $this->formatPostData($createdPost, $user->id)
        ];
    }

    /**
     * 投稿詳細を取得
     */
    public function getPost(string $postId, ?string $jwt): array
    {
        $currentUserId = $this->getCurrentUserId($jwt);
        $post = $this->postRepository->findWithUserAndLikes($postId);

        if (!$post) {
            throw new Exception('投稿が見つかりません');
        }

        return [
            'success' => true,
            'post' => $this->formatPostData($post, $currentUserId),
            'current_user_id' => $currentUserId,
        ];
    }

    /**
     * 投稿を削除
     */
    public function deletePost(string $postId, string $jwt): array
    {
        $verifiedIdToken = $this->firebaseAuth->verifyIdToken($jwt);
        $firebaseUid = $verifiedIdToken->claims()->get('sub');

        $user = $this->userRepository->findByFirebaseUid($firebaseUid);
        if (!$user) {
            throw new Exception('ユーザーが見つかりません');
        }

        $post = $this->postRepository->findById($postId);
        if (!$post) {
            throw new Exception('投稿が見つかりません');
        }

        if ($post->user_id !== $user->id) {
            throw new Exception('他のユーザーの投稿は削除できません');
        }

        $this->postRepository->delete($post);

        Log::info('投稿論理削除成功', [
            'post_id' => $postId,
            'user_id' => $user->id
        ]);

        return [
            'success' => true,
            'message' => '投稿を削除しました',
            'post_id' => $postId
        ];
    }

    /**
     * 投稿を復元
     */
    public function restorePost(string $postId, string $jwt): array
    {
        $verifiedIdToken = $this->firebaseAuth->verifyIdToken($jwt);
        $firebaseUid = $verifiedIdToken->claims()->get('sub');

        $user = $this->userRepository->findByFirebaseUid($firebaseUid);
        if (!$user) {
            throw new Exception('ユーザーが見つかりません');
        }

        $post = $this->postRepository->findWithTrashed($postId);
        if (!$post) {
            throw new Exception('投稿が見つかりません');
        }

        if (!$post->trashed()) {
            throw new Exception('この投稿は削除されていません');
        }

        if ($post->user_id !== $user->id) {
            throw new Exception('他のユーザーの投稿は復元できません');
        }

        $this->postRepository->restore($post);

        Log::info('投稿復元成功', [
            'post_id' => $postId,
            'user_id' => $user->id
        ]);

        return [
            'success' => true,
            'message' => '投稿を復元しました',
            'post_id' => $postId
        ];
    }
}
