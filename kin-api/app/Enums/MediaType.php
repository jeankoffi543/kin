<?php

namespace App\Enums;

enum MediaType: string
{
    use Values;

    case PHOTO = 'photo';
    case VIDEO = 'video';
}
