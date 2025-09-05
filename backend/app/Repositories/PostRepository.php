<?php

namespace App\Repositories;

use App\Models\Post;
use Illuminate\Pagination\LengthAwarePaginator;

class PostRepository implements PostRepositoryInterface
{
    public function findById(string $postId): ?Post
    {
        return Post::find($postId);
    }

    public function findWithUserAndLikes(string $postId): ?Post
    {
        return Post::with(['user:id,name,email', 'likes'])
            ->withCount('likes')
            ->find($postId);
    }

    public function findWithTrashed(string $postId): ?Post
    {
        return Post::withTrashed()->find($postId);
    }

    public function getPaginatedWithUserAndLikes(int $perPage, int $page): LengthAwarePaginator
    {
        return Post::with(['user:id,name,email', 'likes'])
            ->withCount('likes')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);
    }

    public function create(array $postData): Post
    {
        return Post::create($postData);
    }

    public function delete(Post $post): bool
    {
        return $post->delete();
    }

    public function restore(Post $post): bool
    {
        return $post->restore();
    }
}