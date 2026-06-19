<?php

namespace App\Services;

use App\Enums\SubscriptionStatus;
use App\Http\Resources\AuthUserResource;
use App\Models\User;
use App\Services\Concerns\HasAuth;
use Illuminate\Support\Facades\Hash;

class AuthUserService extends Service
{
    use HasAuth;

    protected $model = User::class;
    protected $resource = AuthUserResource::class;

    public function login(array $credentials): array
    {
        $result = $this->loginWithCredentials(
            $credentials['email'],
            $credentials['password'],
            User::class,
            'user-token'
        );

        return [
            'token' => $result['token'],
            'user'  => AuthUserResource::make($result['record']),
        ];
    }

    public function register(array $data): array
    {
        $user = User::create([
            'name'                => $data['name'],
            'email'               => $data['email'],
            'password'            => Hash::make($data['password']),
            'subscription_status' => SubscriptionStatus::TRIAL,
            'trial_ends_at'       => now()->addDays(14),
        ]);

        $token = $user->createToken('user-token')->plainTextToken;

        return [
            'token' => $token,
            'user'  => AuthUserResource::make($user),
        ];
    }

    public function logout(mixed $user): \Illuminate\Http\JsonResponse
    {
        $this->logoutCurrentSession($user);
        return response()->json(['message' => 'Logged out successfully.']);
    }
}
