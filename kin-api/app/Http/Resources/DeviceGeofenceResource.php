<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DeviceGeofenceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'device_id'  => $this->device_id,
            'name'       => $this->name,
            'latitude'   => (float) $this->latitude,
            'longitude'  => (float) $this->longitude,
            'radius'     => (float) $this->radius,
            'is_active'  => (bool) $this->is_active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
