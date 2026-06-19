<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\DeviceSyncController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\DeviceController;
use App\Http\Controllers\FcmController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\TitleController;
use App\Http\Controllers\UserController;
use App\Http\Middleware\CheckDeviceToken;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Kin Parental Control API Routes
|--------------------------------------------------------------------------
|
| Guards:
|   auth:sanctum        → Parent / User (web consumer)
|   auth:admin-sanctum  → Backoffice Admin (strictly isolated guard)
|   CheckDeviceToken    → React Native child device (UUID-based)
|
*/

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC — Authentication (unauthenticated access only)
// ─────────────────────────────────────────────────────────────────────────────

Route::post('/user/register', [UserController::class, 'register']);
Route::post('/user/login',    [UserController::class, 'login']);

Route::post('/admin/login',   [AdminController::class, 'login']);

// ─────────────────────────────────────────────────────────────────────────────
// PARENT / USER  (guard: auth:sanctum)
// ─────────────────────────────────────────────────────────────────────────────

Route::middleware(['auth:sanctum'])->group(function () {

    Route::post('/user/logout', [UserController::class, 'logout']);
    Route::get('/user/me',      [UserController::class, 'me']);

    // Device registration (link a child device to the parent's account)
    Route::post('/user/devices/register', [DeviceController::class, 'register']);

    // Device control and telemetry feeds
    Route::apiResource('/user/devices', DeviceController::class)->only(['index', 'show', 'destroy']);
    Route::put('/user/devices/{id}/status',   [DeviceController::class, 'changeStatus']);
    Route::post('/user/devices/{id}/command', [DeviceController::class, 'executeRemoteCommand']);
    Route::post('/user/devices/{id}/force-sync', [DeviceController::class, 'forceSync']);
    Route::post('/user/devices/{id}/force-sync-reset', [DeviceController::class, 'forceSyncReset']);

    // ── Telemetry read-only feeds for the Parent ────────────────────────
    Route::get('/user/devices/{id}/calls',           [DeviceController::class, 'calls']);
    Route::get('/user/devices/{id}/sms',             [DeviceController::class, 'sms']);
    Route::get('/user/devices/{id}/sms/threads',     [DeviceController::class, 'smsThreads']);
    Route::get('/user/devices/{id}/contacts',        [DeviceController::class, 'contacts']);
    Route::get('/user/devices/{id}/notifications',   [DeviceController::class, 'interceptedNotifications']);
    Route::get('/user/devices/{id}/gps',             [DeviceController::class, 'gpsLocations']);
    Route::get('/user/devices/{id}/geofences',       [DeviceController::class, 'geofences']);
    Route::get('/user/devices/{id}/geofence-alerts', [DeviceController::class, 'geofenceAlerts']);
    Route::get('/user/devices/{id}/social',          [DeviceController::class, 'socialMessages']);
    Route::get('/user/devices/{id}/browser',         [DeviceController::class, 'browserHistories']);
    Route::get('/user/devices/{id}/apps',            [DeviceController::class, 'installedApps']);
    Route::get('/user/devices/{id}/files',           [DeviceController::class, 'files']);
    Route::get('/user/devices/{id}/media',           [DeviceController::class, 'media']);
    Route::get('/user/devices/{id}/restrictions',    [DeviceController::class, 'restrictions']);

    // ── Telemetry write configurations for the Parent ─────────────────────
    Route::post('/user/devices/{id}/geofences',                  [DeviceController::class, 'storeGeofence']);
    Route::put('/user/devices/{id}/geofences/{geofenceId}',      [DeviceController::class, 'updateGeofence']);
    Route::delete('/user/devices/{id}/geofences/{geofenceId}',   [DeviceController::class, 'destroyGeofence']);
    Route::post('/user/devices/{id}/restrictions',               [DeviceController::class, 'storeRestrictionRule']);
    Route::get('/user/devices/{id}/media/{mediaId}/download',    [DeviceController::class, 'downloadMedia']);
    Route::get('/user/devices/{id}/calls/{callId}/download',     [DeviceController::class, 'downloadCallAudio']);

    // Support ticket conversations (parent side)
    Route::get('/user/conversations',               [ConversationController::class, 'indexForUser']);
    Route::get('/user/conversations/{id}',          [ConversationController::class, 'showForUser']);
    Route::post('/user/conversations',              [ConversationController::class, 'store']);
    Route::post('/user/conversations/{id}/message', [ConversationController::class, 'storeMessage']);
    Route::post('/user/conversations/{id}/typing',  [ConversationController::class, 'broadcastTyping']);
    Route::post('/user/conversations/{id}/read',    [ConversationController::class, 'markAsRead']);

    // In-app notifications (parent)
    Route::get('/user/notifications',      [NotificationController::class, 'indexForUser']);
    Route::get('/user/notifications/{id}', [NotificationController::class, 'showForUser']);
});

