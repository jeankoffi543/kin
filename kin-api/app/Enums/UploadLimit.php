<?php

namespace App\Enums;

enum UploadLimit: int
{
    use Values;

    case IMAGE = 5120;
    case GENERIC = 20480;
}
