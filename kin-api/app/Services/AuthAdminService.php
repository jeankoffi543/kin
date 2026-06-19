<?php

namespace App\Services;

use App\Http\Resources\AuthAdminResource;
use App\Models\Admin;
use App\Services\Concerns\HasAuth;

class AuthAdminService extends Service
{
    use HasAuth;

    protected $model = Admin::class;
    protected $resource = AuthAdminResource::class;

    public function login(array $credentials): array
    {
        $result = $this->loginWithCredentials(
            $credentials['email'],
            $credentials['password'],
            Admin::class,
            'admin-token'
        );

        return [
            'token' => $result['token'],
            'admin' => AuthAdminResource::make($result['record']),
        ];
    }

    public function logout(mixed $admin): \Illuminate\Http\JsonResponse
    {
        $this->logoutCurrentSession($admin);
        return response()->json(['message' => 'Logged out successfully.']);
    }
}
