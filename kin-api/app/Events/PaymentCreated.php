<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PaymentCreated
{
    use Dispatchable, SerializesModels;

    public User $user;
    public float $amount;
    public string $transactionId;

    /**
     * Create a new event instance.
     */
    public function __construct(User $user, float $amount, string $transactionId)
    {
        $this->user = $user;
        $this->amount = $amount;
        $this->transactionId = $transactionId;
    }
}
