<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuthUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'user_id'             => $this->id,
            'name'                => $this->name,
            'email'               => $this->email,
            'subscription_status' => $this->subscription_status?->value ?? $this->subscription_status,
            'trial_ends_at'       => $this->trial_ends_at?->toIso8601String(),
            'created_at'          => $this->created_at?->toIso8601String(),
            'updated_at'          => $this->updated_at?->toIso8601String(),
        ];
    }
}
