<?php

namespace App\Enums;

enum SmsType: string
{
    use Values;

    case INBOX = 'inbox';
    case SENT = 'sent';
}
