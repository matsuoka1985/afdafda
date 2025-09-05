<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Redis;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class LogoutTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // テスト用Redisデータベースをクリア
        Redis::connection('testing')->flushdb();
    }

    protected function tearDown(): void
    {
        // テスト後にRedisテストDBをクリア
        Redis::connection('testing')->flushdb();
        parent::tearDown();
    }

    #[Test]
    public function ログアウト時にJWTがRedisブラックリストに登録される(): void
    {
        // 正しい形式のテスト用JWT作成
        $exp = time() + 3600;
        $payload = json_encode([
            'iss' => 'test',
            'aud' => 'test',
            'iat' => time(),
            'exp' => $exp,
            'uid' => 'test-uid'
        ]);
        $encodedPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
        $jwt = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.{$encodedPayload}.test-signature";

        // ログアウトAPI実行
        $response = $this->call('POST', '/api/auth/logout', [], ['auth_jwt' => $jwt], [], [
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_CONTENT_TYPE' => 'application/json'
        ]);

        // レスポンス検証
        $response->assertStatus(200)->assertJson(['success' => true]);

        // RedisにJWTが登録されているか確認
        $jti = hash('sha256', $jwt);
        $blacklistKey = "jwt_blacklist:{$jti}";
        $exists = Redis::connection('testing')->exists($blacklistKey);

        $this->assertEquals(1, $exists);
    }
}
