<?php

namespace Keky\QueryMaster\Concerns;

trait IsSortable
{
    public function scopeSortOnRequest($query)
    {
        if (!property_exists($this, 'sortable') || !request()->has('sort_by')) {
            return $query;
        }

        $sortBy = request()->input('sort_by');
        $sortDesc = request()->boolean('sort_desc', false);
        $direction = $sortDesc ? 'desc' : 'asc';

        if (in_array($sortBy, $this->sortable)) {
            $query->orderBy($sortBy, $direction);
        }

        return $query;
    }
}
