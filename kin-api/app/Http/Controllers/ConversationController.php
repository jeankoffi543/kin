<?php

namespace App\Http\Controllers;

use App\Http\Requests\ConversationRequest;
use App\Http\Requests\MessageRequest;
use App\Http\Requests\ReadRequest;
use App\Http\Requests\TypingRequest;
use App\Services\ConversationService;
use Kjos\Command\Managers\Controller as BaseController;

/**
 * @group Admin: Conversations
 *
 * Support ticket conversation management. Admin methods are in this group;
 * user-facing methods are tagged `@group User: Conversations` individually.
 */
class ConversationController extends BaseController
{
    /** @var ConversationService */
    protected $service;

    public function getServices(): array
    {
        return [
            'service' => ConversationService::class,
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin endpoints (invoked via the auth:admin-sanctum guard)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Admin lists all support conversations (paginated, filterable, sortable).
     */
    public function index(): mixed
    {
        return $this->invokeWithCatching(function () {
            return $this->service->index();
        });
    }

    /**
     * Admin retrieves the full thread of a given conversation.
     */
    public function show(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->show($id);
        });
    }

    /**
     * Admin soft-deletes (closes) a support conversation.
     */
    public function destroy(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->destroy($id);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Parent / User endpoints (invoked via the auth:sanctum guard)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @group User: Conversations
     *
     * Parent lists their own support conversations (paginated).
     */
    public function indexForUser(): mixed
    {
        return $this->invokeWithCatching(function () {
            return $this->service->forCurrentUser();
        });
    }

    /**
     * @group User: Conversations
     *
     * Parent retrieves the full thread of one of their conversations.
     */
    public function showForUser(int $id): mixed
    {
        return $this->invokeWithCatching(function () use ($id) {
            return $this->service->showForCurrentUser($id);
        });
    }

    /**
     * @group User: Conversations
     *
     * Parent opens a new support ticket conversation.
     */
    public function store(ConversationRequest $request): mixed
    {
        return $this->invokeWithCatching(function () use ($request) {
            return $this->service->storeForUser($request->validated());
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Shared real-time messaging actions (parent + admin, same guard logic)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Send a message into a conversation thread.
     *
     * The service resolves the correct MessageSender enum (user / admin / support)
     * by inspecting which guard is currently authenticated.
     */
    public function storeMessage(int $id, MessageRequest $request): mixed
    {
        return $this->invokeWithCatching(function () use ($id, $request) {
            return $this->service->sendMessage($id, $request->validated());
        });
    }

    /**
     * Broadcast a "is typing…" presence signal to the conversation channel.
     */
    public function broadcastTyping(int $id, TypingRequest $request): mixed
    {
        return $this->invokeWithCatching(function () use ($id, $request) {
            return $this->service->broadcastActorTyping($id, $request->validated());
        });
    }

    /**
     * Mark all messages up to a given ID as read for the current actor.
     */
    public function markAsRead(int $id, ReadRequest $request): mixed
    {
        return $this->invokeWithCatching(function () use ($id, $request) {
            return $this->service->markMessagesAsRead($id, $request->validated());
        });
    }
}
