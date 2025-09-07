<?php

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
        Schema::create('contact_messages', function (Blueprint $table) {
            $table->id();

            // Core fields
            $table->string('name', 120);
            $table->string('email', 190);
            $table->string('phone', 50)->nullable();
            $table->string('subject', 190)->nullable();
            $table->text('message');

            // Lightweight workflow
            $table->enum('status', ['new', 'read', 'archived'])->default('new')->index();

            // Useful metadata
            $table->ipAddress('ip')->nullable();
            $table->text('user_agent')->nullable();
            $table->text('page_url')->nullable();
            $table->text('referrer')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['email', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contact_messages');
    }
};
