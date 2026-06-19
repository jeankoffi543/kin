<?php

namespace App\Enums;

enum Gender: string
{
    use Values;

    case MEN = 'male';
    case WOMEN = 'female';
}
