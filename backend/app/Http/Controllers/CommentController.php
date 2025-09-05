<?php

namespace App\Http\Controllers;

use App\Http\Requests\CommentStoreRequest;
use App\Services\CommentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Exception;

class CommentController extends Controller
{
    private $commentService;

    public function __construct(CommentService $commentService)
    {
        $this->commentService = $commentService;
    }
    public function index(Request $request, string $postId)
    {
        try {
            $perPage = $request->get('per_page', 10);
            $page = $request->get('page', 1);

            $result = $this->commentService->getCommentsByPostId($postId, $perPage, $page);
            return response()->json($result);

        } catch (Exception $e) {
            Log::error('コメント一覧取得エラー', ['error' => $e->getMessage(), 'post_id' => $postId]);
            
            if ($e->getMessage() === '投稿が見つかりません') {
                return response()->json([
                    'success' => false,
                    'error' => $e->getMessage()
                ], 404);
            }
            
            return response()->json([
                'success' => false,
                'error' => 'コメントの取得に失敗しました'
            ], 500);
        }
    }


    public function store(CommentStoreRequest $request, string $postId)
    {
        try {
            $jwt = $request->cookie('auth_jwt');
            
            if (empty($jwt)) {
                return response()->json([
                    'success' => false,
                    'error' => '認証が必要です'
                ], 401);
            }

            $result = $this->commentService->createComment($postId, $request->validated(), $jwt);
            return response()->json($result, 201);

        } catch (Exception $e) {
            Log::error('コメント作成エラー', [
                'error' => $e->getMessage(),
                'post_id' => $postId,
                'trace' => $e->getTraceAsString()
            ]);
            
            if ($e->getMessage() === '投稿が見つかりません') {
                return response()->json([
                    'success' => false,
                    'error' => $e->getMessage()
                ], 404);
            }
            
            if ($e->getMessage() === 'ユーザーが見つかりません') {
                return response()->json([
                    'success' => false,
                    'error' => $e->getMessage()
                ], 404);
            }
            
            return response()->json([
                'success' => false,
                'error' => 'コメントの投稿に失敗しました'
            ], 500);
        }
    }
}
