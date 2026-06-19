<?php

namespace Keky\QueryMaster;

use Keky\QueryMaster\Enums\FilterOperator;

class Filter
{
    protected string $column;
    protected string $requestKey;
    protected FilterOperator $operator = FilterOperator::EQUAL;
    protected array $validationRules = [];
    protected $applyCallback = null;
    protected bool $caseInsensitive = false;

    public function __construct(string $column, string $requestKey)
    {
        $this->column = $column;
        $this->requestKey = $requestKey;
    }

    public static function make(string $column, string $requestKey): self
    {
        return new static($column, $requestKey);
    }

    public function setOperator(FilterOperator $operator): self
    {
        $this->operator = $operator;
        return $this;
    }

    public function setValidationRules(array $rules): self
    {
        $this->validationRules = $rules;
        return $this;
    }

    public function applyWith(callable $callback): self
    {
        $this->applyCallback = $callback;
        return $this;
    }

    public function setCaseInsensitive(bool $caseInsensitive): self
    {
        $this->caseInsensitive = $caseInsensitive;
        return $this;
    }

    public function getColumn(): string
    {
        return $this->column;
    }

    public function getRequestKey(): string
    {
        return $this->requestKey;
    }

    public function getOperator(): FilterOperator
    {
        return $this->operator;
    }

    public function getValidationRules(): array
    {
        return $this->validationRules;
    }

    public function getApplyCallback(): ?callable
    {
        return $this->applyCallback;
    }

    public function isCaseInsensitive(): bool
    {
        return $this->caseInsensitive;
    }
}
