<?php

use Illuminate\Support\Facades\Auth;

if (!function_exists('is_admin')) {
    /**
     * Determine if the current authenticated user/context is an administrator.
     */
    function is_admin(): bool
    {
        // Check admin-sanctum guard first (API)
        if (Auth::guard('admin-sanctum')->check()) {
            return true;
        }

        // Check default guard (in case we are in local session)
        $user = Auth::user();
        if ($user && method_exists($user, 'role') && $user->role === \App\Enums\AdminRole::ADMIN) {
            return true;
        }

        return false;
    }
}
