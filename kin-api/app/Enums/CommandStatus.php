<?php

namespace App\Enums;

enum CommandStatus: string
{
    use Values;

    case PENDING = 'pending';
    case PROCESSING = 'processing';
    case COMPLETED = 'completed';
    case FAILED = 'failed';
}
