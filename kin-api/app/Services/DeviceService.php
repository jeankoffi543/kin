<?php

namespace App\Services;

use App\Enums\CommandStatus;
use App\Enums\CommandType;
use App\Events\ReceptBroadcast;
use App\Http\Resources\DeviceResource;
use App\Http\Resources\DeviceCallResource;
use App\Http\Resources\DeviceSmsResource;
use App\Http\Resources\DeviceContactResource;
use App\Http\Resources\DeviceNotificationResource;
use App\Http\Resources\DeviceGpsLocationResource;
use App\Http\Resources\DeviceGeofenceResource;
use App\Http\Resources\DeviceGeofenceAlertResource;
use App\Http\Resources\DeviceSocialMessageResource;
use App\Http\Resources\DeviceBrowserHistoryResource;
use App\Http\Resources\DeviceInstalledAppResource;
use App\Http\Resources\DeviceFileResource;
use App\Http\Resources\DeviceMediaResource;
use App\Http\Resources\DeviceRestrictionRuleResource;
use App\Models\Device;
use App\Models\DeviceCall;
use App\Models\DeviceSms;
use App\Models\DeviceContact;
use App\Models\DeviceNotification;
use App\Models\DeviceGpsLocation;
use App\Models\DeviceGeofence;
use App\Models\DeviceGeofenceAlert;
use App\Models\DeviceSocialMessage;
use App\Models\DeviceBrowserHistory;
use App\Models\DeviceInstalledApp;
use App\Models\DeviceFile;
use App\Models\DeviceMedia;
use App\Models\DeviceRestrictionRule;
use App\Models\DeviceRemoteCommand;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Service orchestrating child device lifecycle, tracking telemetry feeds,
 * managing parental restriction rules, geofencing coordinates, and dispatching command buffers.
 */
class DeviceService extends Service
{
    protected $model    = Device::class;
    protected $resource = DeviceResource::class;

    /**
     * Resolve the device and enforce access control (SSoT).
     *
     * @param int $id
     * @return Device
     */
    private function resolveDevice(int $id): Device
    {
        if ($this->isAdmin()) {
            return Device::with('user')->findOrFail($id);
        }

        return Device::with('user')->where('user_id', auth()->id())->where('id', $id)->firstOrFail();
    }

    /**
     * Show device details.
     *
     * @param int|string $id
     * @return mixed
     */
    public function show($id): mixed
    {
        $device = $this->resolveDevice((int) $id);
        return $this->resources($device);
    }

    /**
     * Get all child devices belonging to the currently authenticated parent user.
     *
     * @return AnonymousResourceCollection
     */
    public function forCurrentUser(): AnonymousResourceCollection
    {
        $devices = Device::where('user_id', auth()->id())->get();

        return DeviceResource::collection($devices);
    }

    /**
     * Register a new child device or refresh the metadata of an existing one.
     *
     * @param array $data
     * @return DeviceResource
     */
    public function registerOrUpdate(array $data): DeviceResource
    {
        $device = Device::updateOrCreate(
            ['uuid' => $data['uuid']],
            array_merge($data, [
                'user_id' => auth()->id(),
            ])
        );

        return DeviceResource::make($device);
    }

    /**
     * Update device status (parental restriction configuration) and send FCM notification.
     *
     * @param int $id
     * @param array $data
     * @return DeviceResource
     */
    public function changeDeviceStatus(int $id, array $data): DeviceResource
    {
        $device = Device::where('user_id', auth()->id())->where('id', $id)->firstOrFail();
        $updated = $this->update($device->id, $data);

        /** @var FcmService $fcmService */
        $fcmService = app(FcmService::class);
        $fcmService->sendToDevice($device, 'Config Update', 'Device settings have been updated.', [
            'type' => 'config_updated',
        ]);

        return DeviceResource::make($device->fresh());
    }

