<?php

namespace App\Http\Middleware;

use App\Enums\SubscriptionStatus;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckTrial
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], Response::HTTP_UNAUTHORIZED);
        }

        $status = $user->subscription_status;
        
        if ($status === SubscriptionStatus::ACTIVE) {
            return $next($request);
        }

        if ($status === SubscriptionStatus::TRIAL) {
            if ($user->trial_ends_at && $user->trial_ends_at->isFuture()) {
                return $next($request);
            }
        }

        return response()->json([
            'message' => 'Subscription or trial has expired.',
            'error'   => 'payment_required'
        ], Response::HTTP_PAYMENT_REQUIRED);
    }
}
