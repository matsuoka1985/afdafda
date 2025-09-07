<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Log;
use App\Repositories\UserRepositoryInterface;
use App\Repositories\UserRepository;
use App\Repositories\PostRepositoryInterface;
use App\Repositories\PostRepository;
use App\Repositories\CommentRepositoryInterface;
use App\Repositories\CommentRepository;
use App\Repositories\LikeRepositoryInterface;
use App\Repositories\LikeRepository;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Auth;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(UserRepositoryInterface::class, UserRepository::class);
        $this->app->bind(PostRepositoryInterface::class, PostRepository::class);
        $this->app->bind(CommentRepositoryInterface::class, CommentRepository::class);
        $this->app->bind(LikeRepositoryInterface::class, LikeRepository::class);
        
        $this->app->singleton(Auth::class, function ($app) {
            $credentialsPath = '/var/www/storage/app/firebase/firebase-adminsdk.json';
            
            // Skip Firebase initialization if no credentials provided (for testing)
            $credentialsEnv = env('FIREBASE_CREDENTIALS');
            if (empty($credentialsEnv)) {
                return null;
            }
            
            // Check if the file exists (created by deploy.sh)
            if (file_exists($credentialsPath) && is_readable($credentialsPath)) {
                Log::info('Using Firebase credentials file', ['path' => $credentialsPath]);
                $factory = (new Factory)->withServiceAccount($credentialsPath);
            } else {
                // If file doesn't exist, use base64 decoded credentials directly
                Log::info('Firebase credentials file not found, using base64 decoded credentials');
                $decodedCredentials = base64_decode($credentialsEnv);
                if ($decodedCredentials === false || empty($decodedCredentials)) {
                    Log::error('Failed to decode Firebase credentials');
                    return null;
                }
                $factory = (new Factory)->withServiceAccount($decodedCredentials);
            }
            
            return $factory->createAuth();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
