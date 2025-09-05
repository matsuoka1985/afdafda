<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Services\AuthService;
use Exception;

class AuthController extends Controller
{
    private $authService;
    
    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }
    
    public function register(RegisterRequest $request)
    {
        try {
            $result = $this->authService->register($request->validated());
            return response()->json($result, 201);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'ユーザー登録に失敗しました',
                'details' => $e->getMessage()
            ], 500);
        }
    }
    
    
    public function login(LoginRequest $request)
    {
        try {
            $result = $this->authService->login($request->firebase_uid);
            return response()->json($result);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'ログインに失敗しました',
                'details' => $e->getMessage()
            ], 500);
        }
    }
}
