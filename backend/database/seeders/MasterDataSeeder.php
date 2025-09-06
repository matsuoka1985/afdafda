<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Post;

class MasterDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // テスト用ユーザー（Firebase認証済み）
        // Firebase側: dev@invalid.test / password
        $devUser = User::create([
            'firebase_uid' => 'fXBjWaepBRYu7Sg80BSCsm8eDVa2',
            'name' => 'Dev User',
            'email' => 'dev@invalid.test',
            'email_verified_at' => now(),
        ]);

        // その他のサンプルユーザー（Fakerを使わずに固定データ）
        $users = [
            [
                'firebase_uid' => 'sample_user_001',
                'name' => '田中太郎',
                'email' => 'tanaka@example.com',
                'email_verified_at' => now(),
            ],
            [
                'firebase_uid' => 'sample_user_002',
                'name' => '佐藤花子',
                'email' => 'sato@example.com',
                'email_verified_at' => now(),
            ],
            [
                'firebase_uid' => 'sample_user_003',
                'name' => '鈴木次郎',
                'email' => 'suzuki@example.com',
                'email_verified_at' => now(),
            ]
        ];

        foreach ($users as $userData) {
            User::create($userData);
        }

        // サンプル投稿データ
        $posts = [
            ['user_id' => 1, 'body' => 'SNSアプリへようこそ！初回投稿です。'],
            ['user_id' => 2, 'body' => 'みなさん、よろしくお願いします🎉'],
            ['user_id' => 2, 'body' => '今日はいい天気ですね！'],
            ['user_id' => 3, 'body' => 'Laravel11とNuxt3での開発が楽しいです'],
            ['user_id' => 4, 'body' => 'Firebase認証の実装完了しました💪'],
            ['user_id' => 1, 'body' => 'AWS ECS Fargateでのデプロイも成功！'],
        ];

        foreach ($posts as $postData) {
            Post::create($postData);
        }
    }
}