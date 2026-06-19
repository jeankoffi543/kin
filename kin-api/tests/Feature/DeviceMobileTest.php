<?php

use App\Enums\CommandStatus;
use App\Enums\CommandType;
use App\Models\Device;
use App\Models\DeviceRemoteCommand;
use App\Models\DeviceRestrictionRule;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function mobileDevice(string $uuid = 'mobile-uuid-1'): array
{
    $user = User::factory()->create();
    $device = Device::create(['user_id' => $user->id, 'uuid' => $uuid, 'platform' => 'android']);

    return [$user, $device];
}

// ─────────────────────────────────────────────────────────────────────────────
// Authentication guard
// ─────────────────────────────────────────────────────────────────────────────

test('device endpoint rejects request without X-Device-UUID header', function () {
    $this->getJson('/api/device/notifications')->assertUnauthorized();
});

test('device endpoint rejects unknown UUID', function () {
    $this->withHeaders(['X-Device-UUID' => 'non-existent-uuid'])
        ->getJson('/api/device/notifications')
        ->assertUnauthorized();
});

// ─────────────────────────────────────────────────────────────────────────────
// Notifications (global broadcast messages)
// ─────────────────────────────────────────────────────────────────────────────

test('device can pull global notifications', function () {
    [, $device] = mobileDevice('notif-pull-uuid');

    Notification::create(['audience' => 'all', 'title' => 'Platform Update', 'body' => 'New version available.']);
    Notification::create(['audience' => 'specific', 'user_ids' => [999], 'title' => 'Private', 'body' => 'Not for devices.']);

    $response = $this->withHeaders(['X-Device-UUID' => 'notif-pull-uuid'])
        ->getJson('/api/device/notifications');

    $response->assertOk();
    $titles = collect($response->json('data'))->pluck('title');
    expect($titles)->toContain('Platform Update')
        ->not->toContain('Private');
});

test('device can pull a specific global notification', function () {
    [, $device] = mobileDevice('notif-show-uuid');
    $notif = Notification::create(['audience' => 'all', 'title' => 'Alert', 'body' => 'Read this.']);

    $response = $this->withHeaders(['X-Device-UUID' => 'notif-show-uuid'])
        ->getJson("/api/device/notifications/{$notif->id}");

    $response->assertOk()->assertJsonPath('data.title', 'Alert');
});

test('device cannot pull a specific-audience notification', function () {
    [, $device] = mobileDevice('notif-deny-uuid');
    $notif = Notification::create(['audience' => 'specific', 'user_ids' => [999], 'title' => 'Private', 'body' => 'Not for you.']);

    $this->withHeaders(['X-Device-UUID' => 'notif-deny-uuid'])
        ->getJson("/api/device/notifications/{$notif->id}")
        ->assertNotFound();
});

test('device can pull notifications with pagination', function () {
    [, $device] = mobileDevice('notif-page-uuid');

    for ($i = 1; $i <= 5; $i++) {
        Notification::create(['audience' => 'all', 'title' => "Alert {$i}", 'body' => "Body {$i}."]);
    }

    $response = $this->withHeaders(['X-Device-UUID' => 'notif-page-uuid'])
        ->getJson('/api/device/notifications?limit=2');

    $response->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.total', 5);
});

// ─────────────────────────────────────────────────────────────────────────────
// Restrictions pull
// ─────────────────────────────────────────────────────────────────────────────

test('device can pull its own restriction rules', function () {
    [, $device] = mobileDevice('restrict-pull-uuid');

    DeviceRestrictionRule::create(['device_id' => $device->id, 'rule_type' => 'block_calls', 'is_enabled' => true,  'parameters' => []]);
    DeviceRestrictionRule::create(['device_id' => $device->id, 'rule_type' => 'app_block',   'is_enabled' => false, 'parameters' => []]);

    $response = $this->withHeaders(['X-Device-UUID' => 'restrict-pull-uuid'])
        ->getJson('/api/device/restrictions');

    $response->assertOk()->assertJsonCount(2);
    $types = collect($response->json())->pluck('rule_type');
    expect($types)->toContain('block_calls')->toContain('app_block');
});

