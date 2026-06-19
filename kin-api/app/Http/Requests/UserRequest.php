<?php

namespace App\Http\Requests;

class UserRequest extends BaseFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->route('user') ?: auth()->id();

        if ($this->isMethod('post')) {
            return [
                'name'     => ['required', 'string', 'max:255'],
                'email'    => ['required', 'email', 'unique:users,email'],
                'password' => ['required', 'string', 'min:8'],
            ];
        }

        return [
            'name'     => ['sometimes', 'string', 'max:255'],
            'email'    => ['sometimes', 'email', "unique:users,email,{$userId}"],
            'password' => ['sometimes', 'string', 'min:8'],
        ];
    }
}
