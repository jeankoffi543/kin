<?php

use App\Enums\CallType;
use App\Enums\CommandStatus;
use App\Enums\CommandType;
use App\Enums\MediaType;
use App\Enums\RestrictionRuleType;
use App\Enums\SubscriptionStatus;
use App\Jobs\ProcessTelemetryBatch;
use App\Models\Admin;
use App\Models\Device;
use App\Models\DeviceBrowserHistory;
use App\Models\DeviceCall;
use App\Models\DeviceGeofence;
use App\Models\DeviceGeofenceAlert;
use App\Models\DeviceMedia;
use App\Models\DeviceRemoteCommand;
use App\Models\DeviceRestrictionRule;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

/**
 * Helper: spin up a Device bound to a fresh User.
 */
function makeDevice(string $uuid, string $platform = 'android'): array
{
    $user = User::factory()->create();
    $device = Device::create([
        'user_id' => $user->id,
        'uuid' => $uuid,
        'platform' => $platform,
        'device_name' => 'Test Device',
    ]);

    return [$user, $device];
}

// ─────────────────────────────────────────────────────────────────────────────
// Core deduplication + async dispatch flow
// ─────────────────────────────────────────────────────────────────────────────

test('sync ingests new hashes: acquires dedup lock and dispatches async job', function () {
    Queue::fake();

    [, $device] = makeDevice('uuid-dedup-test');

    $payload = [
        'calls' => [
            [
                'phone_number' => '+33612345678',
                'contact_name' => 'Mom',
                'call_type' => 'incoming',
                'duration' => 120,
                'sync_hash' => 'hash-call-1',
                'local_sqlite_id' => 101,
            ],
            [
                'phone_number' => '+33687654321',
                'call_type' => 'outgoing',
                'duration' => 45,
                'sync_hash' => 'hash-call-2',
                'local_sqlite_id' => 102,
            ],
        ],
    ];

    $response = $this->withHeaders(['X-Device-UUID' => 'uuid-dedup-test'])
        ->postJson('/api/device/sync', $payload);

    $response->assertStatus(200);
    $response->assertJsonPath('success', true);
    // Both hashes must be returned as cleared immediately
    $response->assertJsonPath('cleared.calls', ['hash-call-1', 'hash-call-2']);

    // Dedup lock must be acquired synchronously (before HTTP response)
    expect(DB::table('ingested_payloads')->where('device_id', $device->id)->count())->toBe(2);

    // The heavy telemetry insert is dispatched asynchronously
    Queue::assertPushed(ProcessTelemetryBatch::class, function (ProcessTelemetryBatch $job) use ($device): bool {
        return $job->channel === 'calls'
            && $job->table === 'device_calls'
            && $job->deviceId === $device->id
            && count($job->rows) === 2
            && count($job->hashes) === 2;
    });
});

