<?php

namespace App\Contracts;

interface FirebaseAuthInterface
{
    public function verifyIdToken(string $jwt);
    public function getUser(string $firebaseUid);
    public function deleteUser(string $firebaseUid): void;
}