<?php

namespace App\Console\Commands;

use App\Enums\AdminRole;
use App\Models\Admin;
use App\Models\Title;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class KjosBroadcastInit extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'kjos:broadcast-init';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Initialize parental control chat titles and verify system defaults.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info("Initializing Kin Backoffice and Chat System...");

        // 1. Seed Support Categories (Titles)
        $defaultTitles = [
            'Technical Support / Mobile Installation',
            'Subscription & Billing Issues',
            'Feature Requests & Feedbacks',
            'Report a bug or sync issues',
            'General Inquiries',
        ];

        foreach ($defaultTitles as $name) {
            Title::firstOrCreate(['name' => $name]);
        }
        $this->info("✓ Support Categories (Titles) successfully initialized.");

        // 2. Create Default Admin if empty
        if (Admin::count() === 0) {
            Admin::create([
                'name'     => 'Default Admin',
                'email'    => 'admin@kjosguard.com',
                'password' => Hash::make('password123'),
                'role'     => AdminRole::ADMIN,
            ]);
            $this->info("✓ Default Admin created: admin@kjosguard.com (password: password123)");
        } else {
            $this->info("✓ Admin accounts already exist in system.");
        }

        $this->info("Kin Parental Control setup completed successfully.");
        return 0;
    }
}
