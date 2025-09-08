<?php

namespace App\Services;

use App\Repositories\UserRepositoryInterface;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Auth;
use Exception;

class AuthVerifyService
{
    private $firebaseAuth;
    private $userRepository;

    public function __construct(?Auth $firebaseAuth, UserRepositoryInterface $userRepository)
    {
        $this->firebaseAuth = $firebaseAuth;
        $this->userRepository = $userRepository;
    }

    /**
     * IDトークンを検証してユーザー情報を返す
     */
    public function verifyToken(string $idToken): array
    {
        if (!$this->firebaseAuth) {
            throw new Exception('Firebase Auth is not available');
        }
        
        $verifiedIdToken = $this->firebaseAuth->verifyIdToken($idToken);
        $firebaseUid = $verifiedIdToken->claims()->get('sub');
        $email = $verifiedIdToken->claims()->get('email');
        
        Log::info('Firebase Admin SDK 検証成功', [
            'firebase_uid' => $firebaseUid,
            'firebase_email' => $email,
            'jwt_exp' => $verifiedIdToken->claims()->get('exp')
        ]);

        return [
            'uid' => $firebaseUid,
            'email' => $email,
            'token' => $idToken,
            'exp' => $verifiedIdToken->claims()->get('exp')
        ];
    }

    /**
     * JWTから認証状態を確認
     */
    public function checkAuth(string $jwt): array
    {
        if (!$this->firebaseAuth) {
            throw new Exception('Firebase Auth is not available');
        }
        
        $verifiedIdToken = $this->firebaseAuth->verifyIdToken($jwt);
        $firebaseUid = $verifiedIdToken->claims()->get('sub');
        $firebaseEmail = $verifiedIdToken->claims()->get('email');
        $expiry = $verifiedIdToken->claims()->get('exp');

        Log::info('JWT検証成功', [
            'firebase_uid' => $firebaseUid,
            'firebase_email' => $firebaseEmail,
            'jwt_exp' => $expiry->format('Y-m-d H:i:s')
        ]);

        return [
            'uid' => $firebaseUid,
            'email' => $firebaseEmail,
            'expires_at' => $expiry->format('Y-m-d H:i:s')
        ];
    }

    /**
     * Bearerトークンを検証
     */
    public function checkBearerToken(string $idToken): array
    {
        if (!$this->firebaseAuth) {
            throw new Exception('Firebase Auth is not available');
        }
        
        $verifiedIdToken = $this->firebaseAuth->verifyIdToken($idToken);
        $uid = $verifiedIdToken->claims()->get('sub');

        return [
            'uid' => $uid,
            'message' => 'Token is valid'
        ];
    }

    /**
     * Firebase認証でログインしてユーザー情報をDBに同期
     */
    public function firebaseLogin(string $idToken): array
    {
        if (!$this->firebaseAuth) {
            throw new Exception('Firebase Auth is not available');
        }
        
        $verifiedIdToken = $this->firebaseAuth->verifyIdToken($idToken);
        $uid = $verifiedIdToken->claims()->get('sub');
        
        $firebaseUser = $this->firebaseAuth->getUser($uid);
        
        $email = $firebaseUser->email;
        if (!$email) {
            throw new Exception('Firebase user has no email; cannot sync with current schema');
        }

        $displayName = $firebaseUser->displayName
            ?: (strpos($email, '@') !== false ? strstr($email, '@', true) : 'User');

        $user = $this->userRepository->findByEmail($email);
        
        if (!$user) {
            $user = $this->userRepository->create([
                'firebase_uid' => $uid,
                'name' => $displayName,
                'email' => $email,
                'email_verified_at' => $firebaseUser->emailVerified ? now() : null,
            ]);
            $newUser = true;
        } else {
            $this->userRepository->update($user, [
                'name' => $displayName,
                'firebase_uid' => $uid,
            ]);
            $newUser = false;
        }

        // Firebase Session Cookie を作成（24時間有効）
        try {
            $sessionCookie = $this->firebaseAuth->createSessionCookie($idToken, 60 * 60 * 24);
            $tokenType = 'session_cookie';
            $token = $sessionCookie;
        } catch (Exception $e) {
            // Session Cookie作成に失敗した場合は従来のIDトークンを使用
            Log::warning('Firebase Session Cookie作成失敗、IDトークンを使用', ['error' => $e->getMessage()]);
            $tokenType = 'id_token';
            $token = $idToken;
        }

        return [
            'success' => true,
            'new_user' => $newUser,
            'user' => [
                'id' => $user->id,
                'firebase_uid' => $user->firebase_uid,
                'email' => $user->email,
                'name' => $user->name,
            ],
            'token' => $token,
            'token_type' => $tokenType
        ];
    }

    /**
     * Firebase Session Cookieから認証状態を確認
     */
    public function checkSessionCookie(string $sessionCookie): array
    {
        if (!$this->firebaseAuth) {
            throw new Exception('Firebase Auth is not available');
        }
        
        $decodedClaims = $this->firebaseAuth->verifySessionCookie($sessionCookie);
        $firebaseUid = $decodedClaims->claims()->get('sub');
        $firebaseEmail = $decodedClaims->claims()->get('email');
        $expiry = $decodedClaims->claims()->get('exp');

        Log::info('Firebase Session Cookie検証成功', [
            'firebase_uid' => $firebaseUid,
            'firebase_email' => $firebaseEmail,
            'expires_at' => date('Y-m-d H:i:s', $expiry)
        ]);

        return [
            'uid' => $firebaseUid,
            'email' => $firebaseEmail,
            'expires_at' => date('Y-m-d H:i:s', $expiry)
        ];
    }

    /**
     * 汎用認証チェック（Session CookieまたはIDトークンを自動判別）
     */
    public function checkAuthToken(string $token): array
    {
        if (!$this->firebaseAuth) {
            throw new Exception('Firebase Auth is not available');
        }

        // まずSession Cookieとして検証を試行
        try {
            return $this->checkSessionCookie($token);
        } catch (Exception $e) {
            Log::info('Session Cookie検証失敗、IDトークンとして再試行', ['error' => $e->getMessage()]);
            
            // Session Cookie検証失敗時はIDトークンとして検証
            return $this->checkAuth($token);
        }
    }
}