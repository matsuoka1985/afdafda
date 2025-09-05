<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Like;
use App\Models\Post;
use App\Models\User;

class LikeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::all();
        $posts = Post::all();
        
        for ($i = 0; $i < 1000; $i++) {
            $userId = $users->random()->id;
            $postId = $posts->random()->id;
            
            // 重複チェック
            if (!Like::where('user_id', $userId)->where('post_id', $postId)->exists()) {
                Like::create([
                    'user_id' => $userId,
                    'post_id' => $postId
                ]);
            }
        }
    }
}
