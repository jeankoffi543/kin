<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\FilterOperator;
use Keky\QueryMaster\Enums\SearchOperator;
use Keky\QueryMaster\Filter;
use Keky\QueryMaster\Search;

class DeviceGeofence extends Model
{
    use HasFilters, IsSearchable, IsSortable;

    protected $table = 'device_geofences';

    protected $fillable = [
        'device_id',
        'name',
        'latitude',
        'longitude',
        'radius',
        'is_active',
    ];

    protected array $sortable = [
        'name',
        'radius',
        'is_active',
        'created_at',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'latitude'  => 'float',
            'longitude' => 'float',
            'radius'    => 'float',
            'is_active' => 'boolean',
        ];
    }

    public function searchable(): array
    {
        return [
            Search::make('name', SearchOperator::LIKE),
        ];
    }

    public function filters(): array
    {
        return [
            Filter::make('device_id', 'device_id__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['device_id__eq' => 'integer']),
            Filter::make('is_active', 'is_active__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['is_active__eq' => 'boolean']),
        ];
    }

    public function device()
    {
        return $this->belongsTo(Device::class);
    }

    public function alerts()
    {
        return $this->hasMany(DeviceGeofenceAlert::class, 'geofence_id');
    }
}