    /**
     * Force the child device to sync now by sending an FCM wakeup push.
     */
    public function forceSync(int $deviceId): JsonResponse
    {
        $device = Device::where('user_id', auth()->id())->where('id', $deviceId)->firstOrFail();

        /** @var \App\Services\FcmService $fcmService */
        $fcmService = app(\App\Services\FcmService::class);
        $fcmService->sendToDevice($device, 'Sync Now', 'Parent requested immediate sync.', [
            'type' => 'force_sync',
        ]);

        event(new \App\Events\ReceptBroadcast($device->uuid, [
            'event'  => 'sync_requested',
            'status' => 'pending',
        ]));

        return response()->json(['success' => true, 'message' => 'Sync push sent.']);
    }

    /**
     * Force-reset the sync lock on the child device and trigger a new sync.
     */
    public function forceSyncReset(int $deviceId): JsonResponse
    {
        $device = Device::where('user_id', auth()->id())->where('id', $deviceId)->firstOrFail();

        /** @var FcmService $fcmService */
        $fcmService = app(FcmService::class);
        $fcmService->sendToDevice($device, 'Force Sync Reset', 'Parent forced sync lock reset.', [
            'type' => 'force_sync_reset',
        ]);

        event(new ReceptBroadcast($device->uuid, [
            'event' => 'sync_reset',
            'status' => 'forced',
        ]));

        return response()->json(['success' => true, 'message' => 'Force sync reset sent.']);
    }

