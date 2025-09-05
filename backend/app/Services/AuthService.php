<?php

namespace App\Services;

use App\Contracts\FirebaseAuthInterface;
use App\Repositories\UserRepositoryInterface;
use Illuminate\Support\Facades\Log;
use Exception;

class AuthService
{
    private $firebaseAuth;
    private $userRepository;

    public function __construct(FirebaseAuthInterface $firebaseAuth, UserRepositoryInterface $userRepository)
    {
        $this->firebaseAuth = $firebaseAuth;
        $this->userRepository = $userRepository;
    }

    /**
     * ユーザー登録処理
     */
    public function register(array $userData): array
    {
        try {
            // Firebase Authのユーザー情報を確認
            $this->validateFirebaseUser($userData['firebase_uid']);
            
            // Laravel DBにユーザー作成
            $user = $this->userRepository->create([
                'firebase_uid' => $userData['firebase_uid'],
                'name' => $userData['name'],
                'email' => $userData['email'],
            ]);

            Log::info('User registered successfully', [
                'user_id' => $user->id,
                'firebase_uid' => $userData['firebase_uid'],
                'name' => $userData['name']
            ]);

            return [
                'success' => true,
                'message' => 'ユーザー登録が完了しました',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'firebase_uid' => $user->firebase_uid
                ]
            ];

        } catch (Exception $e) {
            Log::error('User registration failed', [
                'error' => $e->getMessage(),
                'firebase_uid' => $userData['firebase_uid'] ?? null
            ]);

            // エラー時にFirebase Authからユーザーを削除
            $this->deleteFirebaseUser($userData['firebase_uid']);

            throw $e;
        }
    }

    /**
     * ログイン処理
     */
    public function login(string $firebaseUid): array
    {
        $user = $this->userRepository->findByFirebaseUid($firebaseUid);
        
        if (!$user) {
            throw new Exception('ユーザーが見つかりません');
        }
        
        return [
            'success' => true,
            'message' => 'ログイン成功',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'firebase_uid' => $user->firebase_uid
            ]
        ];
    }

    /**
     * Firebase Authのユーザー存在確認
     */
    private function validateFirebaseUser(string $firebaseUid): void
    {
        try {
            $this->firebaseAuth->getUser($firebaseUid);
        } catch (Exception $e) {
            throw new Exception('Firebase ユーザーが見つかりません: ' . $e->getMessage());
        }
    }

    /**
     * Firebase Authからユーザー削除
     */
    public function deleteFirebaseUser(string $firebaseUid): void
    {
        try {
            $this->firebaseAuth->deleteUser($firebaseUid);
            Log::info('Firebase user deleted due to validation failure', [
                'firebase_uid' => $firebaseUid
            ]);
        } catch (Exception $e) {
            Log::error('Failed to delete Firebase user', [
                'firebase_uid' => $firebaseUid,
                'error' => $e->getMessage()
            ]);
        }
    }
}