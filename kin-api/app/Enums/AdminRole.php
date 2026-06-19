<?php

namespace App\Enums;

enum AdminRole: string
{
    use Values;

    case ADMIN = 'admin';
    case SUPPORT = 'support';
}
