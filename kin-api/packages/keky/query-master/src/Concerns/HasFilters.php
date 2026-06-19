<?php

namespace Keky\QueryMaster\Concerns;

use Keky\QueryMaster\Enums\FilterOperator;

trait HasFilters
{
    public function scopeFilterOnRequest($query)
    {
        if (!method_exists($this, 'filters')) {
            return $query;
        }

        $filters = $this->filters();
        foreach ($filters as $filter) {
            $requestKey = $filter->getRequestKey();
            if (request()->has($requestKey)) {
                $value = request()->input($requestKey);
                
                if ($filter->getApplyCallback()) {
                    ($filter->getApplyCallback())($query, $value);
                } else {
                    $column = $filter->getColumn();
                    $operator = $filter->getOperator();

                    if ($operator === FilterOperator::EQUAL) {
                        $query->where($column, '=', $value);
                    } elseif ($operator === FilterOperator::LIKE) {
                        $val = $value;
                        if ($filter->isCaseInsensitive()) {
                            $query->where($column, 'like', "%{$val}%");
                        } else {
                            $query->where($column, 'like', "%{$val}%");
                        }
                    }
                }
            }
        }

        return $query;
    }
}
