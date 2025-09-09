<?php

namespace App\Repositories;

interface LikeRepositoryInterface
{
    public function findByUserAndPost(int $userId, string $postId): ?array;
    public function create(array $likeData): array;
    public function delete(array $like): bool;
    public function countByPostId(string $postId): int;
}