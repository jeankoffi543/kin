<?php

namespace App\Enums;

enum SubscriptionStatus: string
{
    use Values;

    case TRIAL = 'trial';
    case ACTIVE = 'active';
    case EXPIRED = 'expired';
    case CANCELLED = 'cancelled';
}
