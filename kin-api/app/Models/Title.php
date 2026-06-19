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

class Title extends Model
{
    use HasFactory, HasFilters, IsSearchable, IsSortable;

    protected $fillable = [
        'name',
    ];

    protected array $sortable = [
        'name',
        'created_at',
        'updated_at',
    ];

    public function searchable(): array
    {
        return [
            Search::make('name', SearchOperator::LIKE),
        ];
    }

    public function filters(): array
    {
        return [
            Filter::make('name', 'name__like')
                ->setOperator(FilterOperator::LIKE)
                ->setValidationRules(['name__like' => 'string']),
        ];
    }

    public function conversations()
    {
        return $this->hasMany(Conversation::class);
    }
}
