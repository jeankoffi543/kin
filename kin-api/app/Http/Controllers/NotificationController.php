<?php

namespace App\Http\Controllers;

use App\Http\Requests\SendNotificationRequest;
use App\Services\NotificationService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Kjos\Command\Managers\Controller as BaseController;

/**
 * @group Admin: Notifications
 *
 * Broadcast push notifications to all parents or specific users.
 * Device and user read-only endpoints are tagged in each method.
 */
class NotificationController extends BaseController
{
    /** @var NotificationService */
    protected $service;

    public function getServices(): array
    {
        return [
            'service' => NotificationService::class,
        ];
    }

    public function index(): AnonymousResourceCollection
    {
        return $this->invokeWithCatching(function () {
            return $this->service->index();
        });
    }

    public function store(SendNotificationRequest $request): mixed
    {
        return $this->invokeWithCatching(function () use ($request) {
            return $this->service->store($request->validated());
        });
    }

    public function update(int $id, SendNotificationRequest $request): mixed
    {
        return $this->invokeWithCatching(function () use ($id, $request) {
            return $this->service->update($id, $request->validated());
        });
    }

    public function destroy(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->destroy($id);
        });
    }

    public function show(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->show($id);
        });
    }

    /**
     * @group User: Notifications
     */
    public function indexForUser(): AnonymousResourceCollection
    {
        return $this->invokeWithCatching(function () {
            return $this->service->forCurrentUser();
        });
    }

    /**
     * @group User: Notifications
     */
    public function showForUser(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->showForCurrentUser($id);
        });
    }

    /**
     * @group Device: Notifications
     */
    public function indexForDevice(): AnonymousResourceCollection
    {
        return $this->invokeWithCatching(function () {
            return $this->service->forCurrentDevice();
        });
    }

    /**
     * @group Device: Notifications
     */
    public function showForDevice(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->showForCurrentDevice($id);
        });
    }
}
