<?php

namespace App\Repositories;

use App\Models\Post;
use Illuminate\Pagination\LengthAwarePaginator;

interface PostRepositoryInterface
{
    public function findById(string $postId): ?Post;
    public function findWithUserAndLikes(string $postId): ?Post;
    public function findWithTrashed(string $postId): ?Post;
    public function getPaginatedWithUserAndLikes(int $perPage, int $page): LengthAwarePaginator;
    public function create(array $postData): Post;
    public function delete(Post $post): bool;
    public function restore(Post $post): bool;
}