<?php

namespace App\Http\Requests;

class OnlineRequest extends BaseFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'is_online' => ['required', 'boolean'],
        ];
    }
}