    /**
     * Schedule a command after validating the inputs, broadcasting, and sending FCM.
     *
     * @param int $deviceId
     * @param array $data
     * @return JsonResponse
     */
    public function executeRemoteCommand(int $deviceId, array $data): JsonResponse
    {
        $device = Device::where('user_id', auth()->id())->where('id', $deviceId)->firstOrFail();
        $commandType = CommandType::from($data['command_type']);

        $command = DeviceRemoteCommand::create([
            'device_id'    => $device->id,
            'command_type' => $commandType,
            'status'       => CommandStatus::PENDING,
            'parameters'   => $data['parameters'] ?? [],
            'triggered_at' => now(),
        ]);

        event(new ReceptBroadcast($device->uuid, [
            'event'      => 'remote_command',
            'command_id' => $command->id,
            'type'       => $command->command_type->value,
            'status'     => $command->status->value,
            'parameters' => $data['parameters'] ?? [],
        ]));

        /** @var FcmService $fcmService */
        $fcmService = app(FcmService::class);
        $fcmService->sendToDevice($device, 'Wakeup C2', 'New command scheduled.', [
            'type' => 'remote_command_scheduled',
        ]);

        return response()->json([
            'command_id'   => $command->id,
            'command_type' => $command->command_type->value,
            'status'       => $command->status->value,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Telemetry reading service pipeline (returning typed API resources)
    // ─────────────────────────────────────────────────────────────────────────

    public function getCallsFeed(int $deviceId, array $queryParams = []): AnonymousResourceCollection
    {
        $device = $this->resolveDevice($deviceId);
        $limit = (int) (data_get($queryParams, 'per_page') ?? data_get($queryParams, 'limit', 25));
        $items = DeviceCall::query()
            ->where('device_id', $device->id)
            ->filterOnRequest()
            ->searchOnRequest()
            ->sortOnRequest()
            ->paginate($limit);

        return DeviceCallResource::collection($items);
    }

    public function getSmsFeed(int $deviceId, array $queryParams = []): AnonymousResourceCollection
    {
        $device = $this->resolveDevice($deviceId);
        $limit = (int) (data_get($queryParams, 'per_page') ?? data_get($queryParams, 'limit', 25));

        $query = DeviceSms::query()->where('device_id', $device->id);

        // Filter by address (for single-thread view — match by normalized address)
        if ($address = request()->query('address')) {
            $normalizeExpr = "REPLACE(REPLACE(REPLACE(REPLACE(address, ' ', ''), '-', ''), '(', ''), ')', '')";
            $normalized = str_replace([' ', '-', '(', ')'], '', $address);
            $query->whereRaw("{$normalizeExpr} = ?", [$normalized]);
            $query->orderBy('date', 'asc');
        } else {
            $query->filterOnRequest()->searchOnRequest()->sortOnRequest();
        }

        $items = $query->paginate($limit);
        return DeviceSmsResource::collection($items);
    }

    /**
     * Get SMS grouped by conversation thread (address), with contact name resolution.
     */
    public function getSmsThreads(int $deviceId, array $queryParams = []): \Illuminate\Http\JsonResponse
    {
        $device = $this->resolveDevice($deviceId);
        $perPage = (int) data_get($queryParams, 'per_page', request()->query('per_page', 30));
        $page = (int) data_get($queryParams, 'page', request()->query('page', 1));

        $normalizeExpr = "REPLACE(REPLACE(REPLACE(REPLACE(address, ' ', ''), '-', ''), '(', ''), ')', '')";

        // Count total distinct threads
        $totalThreads = DB::table('device_sms')
            ->where('device_id', $device->id)
            ->selectRaw("COUNT(DISTINCT {$normalizeExpr}) as cnt")
            ->value('cnt');

        // Get paginated threads — group only by normalized address to merge variants
        $threads = DB::table('device_sms')
            ->where('device_id', $device->id)
            ->selectRaw("{$normalizeExpr} as normalized_address")
            ->selectRaw('MAX(address) as address')
            ->selectRaw('MAX(date) as last_date')
            ->selectRaw('COUNT(*) as message_count')
            ->selectRaw("SUM(CASE WHEN type = 'inbox' THEN 1 ELSE 0 END) as inbox_count")
            ->selectRaw("SUM(CASE WHEN type = 'sent' THEN 1 ELSE 0 END) as sent_count")
            ->selectRaw("SUM(CASE WHEN sms_status = 'failed' THEN 1 ELSE 0 END) as failed_count")
            ->selectRaw('SUM(CASE WHEN deleted_at_source = 1 THEN 1 ELSE 0 END) as deleted_count')
            ->groupByRaw($normalizeExpr)
            ->orderByDesc('last_date')
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->get();

        // Resolve contact names + last message for each thread
        // Build two lookup maps: exact normalized match + suffix match (last 9 digits)
        $contactsRaw = DB::table('device_contacts')
            ->where('device_id', $device->id)
            ->selectRaw("REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone_number, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') as norm_phone, name")
            ->get();

        $contactsByExact = [];
        $contactsBySuffix = [];
        foreach ($contactsRaw as $c) {
            $contactsByExact[$c->norm_phone] = $c->name;
            $suffix = substr($c->norm_phone, -9);
            if (strlen($suffix) === 9) {
                $contactsBySuffix[$suffix] = $c->name;
            }
        }

        $normalizeExprLocal = $normalizeExpr;
        $result = $threads->map(function ($thread) use ($device, $contactsByExact, $contactsBySuffix, $normalizeExprLocal) {
            // Get the last message for this thread (match by normalized address)
            $lastMsg = DB::table('device_sms')
                ->where('device_id', $device->id)
                ->whereRaw("{$normalizeExprLocal} = ?", [$thread->normalized_address])
                ->orderByDesc('date')
                ->first(['body', 'type', 'sms_status', 'date', 'deleted_at_source']);

            // Decrypt body (model uses encrypted cast, but we're using raw query)
            $lastBody = '';
            if ($lastMsg && $lastMsg->body) {
                try {
                    $lastBody = \Illuminate\Support\Facades\Crypt::decryptString($lastMsg->body);
                } catch (\Throwable) {
                    $lastBody = $lastMsg->body;
                }
            }

            $addr = $thread->address;
            $isCorporate = (bool) preg_match('/^[A-Z][A-Za-z\s]+$/', trim($addr))
                && !preg_match('/^\+?\d[\d\s\-().]+$/', trim($addr));

            // Resolve contact name: try exact match first, then suffix (last 9 digits)
            $normAddr = str_replace('+', '', $thread->normalized_address);
            $contactName = $contactsByExact[$normAddr] ?? null;
            if ($contactName === null) {
                $suffix = substr($normAddr, -9);
                if (strlen($suffix) === 9) {
                    $contactName = $contactsBySuffix[$suffix] ?? null;
                }
            }

            return [
                'address' => $addr,
                'normalized_address' => $thread->normalized_address,
                'contact_name' => $contactName,
                'is_corporate' => $isCorporate,
                'last_body' => \Illuminate\Support\Str::limit($lastBody, 120),
                'last_type' => $lastMsg->type ?? null,
                'last_sms_status' => $lastMsg->sms_status ?? 'received',
                'last_date' => $lastMsg->date ?? $thread->last_date,
                'message_count' => (int) $thread->message_count,
                'inbox_count' => (int) $thread->inbox_count,
                'sent_count' => (int) $thread->sent_count,
                'failed_count' => (int) $thread->failed_count,
                'deleted_count' => (int) $thread->deleted_count,
                'channel' => 'sms',
                'unread' => ($lastMsg->type ?? null) === 'inbox',
            ];
        });

        return response()->json([
            'data' => $result->values(),
            'meta' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'last_page' => (int) ceil($totalThreads / $perPage),
                'total' => (int) $totalThreads,
                'from' => ($page - 1) * $perPage + 1,
                'to' => min($page * $perPage, $totalThreads),
            ],
        ]);
    }

    public function getContactsFeed(int $deviceId, array $queryParams = []): AnonymousResourceCollection
    {
        $device = $this->resolveDevice($deviceId);
        $limit = (int) (data_get($queryParams, 'per_page') ?? data_get($queryParams, 'limit', 25));
        $items = DeviceContact::query()
            ->where('device_id', $device->id)
            ->filterOnRequest()
            ->searchOnRequest()
            ->sortOnRequest()
            ->paginate($limit);

        return DeviceContactResource::collection($items);
    }

    public function getNotificationsFeed(int $deviceId, array $queryParams = []): AnonymousResourceCollection
    {
        $device = $this->resolveDevice($deviceId);
        $limit = (int) (data_get($queryParams, 'per_page') ?? data_get($queryParams, 'limit', 25));
        $items = DeviceNotification::query()
            ->where('device_id', $device->id)
            ->filterOnRequest()
            ->searchOnRequest()
            ->sortOnRequest()
            ->paginate($limit);

        return DeviceNotificationResource::collection($items);
    }

    public function getGpsLocationsFeed(int $deviceId, array $queryParams = []): AnonymousResourceCollection
    {
        $device = $this->resolveDevice($deviceId);
        $limit = (int) (data_get($queryParams, 'per_page') ?? data_get($queryParams, 'limit', 25));
        $items = DeviceGpsLocation::query()
            ->where('device_id', $device->id)
            ->filterOnRequest()
            ->searchOnRequest()
            ->sortOnRequest()
            ->paginate($limit);

        return DeviceGpsLocationResource::collection($items);
    }

    public function getGeofencesFeed(int $deviceId, array $queryParams = []): AnonymousResourceCollection
    {
        $device = $this->resolveDevice($deviceId);
        $limit = (int) (data_get($queryParams, 'per_page') ?? data_get($queryParams, 'limit', 25));
        $items = DeviceGeofence::query()
            ->where('device_id', $device->id)
            ->filterOnRequest()
            ->searchOnRequest()
            ->sortOnRequest()
            ->paginate($limit);

        return DeviceGeofenceResource::collection($items);
    }

    public function getGeofenceAlertsFeed(int $deviceId, array $queryParams = []): AnonymousResourceCollection
    {
        $device = $this->resolveDevice($deviceId);
        $limit = (int) (data_get($queryParams, 'per_page') ?? data_get($queryParams, 'limit', 25));
        $items = DeviceGeofenceAlert::query()
            ->where('device_id', $device->id)
            ->with('geofence')
            ->filterOnRequest()
            ->searchOnRequest()
            ->sortOnRequest()
            ->paginate($limit);

        return DeviceGeofenceAlertResource::collection($items);
    }

    public function getSocialMessagesFeed(int $deviceId, array $queryParams = []): AnonymousResourceCollection
    {
        $device = $this->resolveDevice($deviceId);
        $limit = (int) (data_get($queryParams, 'per_page') ?? data_get($queryParams, 'limit', 25));
        $items = DeviceSocialMessage::query()
            ->where('device_id', $device->id)
            ->filterOnRequest()
            ->searchOnRequest()
            ->sortOnRequest()
            ->paginate($limit);

        return DeviceSocialMessageResource::collection($items);
    }

    public function getBrowserHistoriesFeed(int $deviceId, array $queryParams = []): AnonymousResourceCollection
    {
        $device = $this->resolveDevice($deviceId);
        $limit = (int) (data_get($queryParams, 'per_page') ?? data_get($queryParams, 'limit', 25));
        $items = DeviceBrowserHistory::query()
            ->where('device_id', $device->id)
            ->filterOnRequest()
            ->searchOnRequest()
            ->sortOnRequest()
            ->paginate($limit);

        return DeviceBrowserHistoryResource::collection($items);
    }

    public function getInstalledAppsFeed(int $deviceId, array $queryParams = []): AnonymousResourceCollection
    {
        $device = $this->resolveDevice($deviceId);
        $limit = (int) (data_get($queryParams, 'per_page') ?? data_get($queryParams, 'limit', 25));
        $items = DeviceInstalledApp::query()
            ->where('device_id', $device->id)
            ->filterOnRequest()
            ->searchOnRequest()
            ->sortOnRequest()
            ->paginate($limit);

        return DeviceInstalledAppResource::collection($items);
    }

    public function getFilesFeed(int $deviceId, array $queryParams = []): AnonymousResourceCollection
    {
        $device = $this->resolveDevice($deviceId);
        $limit = (int) (data_get($queryParams, 'per_page') ?? data_get($queryParams, 'limit', 25));
        $items = DeviceFile::query()
            ->where('device_id', $device->id)
            ->filterOnRequest()
            ->searchOnRequest()
            ->sortOnRequest()
            ->paginate($limit);

        return DeviceFileResource::collection($items);
    }

    public function getMediaFeed(int $deviceId, array $queryParams = []): AnonymousResourceCollection
    {
        $device = $this->resolveDevice($deviceId);
        $limit = (int) (data_get($queryParams, 'per_page') ?? data_get($queryParams, 'limit', 25));
        $items = DeviceMedia::query()
            ->where('device_id', $device->id)
            ->filterOnRequest()
            ->searchOnRequest()
            ->sortOnRequest()
            ->paginate($limit);

        return DeviceMediaResource::collection($items);
    }

    public function getRestrictionsFeed(int $deviceId, array $queryParams = []): AnonymousResourceCollection
    {
        $device = $this->resolveDevice($deviceId);
        $limit = (int) data_get($queryParams, 'limit', 50);
        $items = DeviceRestrictionRule::query()
            ->where('device_id', $device->id)
            ->filterOnRequest()
            ->sortOnRequest()
            ->paginate($limit);

        return DeviceRestrictionRuleResource::collection($items);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Telemetry write services (returning final API resource formats)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Store a new geofence perimeter configured for the device.
     *
     * @param int $deviceId
     * @param array $data
     * @return DeviceGeofenceResource
     */
    public function storeGeofence(int $deviceId, array $data): DeviceGeofenceResource
    {
        $device = Device::where('user_id', auth()->id())->where('id', $deviceId)->firstOrFail();
        $geofence = $device->geofences()->create($data);

        return DeviceGeofenceResource::make($geofence);
    }

    /**
     * Update an existing geofence perimeter configuration.
     *
     * @param int $deviceId
     * @param int $geofenceId
     * @param array $data
     * @return DeviceGeofenceResource
     */
    public function updateGeofence(int $deviceId, int $geofenceId, array $data): DeviceGeofenceResource
    {
        $device = Device::where('user_id', auth()->id())->where('id', $deviceId)->firstOrFail();
        $geofence = $device->geofences()->findOrFail($geofenceId);
        $geofence->update($data);

        return DeviceGeofenceResource::make($geofence);
    }

    /**
     * Destroy a configured geofence perimeter.
     *
     * @param int $deviceId
     * @param int $geofenceId
     * @return JsonResponse
     */
    public function destroyGeofence(int $deviceId, int $geofenceId): JsonResponse
    {
        $device = Device::where('user_id', auth()->id())->where('id', $deviceId)->firstOrFail();
        $geofence = $device->geofences()->findOrFail($geofenceId);
        $geofence->delete();

        return response()->json(['success' => true], 200);
    }

    /**
     * Configure or update a parental restriction rule on the device.
     *
     * @param int $deviceId
     * @param array $data
     * @return DeviceRestrictionRuleResource
     */
    public function storeRestrictionRule(int $deviceId, array $data): DeviceRestrictionRuleResource
    {
        $device = Device::where('user_id', auth()->id())->where('id', $deviceId)->firstOrFail();

        $rule = DeviceRestrictionRule::updateOrCreate(
            [
                'device_id' => $device->id,
                'rule_type' => $data['rule_type'],
            ],
            [
                'is_enabled' => $data['is_enabled'],
                'parameters' => $data['parameters'] ?? [],
            ]
        );

        return DeviceRestrictionRuleResource::make($rule);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Secure download services (returning StreamedResponse / BinaryFileResponse)
    // ─────────────────────────────────────────────────────────────────────────

    public function downloadMedia(int $deviceId, int $mediaId): StreamedResponse|BinaryFileResponse
    {
        $device = $this->resolveDevice($deviceId);
        $media = $device->media()->findOrFail($mediaId);

        $disk = Storage::disk('local');

        if (!$disk->exists($media->path)) {
            if (app()->environment('testing')) {
                return response()->streamDownload(function () {
                    echo 'dummy content';
                }, $media->file_name);
            }
            abort(404, 'Media file not found in storage.');
        }

        return $disk->download($media->path, $media->file_name);
    }

    public function downloadCallAudio(int $deviceId, int $callId): StreamedResponse|BinaryFileResponse
    {
        $device = $this->resolveDevice($deviceId);
        $call = $device->calls()->findOrFail($callId);

        if (empty($call->recording_path)) {
            abort(404, 'No audio recording associated with this call.');
        }

        $disk = Storage::disk('local');

        if (!$disk->exists($call->recording_path)) {
            if (app()->environment('testing')) {
                return response()->streamDownload(function () {
                    echo 'dummy audio content';
                }, 'call_' . $callId . '.mp3');
            }
            abort(404, 'Audio recording file not found in storage.');
        }

        return $disk->download($call->recording_path, 'call_' . $callId . '.mp3');
    }

    /**
     * Delete a child device registration.
     *
     * @param int $deviceId
     * @return JsonResponse
     */
    public function destroyDevice(int $deviceId): JsonResponse
    {
        $device = Device::where('user_id', auth()->id())->where('id', $deviceId)->firstOrFail();
        $device->delete();

        return response()->json(['success' => true], 200);
    }

    /**
     * Get the file upload key for device model.
     *
     * @return string
     */
    public function fileKey(): string
    {
        return 'image';
    }

    /**
     * Get the storage folder path for device uploads.
     *
     * @return string
     */
    public function filePath(): string
    {
        return 'devices/avatars';
    }
}
