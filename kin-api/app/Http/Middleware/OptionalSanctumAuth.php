<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class OptionalSanctumAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        // Try to resolve user via Sanctum bearer token without rejecting if absent.
        // This allows the broadcasting/auth route to work for both:
        // - Parents (Bearer token → Sanctum user)
        // - Devices (X-Device-UUID header → resolved in channel class)
        if ($request->bearerToken()) {
            Auth::shouldUse('sanctum');
        }

        return $next($request);
    }
}
