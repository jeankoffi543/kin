<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DeviceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                               => $this->id,
            'user'                             => AuthUserResource::make($this->whenLoaded('user')),
            'uuid'                             => $this->uuid,
            'platform'                         => $this->platform,
            'brand'                            => $this->brand,
            'model'                            => $this->model,
            'os_version'                       => $this->os_version,
            'app_version'                      => $this->app_version,
            'device_name'                      => $this->device_name,
            'ip_address'                       => $this->ip_address,
            'fcm_token'                        => $this->fcm_token,
            'call_recording_enabled'           => (bool) $this->call_recording_enabled,
            'microphone_recording_interval'    => (int) $this->microphone_recording_interval,
            'microphone_recording_continuous'  => (bool) $this->microphone_recording_continuous,
            'screen_recording_enabled'         => (bool) $this->screen_recording_enabled,
            'sync_status'                      => $this->sync_status ?? 'idle',
            'sync_started_at'                  => $this->sync_started_at,
            'created_at'                       => $this->created_at?->toIso8601String(),
            'updated_at'                       => $this->updated_at?->toIso8601String(),
        ];
    }
}
