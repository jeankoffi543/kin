<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rules\Enum;

class AdminRequest extends BaseFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $adminId = $this->route('admin');

        if ($this->isMethod('post')) {
            return [
                'name'     => ['required', 'string', 'max:255'],
                'email'    => ['required', 'email', 'unique:admins,email'],
                'password' => ['required', 'string', 'min:8'],
                'role'     => ['required', 'string', new Enum(\App\Enums\AdminRole::class)],
            ];
        }

        return [
            'name'     => ['sometimes', 'string', 'max:255'],
            'email'    => ['sometimes', 'email', "unique:admins,email,{$adminId}"],
            'password' => ['sometimes', 'string', 'min:8'],
            'role'     => ['sometimes', 'string', new Enum(\App\Enums\AdminRole::class)],
        ];
    }
}
