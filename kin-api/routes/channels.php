<?php

use App\Broadcasting\ConversationAdminUser;
use App\Broadcasting\DeviceCommandChannel;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Authorization is delegated to App\Broadcasting\* channel classes, which
| resolve the caller against the "sanctum" / "admin-sanctum" guards (and,
| for the device channel, the X-Device-UUID header) independently of the
| /broadcasting/auth route's middleware. Returning false from either class
| results in a 403 from Reverb, so unauthorized clients cannot subscribe
| to or intercept another tenant's stream.
|
*/

// Support conversation channel: admins join any conversation, parents only
// the conversation they own (see SendMessageBroadCast, TypingBroadcast,
// MessageStatusBroadcast, ConversationUpdatedBroadcast).
Broadcast::channel('conversation.{id}', ConversationAdminUser::class);

// Device C2 channel: the child device itself (via X-Device-UUID) and the
// owning parent may listen for remote command pushes (see ReceptBroadcast).
Broadcast::channel('device.{uuid}', DeviceCommandChannel::class);
