<?php

namespace App\Services\Concerns;

use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

trait HasAuth
{
    /**
     * Authenticate a user or admin and return a token.
     */
    protected function loginWithCredentials(string $email, string $password, string $modelClass, string $tokenName): array
    {
        $authenticatable = $modelClass::where('email', $email)->first();

        if (!$authenticatable || !Hash::check($password, $authenticatable->password)) {
            throw ValidationException::withMessages([
                'email' => [__('auth.failed')],
            ]);
        }

        $token = $authenticatable->createToken($tokenName)->plainTextToken;

        return [
            'token' => $token,
            'record' => $authenticatable,
        ];
    }

    /**
     * Revoke all tokens for the current authenticated user/admin.
     */
    protected function logoutCurrentSession($authenticatable): void
    {
        if ($authenticatable && method_exists($authenticatable, 'currentAccessToken')) {
            $authenticatable->currentAccessToken()->delete();
        }
    }
}
