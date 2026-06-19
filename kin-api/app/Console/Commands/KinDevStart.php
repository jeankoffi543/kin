<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Process\Process;

class KinDevStart extends Command
{
    protected $signature = 'kin:dev
        {--host=0.0.0.0 : Bind address for serve and Reverb}
        {--port=8000 : Port for the HTTP server}
        {--reverb-port=8080 : Port for the Reverb WebSocket server}
        {--no-horizon : Skip Horizon (use queue:listen instead)}
        {--no-reverb : Skip Reverb WebSocket server}
        {--no-pail : Skip Pail log viewer}
        {--no-server : Skip HTTP server}';

    protected $description = 'Start all Kin services: HTTP server, Reverb, Horizon, queue workers, and Pail logs';

    /** @var Process[] */
    private array $processes = [];

    public function handle(): int
    {
        $host = $this->option('host');
        $port = $this->option('port');
        $reverbPort = $this->option('reverb-port');
        $skipHorizon = $this->option('no-horizon');
        $skipReverb = $this->option('no-reverb');
        $skipPail = $this->option('no-pail');
        $skipServer = $this->option('no-server');


        $this->info('');
        $this->info('  ╔══════════════════════════════════════╗');
        $this->info('  ║       Kin Dev Stack — Starting       ║');
        $this->info('  ╚══════════════════════════════════════╝');
        $this->info('');

        $services = [];

        // 1. HTTP server
        if (!$skipServer) {
            $services[] = [
                'name' => 'server',
                'color' => '34',
                'cmd' => ['php', 'artisan', 'serve', "--host={$host}", "--port={$port}"],
            ];
        }

        // 2. Reverb WebSocket
        if (!$skipReverb) {
            $services[] = [
                'name' => 'reverb',
                'color' => '35',
                'cmd' => ['php', 'artisan', 'reverb:start', "--host={$host}", "--port={$reverbPort}"],
            ];
        }

        // 3. Horizon or queue:listen
        if (!$skipHorizon && class_exists(\Laravel\Horizon\Horizon::class)) {
            $services[] = [
                'name' => 'horizon',
                'color' => '31',
                'cmd' => ['php', 'artisan', 'horizon'],
            ];
        } else {
            $services[] = [
                'name' => 'queue',
                'color' => '31',
                'cmd' => ['php', 'artisan', 'queue:listen', '--tries=3', '--timeout=90'],
            ];
        }

        // 4. Pail log viewer
        if (!$skipPail) {
            $services[] = [
                'name' => 'pail',
                'color' => '33',
                'cmd' => ['php', 'artisan', 'pail', '--timeout=0'],
            ];
        }

        // Print startup summary
        foreach ($services as $service) {
            $this->line("  \e[{$service['color']}m●\e[0m {$service['name']}: " . implode(' ', $service['cmd']));
        }
        $this->info('');
        $this->info("  API:    http://{$host}:{$port}");
        if (!$skipReverb) {
            $this->info("  Reverb: ws://{$host}:{$reverbPort}");
        }
        $this->info('  Press Ctrl+C to stop all services');
        $this->info('');

        // Start all processes
        foreach ($services as $service) {
            $process = new Process($service['cmd'], base_path());
            $process->setTimeout(null);
            $process->start(function ($type, $buffer) use ($service) {
                $lines = explode("\n", trim($buffer));
                foreach ($lines as $line) {
                    if ($line === '') {
                        continue;
                    }
                    $this->output->write(
                        "  \e[{$service['color']}m[{$service['name']}]\e[0m {$line}" . PHP_EOL
                    );
                }
            });
            $this->processes[] = $process;
        }

        // Register shutdown handler for clean exit
        if (function_exists('pcntl_signal')) {
            pcntl_signal(SIGINT, function () {
                $this->shutdown();
                exit(0);
            });
            pcntl_signal(SIGTERM, function () {
                $this->shutdown();
                exit(0);
            });
        }

        // Event loop: watch all processes
        while (true) {
            $allStopped = true;
            foreach ($this->processes as $process) {
                if ($process->isRunning()) {
                    $allStopped = false;
                    $process->getIncrementalOutput();
                    $process->getIncrementalErrorOutput();
                }
            }

            if ($allStopped) {
                $this->error('All processes have stopped.');
                break;
            }

            if (function_exists('pcntl_signal_dispatch')) {
                pcntl_signal_dispatch();
            }

            usleep(200_000);
        }

        $this->shutdown();

        return 0;
    }

    private function shutdown(): void
    {
        $this->info('');
        $this->info('  Stopping all services...');

        foreach ($this->processes as $process) {
            if ($process->isRunning()) {
                $process->stop(5, SIGTERM);
            }
        }

        $this->info('  All services stopped.');
    }
}