test('device only sees its own restriction rules, not other devices', function () {
    [, $device1] = mobileDevice('restrict-own-uuid');
    [, $device2] = mobileDevice('restrict-other-uuid');

    DeviceRestrictionRule::create(['device_id' => $device2->id, 'rule_type' => 'sms_filter', 'is_enabled' => true, 'parameters' => []]);

    $response = $this->withHeaders(['X-Device-UUID' => 'restrict-own-uuid'])
        ->getJson('/api/device/restrictions');

    $response->assertOk()->assertJsonCount(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Commands pull
// ─────────────────────────────────────────────────────────────────────────────

test('device can pull pending commands', function () {
    [, $device] = mobileDevice('cmd-pull-uuid');

    DeviceRemoteCommand::create(['device_id' => $device->id, 'command_type' => CommandType::SCREENSHOT, 'status' => CommandStatus::PENDING, 'parameters' => [], 'triggered_at' => now()]);
    DeviceRemoteCommand::create(['device_id' => $device->id, 'command_type' => CommandType::LIVE_MIC,   'status' => CommandStatus::COMPLETED, 'parameters' => [], 'triggered_at' => now()]);

    $response = $this->withHeaders(['X-Device-UUID' => 'cmd-pull-uuid'])
        ->getJson('/api/device/commands');

    $response->assertOk()->assertJsonCount(1);
    expect($response->json('0.status'))->toBe('pending');
});

// ─────────────────────────────────────────────────────────────────────────────
// Command response
// ─────────────────────────────────────────────────────────────────────────────

test('device can respond to a command with result_url', function () {
    [, $device] = mobileDevice('cmd-respond-uuid');

    $cmd = DeviceRemoteCommand::create([
        'device_id' => $device->id,
        'command_type' => CommandType::SCREENSHOT,
        'status' => CommandStatus::PENDING,
        'parameters' => [],
        'triggered_at' => now(),
    ]);

    $response = $this->withHeaders(['X-Device-UUID' => 'cmd-respond-uuid'])
        ->postJson("/api/device/commands/{$cmd->id}/respond", [
            'status' => 'completed',
            'result_url' => 'https://storage.kin.test/screenshots/result.jpg',
        ]);

    $response->assertOk()->assertJsonPath('success', true);
    expect($cmd->fresh()->status)->toBe(CommandStatus::COMPLETED);
    expect($cmd->fresh()->result_url)->toBe('https://storage.kin.test/screenshots/result.jpg');
});

test('device can respond with failed status', function () {
    [, $device] = mobileDevice('cmd-fail-uuid');

    $cmd = DeviceRemoteCommand::create([
        'device_id' => $device->id,
        'command_type' => CommandType::LIVE_MIC,
        'status' => CommandStatus::PENDING,
        'parameters' => [],
        'triggered_at' => now(),
    ]);

    $response = $this->withHeaders(['X-Device-UUID' => 'cmd-fail-uuid'])
        ->postJson("/api/device/commands/{$cmd->id}/respond", [
            'status'     => 'failed',
            'result_url' => 'n/a',
        ]);

    $response->assertOk();
    expect($cmd->fresh()->status)->toBe(CommandStatus::FAILED);
});

test('command response fails with invalid status', function () {
    [, $device] = mobileDevice('cmd-bad-uuid');

    $cmd = DeviceRemoteCommand::create([
        'device_id' => $device->id,
        'command_type' => CommandType::SCREENSHOT,
        'status' => CommandStatus::PENDING,
        'parameters' => [],
        'triggered_at' => now(),
    ]);

    $this->withHeaders(['X-Device-UUID' => 'cmd-bad-uuid'])
        ->postJson("/api/device/commands/{$cmd->id}/respond", [
            'status' => 'unknown-status',
        ])
        ->assertStatus(400)->assertJsonStructure(['errors' => ['status']]);
});

test('command response fails without status field', function () {
    [, $device] = mobileDevice('cmd-nostat-uuid');

    $cmd = DeviceRemoteCommand::create([
        'device_id' => $device->id,
        'command_type' => CommandType::SCREENSHOT,
        'status' => CommandStatus::PENDING,
        'parameters' => [],
        'triggered_at' => now(),
    ]);

    $this->withHeaders(['X-Device-UUID' => 'cmd-nostat-uuid'])
        ->postJson("/api/device/commands/{$cmd->id}/respond", [])
        ->assertStatus(400)->assertJsonStructure(['errors' => ['status']]);
});

test('device cannot respond to another device command', function () {
    [, $device1] = mobileDevice('cmd-own-uuid');
    [, $device2] = mobileDevice('cmd-foreign-uuid');

    $cmd = DeviceRemoteCommand::create([
        'device_id' => $device2->id,
        'command_type' => CommandType::SCREENSHOT,
        'status' => CommandStatus::PENDING,
        'parameters' => [],
        'triggered_at' => now(),
    ]);

    $this->withHeaders(['X-Device-UUID' => 'cmd-own-uuid'])
        ->postJson("/api/device/commands/{$cmd->id}/respond", [
            'status'     => 'completed',
            'result_url' => 'https://storage.kin.test/screenshots/foreign.jpg',
        ])
        ->assertNotFound();
});
