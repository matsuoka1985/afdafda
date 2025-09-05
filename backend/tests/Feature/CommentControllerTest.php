<?php

namespace Tests\Feature;

use App\Models\Comment;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CommentControllerTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function 投稿に紐付くコメント一覧を取得でき本文と投稿者名が表示される(): void
    {
        // 準備：ユーザー、投稿、コメントを作成
        $expectedUserName = 'テストユーザー太郎';
        $expectedCommentBody = 'これはテスト用のコメント本文です';
        $testUser = User::factory()->create([
            'name' => $expectedUserName
        ]);
        $testPost = Post::factory()->for($testUser)->create();

        // 複数のコメントを作成（期待するコメントを最後に作成して最初に表示されるようにする）
        Comment::factory()->count(2)->for($testPost)->for($testUser)->create();
        Comment::factory()->for($testPost)->for($testUser)->create([
            'body' => $expectedCommentBody
        ]);
        $expectedCommentsCount = 3;

        // 実行：コメント一覧取得APIを呼び出し
        $actual = $this->getJson("/api/posts/{$testPost->id}/comments");

        // 検証：レスポンス構造、コメント数、本文、投稿者名をまとめて確認
        $actual->assertStatus(200);
        $actual->assertJsonStructure([
            'success',
            'comments' => [
                '*' => [
                    'id',
                    'body',
                    'user' => [
                        'id',
                        'name'
                    ]
                ]
            ],
            'pagination'
        ]);
        $actual->assertJsonPath('success', true);
        $actual->assertJsonCount($expectedCommentsCount, 'comments');
        $actual->assertJsonPath('comments.2.body', $expectedCommentBody);
        $actual->assertJsonPath('comments.2.user.name', $expectedUserName);
    }

    #[Test]
    public function ログイン済みのユーザーはコメントを送信できる(): void
    {
        // arrange
        $testUser = User::factory()->create(['name' => 'テストユーザー']);
        $testPost = Post::factory()->for($testUser)->create();
        $inputCommentBody = 'これはテストコメントです';
        $inputJwt = $this->createJwtToken($testUser);

        // act
        $response = $this->call('POST', "/api/posts/{$testPost->id}/comments", [
            'body' => $inputCommentBody
        ], [
            'auth_jwt' => $inputJwt
        ]);
        $actual = $response;

        // assert
        $actual->assertStatus(201);
        $actual->assertJsonStructure([
            'success',
            'comment' => [
                'id',
                'body',
                'user' => [
                    'id',
                    'name'
                ]
            ]
        ]);
        $actual->assertJsonPath('success', true);
        $actual->assertJsonPath('comment.body', $inputCommentBody);
        $actual->assertJsonPath('comment.user.name', $testUser->name);

        // データベースにコメントが保存されていることを確認
        $this->assertDatabaseHas('comments', [
            'body' => $inputCommentBody,
            'user_id' => $testUser->id,
            'post_id' => $testPost->id
        ]);
    }

    #[Test]
    public function ログイン前のユーザーはコメントを送信できない(): void
    {
        // arrange
        $testUser = User::factory()->create();
        $testPost = Post::factory()->for($testUser)->create();
        $inputCommentBody = 'これはテストコメントです';

        // act - JWTトークンなしで投稿を試行
        $actual = $this->call('POST', "/api/posts/{$testPost->id}/comments", [
            'body' => $inputCommentBody
        ]);

        // assert
        $actual->assertStatus(401);
        $actual->assertJsonStructure([
            'success',
            'error'
        ]);
        $actual->assertJsonPath('success', false);
        $actual->assertJsonPath('error', '認証が必要です');

        // データベースにコメントが保存されていないことを確認
        $this->assertDatabaseMissing('comments', [
            'body' => $inputCommentBody
        ]);
    }

    #[Test]
    public function コメント内容が未入力の場合バリデーションメッセージが表示される(): void
    {
        // arrange
        $testUser = User::factory()->create(['name' => 'テストユーザー']);
        $testPost = Post::factory()->for($testUser)->create();
        $inputJwt = $this->createJwtToken($testUser);

        // act - 空のコメント内容で送信
        $actual = $this->call('POST', "/api/posts/{$testPost->id}/comments", [
            'body' => ''
        ], [
            'auth_jwt' => $inputJwt
        ]);

        // assert
        $actual->assertStatus(422);
        $actual->assertJsonStructure([
            'success',
            'error',
            'details' => [
                'body'
            ]
        ]);
        $actual->assertJsonPath('success', false);
        $actual->assertJsonPath('error', 'バリデーションエラー');

        // データベースにコメントが保存されていないことを確認
        $this->assertDatabaseMissing('comments', [
            'body' => ''
        ]);
    }

    #[Test]
    public function コメント内容が120文字を超過した場合バリデーションメッセージが表示される(): void
    {
        // arrange
        $testUser = User::factory()->create(['name' => 'テストユーザー']);
        $testPost = Post::factory()->for($testUser)->create();
        $inputJwt = $this->createJwtToken($testUser);
        $inputCommentBody = str_repeat('あ', 121); // 121文字のコメント内容

        // act
        $actual = $this->call('POST', "/api/posts/{$testPost->id}/comments", [
            'body' => $inputCommentBody
        ], [
            'auth_jwt' => $inputJwt
        ]);

        // assert
        $actual->assertStatus(422);
        $actual->assertJsonStructure([
            'success',
            'error',
            'details' => [
                'body'
            ]
        ]);
        $actual->assertJsonPath('success', false);
        $actual->assertJsonPath('error', 'バリデーションエラー');

        // データベースにコメントが保存されていないことを確認
        $this->assertDatabaseMissing('comments', [
            'body' => $inputCommentBody
        ]);
    }
}
