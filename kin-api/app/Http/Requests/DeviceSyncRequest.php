<?php

namespace App\Http\Requests;

use App\Enums\CallType;
use App\Enums\LocalStatus;
use App\Enums\MediaType;
use App\Enums\SmsType;
use App\Enums\SocialPlatform;
use Illuminate\Validation\Rules\Enum;

class DeviceSyncRequest extends BaseFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // ── Calls ─────────────────────────────────────────────────────────────
            'calls'                      => ['sometimes', 'array'],
            'calls.*.sync_hash'          => ['required', 'string'],
            'calls.*.local_sqlite_id'    => ['required', 'integer'],
            'calls.*.phone_number'       => ['required', 'string'],
            'calls.*.call_type'          => ['required', 'string', new Enum(CallType::class)],
            'calls.*.duration'           => ['required', 'integer', 'min:0'],
            'calls.*.contact_name'       => ['sometimes', 'nullable', 'string'],
            'calls.*.recorded_at'        => ['sometimes', 'nullable', 'string'],
            'calls.*.call_recorded'      => ['sometimes', 'boolean'],
            'calls.*.recording_path'     => ['sometimes', 'nullable', 'string'],
            'calls.*.local_status'       => ['sometimes', 'string', new Enum(LocalStatus::class)],
            'calls.*.deleted_at_source'  => ['sometimes', 'boolean'],

            // ── SMS ───────────────────────────────────────────────────────────────
            'sms'                        => ['sometimes', 'array'],
            'sms.*.sync_hash'            => ['required', 'string'],
            'sms.*.local_sqlite_id'      => ['required', 'integer'],
            'sms.*.address'              => ['required', 'string'],
            'sms.*.body'                 => ['required', 'string'],
            'sms.*.type'                 => ['required', 'string', new Enum(SmsType::class)],
            'sms.*.date'                 => ['required', 'string'],
            'sms.*.sms_status'           => ['sometimes', 'nullable', 'string'],
            'sms.*.local_status'         => ['sometimes', 'string', new Enum(LocalStatus::class)],
            'sms.*.deleted_at_source'    => ['sometimes', 'boolean'],

            // ── Contacts ──────────────────────────────────────────────────────────
            'contacts'                   => ['sometimes', 'array'],
            'contacts.*.sync_hash'       => ['required', 'string'],
            'contacts.*.local_sqlite_id' => ['required', 'integer'],
            'contacts.*.name'            => ['required', 'string'],
            'contacts.*.phone_number'    => ['required', 'string'],
            'contacts.*.local_status'    => ['sometimes', 'string', new Enum(LocalStatus::class)],
            'contacts.*.deleted_at_source' => ['sometimes', 'boolean'],

            // ── Intercepted Notifications ─────────────────────────────────────────
            'notifications'                    => ['sometimes', 'array'],
            'notifications.*.sync_hash'        => ['required', 'string'],
            'notifications.*.local_sqlite_id'  => ['required', 'integer'],
            'notifications.*.package_name'     => ['required', 'string'],
            'notifications.*.title'            => ['sometimes', 'nullable', 'string'],
            'notifications.*.body'             => ['sometimes', 'nullable', 'string'],
            'notifications.*.date'             => ['required', 'string'],
            'notifications.*.local_status'     => ['sometimes', 'string', new Enum(LocalStatus::class)],
            'notifications.*.deleted_at_source' => ['sometimes', 'boolean'],

            // ── GPS Locations ─────────────────────────────────────────────────────
            'gps_locations'                      => ['sometimes', 'array'],
            'gps_locations.*.sync_hash'          => ['required', 'string'],
            'gps_locations.*.local_sqlite_id'    => ['required', 'integer'],
            'gps_locations.*.latitude'           => ['required', 'numeric'],
            'gps_locations.*.longitude'          => ['required', 'numeric'],
            'gps_locations.*.altitude'           => ['sometimes', 'nullable', 'numeric'],
            'gps_locations.*.accuracy'           => ['sometimes', 'nullable', 'numeric'],
            'gps_locations.*.recorded_at'        => ['required', 'string'],
            'gps_locations.*.local_status'       => ['sometimes', 'string', new Enum(LocalStatus::class)],
            'gps_locations.*.deleted_at_source'  => ['sometimes', 'boolean'],

            // ── Geofence Alerts ───────────────────────────────────────────────────
            'geofence_alerts'                      => ['sometimes', 'array'],
            'geofence_alerts.*.sync_hash'          => ['required', 'string'],
            'geofence_alerts.*.local_sqlite_id'    => ['required', 'integer'],
            'geofence_alerts.*.geofence_id'        => ['required', 'integer'],
            'geofence_alerts.*.event_type'         => ['required', 'string', new Enum(\App\Enums\GeofenceEventType::class)],
            'geofence_alerts.*.latitude'           => ['required', 'numeric'],
            'geofence_alerts.*.longitude'          => ['required', 'numeric'],
            'geofence_alerts.*.triggered_at'       => ['required', 'string'],
            'geofence_alerts.*.local_status'       => ['sometimes', 'string', new Enum(LocalStatus::class)],
            'geofence_alerts.*.deleted_at_source'  => ['sometimes', 'boolean'],

            // ── Social Messages ───────────────────────────────────────────────────
            'social_messages'                      => ['sometimes', 'array'],
            'social_messages.*.sync_hash'          => ['required', 'string'],
            'social_messages.*.local_sqlite_id'    => ['required', 'integer'],
            'social_messages.*.platform'           => ['required', 'string', new Enum(SocialPlatform::class)],
            'social_messages.*.sender_name'        => ['required', 'string'],
            'social_messages.*.message'            => ['required', 'string'],
            'social_messages.*.date'               => ['required', 'string'],
            'social_messages.*.local_status'       => ['sometimes', 'string', new Enum(LocalStatus::class)],
            'social_messages.*.deleted_at_source'  => ['sometimes', 'boolean'],

            // ── Browser History ───────────────────────────────────────────────────
            'browser_history'                      => ['sometimes', 'array'],
            'browser_history.*.sync_hash'          => ['required', 'string'],
            'browser_history.*.local_sqlite_id'    => ['required', 'integer'],
            'browser_history.*.url'                => ['required', 'string'],
            'browser_history.*.title'              => ['sometimes', 'nullable', 'string'],
            'browser_history.*.visited_at'         => ['required', 'string'],
            'browser_history.*.local_status'       => ['sometimes', 'string', new Enum(LocalStatus::class)],
            'browser_history.*.deleted_at_source'  => ['sometimes', 'boolean'],

            // ── Installed Apps ────────────────────────────────────────────────────
            'installed_apps'                       => ['sometimes', 'array'],
            'installed_apps.*.sync_hash'           => ['required', 'string'],
            'installed_apps.*.local_sqlite_id'     => ['required', 'integer'],
            'installed_apps.*.app_name'            => ['required', 'string'],
            'installed_apps.*.package_name'        => ['required', 'string'],
            'installed_apps.*.installed_at'        => ['sometimes', 'nullable', 'string'],
            'installed_apps.*.is_blocked'          => ['sometimes', 'boolean'],
            'installed_apps.*.local_status'        => ['sometimes', 'string', new Enum(LocalStatus::class)],
            'installed_apps.*.deleted_at_source'   => ['sometimes', 'boolean'],

            // ── Device Files ──────────────────────────────────────────────────────
            'files'                          => ['sometimes', 'array'],
            'files.*.sync_hash'              => ['required', 'string'],
            'files.*.local_sqlite_id'        => ['required', 'integer'],
            'files.*.path'                   => ['required', 'string'],
            'files.*.file_name'              => ['required', 'string'],
            'files.*.file_size'              => ['required', 'integer', 'min:0'],
            'files.*.is_directory'           => ['sometimes', 'boolean'],
            'files.*.file_created_at'        => ['sometimes', 'nullable', 'string'],
            'files.*.local_status'           => ['sometimes', 'string', new Enum(LocalStatus::class)],
            'files.*.deleted_at_source'      => ['sometimes', 'boolean'],

            // ── Media (Photos / Videos) ───────────────────────────────────────────
            'media'                          => ['sometimes', 'array'],
            'media.*.sync_hash'              => ['required', 'string'],
            'media.*.local_sqlite_id'        => ['required', 'integer'],
            'media.*.media_type'             => ['required', 'string', new Enum(MediaType::class)],
            'media.*.origin_app'             => ['required', 'string'],
            'media.*.file_name'              => ['required', 'string'],
            'media.*.file_size'              => ['required', 'integer', 'min:0'],
            'media.*.path'                   => ['required', 'string'],
            'media.*.deleted_at_source'      => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Human-readable error messages for API consumers.
     */
    public function messages(): array
    {
        return [
            '*.*.sync_hash.required'       => 'Each telemetry record must include a sync_hash.',
            '*.*.local_sqlite_id.required' => 'Each telemetry record must include its local SQLite row ID.',
        ];
    }
}
