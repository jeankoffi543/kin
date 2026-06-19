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

class IngestedPayload extends Model
{
    use HasFilters, IsSearchable, IsSortable;

    protected $table = 'ingested_payloads';

    protected $fillable = [
        'sync_hash',
        'device_id',
        'payload_type',
    ];

    protected array $sortable = [
        'sync_hash',
        'payload_type',
        'created_at',
        'updated_at',
    ];

    public function searchable(): array
    {
        return [
            Search::make('sync_hash', SearchOperator::LIKE),
            Search::make('payload_type', SearchOperator::LIKE),
        ];
    }

    public function filters(): array
    {
        return [
            Filter::make('device_id', 'device_id__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['device_id__eq' => 'integer']),
            Filter::make('payload_type', 'payload_type__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['payload_type__eq' => 'string']),
        ];
    }

    public function device()
    {
        return $this->belongsTo(Device::class);
    }
}
