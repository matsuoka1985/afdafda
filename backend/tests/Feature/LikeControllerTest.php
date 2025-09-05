<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Post;
use App\Models\Like;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class LikeControllerTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function いいねアイコンを押下することでいいねした投稿として登録できる(): void
    {
        // テストデータを作成
        $user = User::factory()->create();
        $post = Post::factory()->create(['body' => 'いいねテスト投稿']);
        
        $jwt = $this->createJwtToken($user);

        // いいね作成APIを呼び出し
        $actual = $this->withHeaders(['X-Test-JWT' => $jwt])
            ->postJson("/api/posts/{$post->id}/like");

        // レスポンスを検証
        if ($actual->getStatusCode() !== 201) {
            dump($actual->getContent());
        }
        $actual->assertStatus(201);
        $actual->assertJsonPath('success', true);
        $actual->assertJsonPath('message', 'いいねしました');

        // データベースにいいねが保存されていることを確認
        $this->assertDatabaseHas('likes', [
            'user_id' => $user->id,
            'post_id' => $post->id
        ]);
    }

    #[Test]
    public function 再度いいねアイコンを押下することでいいねを解除できる(): void
    {
        // テストデータを作成
        $user = User::factory()->create();
        $post = Post::factory()->create(['body' => 'いいね解除テスト投稿']);
        
        // 既にいいねを作成
        Like::create([
            'user_id' => $user->id,
            'post_id' => $post->id
        ]);
        
        $jwt = $this->createJwtToken($user);

        // いいね解除APIを呼び出し
        $actual = $this->withHeaders(['X-Test-JWT' => $jwt])
            ->deleteJson("/api/posts/{$post->id}/like");

        // レスポンスを検証
        $actual->assertStatus(200);
        $actual->assertJsonPath('success', true);
        $actual->assertJsonPath('message', 'いいねを解除しました');

        // データベースからいいねが削除されていることを確認
        $this->assertDatabaseMissing('likes', [
            'user_id' => $user->id,
            'post_id' => $post->id
        ]);
    }

}