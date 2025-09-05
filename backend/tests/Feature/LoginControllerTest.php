<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use App\Services\AuthVerifyService;
use App\Models\User;
use Mockery;

class LoginControllerTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function IDトークンが送信されていない場合バリデーションエラーが返される(): void
    {
        $response = $this->postJson('/api/auth/verify-token', []);

        $response->assertStatus(400);
        $response->assertJson([
            'success' => false,
            'error' => 'バリデーションエラー'
        ]);
    }

    #[Test]
    public function 無効なIDトークンの場合JWT検証に失敗する(): void
    {
        $response = $this->postJson('/api/auth/verify-token', [
            'idToken' => 'invalid_jwt_token'
        ]);

        $response->assertStatus(401);
        $response->assertJsonStructure([
            'success',
            'error'
        ]);
        $response->assertJson([
            'success' => false
        ]);
    }

    #[Test]
    public function 有効なIDトークンの場合JWT検証が成功する(): void
    {
        // AuthVerifyServiceをモック
        $mockAuthVerifyService = Mockery::mock(AuthVerifyService::class);
        $mockAuthVerifyService->shouldReceive('verifyToken')
            ->with('valid_jwt_token')
            ->andReturn([
                'uid' => 'test_firebase_uid',
                'email' => 'test@example.com',
                'token' => 'valid_jwt_token',
                'exp' => time() + 3600
            ]);

        // モックをサービスコンテナにバインド
        $this->app->instance(AuthVerifyService::class, $mockAuthVerifyService);

        
        $response = $this->postJson('/api/auth/verify-token', [
            'idToken' => 'valid_jwt_token'
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => '認証成功',
            'user' => [
                'uid' => 'test_firebase_uid',
                'email' => 'test@example.com'
            ]
        ]);
    }

    #[Test]
    public function Firebase_UIDが存在しない場合ログインに失敗する(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'firebase_uid' => 'non_existent_uid'
        ]);

        $response->assertStatus(500);
        $response->assertJson([
            'success' => false,
            'error' => 'ログインに失敗しました'
        ]);
    }

    #[Test]
    public function 正しいFirebase_UIDでログインが成功する(): void
    {
        // テスト用ユーザーを作成
        $user = User::factory()->create([
            'firebase_uid' => 'test_firebase_uid',
            'name' => 'テストユーザー',
            'email' => 'test@example.com'
        ]);

        $response = $this->postJson('/api/auth/login', [
            'firebase_uid' => 'test_firebase_uid'
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'message' => 'ログイン成功',
            'user' => [
                'id' => $user->id,
                'name' => 'テストユーザー',
                'email' => 'test@example.com',
                'firebase_uid' => 'test_firebase_uid'
            ]
        ]);
    }
}
