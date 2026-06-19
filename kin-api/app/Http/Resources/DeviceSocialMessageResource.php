<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DeviceSocialMessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'device_id'         => $this->device_id,
            'platform'          => $this->platform?->value ?? $this->platform,
            'sender_name'       => $this->sender_name,
            'message'           => $this->message,
            'date'              => $this->date?->toIso8601String(),
            'sync_hash'         => $this->sync_hash,
            'local_sqlite_id'   => (int) $this->local_sqlite_id,
            'local_status'      => $this->local_status?->value ?? $this->local_status,
            'deleted_at_source' => (bool) $this->deleted_at_source,
            'created_at'        => $this->created_at?->toIso8601String(),
            'updated_at'        => $this->updated_at?->toIso8601String(),
        ];
    }
}
