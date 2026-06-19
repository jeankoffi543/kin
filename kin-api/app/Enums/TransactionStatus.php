<?php

namespace App\Enums;

enum TransactionStatus: string
{
    use Values;

    case PENDING = 'pending';
    case COMPLETED = 'completed';
    case FAILED = 'failed';
    case REFUNDED = 'refunded';
}
