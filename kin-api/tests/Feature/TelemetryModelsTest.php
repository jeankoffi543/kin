<?php

use App\Enums\CallType;
use App\Enums\CommandStatus;
use App\Enums\CommandType;
use App\Enums\LocalStatus;
use App\Enums\MediaType;
use App\Enums\RestrictionRuleType;
use App\Enums\SmsType;
use App\Enums\SocialPlatform;
use App\Models\Device;
use App\Models\DeviceBrowserHistory;
use App\Models\DeviceCall;
use App\Models\DeviceFile;
use App\Models\DeviceGeofence;
use App\Models\DeviceGeofenceAlert;
use App\Models\DeviceGpsLocation;
use App\Models\DeviceMedia;
use App\Models\DeviceNotification;
use App\Models\DeviceRemoteCommand;
use App\Models\DeviceRestrictionRule;
use App\Models\DeviceSms;
use App\Models\DeviceSocialMessage;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('device model has all requested hasMany relationships', function () {
    $user = User::factory()->create();
    $device = Device::create([
        'user_id' => $user->id,
        'uuid' => 'test-device-uuid-999',
        'platform' => 'android',
        'device_name' => 'Test Pixel',
    ]);

    // Verify relations
    expect($device->contacts())->toBeInstanceOf(HasMany::class);
    expect($device->interceptedNotifications())->toBeInstanceOf(HasMany::class);
    expect($device->gpsLocations())->toBeInstanceOf(HasMany::class);
    expect($device->geofences())->toBeInstanceOf(HasMany::class);
    expect($device->geofenceAlerts())->toBeInstanceOf(HasMany::class);
    expect($device->socialMessages())->toBeInstanceOf(HasMany::class);
    expect($device->browserHistories())->toBeInstanceOf(HasMany::class);
    expect($device->installedApps())->toBeInstanceOf(HasMany::class);
    expect($device->files())->toBeInstanceOf(HasMany::class);
    expect($device->remoteCommands())->toBeInstanceOf(HasMany::class);
    expect($device->restrictionRules())->toBeInstanceOf(HasMany::class);
});

test('device file model works with casts and querymaster', function () {
    $user = User::factory()->create();
    $device = Device::create([
        'user_id' => $user->id,
        'uuid' => 'test-device-uuid-999',
    ]);

    $file = DeviceFile::create([
        'device_id' => $device->id,
        'path' => '/storage/emulated/0/Download',
        'file_name' => 'report.pdf',
        'file_size' => 1048576,
        'is_directory' => false,
        'file_created_at' => '2026-06-13 12:00:00',
        'sync_hash' => 'file-sync-hash-1',
        'local_sqlite_id' => 10,
        'local_status' => LocalStatus::PENDING,
        'deleted_at_source' => false,
    ]);

    expect($file->is_directory)->toBeBool()->toBeFalse();
    expect($file->file_created_at)->toBeInstanceOf(Carbon::class);
    expect($file->local_status)->toBe(LocalStatus::PENDING);
    expect($file->device->id)->toBe($device->id);

    // Test QueryMaster filters via request helper
    request()->merge(['is_directory__eq' => false]);
    $queried = DeviceFile::filterOnRequest()->first();
    expect($queried)->not->toBeNull();
    expect($queried->id)->toBe($file->id);
});

test('device remote command model works with casts and querymaster', function () {
    $user = User::factory()->create();
    $device = Device::create([
        'user_id' => $user->id,
        'uuid' => 'test-device-uuid-999',
    ]);

    $command = DeviceRemoteCommand::create([
        'device_id' => $device->id,
        'command_type' => CommandType::SCREENSHOT,
        'status' => CommandStatus::PENDING,
        'parameters' => ['quality' => 80],
        'result_url' => 'https://kin.s3.amazonaws.com/screenshots/1.jpg',
        'triggered_at' => '2026-06-13 12:05:00',
    ]);

    expect($command->command_type)->toBe(CommandType::SCREENSHOT);
    expect($command->status)->toBe(CommandStatus::PENDING);
    expect($command->parameters)->toBeArray()->toHaveKey('quality');
    expect($command->triggered_at)->toBeInstanceOf(Carbon::class);
    expect($command->device->id)->toBe($device->id);

    // Test QueryMaster filters via request helper
    request()->merge(['command_type__eq' => 'screenshot']);
    $queried = DeviceRemoteCommand::filterOnRequest()->first();
    expect($queried)->not->toBeNull();
    expect($queried->id)->toBe($command->id);
});

test('device restriction rule model works with casts and querymaster', function () {
    $user = User::factory()->create();
    $device = Device::create([
        'user_id' => $user->id,
        'uuid' => 'test-device-uuid-999',
    ]);

    $rule = DeviceRestrictionRule::create([
        'device_id' => $device->id,
        'rule_type' => RestrictionRuleType::BLOCK_CALLS,
        'is_enabled' => true,
        'parameters' => ['blocked_numbers' => ['+33600000000']],
    ]);

    expect($rule->rule_type)->toBe(RestrictionRuleType::BLOCK_CALLS);
    expect($rule->is_enabled)->toBeBool()->toBeTrue();
    expect($rule->parameters)->toBeArray()->toHaveKey('blocked_numbers');
    expect($rule->device->id)->toBe($device->id);

    // Test QueryMaster filters via request helper
    request()->merge(['is_enabled__eq' => true]);
    $queried = DeviceRestrictionRule::filterOnRequest()->first();
    expect($queried)->not->toBeNull();
    expect($queried->id)->toBe($rule->id);
});

