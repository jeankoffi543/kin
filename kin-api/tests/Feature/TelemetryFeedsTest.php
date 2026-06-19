<?php

use App\Enums\CallType;
use App\Enums\GeofenceEventType;
use App\Enums\MediaType;
use App\Enums\SmsType;
use App\Enums\SocialPlatform;
use App\Models\Admin;
use App\Models\Device;
use App\Models\DeviceBrowserHistory;
use App\Models\DeviceCall;
use App\Models\DeviceContact;
use App\Models\DeviceFile;
use App\Models\DeviceGeofence;
use App\Models\DeviceGeofenceAlert;
use App\Models\DeviceGpsLocation;
use App\Models\DeviceInstalledApp;
use App\Models\DeviceMedia;
use App\Models\DeviceNotification;
use App\Models\DeviceRestrictionRule;
use App\Models\DeviceSms;
use App\Models\DeviceSocialMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function telemetrySetup(): array
{
    $user = User::factory()->create();
    $device = Device::create(['user_id' => $user->id, 'uuid' => 'tel-device-uuid', 'platform' => 'android']);

    $admin = Admin::create([
        'name' => 'Tel Admin', 'email' => 'tel-admin@kin.test',
        'password' => bcrypt('password'), 'role' => 'admin',
    ]);

    return [$user, $device, $admin];
}

// ─────────────────────────────────────────────────────────────────────────────
// Calls feed
// ─────────────────────────────────────────────────────────────────────────────

test('parent can list call logs with pagination and type filter', function () {
    [$user, $device] = telemetrySetup();

    DeviceCall::create(['device_id' => $device->id, 'phone_number' => '+1000', 'call_type' => CallType::INCOMING, 'duration' => 10, 'sync_hash' => 'c1', 'local_sqlite_id' => 1]);
    DeviceCall::create(['device_id' => $device->id, 'phone_number' => '+2000', 'call_type' => CallType::OUTGOING, 'duration' => 20, 'sync_hash' => 'c2', 'local_sqlite_id' => 2]);
    DeviceCall::create(['device_id' => $device->id, 'phone_number' => '+3000', 'call_type' => CallType::MISSED,   'duration' => 0,  'sync_hash' => 'c3', 'local_sqlite_id' => 3]);

    // full list
    $response = $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/calls?limit=10");
    $response->assertOk()->assertJsonCount(3, 'data');

    // paginate
    $response = $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/calls?limit=2");
    $response->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.total', 3);

    // filter by type
    $response = $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/calls?call_type__eq=missed");
    $response->assertOk()->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.call_type', 'missed');

    // search by phone
    $response = $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/calls?search=+1000");
    $response->assertOk()->assertJsonCount(1, 'data');

    // sort by duration desc
    $response = $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/calls?sort_by=duration&sort_desc=true");
    $response->assertOk();
    expect($response->json('data.0.duration'))->toBe(20);
});

