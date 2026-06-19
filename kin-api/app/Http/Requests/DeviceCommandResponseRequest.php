<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rules\Enum;

class DeviceCommandResponseRequest extends BaseFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status'     => ['required', 'string', new Enum(\App\Enums\CommandStatus::class)],
            'result_url' => ['required_without:file', 'nullable', 'string', 'max:2048'],
            'file'       => ['required_without:result_url', 'file', 'mimes:jpeg,png,mp3,wav,mp4', 'max:' . \App\Enums\UploadLimit::GENERIC->value],
        ];
    }
}
