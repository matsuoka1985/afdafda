<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
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
            $factory = (new Factory)->withServiceAccount(config('firebase.credentials.file'));
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
