<?php

namespace App\Broadcasting;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class ConversationAdminUser
{
    /**
     * Create a new channel instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Authenticate the user's access to the channel.
     */
    public function join(?User $user, int $conversationId): bool
    {
        // Admins can join any support conversation
        if (Auth::guard('admin-sanctum')->check()) {
            return true;
        }

        // Sanctum resolves the bearer token on demand regardless of the
        // broadcasting auth route's middleware, so fall back to it when
        // the default guard did not resolve a user.
        $user ??= Auth::guard('sanctum')->user();

        if (!$user) {
            return false;
        }

        // Parent users may only join the channel of a conversation they own
        return (int) $user->id === (int) Conversation::find($conversationId)?->user_id;
    }
}
