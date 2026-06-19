<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Symfony\Component\HttpFoundation\Response;

abstract class BaseFormRequest extends FormRequest
{
    public function failedValidation(Validator $validator): void
    {
        if (!request()->header('x-inertia')) {
            throw new HttpResponseException(
                response()->json(['errors' => $validator->errors()], Response::HTTP_BAD_REQUEST)
            );
        }
    }
}
