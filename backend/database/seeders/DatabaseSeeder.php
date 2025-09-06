<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 環境に応じてシーダーを切り替え
        if (app()->environment('production')) {
            // 本番環境ではFakerを使わないマスターデータのみ
            $this->call([
                MasterDataSeeder::class,
            ]);
        } else {
            // 開発・テスト環境ではFakerを使用したデータも含める
            $this->call([
                UserSeeder::class,
                PostSeeder::class,
                CommentSeeder::class,
                LikeSeeder::class,
            ]);
        }
    }
}
