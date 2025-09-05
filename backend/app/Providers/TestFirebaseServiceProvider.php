<?php

namespace App\Providers;

use App\Contracts\FirebaseAuthInterface;
use App\Repositories\UserRepositoryInterface;
use App\Services\FirebaseAuthAdapter;
use Illuminate\Support\ServiceProvider;
use Kreait\Firebase\Auth;

class TestFirebaseServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        // テスト環境では常にモック実装を使用
        if ($this->app->environment('testing') || $this->app->runningUnitTests()) {
            $this->app->singleton(FirebaseAuthInterface::class, function ($app) {
                $userRepository = $app->make(UserRepositoryInterface::class);
                return new TestFirebaseAuth($userRepository);
            });
        } else {
            // 本番環境用のFirebase Auth実装をバインド
            $this->app->singleton(FirebaseAuthInterface::class, function ($app) {
                $firebaseAuth = $app->make(Auth::class);
                return new FirebaseAuthAdapter($firebaseAuth);
            });
        }
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        //
    }
}

/**
 * テスト用Firebase Auth実装  
 */
class TestFirebaseAuth implements FirebaseAuthInterface
{
    private $userRepository;

    public function __construct(UserRepositoryInterface $userRepository)
    {
        $this->userRepository = $userRepository;
    }

    public function verifyIdToken(string $jwt)
    {
        // テスト用JWTをデコード
        $payload = json_decode(base64_decode($jwt), true);
        if (!$payload || !isset($payload['sub'])) {
            throw new \Exception('Invalid token');
        }

        return new TestIdToken($payload['sub']);
    }

    public function getUser(string $firebaseUid)
    {
        // テスト環境では常に成功
        return new \stdClass();
    }

    public function deleteUser(string $firebaseUid): void
    {
        // テスト環境では何もしない
    }
}

/**
 * テスト用IDトークン
 */
class TestIdToken
{
    private $firebaseUid;

    public function __construct(string $firebaseUid)
    {
        $this->firebaseUid = $firebaseUid;
    }

    public function claims()
    {
        return new TestClaims($this->firebaseUid);
    }
}

/**
 * テスト用クレーム
 */
class TestClaims
{
    private $firebaseUid;

    public function __construct(string $firebaseUid)
    {
        $this->firebaseUid = $firebaseUid;
    }

    public function get(string $key)
    {
        return $key === 'sub' ? $this->firebaseUid : null;
    }
}
