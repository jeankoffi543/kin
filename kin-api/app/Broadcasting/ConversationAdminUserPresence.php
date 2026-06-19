<?php

namespace App\Broadcasting;

use App\Models\User;

class ConversationAdminUserPresence
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
    public function join($user): array|bool
    {
        // Return user details for presence channel tracking
        if ($user) {
            return [
                'id'   => $user->id,
                'name' => $user->name,
                'role' => method_exists($user, 'role') ? $user->role : 'user',
            ];
        }

        return false;
    }
}
