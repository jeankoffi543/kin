<?php

namespace App\Http\Controllers;

use App\Http\Requests\SendNotificationRequest;
use App\Services\FcmService;
use Kjos\Command\Managers\Controller as BaseController;

class FcmController extends BaseController
{
    protected $service;

    public function getServices(): array
    {
        return ['service' => FcmService::class];
    }

    public function sendTestPush(int $deviceId, SendNotificationRequest $request): mixed
    {
        return $this->invokeWithCatching(function () use ($deviceId, $request) {
            return $this->service->sendDiagnosticPush($deviceId, $request->validated());
        });
    }
}
