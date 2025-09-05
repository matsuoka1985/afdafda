<?php

namespace App\Repositories;

use App\Models\User;

class UserRepository implements UserRepositoryInterface
{
    public function findByEmail(string $email): ?User
    {
        return User::where('email', $email)->first();
    }

    public function findByFirebaseUid(string $firebaseUid): ?User
    {
        return User::where('firebase_uid', $firebaseUid)->first();
    }

    public function create(array $userData): User
    {
        return User::create($userData);
    }

    public function update(User $user, array $userData): bool
    {
        return $user->update($userData);
    }
}