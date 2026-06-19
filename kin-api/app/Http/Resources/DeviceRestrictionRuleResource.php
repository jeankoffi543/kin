<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DeviceRestrictionRuleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'device_id'  => $this->device_id,
            'rule_type'  => $this->rule_type?->value ?? $this->rule_type,
            'is_enabled' => (bool) $this->is_enabled,
            'parameters' => $this->parameters,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
