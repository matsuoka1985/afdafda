<?php

namespace App\Http\Controllers;

use App\Services\LikeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Exception;

class LikeController extends Controller
{
    private $likeService;

    public function __construct(LikeService $likeService)
    {
        $this->likeService = $likeService;
    }

    public function store(Request $request, $postId)
    {
        try {
            $jwt = $request->cookie('auth_jwt');
            
            // テスト環境では追加でヘッダーからもJWTをチェック
            if (app()->environment('testing') && empty($jwt)) {
                $jwt = $request->header('X-Test-JWT');
            }
            
            if (empty($jwt)) {
                return response()->json([
                    'success' => false,
                    'error' => '認証が必要です'
                ], 401);
            }

            $result = $this->likeService->createLike($postId, $jwt);
            return response()->json($result, 201);

        } catch (Exception $e) {
            Log::error('いいね作成エラー', ['error' => $e->getMessage()]);
            
            if ($e->getMessage() === 'ユーザーが見つかりません' || $e->getMessage() === '投稿が見つかりません') {
                return response()->json([
                    'success' => false,
                    'error' => $e->getMessage()
                ], 404);
            }
            
            if ($e->getMessage() === '既にいいねしています') {
                return response()->json([
                    'success' => false,
                    'error' => $e->getMessage()
                ], 409);
            }
            
            return response()->json([
                'success' => false,
                'error' => 'いいねの作成に失敗しました'
            ], 500);
        }
    }


    public function destroy(Request $request, $postId)
    {
        try {
            $jwt = $request->cookie('auth_jwt');
            
            // テスト環境では追加でヘッダーからもJWTをチェック
            if (app()->environment('testing') && empty($jwt)) {
                $jwt = $request->header('X-Test-JWT');
            }
            
            if (empty($jwt)) {
                return response()->json([
                    'success' => false,
                    'error' => '認証が必要です'
                ], 401);
            }

            $result = $this->likeService->removeLike($postId, $jwt);
            return response()->json($result);

        } catch (Exception $e) {
            Log::error('いいね解除エラー', ['error' => $e->getMessage()]);
            
            if ($e->getMessage() === 'ユーザーが見つかりません' || $e->getMessage() === 'いいねが見つかりません') {
                return response()->json([
                    'success' => false,
                    'error' => $e->getMessage()
                ], 404);
            }
            
            return response()->json([
                'success' => false,
                'error' => 'いいねの解除に失敗しました'
            ], 500);
        }
    }
}
