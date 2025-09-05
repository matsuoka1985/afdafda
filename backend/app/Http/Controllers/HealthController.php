<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

class HealthController extends Controller
{
    /**
     * Health check endpoint for ALB
     */
    public function check(): JsonResponse
    {
        try {
            // Database connection check
            DB::connection()->getPdo();
            $dbStatus = 'ok';
            
            // Redis connection check (optional)
            $redisStatus = 'ok';
            try {
                Redis::ping();
            } catch (\Exception $e) {
                $redisStatus = 'warning';
            }
            
            return response()->json([
                'status' => 'ok',
                'timestamp' => now()->toISOString(),
                'app' => config('app.name'),
                'version' => '1.0.0',
                'services' => [
                    'database' => $dbStatus,
                    'redis' => $redisStatus
                ]
            ], 200);
            
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Database connection failed',
                'timestamp' => now()->toISOString(),
                'error' => $e->getMessage()
            ], 503);
        }
    }
}