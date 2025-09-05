<?php

namespace App\Repositories;

use App\Models\Like;

class LikeRepository implements LikeRepositoryInterface
{
    public function findByUserAndPost(int $userId, string $postId): ?Like
    {
        return Like::where('user_id', $userId)
                   ->where('post_id', $postId)
                   ->first();
    }

    public function create(array $likeData): Like
    {
        return Like::create($likeData);
    }

    public function delete(Like $like): bool
    {
        return $like->delete();
    }

    public function countByPostId(string $postId): int
    {
        return Like::where('post_id', $postId)->count();
    }
}