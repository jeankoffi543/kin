<?php

use App\Enums\CommandType;
use App\Models\Device;
use App\Models\DeviceRemoteCommand;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

function parentUser(): User
{
    return User::factory()->create();
}

function parentDevice(User $user, string $uuid = 'device-uuid-01'): Device
{
    return Device::create([
        'user_id'     => $user->id,
        'uuid'        => $uuid,
        'platform'    => 'android',
        'device_name' => 'Test Phone',
    ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Device registration
// ─────────────────────────────────────────────────────────────────────────────

test('parent can register a new child device', function () {
    $user = parentUser();

    $this->actingAs($user, 'sanctum')
        ->postJson('/api/user/devices/register', [
            'uuid'        => 'new-device-uuid',
            'platform'    => 'android',
            'device_name' => 'Pixel 7',
            'brand'       => 'Google',
            'os_version'  => '14',
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.uuid', 'new-device-uuid');

    expect(Device::where('uuid', 'new-device-uuid')->exists())->toBeTrue();
});

test('register updates an existing device (upsert by uuid)', function () {
    $user   = parentUser();
    parentDevice($user, 'existing-uuid');

    $this->actingAs($user, 'sanctum')
        ->postJson('/api/user/devices/register', [
            'uuid'        => 'existing-uuid',
            'device_name' => 'Updated Name',
        ])
        ->assertOk()
        ->assertJsonPath('data.device_name', 'Updated Name');

    expect(Device::where('uuid', 'existing-uuid')->count())->toBe(1);
});

test('register fails without uuid', function () {
    $user = parentUser();

    $this->actingAs($user, 'sanctum')
        ->postJson('/api/user/devices/register', ['platform' => 'android'])
        ->assertStatus(400)->assertJsonStructure(['errors' => ['uuid']]);
});

// ─────────────────────────────────────────────────────────────────────────────
// List / Show / Delete
// ─────────────────────────────────────────────────────────────────────────────

test('parent can list their own devices', function () {
    $user = parentUser();
    parentDevice($user, 'dev-list-1');
    parentDevice($user, 'dev-list-2');

    $other = parentUser();
    parentDevice($other, 'dev-other');

    $this->actingAs($user, 'sanctum')
        ->getJson('/api/user/devices')
        ->assertOk()->assertJsonCount(2, 'data');
});

test('parent can show their own device', function () {
    $user   = parentUser();
    $device = parentDevice($user);

    $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}")
        ->assertOk()->assertJsonPath('data.uuid', 'device-uuid-01');
});

test('parent cannot show another parent device', function () {
    $owner  = parentUser();
    $other  = parentUser();
    $device = parentDevice($owner, 'owner-device-uuid');

    $this->actingAs($other, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}")
        ->assertNotFound();
});

test('parent can delete their device', function () {
    $user   = parentUser();
    $device = parentDevice($user);

    $this->actingAs($user, 'sanctum')
        ->deleteJson("/api/user/devices/{$device->id}")
        ->assertOk()->assertJsonPath('success', true);

    expect(Device::find($device->id))->toBeNull();
});

test('unauthenticated request to device list returns 401', function () {
    $this->getJson('/api/user/devices')->assertUnauthorized();
});

// ─────────────────────────────────────────────────────────────────────────────
// Status change
// ─────────────────────────────────────────────────────────────────────────────

test('parent can change device status settings', function () {
    Event::fake();

    $user   = parentUser();
    $device = parentDevice($user);

    $this->actingAs($user, 'sanctum')
        ->putJson("/api/user/devices/{$device->id}/status", [
            'call_recording_enabled'   => true,
            'screen_recording_enabled' => false,
        ])
        ->assertOk();

    expect($device->fresh()->call_recording_enabled)->toBeTrue();
});

test('status change fails with invalid interval value', function () {
    $user   = parentUser();
    $device = parentDevice($user);

    $this->actingAs($user, 'sanctum')
        ->putJson("/api/user/devices/{$device->id}/status", [
            'microphone_recording_interval' => 0,
        ])
        ->assertStatus(400)->assertJsonStructure(['errors' => ['microphone_recording_interval']]);
});

// ─────────────────────────────────────────────────────────────────────────────
// Remote command scheduling
// ─────────────────────────────────────────────────────────────────────────────

test('parent can schedule a screenshot command', function () {
    Event::fake();

    $user   = parentUser();
    $device = parentDevice($user);

    $this->actingAs($user, 'sanctum')
        ->postJson("/api/user/devices/{$device->id}/command", ['command_type' => 'screenshot'])
        ->assertOk()
        ->assertJsonPath('command_type', 'screenshot')
        ->assertJsonPath('status', 'pending');

    expect(DeviceRemoteCommand::where('device_id', $device->id)->count())->toBe(1);
});

test('parent can schedule all command types', function () {
    Event::fake();

    $user = parentUser();

    foreach (CommandType::cases() as $type) {
        $d = Device::create(['user_id' => $user->id, 'uuid' => "cmd-{$type->value}"]);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/user/devices/{$d->id}/command", ['command_type' => $type->value])
            ->assertOk()->assertJsonPath('command_type', $type->value);
    }
});

test('command scheduling fails with invalid command type', function () {
    $user   = parentUser();
    $device = parentDevice($user);

    $this->actingAs($user, 'sanctum')
        ->postJson("/api/user/devices/{$device->id}/command", ['command_type' => 'explode'])
        ->assertStatus(400)->assertJsonStructure(['errors' => ['command_type']]);
});

test('parent cannot schedule a command on another user device', function () {
    Event::fake();

    $owner  = parentUser();
    $other  = parentUser();
    $device = parentDevice($owner, 'owner-cmd-device');

    $this->actingAs($other, 'sanctum')
        ->postJson("/api/user/devices/{$device->id}/command", ['command_type' => 'screenshot'])
        ->assertNotFound();
});
