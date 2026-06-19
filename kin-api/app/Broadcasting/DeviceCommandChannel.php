<?php

namespace App\Broadcasting;

use App\Models\Device;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class DeviceCommandChannel
{
    /**
     * Create a new channel instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Authenticate access to a device's direct command-and-control channel.
     */
    public function join(?User $user, string $uuid): bool
    {
        // The child device itself listens for its own commands, identified
        // by the same header CheckDeviceToken validates on REST requests.
        $deviceUuid = request()->header('X-Device-UUID') ?: request()->input('device_uuid');

        if ($deviceUuid === $uuid && Device::where('uuid', $uuid)->exists()) {
            return true;
        }

        // Sanctum resolves the bearer token on demand regardless of the
        // broadcasting auth route's middleware, so fall back to it when
        // the default guard did not resolve a user.
        $user ??= Auth::guard('sanctum')->user();

        if (!$user) {
            return false;
        }

        // The owning parent may listen to / broadcast on their device's channel
        return Device::where('uuid', $uuid)->where('user_id', $user->id)->exists();
    }
}
