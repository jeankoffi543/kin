<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('device_calls', function (Blueprint $table) {
            $table->timestamp('recorded_at')->nullable()->after('duration');
        });

        // Backfill: copy created_at into recorded_at for existing rows
        DB::table('device_calls')->whereNull('recorded_at')->update(['recorded_at' => DB::raw('created_at')]);
    }

    public function down(): void
    {
        Schema::table('device_calls', function (Blueprint $table) {
            $table->dropColumn('recorded_at');
        });
    }
};
