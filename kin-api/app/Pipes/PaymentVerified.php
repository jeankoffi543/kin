<?php

namespace App\Pipes;

use App\Enums\SubscriptionStatus;
use App\Events\PaymentCreated;
use App\Models\User;
use Closure;
use Illuminate\Support\Facades\Log;

class PaymentVerified
{
    /**
     * Handle the pipeline.
     */
    public function handle(array $payload, Closure $next)
    {
        Log::info("PaymentVerified: Finalizing payment process and updating subscription.", $payload);

        $userId = data_get($payload, 'user_id');
        $amount = data_get($payload, 'amount');
        $transactionId = data_get($payload, 'transaction_id');

        $user = User::find($userId);
        if ($user) {
            // Update subscription to active
            $user->update([
                'subscription_status' => SubscriptionStatus::ACTIVE,
                'trial_ends_at'       => null,
            ]);

            // Fire events
            event(new PaymentCreated($user, $amount, $transactionId));
        }

        return $next($payload);
    }
}
