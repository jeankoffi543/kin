<?php

namespace App\Enums;

enum MessageSender: string
{
    use Values;

    case USER = 'user';
    case SUPPORT = 'support';
    case ADMIN = 'admin';
}
