<?php

namespace App\Services;

use App\Repositories\LikeRepositoryInterface;
use App\Repositories\PostRepositoryInterface;
use App\Repositories\UserRepositoryInterface;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Auth;
use Exception;

class LikeService
{
    private $likeRepository;
    private $postRepository;
    private $userRepository;
    private $firebaseAuth;

    public function __construct(
        LikeRepositoryInterface $likeRepository,
        PostRepositoryInterface $postRepository,
        UserRepositoryInterface $userRepository,
        Auth $firebaseAuth
    ) {
        $this->likeRepository = $likeRepository;
        $this->postRepository = $postRepository;
        $this->userRepository = $userRepository;
        $this->firebaseAuth = $firebaseAuth;
    }

    /**
     * いいねを追加
     */
    public function createLike(string $postId, string $jwt): array
    {
        // テスト環境ではFirebase検証をスキップ
        if (app()->environment('testing')) {
            try {
                $payload = json_decode(base64_decode($jwt), true);
                if ($payload && isset($payload['sub'])) {
                    $user = $this->userRepository->findByFirebaseUid($payload['sub']);
                    if (!$user) {
                        throw new Exception('ユーザーが見つかりません');
                    }
                } else {
                    throw new Exception('ユーザーが見つかりません');
                }
            } catch (Exception $e) {
                throw new Exception('ユーザーが見つかりません');
            }
        } else {
            $verifiedIdToken = $this->firebaseAuth->verifyIdToken($jwt);
            $firebaseUid = $verifiedIdToken->claims()->get('sub');

            $user = $this->userRepository->findByFirebaseUid($firebaseUid);
            if (!$user) {
                throw new Exception('ユーザーが見つかりません');
            }
        }

        $post = $this->postRepository->findById($postId);
        if (!$post) {
            throw new Exception('投稿が見つかりません');
        }

        $existingLike = $this->likeRepository->findByUserAndPost($user->id, $postId);
        if ($existingLike) {
            throw new Exception('既にいいねしています');
        }

        $like = $this->likeRepository->create([
            'user_id' => $user->id,
            'post_id' => $postId,
        ]);

        $likesCount = $this->likeRepository->countByPostId($postId);

        Log::info('いいね作成成功', [
            'like_id' => $like->id,
            'user_id' => $user->id,
            'post_id' => $postId,
            'likes_count' => $likesCount
        ]);

        return [
            'success' => true,
            'message' => 'いいねしました',
            'post_id' => $postId,
            'likes_count' => $likesCount,
            'is_liked' => true
        ];
    }

    /**
     * いいねを解除
     */
    public function removeLike(string $postId, string $jwt): array
    {
        // テスト環境ではFirebase検証をスキップ
        if (app()->environment('testing')) {
            try {
                $payload = json_decode(base64_decode($jwt), true);
                if ($payload && isset($payload['sub'])) {
                    $user = $this->userRepository->findByFirebaseUid($payload['sub']);
                    if (!$user) {
                        throw new Exception('ユーザーが見つかりません');
                    }
                } else {
                    throw new Exception('ユーザーが見つかりません');
                }
            } catch (Exception $e) {
                throw new Exception('ユーザーが見つかりません');
            }
        } else {
            $verifiedIdToken = $this->firebaseAuth->verifyIdToken($jwt);
            $firebaseUid = $verifiedIdToken->claims()->get('sub');

            $user = $this->userRepository->findByFirebaseUid($firebaseUid);
            if (!$user) {
                throw new Exception('ユーザーが見つかりません');
            }
        }

        $like = $this->likeRepository->findByUserAndPost($user->id, $postId);
        if (!$like) {
            throw new Exception('いいねが見つかりません');
        }

        $this->likeRepository->delete($like);
        $likesCount = $this->likeRepository->countByPostId($postId);

        Log::info('いいね解除成功', [
            'user_id' => $user->id,
            'post_id' => $postId,
            'likes_count' => $likesCount
        ]);

        return [
            'success' => true,
            'message' => 'いいねを解除しました',
            'post_id' => $postId,
            'likes_count' => $likesCount,
            'is_liked' => false
        ];
    }
}