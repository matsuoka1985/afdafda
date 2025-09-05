<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Post;
use App\Models\User;

class PostSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::all();
        
        if ($users->isEmpty()) {
            $this->command->warn('ユーザーが存在しません。先にUserSeederを実行してください。');
            return;
        }
        
        // 300件の投稿を作成（各投稿でランダムなユーザーを選択）
        Post::factory(300)->make()->each(function ($post) use ($users) {
            $post->user_id = $users->random()->id;
            $post->save();
        });
        
        $this->command->info('300件の投稿を作成しました。');
    }
}
