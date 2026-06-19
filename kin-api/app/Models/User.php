<?php

namespace App\Models;

use App\Enums\SubscriptionStatus;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Keky\QueryMaster\Concerns\HasFilters;
use Keky\QueryMaster\Concerns\IsSearchable;
use Keky\QueryMaster\Concerns\IsSortable;
use Keky\QueryMaster\Enums\FilterOperator;
use Keky\QueryMaster\Enums\SearchOperator;
use Keky\QueryMaster\Filter;
use Keky\QueryMaster\Search;

use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasFilters, IsSearchable, IsSortable, HasApiTokens;

    protected $fillable = [
        'name',
        'email',
        'password',
        'subscription_status',
        'trial_ends_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected array $sortable = [
        'name',
        'email',
        'subscription_status',
        'created_at',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'subscription_status' => SubscriptionStatus::class,
            'trial_ends_at' => 'datetime',
        ];
    }

    public function searchable(): array
    {
        return [
            Search::make('name', SearchOperator::LIKE),
            Search::make('email', SearchOperator::LIKE),
        ];
    }

    public function filters(): array
    {
        return [
            Filter::make('subscription_status', 'subscription_status__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['subscription_status__eq' => 'string']),
            Filter::make('name', 'name__like')
                ->setOperator(FilterOperator::LIKE)
                ->setValidationRules(['name__like' => 'string']),
        ];
    }

    public function devices()
    {
        return $this->hasMany(Device::class);
    }

    public function conversations()
    {
        return $this->hasMany(Conversation::class);
    }
}
