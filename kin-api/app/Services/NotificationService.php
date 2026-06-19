<?php

namespace App\Services;

use App\Http\Resources\NotificationResource;
use App\Models\Notification;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Auth;

class NotificationService extends Service
{
    protected $model = Notification::class;
    protected $resource = NotificationResource::class;

    public function forCurrentUser(): AnonymousResourceCollection
    {
        $userId = Auth::id();
        $limit = request()->integer('limit', 20);

        $notifications = Notification::query()
            ->where(function ($q) use ($userId) {
                $q->where('audience', 'all')
                  ->orWhere(function ($inner) use ($userId) {
                      $inner->where('audience', 'specific')
                            ->whereJsonContains('user_ids', $userId);
                  });
            })
            ->orderByDesc('created_at')
            ->paginate($limit);

        return NotificationResource::collection($notifications);
    }

    public function showForCurrentUser(int $id): mixed
    {
        $userId = Auth::id();

        $notification = Notification::query()
            ->where('id', $id)
            ->where(function ($q) use ($userId) {
                $q->where('audience', 'all')
                  ->orWhere(function ($inner) use ($userId) {
                      $inner->where('audience', 'specific')
                            ->whereJsonContains('user_ids', $userId);
                  });
            })
            ->firstOrFail();

        return NotificationResource::make($notification);
    }

    public function forCurrentDevice(): AnonymousResourceCollection
    {
        $limit = request()->integer('limit', 20);

        $notifications = Notification::query()
            ->where('audience', 'all')
            ->orderByDesc('created_at')
            ->paginate($limit);

        return NotificationResource::collection($notifications);
    }

    public function showForCurrentDevice(int $id): mixed
    {
        $notification = Notification::query()
            ->where('id', $id)
            ->where('audience', 'all')
            ->firstOrFail();

        return NotificationResource::make($notification);
    }
}
