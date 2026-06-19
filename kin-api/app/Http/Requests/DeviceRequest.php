<?php

namespace App\Http\Requests;

class DeviceRequest extends BaseFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'uuid'        => ['required', 'string'],
            'platform'    => ['sometimes', 'string'],
            'brand'       => ['sometimes', 'string'],
            'model'       => ['sometimes', 'string'],
            'os_version'  => ['sometimes', 'string'],
            'app_version' => ['sometimes', 'string'],
            'device_name' => ['sometimes', 'string'],
            'ip_address'  => ['sometimes', 'string'],
            'fcm_token'   => ['sometimes', 'nullable', 'string', 'min:10', 'max:4096'],
            'image'       => ['sometimes', 'image', 'max:' . \App\Enums\UploadLimit::IMAGE->value],
        ];
    }

    public function prepareForValidation()
    {
        if ($this->hasFile('image')) {
            $this->merge(['image' => $this->file('image')]);
        }
    }
}
