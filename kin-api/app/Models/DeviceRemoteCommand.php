<?php

namespace App\Models;

use App\Enums\CommandStatus;
use App\Enums\CommandType;
use Illuminate\Database\Eloquent\Model;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\FilterOperator;
use Keky\QueryMaster\Enums\SearchOperator;
use Keky\QueryMaster\Filter;
use Keky\QueryMaster\Search;

class DeviceRemoteCommand extends Model
{
    use HasFilters, IsSearchable, IsSortable;

    protected $table = 'device_remote_commands';

    protected $fillable = [
        'device_id',
        'command_type',
        'status',
        'parameters',
        'result_url',
        'triggered_at',
    ];

    protected array $sortable = [
        'command_type',
        'status',
        'triggered_at',
        'created_at',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'command_type' => CommandType::class,
            'status'       => CommandStatus::class,
            'parameters'   => 'array',
            'triggered_at' => 'datetime',
        ];
    }

    public function searchable(): array
    {
        return [
            Search::make('result_url', SearchOperator::LIKE),
        ];
    }

    public function filters(): array
    {
        return [
            Filter::make('device_id', 'device_id__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['device_id__eq' => 'integer']),
            Filter::make('command_type', 'command_type__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['command_type__eq' => ['string', new \Illuminate\Validation\Rules\Enum(CommandType::class)]]),
            Filter::make('status', 'status__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['status__eq' => ['string', new \Illuminate\Validation\Rules\Enum(CommandStatus::class)]]),
        ];
    }

    public function device()
    {
        return $this->belongsTo(Device::class);
    }
}
