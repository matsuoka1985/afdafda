<?php

namespace App\Services;

use App\Contracts\FirebaseAuthInterface;
use Kreait\Firebase\Auth;

class FirebaseAuthAdapter implements FirebaseAuthInterface
{
    private $firebaseAuth;

    public function __construct(?Auth $firebaseAuth = null)
    {
        $this->firebaseAuth = $firebaseAuth;
    }

    public function verifyIdToken(string $jwt)
    {
        if (!$this->firebaseAuth) {
            throw new \Exception('Firebase Auth is not available');
        }
        
        return $this->firebaseAuth->verifyIdToken($jwt);
    }

    public function getUser(string $firebaseUid)
    {
        if (!$this->firebaseAuth) {
            throw new \Exception('Firebase Auth is not available');
        }
        
        return $this->firebaseAuth->getUser($firebaseUid);
    }

    public function deleteUser(string $firebaseUid): void
    {
        if (!$this->firebaseAuth) {
            throw new \Exception('Firebase Auth is not available');
        }
        
        $this->firebaseAuth->deleteUser($firebaseUid);
    }
}