test('sync deduplicates: already-ingested hashes are returned as cleared without re-dispatching a job', function () {
    Queue::fake();

    [, $device] = makeDevice('uuid-dedup-existing');

    // Pre-seed the dedup lock for hash-call-1
    DB::table('ingested_payloads')->insert([
        'sync_hash' => 'hash-call-1',
        'device_id' => $device->id,
        'payload_type' => 'calls',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $payload = [
        'calls' => [
            [
                'phone_number' => '+33612345678',
                'call_type' => 'incoming',
                'duration' => 120,
                'sync_hash' => 'hash-call-1',
                'local_sqlite_id' => 101,
            ],
        ],
    ];

    $response = $this->withHeaders(['X-Device-UUID' => 'uuid-dedup-existing'])
        ->postJson('/api/device/sync', $payload);

    $response->assertStatus(200);
    $response->assertJsonPath('cleared.calls', ['hash-call-1']);

    // No new dedup lock row was added
    expect(DB::table('ingested_payloads')->where('device_id', $device->id)->count())->toBe(1);

    // No job should be dispatched for an already-ingested batch
    Queue::assertNotPushed(ProcessTelemetryBatch::class);
});

test('sync processes multiple channels in a single request and dispatches one job per channel', function () {
    Queue::fake();

    [, $device] = makeDevice('uuid-multi-channel');

    $payload = [
        'calls' => [
            ['phone_number' => '+33600000001', 'call_type' => 'missed', 'duration' => 0, 'sync_hash' => 'mc-call-1', 'local_sqlite_id' => 301],
        ],
        'sms' => [
            ['address' => '+33600000002', 'body' => 'Hey!', 'type' => 'inbox', 'date' => '2026-06-13 10:00:00', 'sync_hash' => 'mc-sms-1', 'local_sqlite_id' => 302],
        ],
        'contacts' => [
            ['name' => 'Alice', 'phone_number' => '+33600000003', 'sync_hash' => 'mc-contact-1', 'local_sqlite_id' => 303],
        ],
    ];

    $response = $this->withHeaders(['X-Device-UUID' => 'uuid-multi-channel'])
        ->postJson('/api/device/sync', $payload);

    $response->assertStatus(200);
    $response->assertJsonPath('cleared.calls', ['mc-call-1']);
    $response->assertJsonPath('cleared.sms', ['mc-sms-1']);
    $response->assertJsonPath('cleared.contacts', ['mc-contact-1']);

    // 3 dedup locks, 3 jobs — one per channel
    expect(DB::table('ingested_payloads')->where('device_id', $device->id)->count())->toBe(3);
    Queue::assertPushed(ProcessTelemetryBatch::class, 3);

    Queue::assertPushed(ProcessTelemetryBatch::class, fn (ProcessTelemetryBatch $j) => $j->channel === 'calls');
    Queue::assertPushed(ProcessTelemetryBatch::class, fn (ProcessTelemetryBatch $j) => $j->channel === 'sms');
    Queue::assertPushed(ProcessTelemetryBatch::class, fn (ProcessTelemetryBatch $j) => $j->channel === 'contacts');
});

test('sync accepts notifications channel and dispatches job with correct table', function () {
    Queue::fake();

    [, $device] = makeDevice('uuid-notif-async');

    $payload = [
        'notifications' => [
            ['package_name' => 'com.whatsapp', 'title' => 'Mom', 'body' => 'Hello!', 'date' => '2026-06-13 12:00:00', 'sync_hash' => 'notif-hash-1', 'local_sqlite_id' => 200],
        ],
    ];

    $response = $this->withHeaders(['X-Device-UUID' => 'uuid-notif-async'])
        ->postJson('/api/device/sync', $payload);

    $response->assertStatus(200);
    $response->assertJsonPath('cleared.notifications', ['notif-hash-1']);

    Queue::assertPushed(ProcessTelemetryBatch::class, function (ProcessTelemetryBatch $job): bool {
        return $job->channel === 'notifications' && $job->table === 'device_notifications';
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// ProcessTelemetryBatch job unit tests
// ─────────────────────────────────────────────────────────────────────────────

test('ProcessTelemetryBatch::handle inserts rows into target table', function () {
    [, $device] = makeDevice('uuid-job-handle');
    $now = now();

    $rows = [
        [
            'device_id' => $device->id,
            'phone_number' => '+33600000099',
            'call_type' => 'outgoing',
            'duration' => 90,
            'contact_name' => null,
            'call_recorded' => false,
            'recording_path' => null,
            'sync_hash' => 'job-hash-1',
            'local_sqlite_id' => 500,
            'local_status' => 'pending',
            'deleted_at_source' => false,
            'created_at' => $now,
            'updated_at' => $now,
        ],
    ];

    $job = new ProcessTelemetryBatch(
        channel: 'calls',
        table: 'device_calls',
        deviceId: $device->id,
        rows: $rows,
        hashes: ['job-hash-1'],
    );

    $job->handle();

    expect(DB::table('device_calls')->where('sync_hash', 'job-hash-1')->exists())->toBeTrue();
});

test('ProcessTelemetryBatch::failed releases dedup locks', function () {
    [, $device] = makeDevice('uuid-job-failed');

    // Simulate a dedup lock already acquired
    DB::table('ingested_payloads')->insert([
        'sync_hash' => 'fail-hash-1',
        'device_id' => $device->id,
        'payload_type' => 'calls',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $job = new ProcessTelemetryBatch(
        channel: 'calls',
        table: 'device_calls',
        deviceId: $device->id,
        rows: [],
        hashes: ['fail-hash-1'],
    );

    $job->failed(new RuntimeException('DB exploded'));

    // Lock must be released so the mobile can retry
    expect(DB::table('ingested_payloads')->where('sync_hash', 'fail-hash-1')->exists())->toBeFalse();
});

test('sync honours mobile local_status when provided in payload', function () {
    Queue::fake();

    [, $device] = makeDevice('uuid-local-status');

    $payload = [
        'calls' => [
            [
                'phone_number' => '+33600000010',
                'call_type' => 'incoming',
                'duration' => 60,
                'sync_hash' => 'ls-hash-1',
                'local_sqlite_id' => 400,
                'local_status' => 'completed', // mobile-provided SSoT value
            ],
        ],
    ];

    $response = $this->withHeaders(['X-Device-UUID' => 'uuid-local-status'])
        ->postJson('/api/device/sync', $payload);

    $response->assertStatus(200);

    Queue::assertPushed(ProcessTelemetryBatch::class, function (ProcessTelemetryBatch $job): bool {
        // The mapped row must carry 'completed', not 'pending'
        return isset($job->rows[0]['local_status'])
            && $job->rows[0]['local_status'] === 'completed';
    });
});

test('sync uses LocalStatus::PENDING as fallback when local_status is absent', function () {
    Queue::fake();

    [, $device] = makeDevice('uuid-local-status-default');

    $payload = [
        'calls' => [
            [
                'phone_number' => '+33600000011',
                'call_type' => 'missed',
                'duration' => 0,
                'sync_hash' => 'ls-default-1',
                'local_sqlite_id' => 401,
                // no local_status key
            ],
        ],
    ];

    $response = $this->withHeaders(['X-Device-UUID' => 'uuid-local-status-default'])
        ->postJson('/api/device/sync', $payload);

    $response->assertStatus(200);

    Queue::assertPushed(ProcessTelemetryBatch::class, function (ProcessTelemetryBatch $job): bool {
        return $job->rows[0]['local_status'] === 'pending';
    });
});

test('device can pull restrictions', function () {
    [$user, $device] = makeDevice('uuid-restrictions-pull');

    DeviceRestrictionRule::create([
        'device_id' => $device->id,
        'rule_type' => RestrictionRuleType::BLOCK_CALLS,
        'is_enabled' => true,
        'parameters' => ['blocked_numbers' => ['+33600000000']],
    ]);

    $response = $this->withHeaders(['X-Device-UUID' => 'uuid-restrictions-pull'])
        ->getJson('/api/device/restrictions');

    $response->assertStatus(200);
    $response->assertJsonCount(1);
    $response->assertJsonFragment(['rule_type' => 'block_calls']);
});

test('device can pull pending commands', function () {
    [$user, $device] = makeDevice('uuid-commands-pull');

    DeviceRemoteCommand::create([
        'device_id' => $device->id,
        'command_type' => CommandType::SCREENSHOT,
        'status' => CommandStatus::PENDING,
        'parameters' => [],
        'triggered_at' => now(),
    ]);

    $response = $this->withHeaders(['X-Device-UUID' => 'uuid-commands-pull'])
        ->getJson('/api/device/commands');

    $response->assertStatus(200);
    $response->assertJsonCount(1);
    $response->assertJsonFragment(['command_type' => 'screenshot', 'status' => 'pending']);
});

test('device can respond to command', function () {
    [$user, $device] = makeDevice('uuid-command-respond');

    $command = DeviceRemoteCommand::create([
        'device_id' => $device->id,
        'command_type' => CommandType::SCREENSHOT,
        'status' => CommandStatus::PENDING,
        'parameters' => [],
        'triggered_at' => now(),
    ]);

    $response = $this->withHeaders(['X-Device-UUID' => 'uuid-command-respond'])
        ->postJson("/api/device/commands/{$command->id}/respond", [
            'status' => 'completed',
            'result_url' => 'https://example.com/screenshot.jpg',
        ]);

    $response->assertStatus(200);
    $response->assertJsonPath('success', true);
    $response->assertJsonPath('status', 'completed');

    expect($command->fresh()->status)->toBe(CommandStatus::COMPLETED);
    expect($command->fresh()->result_url)->toBe('https://example.com/screenshot.jpg');
});

test('parent can access owned device telemetry', function () {
    [$user, $device] = makeDevice('uuid-telemetry-parent-ok');
    $user->update(['subscription_status' => SubscriptionStatus::ACTIVE]);

    DeviceCall::create([
        'device_id' => $device->id,
        'phone_number' => '+33611111111',
        'call_type' => CallType::INCOMING,
        'duration' => 30,
        'sync_hash' => 'acl-call-hash-1',
        'local_sqlite_id' => 1,
    ]);

    $response = $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/calls");

    $response->assertStatus(200);
    $response->assertJsonPath('data.0.phone_number', '+33611111111');
});

test('parent cannot access other parent device telemetry', function () {
    [$user, $device] = makeDevice('uuid-telemetry-parent-bad');
    $user->update(['subscription_status' => SubscriptionStatus::ACTIVE]);

    $otherUser = User::factory()->create();
    $otherUser->update(['subscription_status' => SubscriptionStatus::ACTIVE]);

    $response = $this->actingAs($otherUser, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/calls");

    $response->assertStatus(404);
});

test('admin can access any device telemetry', function () {
    [$user, $device] = makeDevice('uuid-telemetry-admin');

    DeviceCall::create([
        'device_id' => $device->id,
        'phone_number' => '+33611111111',
        'call_type' => CallType::INCOMING,
        'duration' => 30,
        'sync_hash' => 'acl-call-hash-2',
        'local_sqlite_id' => 1,
    ]);

    $admin = Admin::create([
        'name' => 'Admin User',
        'email' => 'admin@kin.com',
        'password' => bcrypt('password'),
    ]);

    $response = $this->actingAs($admin, 'admin-sanctum')
        ->getJson("/api/admin/devices/{$device->id}/calls");

    $response->assertStatus(200);
    $response->assertJsonPath('data.0.phone_number', '+33611111111');
});

test('parent can access geofences, geofence-alerts, and browser telemetry', function () {
    [$user, $device] = makeDevice('uuid-telemetry-geofence-browser');

    $geofence = DeviceGeofence::create([
        'device_id' => $device->id,
        'name' => 'Home circular zone',
        'latitude' => 48.8566,
        'longitude' => 2.3522,
        'radius' => 150.0,
        'is_active' => true,
    ]);

    DeviceGeofenceAlert::create([
        'device_id' => $device->id,
        'geofence_id' => $geofence->id,
        'event_type' => 'enter',
        'latitude' => 48.8566,
        'longitude' => 2.3522,
        'triggered_at' => now(),
        'sync_hash' => 'alert-hash-acl',
        'local_sqlite_id' => 1,
    ]);

    DeviceBrowserHistory::create([
        'device_id' => $device->id,
        'url' => 'https://facebook.com',
        'title' => 'Facebook',
        'visited_at' => now(),
        'sync_hash' => 'browser-hash-acl',
        'local_sqlite_id' => 1,
    ]);

    // Test /geofences
    $response = $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/geofences");
    $response->assertStatus(200);
    $response->assertJsonPath('data.0.name', 'Home circular zone');

    // Test /geofence-alerts
    $response = $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/geofence-alerts");
    $response->assertStatus(200);
    $response->assertJsonPath('data.0.event_type', 'enter');

    // Test /browser
    $response = $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/browser");
    $response->assertStatus(200);
    $response->assertJsonPath('data.0.url', 'https://facebook.com');
});

test('parent can manage geofence configurations', function () {
    [$user, $device] = makeDevice('uuid-geofence-write');

    // 1. Create a geofence
    $response = $this->actingAs($user, 'sanctum')
        ->postJson("/api/user/devices/{$device->id}/geofences", [
            'name' => 'School circular zone',
            'latitude' => 48.1234,
            'longitude' => 2.5678,
            'radius' => 200.0,
            'is_active' => true,
        ]);

    $response->assertStatus(201);
    $response->assertJsonPath('data.name', 'School circular zone');
    $geofenceId = $response->json('data.id');

    // 2. Update the geofence
    $response = $this->actingAs($user, 'sanctum')
        ->putJson("/api/user/devices/{$device->id}/geofences/{$geofenceId}", [
            'radius' => 250.0,
            'is_active' => false,
        ]);

    $response->assertStatus(200);
    $response->assertJsonPath('data.radius', 250);
    $response->assertJsonPath('data.is_active', false);

    // 3. Delete the geofence
    $response = $this->actingAs($user, 'sanctum')
        ->deleteJson("/api/user/devices/{$device->id}/geofences/{$geofenceId}");

    $response->assertStatus(200);
    $response->assertJsonPath('success', true);
});

test('parent can store and update restriction rules', function () {
    [$user, $device] = makeDevice('uuid-restrictions-write');

    // 1. Create restriction
    $response = $this->actingAs($user, 'sanctum')
        ->postJson("/api/user/devices/{$device->id}/restrictions", [
            'rule_type' => 'block_calls',
            'is_enabled' => true,
            'parameters' => ['blocked_numbers' => ['+33600000000']],
        ]);

    $response->assertStatus(201);
    $response->assertJsonPath('data.rule_type', 'block_calls');
    $response->assertJsonPath('data.is_enabled', true);

    // 2. Update the restriction
    $response = $this->actingAs($user, 'sanctum')
        ->postJson("/api/user/devices/{$device->id}/restrictions", [
            'rule_type' => 'block_calls',
            'is_enabled' => false,
            'parameters' => [],
        ]);

    $response->assertStatus(200);
    $response->assertJsonPath('data.is_enabled', false);
});

test('parent and admin can securely download media files', function () {
    [$user, $device] = makeDevice('uuid-media-download');

    $media = new DeviceMedia([
        'device_id' => $device->id,
        'media_type' => MediaType::PHOTO,
        'origin_app' => 'camera',
        'file_name' => 'photo_to_download.jpg',
        'file_size' => 2048,
        'path' => 'media/photo_to_download.jpg',
        'sync_hash' => 'media-download-hash',
    ]);
    $media->save();

    // 1. Parent download
    $response = $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/media/{$media->id}/download");

    $response->assertStatus(200);
    $response->assertHeader('content-disposition', 'attachment; filename=photo_to_download.jpg');

    // 2. Admin download
    $admin = Admin::create([
        'name' => 'Admin Download User',
        'email' => 'admin-dl@kin.com',
        'password' => bcrypt('password'),
    ]);

    $response = $this->actingAs($admin, 'admin-sanctum')
        ->getJson("/api/admin/devices/{$device->id}/media/{$media->id}/download");

    $response->assertStatus(200);
    $response->assertHeader('content-disposition', 'attachment; filename=photo_to_download.jpg');
});

test('parent can delete / dissociate child device', function () {
    [$user, $device] = makeDevice('uuid-device-delete');

    $response = $this->actingAs($user, 'sanctum')
        ->deleteJson("/api/user/devices/{$device->id}");

    $response->assertStatus(200);
    $response->assertJsonPath('success', true);

    expect(Device::find($device->id))->toBeNull();
});

test('parent and admin can securely download call audio recordings', function () {
    [$user, $device] = makeDevice('uuid-call-audio-download');

    $call = DeviceCall::create([
        'device_id' => $device->id,
        'phone_number' => '+33600000012',
        'call_type' => CallType::INCOMING,
        'duration' => 60,
        'call_recorded' => true,
        'recording_path' => 'calls/recording_1.mp3',
        'sync_hash' => 'call-audio-hash-acl',
        'local_sqlite_id' => 1,
    ]);

    // 1. Parent call audio download
    $response = $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/calls/{$call->id}/download");

    $response->assertStatus(200);
    // Let's assert content-disposition header contains the file name
    $response->assertHeader('content-disposition', 'attachment; filename=call_'.$call->id.'.mp3');

    // 2. Admin call audio download
    $admin = Admin::create([
        'name' => 'Admin Call Audio User',
        'email' => 'admin-audio-dl@kin.com',
        'password' => bcrypt('password'),
    ]);

    $response = $this->actingAs($admin, 'admin-sanctum')
        ->getJson("/api/admin/devices/{$device->id}/calls/{$call->id}/download");

    $response->assertStatus(200);
    $response->assertHeader('content-disposition', 'attachment; filename=call_'.$call->id.'.mp3');
});
