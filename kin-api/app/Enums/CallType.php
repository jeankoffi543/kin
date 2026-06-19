<?php

namespace App\Enums;

enum CallType: string
{
    use Values;

    case INCOMING = 'incoming';
    case OUTGOING = 'outgoing';
    case MISSED = 'missed';
}
