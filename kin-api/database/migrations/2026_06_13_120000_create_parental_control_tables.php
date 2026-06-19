<?php

use App\Enums\CallType;
use App\Enums\CommandStatus;
use App\Enums\CommandType;
use App\Enums\ConversationStatus;
use App\Enums\LocalStatus;
use App\Enums\MediaType;
use App\Enums\MessageSender;
use App\Enums\MessageStatus;
use App\Enums\RestrictionRuleType;
use App\Enums\AdminRole;
use App\Enums\SmsType;
use App\Enums\SocialPlatform;
use App\Enums\SubscriptionStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update users table to add subscription details
        Schema::table('users', function (Blueprint $table) {
            $table->enum('subscription_status', SubscriptionStatus::values())->default(SubscriptionStatus::TRIAL->value);
            $table->timestamp('trial_ends_at')->nullable();
        });

        // 1. Admins Table
        Schema::create('admins', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->enum('role', AdminRole::values())->default(AdminRole::ADMIN->value);
            $table->rememberToken();
            $table->timestamps();
        });

        // 2. Titles Table (for Support Conversations)
        Schema::create('titles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->timestamps();
        });

        // 3. Devices Table
        Schema::create('devices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('uuid')->unique();
            $table->string('platform')->nullable();
            $table->string('brand')->nullable();
            $table->string('model')->nullable();
            $table->string('os_version')->nullable();
            $table->string('app_version')->nullable();
            $table->string('device_name')->nullable();
            $table->string('ip_address')->nullable();
            $table->text('fcm_token')->nullable();
            $table->boolean('call_recording_enabled')->default(false);
            $table->integer('microphone_recording_interval')->default(15); // in minutes
            $table->boolean('microphone_recording_continuous')->default(false);
            $table->boolean('screen_recording_enabled')->default(false);
            $table->timestamps();
        });

        // 4. Conversations Table (Support)
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('title_id')->constrained()->cascadeOnDelete();
            $table->enum('status', ConversationStatus::values())->default(ConversationStatus::PENDING->value);
            $table->foreignId('admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->string('code')->unique();
            $table->timestamps();
        });

        // 5. Messages Table (Support)
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->enum('sender', MessageSender::values());
            $table->text('content');
            $table->enum('status', MessageStatus::values())->default(MessageStatus::SENT->value);
            $table->timestamps();
        });

        // 6. Global Push/Admin Notifications Table
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->string('audience')->default('all'); // all, specific
            $table->json('user_ids')->nullable(); // JSON list of targeted users
            $table->string('title');
            $table->text('body');
            $table->timestamps();
        });

        // 7. Core Sync Ingestion Hash Table (Anti-Duplication)
        Schema::create('ingested_payloads', function (Blueprint $table) {
            $table->id();
            $table->string('sync_hash', 64);
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->string('payload_type');
            $table->timestamps();

            $table->unique(['device_id', 'sync_hash']);
            $table->index('created_at');
        });

        // 8. Device Call Logs Table
        Schema::create('device_calls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->string('contact_name')->nullable();
            $table->string('phone_number');
            $table->enum('call_type', CallType::values());
            $table->integer('duration'); // in seconds
            $table->boolean('call_recorded')->default(false);
            $table->string('recording_path')->nullable();
            $table->string('sync_hash');
            
            // SSoT Tracking fields
            $table->bigInteger('local_sqlite_id')->nullable();
            $table->enum('local_status', LocalStatus::values())->default(LocalStatus::PENDING->value);
            $table->boolean('deleted_at_source')->default(false);

            $table->timestamps();

            // Strict Compound Unique Constraint for Anti-Duplication
            $table->unique(['device_id', 'sync_hash']);
            $table->index(['device_id', 'created_at']);
        });

        // 9. Device Contacts Table
        Schema::create('device_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('phone_number');
            $table->string('sync_hash');
            
            // SSoT Tracking fields
            $table->bigInteger('local_sqlite_id')->nullable();
            $table->enum('local_status', LocalStatus::values())->default(LocalStatus::PENDING->value);
            $table->boolean('deleted_at_source')->default(false);

            $table->timestamps();

            $table->unique(['device_id', 'sync_hash']);
            $table->index(['device_id', 'name']);
        });

        // 10. Device SMS Table
        Schema::create('device_sms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->string('address');
            $table->text('body');
            $table->enum('type', SmsType::values());
            $table->timestamp('date');
            $table->string('sync_hash');
            
            // SSoT Tracking fields
            $table->bigInteger('local_sqlite_id')->nullable();
            $table->enum('local_status', LocalStatus::values())->default(LocalStatus::PENDING->value);
            $table->boolean('deleted_at_source')->default(false);

            $table->timestamps();

            $table->unique(['device_id', 'sync_hash']);
            $table->index(['device_id', 'date']);
        });

        // 11. Device Intercepted Notifications Table
        Schema::create('device_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->string('package_name');
            $table->string('title')->nullable();
            $table->text('body')->nullable();
            $table->timestamp('date');
            $table->string('sync_hash');
            
            // SSoT Tracking fields
            $table->bigInteger('local_sqlite_id')->nullable();
            $table->enum('local_status', LocalStatus::values())->default(LocalStatus::PENDING->value);
            $table->boolean('deleted_at_source')->default(false);

            $table->timestamps();

            $table->unique(['device_id', 'sync_hash']);
            $table->index(['device_id', 'date']);
        });

        // 12. Device GPS History Table
        Schema::create('device_gps_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->decimal('altitude', 8, 2)->nullable();
            $table->decimal('accuracy', 5, 2)->nullable();
            $table->timestamp('recorded_at');
            $table->string('sync_hash');
            
            // SSoT Tracking fields
            $table->bigInteger('local_sqlite_id')->nullable();
            $table->enum('local_status', LocalStatus::values())->default(LocalStatus::PENDING->value);
            $table->boolean('deleted_at_source')->default(false);

            $table->timestamps();

            $table->unique(['device_id', 'sync_hash']);
            $table->index(['device_id', 'recorded_at']);
        });

        // 13. Device Geofences Configuration Table
        Schema::create('device_geofences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->decimal('radius'); // in meters
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 14. Device Geofence Alerts (Breach notifications)
        Schema::create('device_geofence_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->foreignId('geofence_id')->constrained('device_geofences')->cascadeOnDelete();
            $table->string('event_type'); // enter, exit
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->timestamp('triggered_at');
            $table->string('sync_hash');
            
            // SSoT Tracking fields
            $table->bigInteger('local_sqlite_id')->nullable();
            $table->enum('local_status', LocalStatus::values())->default(LocalStatus::PENDING->value);
            $table->boolean('deleted_at_source')->default(false);

            $table->timestamps();

            $table->unique(['device_id', 'sync_hash']);
        });

        // 15. Device Social Messaging Interception
        Schema::create('device_social_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->enum('platform', SocialPlatform::values());
            $table->string('sender_name');
            $table->text('message');
            $table->timestamp('date');
            $table->string('sync_hash');
            
            // SSoT Tracking fields
            $table->bigInteger('local_sqlite_id')->nullable();
            $table->enum('local_status', LocalStatus::values())->default(LocalStatus::PENDING->value);
            $table->boolean('deleted_at_source')->default(false);

            $table->timestamps();

            $table->unique(['device_id', 'sync_hash']);
            $table->index(['device_id', 'date']);
        });

        // 16. Device Browser History Table
        Schema::create('device_browser_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->string('url', 2048);
            $table->string('title')->nullable();
            $table->timestamp('visited_at');
            $table->string('sync_hash');
            
            // SSoT Tracking fields
            $table->bigInteger('local_sqlite_id')->nullable();
            $table->enum('local_status', LocalStatus::values())->default(LocalStatus::PENDING->value);
            $table->boolean('deleted_at_source')->default(false);

            $table->timestamps();

            $table->unique(['device_id', 'sync_hash']);
            $table->index(['device_id', 'visited_at']);
        });

        // 17. Device Installed Applications
        Schema::create('device_installed_apps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->string('app_name');
            $table->string('package_name');
            $table->timestamp('installed_at')->nullable();
            $table->boolean('is_blocked')->default(false);
            $table->string('sync_hash');
            
            // SSoT Tracking fields
            $table->bigInteger('local_sqlite_id')->nullable();
            $table->enum('local_status', LocalStatus::values())->default(LocalStatus::PENDING->value);
            $table->boolean('deleted_at_source')->default(false);

            $table->timestamps();

            $table->unique(['device_id', 'sync_hash']);
        });

        // 18. Device Files (File Explorer Sync)
        Schema::create('device_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->text('path');
            $table->string('file_name');
            $table->bigInteger('file_size');
            $table->boolean('is_directory')->default(false);
            $table->timestamp('file_created_at')->nullable();
            $table->string('sync_hash');
            
            // SSoT Tracking fields
            $table->bigInteger('local_sqlite_id')->nullable();
            $table->enum('local_status', LocalStatus::values())->default(LocalStatus::PENDING->value);
            $table->boolean('deleted_at_source')->default(false);

            $table->timestamps();

            $table->unique(['device_id', 'sync_hash']);
        });

        // 19. Device Media Table (Photos & Videos selective sync)
        Schema::create('device_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->enum('media_type', MediaType::values());
            $table->string('origin_app')->comment('Source app: camera, whatsapp, facebook, etc.');
            $table->string('file_name');
            $table->bigInteger('file_size');
            $table->text('path');
            $table->string('sync_hash');

            // SSoT Tracking fields
            $table->bigInteger('local_sqlite_id')->nullable();
            $table->enum('local_status', LocalStatus::values())->default(LocalStatus::PENDING->value);
            $table->boolean('deleted_at_source')->default(false);

            $table->timestamps();

            $table->unique(['device_id', 'sync_hash']);
        });

        // 20. Remote Control Command Queue (Command & Control via Reverb)
        Schema::create('device_remote_commands', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->enum('command_type', CommandType::values());
            $table->enum('status', CommandStatus::values())->default(CommandStatus::PENDING->value);
            $table->json('parameters')->nullable(); // duration, interval, quality
            $table->text('result_url')->nullable(); // link to recorded file/media
            $table->timestamp('triggered_at');
            $table->timestamps();
        });

        // 21. App and Call Blocking Restriction Rules
        Schema::create('device_restriction_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->enum('rule_type', RestrictionRuleType::values());
            $table->boolean('is_enabled')->default(true);
            $table->json('parameters')->nullable(); // dynamic parameters e.g. list of blocked numbers
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::dropIfExists('device_restriction_rules');
        Schema::dropIfExists('device_remote_commands');
        Schema::dropIfExists('device_media');
        Schema::dropIfExists('device_files');
        Schema::dropIfExists('device_installed_apps');
        Schema::dropIfExists('device_browser_history');
        Schema::dropIfExists('device_social_messages');
        Schema::dropIfExists('device_geofence_alerts');
        Schema::dropIfExists('device_geofences');
        Schema::dropIfExists('device_gps_locations');
        Schema::dropIfExists('device_notifications');
        Schema::dropIfExists('device_sms');
        Schema::dropIfExists('device_contacts');
        Schema::dropIfExists('device_calls');
        Schema::dropIfExists('ingested_payloads');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('conversations');
        Schema::dropIfExists('devices');
        Schema::dropIfExists('titles');
        Schema::dropIfExists('admins');

        Schema::enableForeignKeyConstraints();

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['subscription_status', 'trial_ends_at']);
        });
    }
};
