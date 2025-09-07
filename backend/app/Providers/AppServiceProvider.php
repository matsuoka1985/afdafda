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
            $credentialsPath = config('firebase.credentials.file');
            
            // Skip Firebase initialization if no credentials provided (for testing)
            if (empty($credentialsPath)) {
                return null;
            }
            
            // Debug logging
            Log::info('Firebase credentials debug', [
                'credentials_path' => $credentialsPath,
                'file_exists' => file_exists($credentialsPath),
                'is_readable' => is_readable($credentialsPath),
                'file_size' => file_exists($credentialsPath) ? filesize($credentialsPath) : 'N/A'
            ]);
            
            // If credentials is a file path, use it directly
            if (file_exists($credentialsPath)) {
                $factory = (new Factory)->withServiceAccount($credentialsPath);
            } else {
                // If credentials is base64 encoded content, decode and use it
                Log::warning('Firebase credentials file not found, attempting base64 decode', ['path' => $credentialsPath]);
                $decodedCredentials = base64_decode($credentialsPath);
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
