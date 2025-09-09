<?php

namespace App\Repositories;

interface CommentRepositoryInterface
{
    public function findByPostId(string $postId, int $perPage, int $page): array;
    public function create(array $commentData): array;
    public function findWithUser(int $commentId): ?array;
}