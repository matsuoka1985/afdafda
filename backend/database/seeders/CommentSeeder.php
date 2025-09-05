<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Comment;
use App\Models\Post;
use App\Models\User;

class CommentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::all();
        $posts = Post::all();

        if ($users->isEmpty()) {
            $this->command->info('ユーザーが見つかりません。先にUserSeederを実行してください。');
            return;
        }

        if ($posts->isEmpty()) {
            $this->command->info('投稿が見つかりません。先にPostSeederを実行してください。');
            return;
        }

        // 通常のランダムコメント作成（600件）
        $this->command->info('ランダムな投稿に600件のコメントを作成中...');
        Comment::factory(600)->make()->each(function ($comment) use ($users, $posts) {
            $comment->user_id = $users->random()->id;
            $comment->post_id = $posts->random()->id;
            $comment->save();
        });
        $this->command->info('ランダムコメント600件を作成しました！');

        // 特定の投稿に集中的にコメント作成（テスト用）
        $targetPost = Post::first();
        if ($targetPost) {
            $this->command->info("投稿ID {$targetPost->id} に100件のテスト用コメントを作成中...");
            
            Comment::factory(100)->create([
                'post_id' => $targetPost->id,
                'user_id' => function () use ($users) {
                    return $users->random()->id;
                }
            ]);
            
            $this->command->info("投稿ID {$targetPost->id} に100件のテスト用コメントを作成しました！");
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
            $this->command->info("テスト用URL: {$frontendUrl}/posts/{$targetPost->id}");
        }
    }
}
