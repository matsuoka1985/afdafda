<?php

namespace App\Services;

use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;
use Exception;

class JwtBlacklistService
{
    /**
     * 環境に応じたRedis接続を取得
     */
    private function getRedisConnection()
    {
        return app()->environment('testing') ? Redis::connection('testing') : Redis::connection();
    }
    /**
     * JWTをブラックリストに追加
     *
     * @param string $jwt JWTトークン
     * @param int|null $expiresAt JWT有効期限のUnixタイムスタンプ
     * @return bool 登録成功
     */
    public function addToBlacklist(string $jwt, ?int $expiresAt = null): bool
    {
        try {
            // JWTのJTI（JWT ID）を生成（ハッシュ化して短縮）
            $jti = hash('sha256', $jwt);
            
            // ブラックリストキー
            $blacklistKey = "jwt_blacklist:{$jti}";
            
            // TTL計算（JWTの有効期限まで、デフォルトは1日）
            $ttl = $expiresAt ? max(1, $expiresAt - time()) : 86400;
            
            // Redisに登録（TTL付き）
            $this->getRedisConnection()->setex($blacklistKey, $ttl, json_encode([
                'jti' => $jti,
                'blacklisted_at' => time(),
                'expires_at' => $expiresAt
            ]));
            
            Log::info('JWT ブラックリスト登録成功', [
                'jti' => $jti,
                'ttl' => $ttl,
                'expires_at' => $expiresAt
            ]);
            
            return true;
            
        } catch (Exception $e) {
            Log::error('JWT ブラックリスト登録エラー', [
                'error' => $e->getMessage(),
                'jwt_prefix' => substr($jwt, 0, 50) . '...'
            ]);
            
            return false;
        }
    }
    
    /**
     * JWTがブラックリストに登録されているかチェック
     *
     * @param string $jwt JWTトークン
     * @return bool ブラックリストに登録されている場合true
     */
    public function isBlacklisted(string $jwt): bool
    {
        try {
            // JWTのJTI（JWT ID）を生成
            $jti = hash('sha256', $jwt);
            
            // ブラックリストキー
            $blacklistKey = "jwt_blacklist:{$jti}";
            
            // Redisで存在チェック
            $exists = $this->getRedisConnection()->exists($blacklistKey);
            
            if ($exists) {
                Log::info('JWT ブラックリストヒット', ['jti' => $jti]);
                return true;
            }
            
            return false;
            
        } catch (Exception $e) {
            Log::error('JWT ブラックリストチェックエラー', [
                'error' => $e->getMessage(),
                'jwt_prefix' => substr($jwt, 0, 50) . '...'
            ]);
            
            // エラー時は安全側に倒してブラックリスト扱い
            return true;
        }
    }
    
    /**
     * JWTからexpクレーム（有効期限）を取得
     *
     * @param string $jwt JWTトークン
     * @return int|null Unixタイムスタンプまたはnull
     */
    public function getJwtExpiration(string $jwt): ?int
    {
        try {
            // JWTをデコード（検証なし、expクレームのみ取得）
            $parts = explode('.', $jwt);
            if (count($parts) !== 3) {
                return null;
            }
            
            // ペイロード部分をデコード
            $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1])), true);
            
            return $payload['exp'] ?? null;
            
        } catch (Exception $e) {
            Log::error('JWT exp クレーム取得エラー', [
                'error' => $e->getMessage()
            ]);
            
            return null;
        }
    }
}