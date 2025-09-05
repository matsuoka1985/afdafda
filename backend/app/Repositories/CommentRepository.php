<?php

namespace App\Repositories;

use App\Models\Comment;
use Illuminate\Pagination\LengthAwarePaginator;

class CommentRepository implements CommentRepositoryInterface
{
    public function findByPostId(string $postId, int $perPage, int $page): LengthAwarePaginator
    {
        return Comment::with(['user:id,name,email'])
            ->where('post_id', $postId)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);
    }

    public function create(array $commentData): Comment
    {
        return Comment::create($commentData);
    }

    public function findWithUser(int $commentId): ?Comment
    {
        return Comment::with(['user:id,name,email'])->find($commentId);
    }
}