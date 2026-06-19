<?php

namespace App\Http\Requests;

use App\Enums\RestrictionRuleType;
use Illuminate\Validation\Rules\Enum;

class RestrictionRuleStoreRequest extends BaseFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'rule_type' => ['required', 'string', new Enum(RestrictionRuleType::class)],
            'is_enabled' => ['required', 'boolean'],
            'parameters' => ['sometimes', 'array'],
        ];
    }
}
