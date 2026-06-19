<?php

namespace Keky\QueryMaster\Concerns;

trait IsSearchable
{
    public function scopeSearchOnRequest($query)
    {
        if (!method_exists($this, 'searchable') || !request()->has('search')) {
            return $query;
        }

        $searchVal = request()->input('search');
        if (is_null($searchVal) || $searchVal === '') {
            return $query;
        }

        $searchables = $this->searchable();
        $query->where(function ($q) use ($searchables, $searchVal) {
            foreach ($searchables as $search) {
                $column = $search->getColumn();
                if (str_contains($column, '.')) {
                    [$relation, $relColumn] = explode('.', $column, 2);
                    $q->orWhereHas($relation, function ($rq) use ($relColumn, $searchVal) {
                        $rq->where($relColumn, 'like', "%{$searchVal}%");
                    });
                } else {
                    $q->orWhere($column, 'like', "%{$searchVal}%");
                }
            }
        });

        return $query;
    }
}
