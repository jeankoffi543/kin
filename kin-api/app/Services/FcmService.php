<?php

namespace App\Services;

use App\Models\Device;
use Google\Auth\Credentials\ServiceAccountCredentials;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Service managing Google Firebase Cloud Messaging (FCM) HTTP v1 API dispatch,
 * sliding OAuth2 token resolution, and diagnostic pushes.
 */
class FcmService extends Service
{
    /**
     * Send push notification to a specific device.
     */
    public function sendToDevice(Device $device, string $title, string $body, array $data = []): bool
    {
        if (! $device->fcm_token) {
            Log::warning("FCM: Cannot send push to device ID {$device->id} (missing FCM token).");

            return false;
        }

        return $this->sendPush($device->fcm_token, $title, $body, $data);
    }

    /**
     * Send push notification to a list of tokens via Firebase HTTP v1 API.
     */
    public function sendPush(string $token, string $title, string $body, array $data = []): bool
    {
        $projectId = config('services.fcm.project_id') ?: env('FCM_PROJECT_ID');
        $accessToken = $this->getAccessToken();

        // If FCM project is not configured, run in simulation/sandbox mode
        if (! $projectId) {
            Log::info("FCM Simulation: Sending Push to Token: {$token}. Title: {$title}. Body: {$body}", $data);

            return true;
        }

        // Send request to Firebase HTTP v1 API
        $response = Http::withHeaders([
            'Authorization' => 'Bearer '.$accessToken,
            'Content-Type' => 'application/json',
        ])->post('https://fcm.googleapis.com/v1/projects/'.$projectId.'/messages:send', [
            'message' => [
                'token' => $token,
                'notification' => [
                    'title' => $title,
                    'body' => $body,
                ],
                'data' => array_map('strval', $data),
            ],
        ]);

        if ($response->failed()) {
            Log::error('FCM: Push notification dispatch failed via v1 API.', [
                'status' => $response->status(),
                'response' => $response->body(),
            ]);

            return false;
        }

        return true;
    }

    /**
     * Resolve the device, dispatch diagnostic push, and return JsonResponse.
     */
    public function sendDiagnosticPush(int $deviceId, array $data): JsonResponse
    {
        $device = Device::findOrFail($deviceId);
        $success = $this->sendToDevice(
            $device,
            $data['title'],
            $data['body'],
            $data['data'] ?? []
        );

        return response()->json([
            'success' => $success,
            'message' => $success ? 'Push notification sent.' : 'Push notification failed.',
        ]);
    }

    /**
     * Resolve a short-lived OAuth2 Bearer token via Service Account credentials.
     * Token is cached for 50 minutes (expires at 60 min from Google).
     */
    protected function getAccessToken(): string
    {
        return cache()->remember('fcm_access_token', 3000, function (): string {
            $keyPath = storage_path('app/firebase-service-account.json');

            if (! file_exists($keyPath)) {
                // No Service Account — fall back to env static token (dev/testing only)
                return env('FCM_ACCESS_TOKEN', 'mock-oauth2-bearer-token');
            }

            $credentials = new ServiceAccountCredentials(
                'https://www.googleapis.com/auth/firebase.messaging',
                json_decode(file_get_contents($keyPath), true),
            );

            $token = $credentials->fetchAuthToken();

            return $token['access_token'] ?? 'mock-oauth2-bearer-token';
        });
    }
}
