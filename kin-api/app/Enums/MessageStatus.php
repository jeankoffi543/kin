<?php

namespace App\Enums;

enum MessageStatus: string
{
    use Values;

    case SENT = 'sent';
    case DELIVERED = 'delivered';
    case READ = 'read';
}
