<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rules\Enum;

class RemoteCommandExecuteRequest extends BaseFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'command_type' => ['required', 'string', new Enum(\App\Enums\CommandType::class)],
            'parameters' => ['sometimes', 'array'],
        ];
    }
}
