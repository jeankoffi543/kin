<?php

namespace App\Models;

use App\Enums\AdminRole;
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

class Admin extends Authenticatable
{
    use HasFactory, Notifiable, HasFilters, IsSearchable, IsSortable, HasApiTokens;

    protected $table = 'admins';

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected array $sortable = [
        'name',
        'email',
        'role',
        'created_at',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'role' => AdminRole::class,
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
            Filter::make('role', 'role__eq')
                ->setOperator(FilterOperator::EQUAL)
                ->setValidationRules(['role__eq' => 'string']),
        ];
    }

    public function conversations()
    {
        return $this->hasMany(Conversation::class, 'admin_id');
    }
}
