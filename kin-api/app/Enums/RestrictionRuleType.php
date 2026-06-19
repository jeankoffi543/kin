<?php

namespace App\Enums;

enum RestrictionRuleType: string
{
    use Values;

    case BLOCK_CALLS = 'block_calls';
    case SMS_FILTER = 'sms_filter';
    case APP_BLOCK = 'app_block';
    case MODULE_TOGGLE = 'module_toggle';
}
