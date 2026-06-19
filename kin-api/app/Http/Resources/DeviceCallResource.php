<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DeviceCallResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'device_id'         => $this->device_id,
            'contact_name'      => $this->contact_name,
            'phone_number'      => $this->phone_number,
            'call_type'         => $this->call_type?->value ?? $this->call_type,
            'duration'          => (int) $this->duration,
            'recorded_at'       => $this->recorded_at,
            'call_recorded'     => (bool) $this->call_recorded,
            'recording_path'    => $this->recording_path,
            'sync_hash'         => $this->sync_hash,
            'local_sqlite_id'   => (int) $this->local_sqlite_id,
            'local_status'      => $this->local_status?->value ?? $this->local_status,
            'deleted_at_source' => (bool) $this->deleted_at_source,
            'created_at'        => $this->created_at?->toIso8601String(),
            'updated_at'        => $this->updated_at?->toIso8601String(),
        ];
    }
}
