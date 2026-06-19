<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rules\Enum;

class ConversationRequest extends BaseFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        if ($this->isMethod(BaseFormRequest::METHOD_GET)) {
            return [];
        }

        $rules = [
            'title_id' => ['required', 'exists:titles,id'],
            'status'   => ['sometimes', 'string', new Enum(\App\Enums\ConversationStatus::class)],
        ];

        if ($this->isMethod(BaseFormRequest::METHOD_PUT) || $this->isMethod(BaseFormRequest::METHOD_PATCH)) {
            $rules['title_id'] = ['sometimes', 'exists:titles,id'];
            $rules['status']   = ['required', 'string', new Enum(\App\Enums\ConversationStatus::class)];
        }

        return $rules;
    }
}
