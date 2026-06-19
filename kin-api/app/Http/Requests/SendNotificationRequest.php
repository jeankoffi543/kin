<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rules\Enum;

class SendNotificationRequest extends BaseFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        if ($this->isMethod('put') || $this->isMethod('patch')) {
            return [
                'audience'   => ['sometimes', 'string', new Enum(\App\Enums\NotificationAudience::class)],
                'user_ids'   => ['sometimes', 'array'],
                'user_ids.*' => ['exists:users,id'],
                'title'      => ['sometimes', 'string', 'max:255'],
                'body'       => ['sometimes', 'string'],
            ];
        }

        return [
            'audience'   => ['required', 'string', new Enum(\App\Enums\NotificationAudience::class)],
            'user_ids'   => ['required_if:audience,specific', 'array'],
            'user_ids.*' => ['exists:users,id'],
            'title'      => ['required', 'string', 'max:255'],
            'body'       => ['required', 'string'],
        ];
    }
}
