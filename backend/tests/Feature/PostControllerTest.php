<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Post;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Kreait\Firebase\Auth;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PostControllerTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function 全投稿を取得できる()
    {
        // テストデータを作成
        $user1 = User::factory()->create(['name' => 'ユーザー1']);
        $user2 = User::factory()->create(['name' => 'ユーザー2']);

        $post1 = Post::factory()->create([
            'user_id' => $user1->id,
            'body' => '投稿1の内容'
        ]);

        $post2 = Post::factory()->create([
            'user_id' => $user2->id,
            'body' => '投稿2の内容'
        ]);

        // API呼び出し
        $response = $this->getJson('/api/posts');

        // レスポンス検証
        $response->assertStatus(200)
            ->assertJson([
                'success' => true
            ])
            ->assertJsonStructure([
                'success',
                'posts' => [
                    '*' => [
                        'id',
                        'body',
                        'user' => [
                            'id',
                            'name',
                            'email'
                        ],
                        'likes_count',
                        'is_liked',
                        'is_owner'
                    ]
                ],
                'current_user_id',
                'pagination' => [
                    'current_page',
                    'total',
                    'per_page'
                ]
            ]);

        // 投稿数の確認
        $responseData = $response->json();
        $this->assertCount(2, $responseData['posts']);

        // 投稿内容の確認
        $this->assertEquals('投稿1の内容', $responseData['posts'][0]['body']);
        $this->assertEquals('投稿2の内容', $responseData['posts'][1]['body']);
    }

    #[Test]
    public function ログイン中のユーザーがいいねした投稿はハートアイコンが赤色で表示される()
    {
        // テストデータを作成
        $user = User::factory()->create(['name' => 'テストユーザー']);

        // いいねした投稿を作成
        $likedPost = Post::factory()->create([
            'user_id' => $user->id,
            'body' => 'いいねテスト投稿'
        ]);

        // いいねしていない投稿を作成
        $notLikedPost = Post::factory()->create([
            'user_id' => $user->id,
            'body' => 'いいねしていないテスト投稿'
        ]);

        // ユーザーが最初の投稿にのみいいねする
        $likedPost->likes()->create(['user_id' => $user->id]);

        // JWTトークンを作成してテスト用ヘッダーで送信
        $jwt = $this->createJwtToken($user);

        // テスト用ヘッダーでJWTを送信
        $response = $this->call('GET', '/api/posts', [], [
            'auth_jwt' => $jwt
        ]);

        // レスポンス検証
        $response->assertStatus(200)
            ->assertJson([
                'success' => true
            ]);

        $responseData = $response->json();

        // 投稿の中からいいねした投稿といいねしていない投稿を見つける
        $likedPostData = null;
        $notLikedPostData = null;

        foreach ($responseData['posts'] as $post) {
            if ($post['id'] == $likedPost->id) {
                $likedPostData = $post;
            }
            if ($post['id'] == $notLikedPost->id) {
                $notLikedPostData = $post;
            }
        }

        // アサーション。第二引数はテストが失敗したときに出力されるエラーメッセージ
        $this->assertNotNull($likedPostData, 'いいねした投稿が見つかりません');
        $this->assertNotNull($notLikedPostData, 'いいねしていない投稿が見つかりません');

        // いいねした投稿のis_likedがtrueであることを確認
        $this->assertTrue($likedPostData['is_liked']);
        $this->assertEquals(1, $likedPostData['likes_count']);

        // いいねしていない投稿のis_likedがfalseであることを確認
        $this->assertFalse($notLikedPostData['is_liked']);
        $this->assertEquals(0, $notLikedPostData['likes_count']);

        // current_user_idの確認
        $this->assertEquals($user->id, $responseData['current_user_id']);
    }

    #[Test]
    public function ログイン中のユーザーによる投稿には削除マークが表示される()
    {
        // テストデータを作成
        $user = User::factory()->create(['name' => '投稿者ユーザー']);
        $otherUser = User::factory()->create(['name' => '他のユーザー']);

        // 各ユーザーの投稿を作成
        $myPost = Post::factory()->create([
            'user_id' => $user->id,
            'body' => '自分の投稿'
        ]);

        $otherPost = Post::factory()->create([
            'user_id' => $otherUser->id,
            'body' => '他人の投稿'
        ]);

        // JWTトークンを作成してテスト用ヘッダーで送信
        $jwt = $this->createJwtToken($user);

        // テスト用ヘッダーでJWTを送信
        $response = $this->call('GET', '/api/posts', [], [
            'auth_jwt' => $jwt
        ]);

        // レスポンス検証
        $response->assertStatus(200)
            ->assertJson([
                'success' => true
            ]);

        $responseData = $response->json();

        // 投稿の中から自分の投稿と他人の投稿を見つける
        $myPostData = null;
        $otherPostData = null;

        foreach ($responseData['posts'] as $post) {
            if ($post['id'] == $myPost->id) {
                $myPostData = $post;
            }
            if ($post['id'] == $otherPost->id) {
                $otherPostData = $post;
            }
        }

        // アサーション
        $this->assertNotNull($myPostData, '自分の投稿が見つかりません');
        $this->assertNotNull($otherPostData, '他人の投稿が見つかりません');

        // 自分の投稿には削除権限がある（is_owner = true）
        $this->assertTrue($myPostData['is_owner'], '自分の投稿のis_ownerがtrueになっていません');

        // 他人の投稿には削除権限がない（is_owner = false）
        $this->assertFalse($otherPostData['is_owner'], '他人の投稿のis_ownerがfalseになっていません');

        // current_user_idの確認
        $this->assertEquals($user->id, $responseData['current_user_id'], 'current_user_idが期待する値と一致しません');
    }

    #[Test]
    public function 投稿詳細ページで投稿本文と投稿者名が表示される(): void
    {
        // テスト用ユーザーと投稿を作成
        $expectedUserName = 'テストユーザー太郎';
        $expectedPostBody = 'これはテスト用の投稿本文です';
        $user = User::factory()->create([
            'name' => $expectedUserName
        ]);
        $post = Post::factory()->for($user)->create([
            'body' => $expectedPostBody
        ]);

        // JWTトークンを作成
        $jwt = $this->createJwtToken($user);

        // 投稿詳細取得APIを呼び出し
        $actual = $this->call('GET', "/api/posts/{$post->id}", [], [
            'auth_jwt' => $jwt
        ]);

        // レスポンス構造と内容を検証
        $actual->assertStatus(200);
        $actual->assertJsonStructure([
            'success',
            'post' => [
                'id',
                'body',
                'user' => [
                    'id',
                    'name'
                ]
            ],
            'current_user_id'
        ]);
        $actual->assertJsonPath('success', true);
        $actual->assertJsonPath('post.body', $expectedPostBody);
        $actual->assertJsonPath('post.user.name', $expectedUserName);
    }

    #[Test]
    public function 投稿詳細でログイン中ユーザーがいいねした投稿は正しく表示される(): void
    {
        // テスト用ユーザーと投稿を作成
        $user = User::factory()->create(['name' => 'テストユーザー']);
        $post = Post::factory()->for($user)->create(['body' => 'いいねテスト投稿']);

        // ユーザーが投稿にいいねする
        $post->likes()->create(['user_id' => $user->id]);

        // JWTトークンを作成
        $jwt = $this->createJwtToken($user);

        // 投稿詳細取得APIを呼び出し
        $actual = $this->call('GET', "/api/posts/{$post->id}", [], [
            'auth_jwt' => $jwt
        ]);

        // いいね状態が正しく返されることを検証
        $actual->assertStatus(200);
        $actual->assertJsonPath('success', true);
        $actual->assertJsonPath('post.is_liked', true);
        $actual->assertJsonPath('post.likes_count', 1);
        $actual->assertJsonPath('current_user_id', $user->id);
    }

    #[Test]
    public function 投稿詳細で自分の投稿には削除権限が付与される(): void
    {
        // テスト用ユーザーと投稿を作成
        $user = User::factory()->create(['name' => '投稿者ユーザー']);
        $post = Post::factory()->for($user)->create(['body' => '自分の投稿']);

        // JWTトークンを作成
        $jwt = $this->createJwtToken($user);

        // 投稿詳細取得APIを呼び出し
        $actual = $this->call('GET', "/api/posts/{$post->id}", [], [
            'auth_jwt' => $jwt
        ]);

        // 削除権限が正しく返されることを検証
        $actual->assertStatus(200);
        $actual->assertJsonPath('success', true);
        $actual->assertJsonPath('post.is_owner', true);
        $actual->assertJsonPath('current_user_id', $user->id);
    }

    #[Test]
    public function 投稿詳細で他人の投稿には削除権限が付与されない(): void
    {
        // 投稿者と閲覧者の2人のユーザーを作成
        $postAuthor = User::factory()->create(['name' => '投稿者']);
        $viewer = User::factory()->create(['name' => '閲覧者']);
        $post = Post::factory()->for($postAuthor)->create(['body' => '他人の投稿']);

        // 閲覧者のJWTトークンを作成
        $jwt = $this->createJwtToken($viewer);

        // 閲覧者として投稿詳細取得APIを呼び出し
        $actual = $this->call('GET', "/api/posts/{$post->id}", [], [
            'auth_jwt' => $jwt
        ]);

        // 削除権限が付与されないことを検証
        $actual->assertStatus(200);
        $actual->assertJsonPath('success', true);
        $actual->assertJsonPath('post.is_owner', false);
        $actual->assertJsonPath('current_user_id', $viewer->id);
    }

    #[Test]
    public function 未ログインで投稿詳細にアクセスすると401エラーが返される(): void
    {
        // テスト用投稿を作成
        $user = User::factory()->create();
        $post = Post::factory()->for($user)->create(['body' => 'テスト投稿']);

        // JWTトークンなしで投稿詳細にアクセス
        $actual = $this->getJson("/api/posts/{$post->id}");

        // 401エラーが返されることを確認
        $actual->assertStatus(401);
        $actual->assertJsonPath('success', false);
        $actual->assertJsonPath('error', '認証が必要です');
    }

    #[Test]
    public function 存在しない投稿にアクセスすると404エラーが返される(): void
    {
        // 存在しないIDで投稿詳細にアクセス
        $user = User::factory()->create();
        $jwt = $this->createJwtToken($user);
        $nonExistentId = 99999;

        $actual = $this->call('GET', "/api/posts/{$nonExistentId}", [], [
            'auth_jwt' => $jwt
        ]);

        // 404エラーが返されることを確認
        $actual->assertStatus(404);
        $actual->assertJsonPath('success', false);
        $actual->assertJsonPath('error', '投稿が見つかりません');
    }

    #[Test]
    public function 投稿一覧でいいね数が0の投稿が正しく表示される(): void
    {
        // いいね数が0の投稿を作成
        $user = User::factory()->create();
        $post = Post::factory()->for($user)->create(['body' => 'いいね数0の投稿']);

        $jwt = $this->createJwtToken($user);

        // 投稿一覧取得APIを呼び出し
        $actual = $this->call('GET', '/api/posts', [], [
            'auth_jwt' => $jwt
        ]);

        // いいね数が0であることを確認
        $actual->assertStatus(200);
        $actual->assertJsonPath('success', true);
        $actual->assertJsonPath('posts.0.likes_count', 0);
    }

    #[Test]
    public function 投稿一覧で複数のいいねがある投稿が正しく表示される(): void
    {
        // いいね数が複数の投稿を作成
        $user = User::factory()->create();
        $otherUsers = User::factory()->count(3)->create();
        $post = Post::factory()->for($user)->create(['body' => 'いいね数3の投稿']);

        // 3人のユーザーがいいねする
        foreach ($otherUsers as $otherUser) {
            $post->likes()->create(['user_id' => $otherUser->id]);
        }

        $jwt = $this->createJwtToken($user);

        // 投稿一覧取得APIを呼び出し
        $actual = $this->call('GET', '/api/posts', [], [
            'auth_jwt' => $jwt
        ]);

        // いいね数が3であることを確認
        $actual->assertStatus(200);
        $actual->assertJsonPath('success', true);
        $actual->assertJsonPath('posts.0.likes_count', 3);
    }

    #[Test]
    public function 投稿詳細でいいね数が0の投稿が正しく表示される(): void
    {
        // いいね数が0の投稿を作成
        $user = User::factory()->create();
        $post = Post::factory()->for($user)->create(['body' => 'いいね数0の投稿詳細']);

        $jwt = $this->createJwtToken($user);

        // 投稿詳細取得APIを呼び出し
        $actual = $this->call('GET', "/api/posts/{$post->id}", [], [
            'auth_jwt' => $jwt
        ]);

        // いいね数が0であることを確認
        $actual->assertStatus(200);
        $actual->assertJsonPath('success', true);
        $actual->assertJsonPath('post.likes_count', 0);
    }

    #[Test]
    public function 投稿詳細で複数のいいねがある投稿が正しく表示される(): void
    {
        // いいね数が複数の投稿を作成
        $user = User::factory()->create();
        $otherUsers = User::factory()->count(5)->create();
        $post = Post::factory()->for($user)->create(['body' => 'いいね数5の投稿詳細']);

        // 5人のユーザーがいいねする
        foreach ($otherUsers as $otherUser) {
            $post->likes()->create(['user_id' => $otherUser->id]);
        }

        $jwt = $this->createJwtToken($user);

        // 投稿詳細取得APIを呼び出し
        $actual = $this->call('GET', "/api/posts/{$post->id}", [], [
            'auth_jwt' => $jwt
        ]);

        // いいね数が5であることを確認
        $actual->assertStatus(200);
        $actual->assertJsonPath('success', true);
        $actual->assertJsonPath('post.likes_count', 5);
    }

    #[Test]
    public function ログイン済みのユーザーは投稿を送信できる(): void
    {
        // arrange
        $user = User::factory()->create(['name' => 'テストユーザー']);
        $inputBody = 'これはテスト投稿です';
        $inputJwt = $this->createJwtToken($user);

        // act
        $response = $this->call('POST', '/api/posts', [
            'body' => $inputBody
        ], [
            'auth_jwt' => $inputJwt
        ]);
        $actual = $response;

        // assert
        $actual->assertStatus(201);
        $actual->assertJsonStructure([
            'success',
            'post' => [
                'id',
                'body',
                'user' => [
                    'id',
                    'name'
                ],
                'likes_count'
            ]
        ]);
        $actual->assertJsonPath('success', true);
        $actual->assertJsonPath('post.body', $inputBody);
        $actual->assertJsonPath('post.user.name', $user->name);
        $actual->assertJsonPath('post.likes_count', 0);

        // データベースに投稿が保存されていることを確認
        $this->assertDatabaseHas('posts', [
            'body' => $inputBody,
            'user_id' => $user->id
        ]);
    }

    #[Test]
    public function 未ログインユーザーは投稿を送信できない(): void
    {
        // arrange
        $inputBody = 'ログインしていないユーザーからの投稿';

        // act - JWTトークンなしで投稿を試行
        $actual = $this->postJson('/api/posts', [
            'body' => $inputBody
        ]);

        // assert
        $actual->assertStatus(401);
        $actual->assertJsonPath('success', false);
        $actual->assertJsonPath('error', '認証が必要です');

        // データベースに投稿が保存されていないことを確認
        $this->assertDatabaseMissing('posts', [
            'body' => $inputBody
        ]);
    }

    #[Test]
    public function 投稿内容が未入力の場合バリデーションメッセージが表示される(): void
    {
        // arrange
        $user = User::factory()->create(['name' => 'テストユーザー']);
        $inputJwt = $this->createJwtToken($user);

        // act - 空の投稿内容で送信
        $actual = $this->call('POST', '/api/posts', [
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

        // データベースに投稿が保存されていないことを確認
        $this->assertDatabaseMissing('posts', [
            'body' => ''
        ]);
    }

    #[Test]
    public function 投稿内容が120文字を超過した場合バリデーションメッセージが表示される(): void
    {
        // arrange
        $user = User::factory()->create(['name' => 'テストユーザー']);
        $inputJwt = $this->createJwtToken($user);
        $inputBody = str_repeat('あ', 121); // 121文字の投稿内容

        // act
        $actual = $this->call('POST', '/api/posts', [
            'body' => $inputBody
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

        // データベースに投稿が保存されていないことを確認
        $this->assertDatabaseMissing('posts', [
            'body' => $inputBody
        ]);
    }

}
