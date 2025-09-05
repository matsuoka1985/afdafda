<?php

namespace App\Services;

use App\Contracts\FirebaseAuthInterface;
use Kreait\Firebase\Auth;

class FirebaseAuthAdapter implements FirebaseAuthInterface
{
    private $firebaseAuth;

    public function __construct(Auth $firebaseAuth)
    {
        $this->firebaseAuth = $firebaseAuth;
    }

    public function verifyIdToken(string $jwt)
    {
        return $this->firebaseAuth->verifyIdToken($jwt);
    }

    public function getUser(string $firebaseUid)
    {
        return $this->firebaseAuth->getUser($firebaseUid);
    }

    public function deleteUser(string $firebaseUid): void
    {
        $this->firebaseAuth->deleteUser($firebaseUid);
    }
}