<?php

namespace App\Events;

use App\Models\Conversation;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TypingBroadcast implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Conversation $conversation;
    public bool $isTyping;
    public string $senderName;

    /**
     * Create a new event instance.
     */
    public function __construct(Conversation $conversation, bool $isTyping, string $senderName)
    {
        $this->conversation = $conversation;
        $this->isTyping = $isTyping;
        $this->senderName = $senderName;
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('conversation.' . $this->conversation->id),
        ];
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'is_typing'   => $this->isTyping,
            'sender_name' => $this->senderName,
        ];
    }
}
