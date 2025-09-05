<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AuthVerifyController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\LikeController;
use App\Http\Controllers\CommentController;

Route::post('/auth/check-token', [AuthVerifyController::class, 'checkToken']);

Route::post('/auth/firebase-login', [AuthVerifyController::class, 'firebaseLogin']);

// 新しい認証エンドポイント
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

// Firebase Admin SDK 認証検証（HTTP-Only Cookie）
Route::post('/auth/verify-token', [AuthVerifyController::class, 'verifyAndSetCookie']);
Route::get('/auth/check', [AuthVerifyController::class, 'checkAuth']);
Route::post('/auth/logout', [AuthVerifyController::class, 'logout']);

// 投稿関連のエンドポイント
Route::get('/posts', [PostController::class, 'index']);
Route::post('/posts', [PostController::class, 'store']);
Route::get('/posts/{id}', [PostController::class, 'show']);
Route::delete('/posts/{id}', [PostController::class, 'destroy']);
Route::post('/posts/{id}/restore', [PostController::class, 'restore']);

// いいね関連のエンドポイント
Route::post('/posts/{postId}/like', [LikeController::class, 'store']);
Route::delete('/posts/{postId}/like', [LikeController::class, 'destroy']);

// コメント関連のエンドポイント
Route::get('/posts/{postId}/comments', [CommentController::class, 'index']);
Route::post('/posts/{postId}/comments', [CommentController::class, 'store']);
