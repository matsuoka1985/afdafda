<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // テスト用ユーザー（Firebase認証済み）を作成
        // Firebase側: dev@invalid.test / password
        User::create([
            'firebase_uid' => 'fXBjWaepBRYu7Sg80BSCsm8eDVa2',
            'name' => 'Dev User',
            'email' => 'dev@invalid.test',
            'email_verified_at' => now(),
        ]);

        // その他のダミーユーザーも作成
        User::factory(9)->create();
    }
}
