<?php

namespace App\Models;

use App\Enums\LocalStatus;
use App\Enums\SmsStatus;
use App\Enums\SmsType;
use Illuminate\Database\Eloquent\Model;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\FilterOperator;
use Keky\QueryMaster\Enums\SearchOperator;
use Keky\QueryMaster\Filter;
use Keky\QueryMaster\Search;

class DeviceSms extends Model
{
    use HasFilters, IsSearchable, IsSortable;

    protected $table = 'device_sms';

    protected $fillable = [
        'device_id',
        'address',
        'body',
        'type',
        'sms_status',
        'date',
        'sync_hash',
        'local_sqlite_id',
        'local_status',
        'deleted_at_source',
    ];

    protected array $sortable = [
        'address',
        'type',
        'sms_status',
        'date',
        'local_status',
        'deleted_at_source',
        'created_at',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'datetime',
            'type' => SmsType::class,
            'sms_status' => SmsStatus::class,
            'body' => 'encrypted',
            'local_sqlite_id' => 'integer',
            'local_status' => LocalStatus::class,
            'deleted_at_source' => 'boolean',
        ];
    }

    public function searchable(): array
    {
        return [
            Search::make('address', SearchOperator::LIKE),
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
            Filter::make('type', 'type__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['type__eq' => ['string', new \Illuminate\Validation\Rules\Enum(SmsType::class)]]),
            Filter::make('sms_status', 'sms_status__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['sms_status__eq' => ['string', new \Illuminate\Validation\Rules\Enum(SmsStatus::class)]]),
            Filter::make('deleted_at_source', 'deleted__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['deleted__eq' => 'boolean']),
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
