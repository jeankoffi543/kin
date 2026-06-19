<?php

namespace Keky\QueryMaster;

use Keky\QueryMaster\Enums\SearchOperator;

class Search
{
    protected string $column;
    protected SearchOperator $operator;

    public function __construct(string $column, SearchOperator $operator)
    {
        $this->column = $column;
        $this->operator = $operator;
    }

    public static function make(string $column, SearchOperator $operator): self
    {
        return new static($column, $operator);
    }

    public function getColumn(): string
    {
        return $this->column;
    }

    public function getOperator(): SearchOperator
    {
        return $this->operator;
    }
}
