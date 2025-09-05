<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PostDeletionTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function ログイン済みユーザーが自分の投稿を削除できる(): void
    {
        // arrange
        $testUser = User::factory()->create(['name' => 'テストユーザー']);
        $testPost = Post::factory()->for($testUser)->create([
            'body' => 'これは削除されるテスト投稿です'
        ]);
        $inputJwt = $this->createJwtToken($testUser);

        // act
        $actual = $this->call('DELETE', "/api/posts/{$testPost->id}", [], [
            'auth_jwt' => $inputJwt
        ]);

        // assert
        $actual->assertStatus(200);
        $actual->assertJsonStructure([
            'success',
            'message',
            'post_id'
        ]);
        $actual->assertJsonPath('success', true);
        $actual->assertJsonPath('message', '投稿を削除しました');
        $actual->assertJsonPath('post_id', (string)$testPost->id);

        // データベースから論理削除されていることを確認
        $this->assertSoftDeleted('posts', [
            'id' => $testPost->id,
            'user_id' => $testUser->id
        ]);
    }

    #[Test]
    public function ログイン前のユーザーは投稿を削除できない(): void
    {
        // arrange
        $testUser = User::factory()->create(['name' => 'テストユーザー']);
        $testPost = Post::factory()->for($testUser)->create([
            'body' => 'これは削除されないテスト投稿です'
        ]);

        // act - JWTトークンなしで削除を試行
        $actual = $this->call('DELETE', "/api/posts/{$testPost->id}");

        // assert
        $actual->assertStatus(401);
        $actual->assertJsonStructure([
            'success',
            'error'
        ]);
        $actual->assertJsonPath('success', false);
        $actual->assertJsonPath('error', '認証が必要です');

        // データベースで投稿が削除されていないことを確認
        $this->assertDatabaseHas('posts', [
            'id' => $testPost->id,
            'user_id' => $testUser->id,
            'deleted_at' => null
        ]);
    }

    #[Test]
    public function 他のユーザーの投稿は削除できない(): void
    {
        // arrange
        $postOwner = User::factory()->create(['name' => '投稿者ユーザー']);
        $otherUser = User::factory()->create(['name' => '他のユーザー']);
        $testPost = Post::factory()->for($postOwner)->create([
            'body' => '他人の投稿なので削除できません'
        ]);
        $inputJwt = $this->createJwtToken($otherUser);

        // act - 他のユーザーのJWTで投稿削除を試行
        $actual = $this->call('DELETE', "/api/posts/{$testPost->id}", [], [
            'auth_jwt' => $inputJwt
        ]);

        // assert
        $actual->assertStatus(403);
        $actual->assertJsonStructure([
            'success',
            'error'
        ]);
        $actual->assertJsonPath('success', false);
        $actual->assertJsonPath('error', '他のユーザーの投稿は削除できません');

        // データベースで投稿が削除されていないことを確認
        $this->assertDatabaseHas('posts', [
            'id' => $testPost->id,
            'user_id' => $postOwner->id,
            'deleted_at' => null
        ]);
    }
}