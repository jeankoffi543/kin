<?php

namespace App\Jobs;

use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Asynchronous bulk writer for a single telemetry channel batch.
 *
 * This job is dispatched by DeviceSyncService after the deduplication lock
 * has already been acquired (hashes written to `ingested_payloads`).
 * It runs on the `telemetry` Horizon queue and performs the actual bulk
 * INSERT into the target telemetry table without blocking the HTTP response.
 *
 * Failure behaviour:
 *  - On any Throwable, the transaction rolls back, and the job is retried
 *    up to $tries times with exponential backoff via $backoff.
 *  - After exhausting retries, `failed()` logs the failure and removes the
 *    orphaned hash fingerprints from `ingested_payloads` so the mobile
 *    device can retry synchronisation on its next cycle.
 */
class ProcessTelemetryBatch implements ShouldQueue
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Maximum number of attempts before the job is marked as failed.
     */
    public int $tries = 3;

    /**
     * Exponential backoff in seconds between retry attempts.
     *
     * @var list<int>
     */
    public array $backoff = [10, 30, 60];

    /**
     * @param  string                    $channel  Payload key (e.g. 'calls', 'sms').
     * @param  string                    $table    Target telemetry DB table.
     * @param  int                       $deviceId Authenticated child device ID.
     * @param  list<array<string, mixed>> $rows     Pre-mapped, insertion-ready rows.
     * @param  list<string>              $hashes   Sync hashes included in this batch,
     *                                              used for rollback cleanup on failure.
     */
    public function __construct(
        public readonly string $channel,
        public readonly string $table,
        public readonly int $deviceId,
        public readonly array $rows,
        public readonly array $hashes,
    ) {
        // Route to the dedicated telemetry queue (defined in config/horizon.php)
        $this->onQueue('telemetry');
    }

    /**
     * Execute the bulk telemetry insert.
     *
     * The insert is wrapped in a transaction so a partial failure
     * does not leave orphaned rows in the telemetry table. Eloquent
     * is deliberately bypassed in favour of a raw query-builder mass
     * insert for maximum throughput.
     */
    public function handle(): void
    {
        if ($this->batch()?->cancelled()) {
            return;
        }

        if (empty($this->rows)) {
            return;
        }

        DB::transaction(function (): void {
            DB::table($this->table)->insert($this->rows);
        });

        Log::debug('[ProcessTelemetryBatch] Batch committed', [
            'channel'   => $this->channel,
            'table'     => $this->table,
            'device_id' => $this->deviceId,
            'rows'      => count($this->rows),
        ]);
    }

    /**
     * Called by Laravel after all retry attempts have been exhausted.
     *
     * Logs the failure context (channel + device) and removes the hash
     * fingerprints from `ingested_payloads` so the deduplication lock is
     * released and the mobile device can retry synchronisation.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('[ProcessTelemetryBatch] Batch permanently failed — releasing dedup locks', [
            'channel'   => $this->channel,
            'table'     => $this->table,
            'device_id' => $this->deviceId,
            'hashes'    => $this->hashes,
            'exception' => $exception->getMessage(),
        ]);

        DB::table('ingested_payloads')
            ->where('device_id', $this->deviceId)
            ->whereIn('sync_hash', $this->hashes)
            ->delete();
    }
}
