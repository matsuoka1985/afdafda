<?php

namespace App\Repositories;

use App\Models\Like;

interface LikeRepositoryInterface
{
    public function findByUserAndPost(int $userId, string $postId): ?Like;
    public function create(array $likeData): Like;
    public function delete(Like $like): bool;
    public function countByPostId(string $postId): int;
}