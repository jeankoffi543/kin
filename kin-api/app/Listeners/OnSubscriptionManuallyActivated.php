<?php

namespace App\Listeners;

use App\Mail\SubscriptionActivatedMail;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class OnSubscriptionManuallyActivated implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Handle the event.
     */
    public function handle(mixed $event): void
    {
        $user = $event->user;

        Log::info("OnSubscriptionManuallyActivated: Subscription manually activated for User {$user->id}");

        // Dispatch mail
        Mail::to($user->email)->send(new SubscriptionActivatedMail($user));
    }
}
