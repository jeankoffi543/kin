<?php

namespace App\Http\Controllers;

use App\Http\Requests\DeviceRequest;
use App\Http\Requests\DeviceStatusChangeRequest;
use App\Http\Requests\GeofenceRequest;
use App\Http\Requests\RemoteCommandExecuteRequest;
use App\Http\Requests\RestrictionRuleStoreRequest;
use App\Services\DeviceService;
use Kjos\Command\Managers\Controller as BaseController;

/**
 * @group User: Device Management
 *
 * Parent device lifecycle (register, list, show, delete, status, commands).
 * Telemetry feed endpoints are tagged `@group User: Telemetry Feeds` or `@group Admin: Telemetry Feeds`.
 */
class DeviceController extends BaseController
{
    /** @var DeviceService */
    protected $service;

    public function getServices(): array
    {
        return [
            'service' => DeviceService::class,
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Parent / User endpoints (guard: auth:sanctum)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Parent lists their registered child devices.
     */
    public function index(): mixed
    {
        return $this->invokeWithCatching(function () {
            return $this->service->forCurrentUser();
        });
    }

    /**
     * Parent gets details of a specific child device.
     */
    public function show(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->show($id);
        });
    }

    /**
     * Parent deletes / dissociates a specific child device.
     */
    public function destroy(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->destroyDevice($id);
        });
    }

    /**
     * Mobile device registers or updates its own metadata.
     */
    public function register(DeviceRequest $request): mixed
    {
        return $this->invokeWithCatching(function () use ($request) {
            return $this->service->registerOrUpdate($request->validated());
        });
    }

    /**
     * Parent updates device status.
     */
    public function changeStatus(int $id, DeviceStatusChangeRequest $request): mixed
    {
        return $this->invokeWithCatching(function () use ($id, $request) {
            return $this->service->changeDeviceStatus($id, $request->validated());
        });
    }

    /**
     * Parent schedules a remote command.
     */
    public function executeRemoteCommand(int $id, RemoteCommandExecuteRequest $request): mixed
    {
        return $this->invokeWithCatching(function () use ($id, $request) {
            return $this->service->executeRemoteCommand($id, $request->validated());
        });
    }

    /**
     * Parent forces the child device to sync immediately.
     */
    public function forceSync(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->forceSync($id);
        });
    }

    public function forceSyncReset(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->forceSyncReset($id);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Telemetry read-only feeds (Parent and Admin Backoffice)
    // ─────────────────────────────────────────────────────────────────────────

    public function calls(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->getCallsFeed($id, request()->all());
        });
    }

    public function smsThreads(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->getSmsThreads($id, request()->all());
        });
    }

    public function sms(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->getSmsFeed($id, request()->all());
        });
    }

    public function contacts(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->getContactsFeed($id, request()->all());
        });
    }

    public function interceptedNotifications(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->getNotificationsFeed($id, request()->all());
        });
    }

    public function gpsLocations(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->getGpsLocationsFeed($id, request()->all());
        });
    }

    public function geofences(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->getGeofencesFeed($id, request()->all());
        });
    }

    public function geofenceAlerts(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->getGeofenceAlertsFeed($id, request()->all());
        });
    }

    public function socialMessages(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->getSocialMessagesFeed($id, request()->all());
        });
    }

    public function browserHistories(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->getBrowserHistoriesFeed($id, request()->all());
        });
    }

    public function installedApps(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->getInstalledAppsFeed($id, request()->all());
        });
    }

    public function files(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->getFilesFeed($id, request()->all());
        });
    }

    public function media(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->getMediaFeed($id, request()->all());
        });
    }

    public function restrictions(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->getRestrictionsFeed($id, request()->all());
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Telemetry write endpoints
    // ─────────────────────────────────────────────────────────────────────────

    public function storeGeofence(int $id, GeofenceRequest $request): mixed
    {
        return $this->invokeWithCatching(function () use ($id, $request) {
            return $this->service->storeGeofence($id, $request->validated());
        });
    }

    public function updateGeofence(int $id, int $geofenceId, GeofenceRequest $request): mixed
    {
        return $this->invokeWithCatching(function () use ($id, $geofenceId, $request) {
            return $this->service->updateGeofence($id, $geofenceId, $request->validated());
        });
    }

    public function destroyGeofence(int $id, int $geofenceId): mixed
    {
        return $this->invokeWithCatching(function () use ($id, $geofenceId) {
            return $this->service->destroyGeofence($id, $geofenceId);
        });
    }

    public function storeRestrictionRule(int $id, RestrictionRuleStoreRequest $request): mixed
    {
        return $this->invokeWithCatching(function () use ($id, $request) {
            return $this->service->storeRestrictionRule($id, $request->validated());
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Secure downloads
    // ─────────────────────────────────────────────────────────────────────────

    public function downloadMedia(int $id, int $mediaId): mixed
    {
        return $this->invokeWithCatching(function () use ($id, $mediaId) {
            return $this->service->downloadMedia($id, $mediaId);
        });
    }

    public function downloadCallAudio(int $id, int $callId): mixed
    {
        return $this->invokeWithCatching(function () use ($id, $callId) {
            return $this->service->downloadCallAudio($id, $callId);
        });
    }
}
