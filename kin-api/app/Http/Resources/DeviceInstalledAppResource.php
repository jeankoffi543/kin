<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DeviceInstalledAppResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'device_id'         => $this->device_id,
            'app_name'          => $this->app_name,
            'package_name'      => $this->package_name,
            'installed_at'      => $this->installed_at?->toIso8601String(),
            'is_blocked'        => (bool) $this->is_blocked,
            'sync_hash'         => $this->sync_hash,
            'local_sqlite_id'   => (int) $this->local_sqlite_id,
            'local_status'      => $this->local_status?->value ?? $this->local_status,
            'deleted_at_source' => (bool) $this->deleted_at_source,
            'created_at'        => $this->created_at?->toIso8601String(),
            'updated_at'        => $this->updated_at?->toIso8601String(),
        ];
    }
}
