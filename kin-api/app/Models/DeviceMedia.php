<?php

namespace App\Models;

use App\Enums\LocalStatus;
use App\Enums\MediaType;
use Illuminate\Database\Eloquent\Model;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\FilterOperator;
use Keky\QueryMaster\Enums\SearchOperator;
use Keky\QueryMaster\Filter;
use Keky\QueryMaster\Search;

class DeviceMedia extends Model
{
    use HasFilters, IsSearchable, IsSortable;

    protected $table = 'device_media';

    protected $fillable = [
        'device_id',
        'media_type',
        'origin_app',
        'file_name',
        'file_size',
        'path',
        'sync_hash',
        'local_sqlite_id',
        'local_status',
        'deleted_at_source',
    ];

    protected array $sortable = [
        'media_type',
        'origin_app',
        'file_name',
        'file_size',
        'local_status',
        'created_at',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'media_type'        => MediaType::class,
            'local_sqlite_id'   => 'integer',
            'local_status'      => LocalStatus::class,
            'deleted_at_source' => 'boolean',
        ];
    }

    public function searchable(): array
    {
        return [
            Search::make('file_name', SearchOperator::LIKE),
            Search::make('origin_app', SearchOperator::LIKE),
            Search::make('sync_hash', SearchOperator::LIKE),
        ];
    }

    public function filters(): array
    {
        return [
            Filter::make('device_id', 'device_id__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['device_id__eq' => 'integer']),
            Filter::make('media_type', 'media_type__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['media_type__eq' => ['string', new \Illuminate\Validation\Rules\Enum(MediaType::class)]]),
            Filter::make('local_status', 'local_status__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['local_status__eq' => ['string', new \Illuminate\Validation\Rules\Enum(LocalStatus::class)]]),
            Filter::make('origin_app', 'origin_app__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['origin_app__eq' => 'string']),
            Filter::make('created_at', 'created_at__between')
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
                            $query->whereBetween('created_at', [$start, $end]);
                        } catch (\Exception $e) {
                            // ignore invalid dates
                        }
                    }
                })
                ->setValidationRules(['created_at__between' => 'nullable']),
        ];
    }

    public function device()
    {
        return $this->belongsTo(Device::class);
    }
}
