<?php

namespace App\Http\Requests;

class GeofenceRequest extends BaseFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        if ($this->isMethod('post')) {
            return [
                'name'      => ['required', 'string', 'max:255'],
                'latitude'  => ['required', 'numeric'],
                'longitude' => ['required', 'numeric'],
                'radius'    => ['required', 'numeric', 'min:0'],
                'is_active' => ['sometimes', 'boolean'],
            ];
        }

        return [
            'name'      => ['sometimes', 'string', 'max:255'],
            'latitude'  => ['sometimes', 'numeric'],
            'longitude' => ['sometimes', 'numeric'],
            'radius'    => ['sometimes', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
