<?php

namespace App\Http\Requests;

class DeviceStatusChangeRequest extends BaseFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'call_recording_enabled'          => ['sometimes', 'boolean'],
            'microphone_recording_interval'  => ['sometimes', 'integer', 'min:1', 'max:1440'],
            'microphone_recording_continuous' => ['sometimes', 'boolean'],
            'screen_recording_enabled'        => ['sometimes', 'boolean'],
        ];
    }
}
