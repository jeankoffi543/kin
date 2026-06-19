<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConversationLightResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'conversation_id' => $this->id,
            'title'           => TitleResource::make($this->whenLoaded('title')),
            'status'          => $this->status?->value ?? $this->status,
            'admin'           => $this->relationLoaded('admin') && $this->admin ? AuthAdminResource::make($this->admin) : null,
            'code'            => $this->code,
            'created_at'      => $this->created_at?->toIso8601String(),
            'updated_at'      => $this->updated_at?->toIso8601String(),
        ];
    }
}
