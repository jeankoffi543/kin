<?php

namespace App\Enums;

enum GeofenceEventType: string
{
    use Values;

    case ENTER = 'enter';
    case EXIT = 'exit';
}
