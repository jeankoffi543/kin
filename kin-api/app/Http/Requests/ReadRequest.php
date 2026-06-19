<?php

namespace App\Http\Requests;

class ReadRequest extends BaseFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'last_message_id' => ['required', 'exists:messages,id'],
        ];
    }
}
