<?php

namespace App\Repositories;

use App\Models\User;

class UserRepository implements UserRepositoryInterface
{
    public function findByEmail(string $email): ?array
    {
        $user = User::where('email', $email)->first();
        return $user ? $user->toArray() : null;
    }

    public function findByFirebaseUid(string $firebaseUid): ?array
    {
        $user = User::where('firebase_uid', $firebaseUid)->first();
        return $user ? $user->toArray() : null;
    }

    public function create(array $userData): array
    {
        $user = User::create($userData);
        return $user->toArray();
    }

    public function update(array $user, array $userData): bool
    {
        $model = User::find($user['id']);
        return $model ? $model->update($userData) : false;
    }
}