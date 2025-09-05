<?php

namespace App\Services;

use App\Contracts\FirebaseAuthInterface;
use App\Repositories\CommentRepositoryInterface;
use App\Repositories\PostRepositoryInterface;
use App\Repositories\UserRepositoryInterface;
use Illuminate\Support\Facades\Log;
use Exception;

class CommentService
{
    private $commentRepository;
    private $postRepository;
    private $userRepository;
    private $firebaseAuth;

    public function __construct(
        CommentRepositoryInterface $commentRepository,
        PostRepositoryInterface $postRepository,
        UserRepositoryInterface $userRepository,
        FirebaseAuthInterface $firebaseAuth
    ) {
        $this->commentRepository = $commentRepository;
        $this->postRepository = $postRepository;
        $this->userRepository = $userRepository;
        $this->firebaseAuth = $firebaseAuth;
    }

    /**
     * 投稿のコメント一覧を取得
     */
    public function getCommentsByPostId(string $postId, int $perPage, int $page): array
    {
        $post = $this->postRepository->findById($postId);
        if (!$post) {
            throw new Exception('投稿が見つかりません');
        }

        $comments = $this->commentRepository->findByPostId($postId, $perPage, $page);

        $commentsData = $comments->map(function ($comment) {
            return [
                'id' => $comment->id,
                'body' => $comment->body,
                'user' => [
                    'id' => $comment->user->id,
                    'name' => $comment->user->name,
                    'email' => $comment->user->email,
                ],
            ];
        });

        return [
            'success' => true,
            'comments' => $commentsData,
            'pagination' => [
                'current_page' => $comments->currentPage(),
                'last_page' => $comments->lastPage(),
                'per_page' => $comments->perPage(),
                'total' => $comments->total(),
                'has_more_pages' => $comments->hasMorePages(),
            ]
        ];
    }

    /**
     * コメントを作成
     */
    public function createComment(string $postId, array $commentData, string $jwt): array
    {
        $post = $this->postRepository->findById($postId);
        if (!$post) {
            throw new Exception('投稿が見つかりません');
        }

        $verifiedIdToken = $this->firebaseAuth->verifyIdToken($jwt);
        $firebaseUid = $verifiedIdToken->claims()->get('sub');

        $user = $this->userRepository->findByFirebaseUid($firebaseUid);
        if (!$user) {
            throw new Exception('ユーザーが見つかりません');
        }

        $comment = $this->commentRepository->create([
            'post_id' => $postId,
            'user_id' => $user->id,
            'body' => $commentData['body'],
        ]);

        $createdComment = $this->commentRepository->findWithUser($comment->id);

        return [
            'success' => true,
            'message' => 'コメントを投稿しました',
            'comment' => [
                'id' => $createdComment->id,
                'body' => $createdComment->body,
                'user' => [
                    'id' => $createdComment->user->id,
                    'name' => $createdComment->user->name,
                    'email' => $createdComment->user->email,
                ],
            ]
        ];
    }
}