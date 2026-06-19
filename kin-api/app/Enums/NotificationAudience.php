<?php

namespace App\Enums;

enum NotificationAudience: string
{
    use Values;

    case ALL = 'all';
    case SPECIFIC = 'specific';
}
