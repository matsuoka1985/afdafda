<?php

namespace App\Repositories;

use App\Models\User;

interface UserRepositoryInterface
{
    public function findByEmail(string $email): ?User;
    public function findByFirebaseUid(string $firebaseUid): ?User;
    public function create(array $userData): User;
    public function update(User $user, array $userData): bool;
}