<?php

namespace App\Models;

use App\Enums\LocalStatus;
use App\Enums\GeofenceEventType;
use Illuminate\Database\Eloquent\Model;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\FilterOperator;
use Keky\QueryMaster\Enums\SearchOperator;
use Keky\QueryMaster\Filter;
use Keky\QueryMaster\Search;

class DeviceGeofenceAlert extends Model
{
    use HasFilters, IsSearchable, IsSortable;

    protected $table = 'device_geofence_alerts';

    protected $fillable = [
        'device_id',
        'geofence_id',
        'event_type',
        'latitude',
        'longitude',
        'triggered_at',
        'sync_hash',
        'local_sqlite_id',
        'local_status',
        'deleted_at_source',
    ];

    protected array $sortable = [
        'event_type',
        'triggered_at',
        'local_status',
        'created_at',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'latitude'          => 'float',
            'longitude'         => 'float',
            'triggered_at'      => 'datetime',
            'local_sqlite_id'   => 'integer',
            'local_status'      => LocalStatus::class,
            'event_type'        => GeofenceEventType::class,
            'deleted_at_source' => 'boolean',
        ];
    }

    public function searchable(): array
    {
        return [
            Search::make('sync_hash', SearchOperator::LIKE),
        ];
    }

    public function filters(): array
    {
        return [
            Filter::make('device_id', 'device_id__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['device_id__eq' => 'integer']),
            Filter::make('geofence_id', 'geofence_id__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['geofence_id__eq' => 'integer']),
            Filter::make('event_type', 'event_type__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['event_type__eq' => ['string', new \Illuminate\Validation\Rules\Enum(GeofenceEventType::class)]]),
            Filter::make('local_status', 'local_status__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['local_status__eq' => ['string', new \Illuminate\Validation\Rules\Enum(LocalStatus::class)]]),
            Filter::make('triggered_at', 'triggered_at__between')
                ->applyWith(function ($query, $value) {
                    $dates = is_string($value) ? explode(',', $value) : (array) $value;
                    if (count($dates) === 2) {
                        try {
                            $parseDate = function ($val) {
                                if (is_numeric($val)) {
                                    if (strlen((string) $val) >= 13) {
                                        return \Illuminate\Support\Carbon::createFromTimestampMs((int) $val);
                                    }
                                    return \Illuminate\Support\Carbon::createFromTimestamp((int) $val);
                                }
                                return \Illuminate\Support\Carbon::parse($val);
                            };
                            $start = $parseDate(trim($dates[0]));
                            $end = $parseDate(trim($dates[1]));
                            $query->whereBetween('triggered_at', [$start, $end]);
                        } catch (\Exception $e) {
                            // ignore invalid dates
                        }
                    }
                })
                ->setValidationRules(['triggered_at__between' => 'nullable']),
        ];
    }

    public function device()
    {
        return $this->belongsTo(Device::class);
    }

    public function geofence()
    {
        return $this->belongsTo(DeviceGeofence::class, 'geofence_id');
    }
}