// ─────────────────────────────────────────────────────────────────────────────
// CHILD MOBILE DEVICE SYNC  (guard: CheckDeviceToken — UUID header)
// ─────────────────────────────────────────────────────────────────────────────

Route::middleware([CheckDeviceToken::class])->group(function () {
    // Core batch ingestion endpoint — delegated to the dedicated sync controller
    Route::post('/device/sync', [DeviceSyncController::class, 'sync']);

    // Device push-notification feed (pull by child device)
    Route::get('/device/notifications',      [NotificationController::class, 'indexForDevice']);
    Route::get('/device/notifications/{id}', [NotificationController::class, 'showForDevice']);

    // FCM token registration — mobile device sends its token after Firebase init
    Route::post('/device/fcm-token', [DeviceSyncController::class, 'registerFcmToken']);

    // Heartbeat — update device metadata (brand, model, os, ip) + touch updated_at
    Route::post('/device/heartbeat', [DeviceSyncController::class, 'heartbeat']);

    // Sync status — mobile reports syncing/idle to parent
    Route::post('/device/sync-status', [DeviceSyncController::class, 'updateSyncStatus']);

    // Mobile device pull configuration and command channels
    Route::get('/device/restrictions',           [DeviceSyncController::class, 'pullRestrictions']);
    Route::get('/device/commands',               [DeviceSyncController::class, 'pullPendingCommands']);
    Route::post('/device/commands/{id}/respond', [DeviceSyncController::class, 'respondToCommand']);
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN BACKOFFICE  (guard: auth:admin-sanctum — strictly isolated)
// ─────────────────────────────────────────────────────────────────────────────

Route::middleware(['auth:admin-sanctum'])->group(function () {

    Route::post('/admin/logout', [AdminController::class, 'logout']);

    // ── Core CRUD resources ──────────────────────────────────────────────────
    Route::apiResource('/admin/admins',        AdminController::class);
    Route::apiResource('/admin/users',         UserController::class);
    Route::apiResource('/admin/titles',        TitleController::class);
    Route::apiResource('/admin/notifications', NotificationController::class);
    Route::apiResource('/admin/conversations', ConversationController::class)->only(['index', 'show', 'destroy']);

    // ── Support ticket conversations (admin / support side) ──────────────────
    Route::post('/admin/conversations/{id}/message', [ConversationController::class, 'storeMessage']);
    Route::post('/admin/conversations/{id}/typing',  [ConversationController::class, 'broadcastTyping']);
    Route::post('/admin/conversations/{id}/read',    [ConversationController::class, 'markAsRead']);

    // ── Device management ────────────────────────────────────────────────────
    Route::post('/admin/devices/{id}/push-test', [FcmController::class, 'sendTestPush']);

    // ── Telemetry read-only feeds (QueryMaster-filterable, for Next.js backoffice) ──
    Route::get('/admin/devices/{id}/calls',           [DeviceController::class, 'calls']);
    Route::get('/admin/devices/{id}/sms',             [DeviceController::class, 'sms']);
    Route::get('/admin/devices/{id}/sms/threads',     [DeviceController::class, 'smsThreads']);
    Route::get('/admin/devices/{id}/contacts',        [DeviceController::class, 'contacts']);
    Route::get('/admin/devices/{id}/notifications',   [DeviceController::class, 'interceptedNotifications']);
    Route::get('/admin/devices/{id}/gps',             [DeviceController::class, 'gpsLocations']);
    Route::get('/admin/devices/{id}/geofences',       [DeviceController::class, 'geofences']);
    Route::get('/admin/devices/{id}/geofence-alerts', [DeviceController::class, 'geofenceAlerts']);
    Route::get('/admin/devices/{id}/social',          [DeviceController::class, 'socialMessages']);
    Route::get('/admin/devices/{id}/browser',         [DeviceController::class, 'browserHistories']);
    Route::get('/admin/devices/{id}/apps',            [DeviceController::class, 'installedApps']);
    Route::get('/admin/devices/{id}/files',           [DeviceController::class, 'files']);
    Route::get('/admin/devices/{id}/media',           [DeviceController::class, 'media']);
    Route::get('/admin/devices/{id}/restrictions',    [DeviceController::class, 'restrictions']);

    // ── Telemetry secure download for Admin ────────────────────────────────
    Route::get('/admin/devices/{id}/media/{mediaId}/download',  [DeviceController::class, 'downloadMedia']);
    Route::get('/admin/devices/{id}/calls/{callId}/download',   [DeviceController::class, 'downloadCallAudio']);
});
