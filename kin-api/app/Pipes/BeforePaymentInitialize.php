<?php

namespace App\Pipes;

use Closure;
use Exception;
use Illuminate\Support\Facades\Log;

class BeforePaymentInitialize
{
    /**
     * Handle the pipeline.
     */
    public function handle(array $payload, Closure $next)
    {
        Log::info("BeforePaymentInitialize: Checking payment payload preconditions", $payload);

        $userId = data_get($payload, 'user_id');
        $amount = data_get($payload, 'amount');

        if (!$userId) {
            throw new Exception("Payment initialize failure: Missing user_id.");
        }

        if (!$amount || $amount <= 0) {
            throw new Exception("Payment initialize failure: Invalid amount.");
        }

        return $next($payload);
    }
}
