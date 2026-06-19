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

class DeviceNotification extends Model
{
    use HasFilters, IsSearchable, IsSortable;

    protected $table = 'device_notifications';

    protected $fillable = [
        'device_id',
        'package_name',
        'title',
        'body',
        'date',
        'sync_hash',
        'local_sqlite_id',
        'local_status',
        'deleted_at_source',
    ];

    protected array $sortable = [
        'package_name',
        'title',
        'date',
        'local_status',
        'created_at',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'date'              => 'datetime',
            'body'              => 'encrypted',
            'local_sqlite_id'   => 'integer',
            'local_status'      => LocalStatus::class,
            'deleted_at_source' => 'boolean',
        ];
    }

    public function searchable(): array
    {
        return [
            Search::make('package_name', SearchOperator::LIKE),
            Search::make('title', SearchOperator::LIKE),
            Search::make('body', SearchOperator::LIKE),
            Search::make('sync_hash', SearchOperator::LIKE),
        ];
    }

    public function filters(): array
    {
        return [
            Filter::make('device_id', 'device_id__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['device_id__eq' => 'integer']),
            Filter::make('package_name', 'package_name__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['package_name__eq' => 'string']),
            Filter::make('local_status', 'local_status__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['local_status__eq' => ['string', new \Illuminate\Validation\Rules\Enum(LocalStatus::class)]]),
            Filter::make('date', 'date__between')
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
                            $query->whereBetween('date', [$start, $end]);
                        } catch (\Exception $e) {
                            // ignore invalid dates
                        }
                    }
                })
                ->setValidationRules(['date__between' => 'nullable']),
        ];
    }

    public function device()
    {
        return $this->belongsTo(Device::class);
    }
}
