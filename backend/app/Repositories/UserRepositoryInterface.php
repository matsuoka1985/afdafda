<?php

namespace App\Repositories;

interface UserRepositoryInterface
{
    public function findByEmail(string $email): ?array;
    public function findByFirebaseUid(string $firebaseUid): ?array;
    public function create(array $userData): array;
    public function update(array $user, array $userData): bool;
}