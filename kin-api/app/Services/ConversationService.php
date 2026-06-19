<?php

namespace App\Services;

use App\Enums\ConversationStatus;
use App\Enums\MessageSender;
use App\Enums\MessageStatus;
use App\Events\ConversationUpdatedBroadcast;
use App\Events\SendMessageBroadCast;
use App\Events\TypingBroadcast;
use App\Http\Resources\ConversationLightResource;
use App\Http\Resources\ConversationResource;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

/**
 * Service handling customer support conversations, message delivery,
 * typing indicator broadcasts, and read receipt updates.
 */
class ConversationService extends Service
{
    protected $model = Conversation::class;
    protected $resource = ConversationResource::class;

    /**
     * Get a paginated list of conversations for the currently authenticated parent user.
     *
     * @return AnonymousResourceCollection
     */
    public function forCurrentUser(): AnonymousResourceCollection
    {
        $userId = Auth::id();
        $limit = request()->integer('limit', 15);

        $conversations = Conversation::query()
            ->where('user_id', $userId)
            ->with(['title', 'admin'])
            ->orderByDesc('updated_at')
            ->paginate($limit);

        return ConversationLightResource::collection($conversations);
    }

    /**
     * Show conversation details if it belongs to the currently authenticated parent user.
     *
     * @param int $id
     * @return ConversationResource
     */
    public function showForCurrentUser(int $id): ConversationResource
    {
        $userId = Auth::id();

        $conversation = Conversation::query()
            ->where('id', $id)
            ->where('user_id', $userId)
            ->with(['user', 'title', 'admin', 'messages'])
            ->firstOrFail();

        return ConversationResource::make($conversation);
    }

    /**
     * Create a new support conversation for the currently authenticated parent user.
     *
     * @param array $data
     * @return ConversationResource
     */
    public function storeForUser(array $data): ConversationResource
    {
        $userId = Auth::id();

        $conversation = Conversation::create([
            'user_id'  => $userId,
            'title_id' => $data['title_id'],
            'status'   => ConversationStatus::PENDING,
            'code'     => 'CONV-' . strtoupper(Str::random(8)),
        ]);

        $conversation->load(['user', 'title', 'admin', 'messages']);

        return ConversationResource::make($conversation);
    }

    /**
     * Send a support message and dispatch the real-time broadcast events.
     *
     * @param int $conversationId
     * @param array $data
     * @param string|null $senderRole
     * @return MessageResource
     */
    public function sendMessage(int $conversationId, array $data, ?string $senderRole = null): MessageResource
    {
        $conversation = $this->isAdmin()
            ? Conversation::findOrFail($conversationId)
            : Conversation::where('id', $conversationId)->where('user_id', auth()->id())->firstOrFail();

        if ($senderRole === null) {
            $senderRole = auth()->guard('admin-sanctum')->check() ? 'admin' : 'user';
        }

        // Map roles to MessageSender enum
        $sender = MessageSender::USER;
        if ($senderRole === 'admin') {
            $sender = MessageSender::ADMIN;
        } elseif ($senderRole === 'support') {
            $sender = MessageSender::SUPPORT;
        }

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender'          => $sender,
            'content'         => $data['content'],
            'status'          => MessageStatus::SENT,
        ]);

        // Touch the conversation updated_at timestamp
        $conversation->touch();

        // Trigger real-time broadcast events
        event(new SendMessageBroadCast($message));
        event(new ConversationUpdatedBroadcast($conversation));

        return MessageResource::make($message);
    }

    /**
     * Broadcast typing status for a conversation after ensuring permissions.
     *
     * @param int $conversationId
     * @param bool $isTyping
     * @param string $senderName
     * @return void
     */
    public function broadcastTyping(int $conversationId, bool $isTyping, string $senderName): void
    {
        $conversation = $this->isAdmin()
            ? Conversation::findOrFail($conversationId)
            : Conversation::where('id', $conversationId)->where('user_id', auth()->id())->firstOrFail();

        event(new TypingBroadcast($conversation, $isTyping, $senderName));
    }

    /**
     * Handle typing status broadcast from active actor request.
     *
     * @param int $conversationId
     * @param array $data
     * @return array
     */
    public function broadcastActorTyping(int $conversationId, array $data): array
    {
        $user     = auth()->user();
        $isTyping = (bool) ($data['is_typing'] ?? false);
        $this->broadcastTyping($conversationId, $isTyping, $user?->name ?? 'Unknown');

        return ['success' => true];
    }

    /**
     * Mark all messages in a conversation as read up to a specified message ID.
     *
     * @param int $conversationId
     * @param int $lastMessageId
     * @param string $readerRole
     * @return void
     */
    public function markAsRead(int $conversationId, int $lastMessageId, string $readerRole): void
    {
        $conversation = $this->isAdmin()
            ? Conversation::findOrFail($conversationId)
            : Conversation::where('id', $conversationId)->where('user_id', auth()->id())->firstOrFail();

        // Mark all messages up to lastMessageId as read
        Message::query()
            ->where('conversation_id', $conversation->id)
            ->where('id', '<=', $lastMessageId)
            ->where('status', '!=', MessageStatus::READ)
            ->update(['status' => MessageStatus::READ]);
    }

    /**
     * Handle marking messages as read request.
     *
     * @param int $conversationId
     * @param array $data
     * @return array
     */
    public function markMessagesAsRead(int $conversationId, array $data): array
    {
        $role          = auth()->guard('admin-sanctum')->check() ? 'admin' : 'user';
        $lastMessageId = (int) ($data['last_message_id'] ?? 0);
        $this->markAsRead($conversationId, $lastMessageId, $role);

        return ['success' => true];
    }
}
