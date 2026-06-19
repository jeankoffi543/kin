<?php

namespace App\Models;

use App\Enums\RestrictionRuleType;
use Illuminate\Database\Eloquent\Model;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\FilterOperator;
use Keky\QueryMaster\Enums\SearchOperator;
use Keky\QueryMaster\Filter;
use Keky\QueryMaster\Search;

class DeviceRestrictionRule extends Model
{
    use HasFilters, IsSearchable, IsSortable;

    protected $table = 'device_restriction_rules';

    protected $fillable = [
        'device_id',
        'rule_type',
        'is_enabled',
        'parameters',
    ];

    protected array $sortable = [
        'rule_type',
        'is_enabled',
        'created_at',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'rule_type'  => RestrictionRuleType::class,
            'is_enabled' => 'boolean',
            'parameters' => 'array',
        ];
    }

    public function searchable(): array
    {
        return [];
    }

    public function filters(): array
    {
        return [
            Filter::make('device_id', 'device_id__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['device_id__eq' => 'integer']),
            Filter::make('rule_type', 'rule_type__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['rule_type__eq' => ['string', new \Illuminate\Validation\Rules\Enum(RestrictionRuleType::class)]]),
            Filter::make('is_enabled', 'is_enabled__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['is_enabled__eq' => 'boolean']),
        ];
    }

    public function device()
    {
        return $this->belongsTo(Device::class);
    }
}
