<?php

namespace App\Http\Middleware;

use App\Models\Device;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckDeviceToken
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $uuid = $request->header('X-Device-UUID') ?: $request->input('device_uuid');

        if (!$uuid) {
            return response()->json(['message' => 'Missing X-Device-UUID header or parameter.'], Response::HTTP_UNAUTHORIZED);
        }

        $device = Device::where('uuid', $uuid)->first();

        if (!$device) {
            return response()->json(['message' => 'Unauthorized device.'], Response::HTTP_UNAUTHORIZED);
        }

        // Bind device to request for service access
        $request->attributes->set('device', $device);

        return $next($request);
    }
}
