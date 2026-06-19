<?php

namespace App\Enums;

enum SmsStatus: string
{
    use Values;

    case RECEIVED = 'received';
    case DELIVERED = 'delivered';
    case FAILED = 'failed';
    case DRAFT = 'draft';
    case SENDING = 'sending';
    case QUEUED = 'queued';
}
