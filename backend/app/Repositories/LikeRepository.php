<?php

namespace App\Repositories;

use App\Models\Like;

class LikeRepository implements LikeRepositoryInterface
{
    public function findByUserAndPost(int $userId, string $postId): ?array
    {
        $like = Like::where('user_id', $userId)
                   ->where('post_id', $postId)
                   ->first();
        return $like ? $like->toArray() : null;
    }

    public function create(array $likeData): array
    {
        $like = Like::create($likeData);
        return $like->toArray();
    }

    public function delete(array $like): bool
    {
        $model = Like::find($like['id']);
        return $model ? $model->delete() : false;
    }

    public function countByPostId(string $postId): int
    {
        return Like::where('post_id', $postId)->count();
    }
}