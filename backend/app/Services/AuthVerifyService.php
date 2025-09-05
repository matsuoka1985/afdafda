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

    public function __construct(Auth $firebaseAuth, UserRepositoryInterface $userRepository)
    {
        $this->firebaseAuth = $firebaseAuth;
        $this->userRepository = $userRepository;
    }

    /**
     * IDトークンを検証してユーザー情報を返す
     */
    public function verifyToken(string $idToken): array
    {
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

        return [
            'success' => true,
            'new_user' => $newUser,
            'user' => [
                'id' => $user->id,
                'firebase_uid' => $user->firebase_uid,
                'email' => $user->email,
                'name' => $user->name,
            ],
            'token' => $idToken
        ];
    }
}