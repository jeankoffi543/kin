<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('devices', function (Blueprint $table) {
            $table->string('sync_status', 20)->default('idle')->after('ip_address');
            $table->timestamp('sync_started_at')->nullable()->after('sync_status');
        });
    }

    public function down(): void
    {
        Schema::table('devices', function (Blueprint $table) {
            $table->dropColumn(['sync_status', 'sync_started_at']);
        });
    }
};
