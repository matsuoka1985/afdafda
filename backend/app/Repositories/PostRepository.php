<?php

namespace App\Repositories;

use App\Models\Post;

class PostRepository implements PostRepositoryInterface
{
    public function findById(string $postId): ?array
    {
        $post = Post::find($postId);
        return $post ? $post->toArray() : null;
    }

    public function findWithUserAndLikes(string $postId): ?array
    {
        $post = Post::with(['user:id,name,email', 'likes'])
            ->withCount('likes')
            ->find($postId);
        return $post ? $post->toArray() : null;
    }

    public function findWithTrashed(string $postId): ?array
    {
        $post = Post::withTrashed()->find($postId);
        return $post ? $post->toArray() : null;
    }

    public function getPaginatedWithUserAndLikes(int $perPage, int $page): array
    {
        $paginator = Post::with(['user:id,name,email', 'likes'])
            ->withCount('likes')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        return [
            'data' => collect($paginator->items())->map(function ($item) {
                return $item->toArray();
            })->toArray(),
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'from' => $paginator->firstItem(),
            'to' => $paginator->lastItem(),
        ];
    }

    public function create(array $postData): array
    {
        $post = Post::create($postData);
        return $post->toArray();
    }

    public function delete(array $post): bool
    {
        $model = Post::find($post['id']);
        return $model ? $model->delete() : false;
    }

    public function restore(array $post): bool
    {
        $model = Post::withTrashed()->find($post['id']);
        return $model ? $model->restore() : false;
    }
}