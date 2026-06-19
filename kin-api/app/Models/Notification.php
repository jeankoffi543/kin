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

class Notification extends Model
{
    use HasFactory, HasFilters, IsSearchable, IsSortable;

    protected $fillable = [
        'audience',
        'user_ids',
        'title',
        'body',
    ];

    protected array $sortable = [
        'audience',
        'title',
        'created_at',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'user_ids' => 'array',
        ];
    }

    public function searchable(): array
    {
        return [
            Search::make('title', SearchOperator::LIKE),
            Search::make('body', SearchOperator::LIKE),
        ];
    }

    public function filters(): array
    {
        return [
            Filter::make('audience', 'audience__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['audience__eq' => 'string']),
        ];
    }
}
