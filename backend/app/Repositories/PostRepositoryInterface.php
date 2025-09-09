<?php

namespace App\Repositories;

interface PostRepositoryInterface
{
    public function findById(string $postId): ?array;
    public function findWithUserAndLikes(string $postId): ?array;
    public function findWithTrashed(string $postId): ?array;
    public function getPaginatedWithUserAndLikes(int $perPage, int $page): array;
    public function create(array $postData): array;
    public function delete(array $post): bool;
    public function restore(array $post): bool;
}