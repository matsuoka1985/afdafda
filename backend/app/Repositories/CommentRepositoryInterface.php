<?php

namespace App\Repositories;

use App\Models\Comment;
use Illuminate\Pagination\LengthAwarePaginator;

interface CommentRepositoryInterface
{
    public function findByPostId(string $postId, int $perPage, int $page): LengthAwarePaginator;
    public function create(array $commentData): Comment;
    public function findWithUser(int $commentId): ?Comment;
}