test('device call, notification, social message, gps location, and browser history temporal filters work', function () {
    $user = User::factory()->create();
    $device = Device::create([
        'user_id' => $user->id,
        'uuid' => 'test-device-uuid-999',
    ]);

    // 1. DeviceCall
    $call1 = new DeviceCall([
        'device_id' => $device->id,
        'phone_number' => '+33611111111',
        'call_type' => CallType::INCOMING,
        'duration' => 10,
        'sync_hash' => 'call-hash-1',
    ]);
    $call1->created_at = '2026-06-12 12:00:00';
    $call1->save(['timestamps' => false]);

    $call2 = new DeviceCall([
        'device_id' => $device->id,
        'phone_number' => '+33622222222',
        'call_type' => CallType::INCOMING,
        'duration' => 15,
        'sync_hash' => 'call-hash-2',
    ]);
    $call2->created_at = '2026-06-13 12:00:00';
    $call2->save(['timestamps' => false]);

    request()->replace(['created_at__between' => '2026-06-13 00:00:00,2026-06-13 23:59:59']);
    $calls = DeviceCall::filterOnRequest()->get();
    expect($calls->count())->toBe(1);
    expect($calls->first()->id)->toBe($call2->id);

    // Test with millisecond timestamps
    $startMs = Illuminate\Support\Carbon::parse('2026-06-13 00:00:00')->timestamp * 1000;
    $endMs = Illuminate\Support\Carbon::parse('2026-06-13 23:59:59')->timestamp * 1000;
    request()->replace(['created_at__between' => "{$startMs},{$endMs}"]);
    $calls2 = DeviceCall::filterOnRequest()->get();
    expect($calls2->count())->toBe(1);
    expect($calls2->first()->id)->toBe($call2->id);

    // 2. DeviceNotification
    $notif = DeviceNotification::create([
        'device_id' => $device->id,
        'package_name' => 'com.whatsapp',
        'title' => 'Mom',
        'body' => 'Hello',
        'date' => '2026-06-13 12:00:00',
        'sync_hash' => 'notif-hash',
    ]);
    request()->replace(['date__between' => '2026-06-13 00:00:00,2026-06-13 23:59:59']);
    expect(DeviceNotification::filterOnRequest()->count())->toBe(1);

    // 3. DeviceSocialMessage
    $social = DeviceSocialMessage::create([
        'device_id' => $device->id,
        'platform' => SocialPlatform::WHATSAPP,
        'sender_name' => 'Mom',
        'message' => 'Hello',
        'date' => '2026-06-13 12:00:00',
        'sync_hash' => 'social-hash',
    ]);
    request()->replace(['date__between' => '2026-06-13 00:00:00,2026-06-13 23:59:59']);
    expect(DeviceSocialMessage::filterOnRequest()->count())->toBe(1);

    // 4. DeviceGpsLocation
    $gps = DeviceGpsLocation::create([
        'device_id' => $device->id,
        'latitude' => 48.8566,
        'longitude' => 2.3522,
        'recorded_at' => '2026-06-13 12:00:00',
        'sync_hash' => 'gps-hash',
    ]);
    request()->replace(['recorded_at__between' => '2026-06-13 00:00:00,2026-06-13 23:59:59']);
    expect(DeviceGpsLocation::filterOnRequest()->count())->toBe(1);

    // 5. DeviceBrowserHistory
    $browser = DeviceBrowserHistory::create([
        'device_id' => $device->id,
        'url' => 'https://google.com',
        'title' => 'Google',
        'visited_at' => '2026-06-13 12:00:00',
        'sync_hash' => 'browser-hash',
    ]);
    request()->replace(['visited_at__between' => '2026-06-13 00:00:00,2026-06-13 23:59:59']);
    expect(DeviceBrowserHistory::filterOnRequest()->count())->toBe(1);

    // 6. DeviceSms
    $sms = DeviceSms::create([
        'device_id' => $device->id,
        'address' => '+33633333333',
        'body' => 'Sms body',
        'type' => SmsType::INBOX,
        'date' => '2026-06-13 12:00:00',
        'sync_hash' => 'sms-hash',
    ]);
    request()->replace(['date__between' => '2026-06-13 00:00:00,2026-06-13 23:59:59']);
    expect(DeviceSms::filterOnRequest()->count())->toBe(1);

    // 7. DeviceMedia
    $media = new DeviceMedia([
        'device_id' => $device->id,
        'media_type' => MediaType::PHOTO,
        'origin_app' => 'camera',
        'file_name' => 'photo.jpg',
        'file_size' => 1024,
        'path' => '/storage/emulated/0/DCIM/photo.jpg',
        'sync_hash' => 'media-hash',
    ]);
    $media->created_at = '2026-06-13 12:00:00';
    $media->save(['timestamps' => false]);
    request()->replace(['created_at__between' => '2026-06-13 00:00:00,2026-06-13 23:59:59']);
    expect(DeviceMedia::filterOnRequest()->count())->toBe(1);

    // 8. DeviceGeofenceAlert
    $geofence = DeviceGeofence::create([
        'device_id' => $device->id,
        'name' => 'Home',
        'latitude' => 48.8566,
        'longitude' => 2.3522,
        'radius' => 100,
        'is_active' => true,
    ]);

    $alert = DeviceGeofenceAlert::create([
        'device_id' => $device->id,
        'geofence_id' => $geofence->id,
        'event_type' => 'enter',
        'latitude' => 48.8566,
        'longitude' => 2.3522,
        'triggered_at' => '2026-06-13 12:00:00',
        'sync_hash' => 'alert-hash',
    ]);
    request()->replace(['triggered_at__between' => '2026-06-13 00:00:00,2026-06-13 23:59:59']);
    expect(DeviceGeofenceAlert::filterOnRequest()->count())->toBe(1);
});
