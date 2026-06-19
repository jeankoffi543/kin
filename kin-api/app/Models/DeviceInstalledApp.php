<?php

namespace App\Models;

use App\Enums\LocalStatus;
use Illuminate\Database\Eloquent\Model;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\FilterOperator;
use Keky\QueryMaster\Enums\SearchOperator;
use Keky\QueryMaster\Filter;
use Keky\QueryMaster\Search;

class DeviceInstalledApp extends Model
{
    use HasFilters, IsSearchable, IsSortable;

    protected $table = 'device_installed_apps';

    protected $fillable = [
        'device_id',
        'app_name',
        'package_name',
        'installed_at',
        'is_blocked',
        'sync_hash',
        'local_sqlite_id',
        'local_status',
        'deleted_at_source',
    ];

    protected array $sortable = [
        'app_name',
        'package_name',
        'is_blocked',
        'local_status',
        'created_at',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'installed_at'      => 'datetime',
            'is_blocked'        => 'boolean',
            'local_sqlite_id'   => 'integer',
            'local_status'      => LocalStatus::class,
            'deleted_at_source' => 'boolean',
        ];
    }

    public function searchable(): array
    {
        return [
            Search::make('app_name', SearchOperator::LIKE),
            Search::make('package_name', SearchOperator::LIKE),
            Search::make('sync_hash', SearchOperator::LIKE),
        ];
    }

    public function filters(): array
    {
        return [
            Filter::make('device_id', 'device_id__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['device_id__eq' => 'integer']),
            Filter::make('is_blocked', 'is_blocked__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['is_blocked__eq' => 'boolean']),
            Filter::make('local_status', 'local_status__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['local_status__eq' => ['string', new \Illuminate\Validation\Rules\Enum(LocalStatus::class)]]),
        ];
    }

    public function device()
    {
        return $this->belongsTo(Device::class);
    }
}
