<?php

namespace App\Http\Requests;

class TypingRequest extends BaseFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'is_typing' => ['required', 'boolean'],
        ];
    }
}
