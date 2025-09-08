<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('galleries', function (Blueprint $table) {
            $table->unsignedInteger('order_column')->nullable()->after('is_active')->index();
        });

        // Backfill a sensible initial order (created_at then id)
        DB::statement('
            UPDATE galleries
            SET order_column = id
            WHERE order_column IS NULL
        ');
    }

    public function down(): void
    {
        Schema::table('galleries', function (Blueprint $table) {
            $table->dropColumn('order_column');
        });
    }
};
