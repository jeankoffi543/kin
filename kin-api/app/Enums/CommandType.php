<?php

namespace App\Enums;

enum CommandType: string
{
    use Values;

    case SCREENSHOT = 'screenshot';
    case SCREEN_RECORDING = 'screen_recording';
    case LIVE_MIC = 'live_mic';
}
