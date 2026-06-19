<?php

namespace App\Models;

use App\Enums\MessageSender;
use App\Enums\MessageStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\FilterOperator;
use Keky\QueryMaster\Enums\SearchOperator;
use Keky\QueryMaster\Filter;
use Keky\QueryMaster\Search;

class Message extends Model
{
    use HasFactory, HasFilters, IsSearchable, IsSortable;

    protected $fillable = [
        'conversation_id',
        'sender',
        'content',
        'status',
    ];

    protected array $sortable = [
        'sender',
        'status',
        'created_at',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'sender' => MessageSender::class,
            'status' => MessageStatus::class,
        ];
    }

    public function searchable(): array
    {
        return [
            Search::make('content', SearchOperator::LIKE),
        ];
    }

    public function filters(): array
    {
        return [
            Filter::make('status', 'status__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['status__eq' => 'string']),
            Filter::make('sender', 'sender__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['sender__eq' => 'string']),
        ];
    }

    public function conversation()
    {
        return $this->belongsTo(Conversation::class);
    }
}
