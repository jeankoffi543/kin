<?php

use App\Enums\SmsStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('device_sms', function (Blueprint $table) {
            $table->string('sms_status', 20)->default(SmsStatus::RECEIVED->value)->after('type');
            $table->index('sms_status');
            $table->index('deleted_at_source');
        });
    }

    public function down(): void
    {
        Schema::table('device_sms', function (Blueprint $table) {
            $table->dropIndex(['sms_status']);
            $table->dropIndex(['deleted_at_source']);
            $table->dropColumn('sms_status');
        });
    }
};
