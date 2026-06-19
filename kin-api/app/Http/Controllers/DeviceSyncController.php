<?php

namespace App\Http\Controllers;

use App\Http\Requests\DeviceCommandResponseRequest;
use App\Http\Requests\DeviceSyncRequest;
use App\Services\DeviceSyncService;
use Illuminate\Http\Request;

/**
 * @group Device: Sync & Telemetry
 *
 * Dedicated ingestion and synchronization controller for mobile child devices.
 * Restrictions and command endpoints are tagged `@group Device: Restrictions & Commands`.
 *
 * All methods are encapsulated in $this->invokeWithCatching(function () { ... })
 * to respect the strict "zero logic in the controller" architectural contract.
 */
class DeviceSyncController extends Controller
{
    /** @var DeviceSyncService */
    protected $syncService;

    public function getServices(): array
    {
        return [
            'syncService' => DeviceSyncService::class,
        ];
    }

    /**
     * Ingest a validated SQLite telemetry batch from a child mobile device.
     */
    public function sync(DeviceSyncRequest $request): mixed
    {
        return $this->invokeWithCatching(function () use ($request) {
            return $this->syncService->processDeviceSync(
                $request->attributes->get('device'),
                $request->validated()
            );
        });
    }

    /**
     * Register or update the FCM push token for the authenticated child device.
     */
    public function registerFcmToken(Request $request): mixed
    {
        return $this->invokeWithCatching(function () use ($request) {
            return $this->syncService->storeFcmToken(
                $request->attributes->get('device'),
                $request->string('token')->toString()
            );
        });
    }

    /**
     * Heartbeat: update device metadata and touch updated_at.
     */
    public function heartbeat(Request $request): mixed
    {
        return $this->invokeWithCatching(function () use ($request) {
            return $this->syncService->heartbeat(
                $request->attributes->get('device'),
                $request->only(['platform', 'brand', 'model', 'os_version', 'app_version'])
            );
        });
    }

    public function updateSyncStatus(Request $request): mixed
    {
        return $this->invokeWithCatching(function () use ($request) {
            $device = $request->attributes->get('device');
            if (! $device instanceof \App\Models\Device) {
                abort(401);
            }

            $status = $request->input('status', 'idle');
            $device->update([
                'sync_status' => $status,
                'sync_started_at' => $status === 'syncing' ? now() : null,
            ]);

            return response()->json(['success' => true, 'sync_status' => $status]);
        });
    }

    /**
     * @group Device: Restrictions & Commands
     *
     * Pull active restriction rules for the child device.
     */
    public function pullRestrictions(Request $request): mixed
    {
        return $this->invokeWithCatching(function () use ($request) {
            return $this->syncService->getRestrictionsForDevice(
                $request->attributes->get('device')
            );
        });
    }

    /**
     * @group Device: Restrictions & Commands
     *
     * Pull pending remote commands for the child device.
     */
    public function pullPendingCommands(Request $request): mixed
    {
        return $this->invokeWithCatching(function () use ($request) {
            return $this->syncService->getPendingCommandsForDevice(
                $request->attributes->get('device')
            );
        });
    }

    /**
     * @group Device: Restrictions & Commands
     *
     * Respond to a specific scheduled remote command (submit execution result).
     */
    public function respondToCommand(int $id, DeviceCommandResponseRequest $request): mixed
    {
        return $this->invokeWithCatching(function () use ($id, $request) {
            return $this->syncService->respondToCommand(
                $id,
                $request->attributes->get('device'),
                $request->validated()
            );
        });
    }
}
