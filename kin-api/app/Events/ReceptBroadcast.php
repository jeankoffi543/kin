<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ReceptBroadcast implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $deviceUuid;
    public array $payload;

    /**
     * Create a new event instance.
     */
    public function __construct(string $deviceUuid, array $payload)
    {
        $this->deviceUuid = $deviceUuid;
        $this->payload = $payload;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        // Devices can subscribe to their own channel
        return [
            new PrivateChannel('device.' . $this->deviceUuid),
        ];
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return $this->payload;
    }
}
