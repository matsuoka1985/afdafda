<?php

namespace App\Http\Controllers;

use App\Http\Requests\PostStoreRequest;
use App\Services\PostService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Exception;

class PostController extends Controller
{
    private $postService;

    public function __construct(PostService $postService)
    {
        $this->postService = $postService;
    }
    public function index(Request $request)
    {
        try {
            $page = (int) $request->get('page', 1);
            $perPage = (int) $request->get('per_page', 20);
            $jwt = $request->cookie('auth_jwt');
            
            $result = $this->postService->getPosts($page, $perPage, $jwt);
            return response()->json($result);

        } catch (Exception $e) {
            Log::error('投稿一覧取得エラー', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'error' => '投稿の取得に失敗しました'
            ], 500);
        }
    }


    public function store(PostStoreRequest $request)
    {
        try {
            $jwt = $request->cookie('auth_jwt');

            if (empty($jwt)) {
                return response()->json([
                    'success' => false,
                    'error' => '認証が必要です'
                ], 401);
            }

            $result = $this->postService->createPost($request->validated(), $jwt);
            return response()->json($result, 201);

        } catch (Exception $e) {
            Log::error('投稿作成エラー', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);

            if ($e->getMessage() === 'ユーザーが見つかりません') {
                return response()->json([
                    'success' => false,
                    'error' => $e->getMessage()
                ], 404);
            }

            return response()->json([
                'success' => false,
                'error' => '投稿の作成に失敗しました',
                'debug' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    public function show(Request $request, string $id)
    {
        try {
            $jwt = $request->cookie('auth_jwt');
            
            // 認証チェック
            if (empty($jwt)) {
                return response()->json([
                    'success' => false,
                    'error' => '認証が必要です'
                ], 401);
            }
            
            $result = $this->postService->getPost($id, $jwt);
            return response()->json($result);

        } catch (Exception $e) {
            Log::error('投稿詳細取得エラー', ['error' => $e->getMessage(), 'post_id' => $id]);

            if ($e->getMessage() === '投稿が見つかりません') {
                return response()->json([
                    'success' => false,
                    'error' => $e->getMessage()
                ], 404);
            }

            return response()->json([
                'success' => false,
                'error' => '投稿の取得に失敗しました'
            ], 500);
        }
    }


    public function destroy(Request $request, $id)
    {
        try {
            $jwt = $request->cookie('auth_jwt');

            if (empty($jwt)) {
                return response()->json([
                    'success' => false,
                    'error' => '認証が必要です'
                ], 401);
            }

            $result = $this->postService->deletePost($id, $jwt);
            return response()->json($result);

        } catch (Exception $e) {
            Log::error('投稿削除エラー', ['error' => $e->getMessage()]);

            if ($e->getMessage() === 'ユーザーが見つかりません' || $e->getMessage() === '投稿が見つかりません') {
                return response()->json([
                    'success' => false,
                    'error' => $e->getMessage()
                ], 404);
            }

            if ($e->getMessage() === '他のユーザーの投稿は削除できません') {
                return response()->json([
                    'success' => false,
                    'error' => $e->getMessage()
                ], 403);
            }

            return response()->json([
                'success' => false,
                'error' => '投稿の削除に失敗しました'
            ], 500);
        }
    }

    public function restore(Request $request, $id)
    {
        try {
            $jwt = $request->cookie('auth_jwt');

            if (empty($jwt)) {
                return response()->json([
                    'success' => false,
                    'error' => '認証が必要です'
                ], 401);
            }

            $result = $this->postService->restorePost($id, $jwt);
            return response()->json($result);

        } catch (Exception $e) {
            Log::error('投稿復元エラー', ['error' => $e->getMessage()]);

            if ($e->getMessage() === 'ユーザーが見つかりません' || $e->getMessage() === '投稿が見つかりません') {
                return response()->json([
                    'success' => false,
                    'error' => $e->getMessage()
                ], 404);
            }

            if ($e->getMessage() === 'この投稿は削除されていません') {
                return response()->json([
                    'success' => false,
                    'error' => $e->getMessage()
                ], 400);
            }

            if ($e->getMessage() === '他のユーザーの投稿は復元できません') {
                return response()->json([
                    'success' => false,
                    'error' => $e->getMessage()
                ], 403);
            }

            return response()->json([
                'success' => false,
                'error' => '投稿の復元に失敗しました'
            ], 500);
        }
    }
}
