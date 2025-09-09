<?php

namespace App\Repositories;

use App\Models\Comment;

class CommentRepository implements CommentRepositoryInterface
{
    public function findByPostId(string $postId, int $perPage, int $page): array
    {
        $paginator = Comment::with(['user:id,name,email'])
            ->where('post_id', $postId)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        return [
            'data' => collect($paginator->items())->map(function ($item) {
                return $item->toArray();
            })->toArray(),
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'has_more_pages' => $paginator->hasMorePages(),
        ];
    }

    public function create(array $commentData): array
    {
        $comment = Comment::create($commentData);
        return $comment->toArray();
    }

    public function findWithUser(int $commentId): ?array
    {
        $comment = Comment::with(['user:id,name,email'])->find($commentId);
        return $comment ? $comment->toArray() : null;
    }
}