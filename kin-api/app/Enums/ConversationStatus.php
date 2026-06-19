<?php

namespace App\Enums;

enum ConversationStatus: string
{
    use Values;

    case PENDING = 'pending';
    case ACTIVE = 'active';
    case CLOSED = 'closed';
}
