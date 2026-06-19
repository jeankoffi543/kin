<?php

namespace App\Models;

use App\Enums\ConversationStatus;
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

class Conversation extends Model
{
    use HasFactory, HasFilters, IsSearchable, IsSortable;

    protected $fillable = ['user_id', 'title_id', 'status', 'admin_id', 'code'];

    protected array $sortable = ['status', 'code', 'created_at', 'updated_at'];

    protected function casts(): array
    {
        return [
            'status' => ConversationStatus::class,
        ];
    }

    public function searchable(): array
    {
        return [
            Search::make('code', SearchOperator::LIKE),
            Search::make('title.name', SearchOperator::LIKE),
        ];
    }

    public function filters(): array
    {
        return [
            Filter::make('status', 'status__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['status__eq' => 'string']),

            Filter::make('code', 'code__iLike')
                ->setCaseInsensitive(true)
                ->setOperator(FilterOperator::LIKE)
                ->setValidationRules(['code__iLike' => 'string']),
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function title()
    {
        return $this->belongsTo(Title::class);
    }

    public function admin()
    {
        return $this->belongsTo(Admin::class, 'admin_id');
    }

    public function messages()
    {
        return $this->hasMany(Message::class);
    }
}
