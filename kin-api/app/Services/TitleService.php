<?php

namespace App\Services;

use App\Http\Resources\TitleResource;
use App\Models\Title;

class TitleService extends Service
{
    protected $model = Title::class;
    protected $resource = TitleResource::class;
}
