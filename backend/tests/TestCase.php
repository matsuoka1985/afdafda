<?php

namespace Tests;

use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * テスト用のJWTトークンを作成
     */
    protected function createJwtToken(User $user): string
    {
        // テスト環境では実際のFirebase JWTは使用せず、ユーザーIDを含む簡単なトークンを作成
        return base64_encode(json_encode([
            'sub' => $user->firebase_uid,
            'exp' => time() + 3600
        ]));
    }
}
