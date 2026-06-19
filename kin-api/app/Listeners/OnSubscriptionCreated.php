<?php

namespace App\Listeners;

use App\Events\SubscriptionCreated;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class OnSubscriptionCreated implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Handle the event.
     */
    public function handle(SubscriptionCreated $event): void
    {
        Log::info("OnSubscriptionCreated: Onboarding subscription created for User {$event->user->id}");
    }
}
