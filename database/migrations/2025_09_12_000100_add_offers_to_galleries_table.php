<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('galleries', function (Blueprint $table) {
            $table->decimal('starting_offer', 12, 2)->nullable()->after('style');
            $table->decimal('current_offer', 12, 2)->nullable()->after('starting_offer');
            $table->boolean('is_sold')->default(false)->after('current_offer');
        });
    }

    public function down(): void
    {
        Schema::table('galleries', function (Blueprint $table) {
            $table->dropColumn(['starting_offer', 'current_offer', 'is_sold']);
        });
    }
};