test('parent cannot access another parent calls', function () {
    [$user, $device] = telemetrySetup();
    $other = User::factory()->create();

    $this->actingAs($other, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/calls")
        ->assertNotFound();
});

test('admin can access any device calls feed', function () {
    [$user, $device, $admin] = telemetrySetup();
    DeviceCall::create(['device_id' => $device->id, 'phone_number' => '+9000', 'call_type' => CallType::INCOMING, 'duration' => 5, 'sync_hash' => 'adm-c1', 'local_sqlite_id' => 10]);

    $this->actingAs($admin, 'admin-sanctum')
        ->getJson("/api/admin/devices/{$device->id}/calls")
        ->assertOk()->assertJsonCount(1, 'data');
});

// ─────────────────────────────────────────────────────────────────────────────
// SMS feed
// ─────────────────────────────────────────────────────────────────────────────

test('parent can list sms with type filter and search', function () {
    [$user, $device] = telemetrySetup();

    DeviceSms::create(['device_id' => $device->id, 'address' => '+1001', 'body' => 'Inbox msg', 'type' => SmsType::INBOX, 'date' => now(), 'sync_hash' => 's1', 'local_sqlite_id' => 1]);
    DeviceSms::create(['device_id' => $device->id, 'address' => '+1002', 'body' => 'Sent msg',  'type' => SmsType::SENT,  'date' => now(), 'sync_hash' => 's2', 'local_sqlite_id' => 2]);

    $response = $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/sms?type__eq=inbox");
    $response->assertOk()->assertJsonCount(1, 'data');

    $response = $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/sms?search=+1002");
    $response->assertOk()->assertJsonCount(1, 'data');
});

// ─────────────────────────────────────────────────────────────────────────────
// Contacts feed
// ─────────────────────────────────────────────────────────────────────────────

test('parent can list contacts with search and sort', function () {
    [$user, $device] = telemetrySetup();

    DeviceContact::create(['device_id' => $device->id, 'name' => 'Alice', 'phone_number' => '+111', 'sync_hash' => 'ct1', 'local_sqlite_id' => 1]);
    DeviceContact::create(['device_id' => $device->id, 'name' => 'Bob',   'phone_number' => '+222', 'sync_hash' => 'ct2', 'local_sqlite_id' => 2]);

    $response = $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/contacts?search=Alice");
    $response->assertOk()->assertJsonCount(1, 'data');

    $response = $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/contacts?sort_by=name&sort_desc=true");
    $response->assertOk();
    expect($response->json('data.0.name'))->toBe('Bob');
});

// ─────────────────────────────────────────────────────────────────────────────
// Notifications (intercepted by device) feed
// ─────────────────────────────────────────────────────────────────────────────

test('parent can list intercepted notifications with package filter', function () {
    [$user, $device] = telemetrySetup();

    DeviceNotification::create(['device_id' => $device->id, 'package_name' => 'com.whatsapp', 'title' => 'Mom', 'body' => 'Hey', 'date' => now(), 'sync_hash' => 'n1', 'local_sqlite_id' => 1]);
    DeviceNotification::create(['device_id' => $device->id, 'package_name' => 'com.telegram', 'title' => 'Dad', 'body' => 'Hi',  'date' => now(), 'sync_hash' => 'n2', 'local_sqlite_id' => 2]);

    $response = $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/notifications?package_name__eq=com.whatsapp");
    $response->assertOk()->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.package_name', 'com.whatsapp');
});

// ─────────────────────────────────────────────────────────────────────────────
// GPS feed
// ─────────────────────────────────────────────────────────────────────────────

test('parent can list gps locations with date range filter', function () {
    [$user, $device] = telemetrySetup();

    DeviceGpsLocation::create(['device_id' => $device->id, 'latitude' => 48.85, 'longitude' => 2.35, 'recorded_at' => '2026-01-01 10:00:00', 'sync_hash' => 'g1', 'local_sqlite_id' => 1]);
    DeviceGpsLocation::create(['device_id' => $device->id, 'latitude' => 48.90, 'longitude' => 2.40, 'recorded_at' => '2026-06-01 10:00:00', 'sync_hash' => 'g2', 'local_sqlite_id' => 2]);

    $response = $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/gps?recorded_at__between=2026-06-01 00:00:00,2026-06-30 23:59:59");
    $response->assertOk()->assertJsonCount(1, 'data');
});

// ─────────────────────────────────────────────────────────────────────────────
// Geofences and geofence alerts feed
// ─────────────────────────────────────────────────────────────────────────────

test('parent can list geofences with sort', function () {
    [$user, $device] = telemetrySetup();

    DeviceGeofence::create(['device_id' => $device->id, 'name' => 'Home',   'latitude' => 48.85, 'longitude' => 2.35, 'radius' => 100, 'is_active' => true]);
    DeviceGeofence::create(['device_id' => $device->id, 'name' => 'School', 'latitude' => 48.90, 'longitude' => 2.40, 'radius' => 200, 'is_active' => true]);

    $response = $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/geofences?sort_by=name");
    $response->assertOk()->assertJsonCount(2, 'data');
    expect($response->json('data.0.name'))->toBe('Home');
});

test('parent can list geofence alerts with event_type filter', function () {
    [$user, $device] = telemetrySetup();

    $geo = DeviceGeofence::create(['device_id' => $device->id, 'name' => 'G1', 'latitude' => 48.85, 'longitude' => 2.35, 'radius' => 100]);

    DeviceGeofenceAlert::create(['device_id' => $device->id, 'geofence_id' => $geo->id, 'event_type' => GeofenceEventType::ENTER, 'latitude' => 48.85, 'longitude' => 2.35, 'triggered_at' => now(), 'sync_hash' => 'ga1', 'local_sqlite_id' => 1]);
    DeviceGeofenceAlert::create(['device_id' => $device->id, 'geofence_id' => $geo->id, 'event_type' => GeofenceEventType::EXIT,  'latitude' => 48.85, 'longitude' => 2.35, 'triggered_at' => now(), 'sync_hash' => 'ga2', 'local_sqlite_id' => 2]);

    $response = $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/geofence-alerts?event_type__eq=enter");
    $response->assertOk()->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.event_type', 'enter');
});

// ─────────────────────────────────────────────────────────────────────────────
// Social messages feed
// ─────────────────────────────────────────────────────────────────────────────

test('parent can list social messages with platform filter', function () {
    [$user, $device] = telemetrySetup();

    DeviceSocialMessage::create(['device_id' => $device->id, 'platform' => SocialPlatform::WHATSAPP, 'sender_name' => 'Mom',  'message' => 'Hello',   'date' => now(), 'sync_hash' => 'sm1', 'local_sqlite_id' => 1]);
    DeviceSocialMessage::create(['device_id' => $device->id, 'platform' => SocialPlatform::TELEGRAM, 'sender_name' => 'Dad',  'message' => 'Bonjour', 'date' => now(), 'sync_hash' => 'sm2', 'local_sqlite_id' => 2]);
    DeviceSocialMessage::create(['device_id' => $device->id, 'platform' => SocialPlatform::FACEBOOK, 'sender_name' => 'Friend', 'message' => 'Hey',   'date' => now(), 'sync_hash' => 'sm3', 'local_sqlite_id' => 3]);

    $response = $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/social?platform__eq=whatsapp");
    $response->assertOk()->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.platform', 'whatsapp');

    // sort by sender_name
    $response = $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/social?sort_by=sender_name");
    $response->assertOk();
    expect($response->json('data.0.sender_name'))->toBe('Dad');
});

// ─────────────────────────────────────────────────────────────────────────────
// Browser history feed
// ─────────────────────────────────────────────────────────────────────────────

test('parent can list browser history with date filter', function () {
    [$user, $device] = telemetrySetup();

    DeviceBrowserHistory::create(['device_id' => $device->id, 'url' => 'https://google.com',   'title' => 'Google',   'visited_at' => '2026-05-01 10:00:00', 'sync_hash' => 'bh1', 'local_sqlite_id' => 1]);
    DeviceBrowserHistory::create(['device_id' => $device->id, 'url' => 'https://youtube.com',  'title' => 'YouTube',  'visited_at' => '2026-06-10 12:00:00', 'sync_hash' => 'bh2', 'local_sqlite_id' => 2]);

    $response = $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/browser?visited_at__between=2026-06-01 00:00:00,2026-06-30 23:59:59");
    $response->assertOk()->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.url', 'https://youtube.com');
});

// ─────────────────────────────────────────────────────────────────────────────
// Installed apps feed
// ─────────────────────────────────────────────────────────────────────────────

test('parent can list installed apps with search', function () {
    [$user, $device] = telemetrySetup();

    DeviceInstalledApp::create(['device_id' => $device->id, 'app_name' => 'TikTok', 'package_name' => 'com.tiktok', 'sync_hash' => 'ia1', 'local_sqlite_id' => 1]);
    DeviceInstalledApp::create(['device_id' => $device->id, 'app_name' => 'Roblox', 'package_name' => 'com.roblox', 'sync_hash' => 'ia2', 'local_sqlite_id' => 2]);

    $response = $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/apps?search=TikTok");
    $response->assertOk()->assertJsonCount(1, 'data');
});

// ─────────────────────────────────────────────────────────────────────────────
// Files feed
// ─────────────────────────────────────────────────────────────────────────────

test('parent can list device files with sort', function () {
    [$user, $device] = telemetrySetup();

    DeviceFile::create(['device_id' => $device->id, 'path' => '/storage/docs', 'file_name' => 'report.pdf', 'file_size' => 1024, 'sync_hash' => 'f1', 'local_sqlite_id' => 1]);
    DeviceFile::create(['device_id' => $device->id, 'path' => '/storage/docs', 'file_name' => 'agenda.pdf', 'file_size' => 2048, 'sync_hash' => 'f2', 'local_sqlite_id' => 2]);

    $response = $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/files?sort_by=file_name");
    $response->assertOk()->assertJsonCount(2, 'data');
    expect($response->json('data.0.file_name'))->toBe('agenda.pdf');
});

// ─────────────────────────────────────────────────────────────────────────────
// Media feed
// ─────────────────────────────────────────────────────────────────────────────

test('parent can list media with media_type filter', function () {
    [$user, $device] = telemetrySetup();

    $photo = new DeviceMedia(['device_id' => $device->id, 'media_type' => MediaType::PHOTO, 'origin_app' => 'camera', 'file_name' => 'photo.jpg', 'file_size' => 512, 'path' => 'p/photo.jpg', 'sync_hash' => 'm1', 'local_sqlite_id' => 1]);
    $photo->save();
    $video = new DeviceMedia(['device_id' => $device->id, 'media_type' => MediaType::VIDEO, 'origin_app' => 'camera', 'file_name' => 'clip.mp4',  'file_size' => 4096, 'path' => 'p/clip.mp4',  'sync_hash' => 'm2', 'local_sqlite_id' => 2]);
    $video->save();

    $response = $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/media?media_type__eq=photo");
    $response->assertOk()->assertJsonCount(1, 'data');
});

// ─────────────────────────────────────────────────────────────────────────────
// Restrictions feed
// ─────────────────────────────────────────────────────────────────────────────

test('parent can list restriction rules', function () {
    [$user, $device] = telemetrySetup();

    DeviceRestrictionRule::create(['device_id' => $device->id, 'rule_type' => 'block_calls', 'is_enabled' => true, 'parameters' => []]);
    DeviceRestrictionRule::create(['device_id' => $device->id, 'rule_type' => 'app_block',   'is_enabled' => false, 'parameters' => []]);

    $response = $this->actingAs($user, 'sanctum')
        ->getJson("/api/user/devices/{$device->id}/restrictions");
    $response->assertOk()->assertJsonCount(2, 'data');
});

test('admin can access all telemetry feeds for any device', function () {
    [$user, $device, $admin] = telemetrySetup();

    DeviceCall::create(['device_id' => $device->id, 'phone_number' => '+5000', 'call_type' => CallType::INCOMING, 'duration' => 30, 'sync_hash' => 'adm-call-1', 'local_sqlite_id' => 99]);

    $feeds = ['calls', 'sms', 'contacts', 'notifications', 'gps', 'geofences', 'geofence-alerts', 'social', 'browser', 'apps', 'files', 'media', 'restrictions'];

    foreach ($feeds as $feed) {
        $this->actingAs($admin, 'admin-sanctum')
            ->getJson("/api/admin/devices/{$device->id}/{$feed}")
            ->assertOk();
    }
});
