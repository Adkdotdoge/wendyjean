<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media', function (Blueprint $table) {
            $table->id();

            // Owner (polymorphic)
            $table->string('model_type');
            $table->unsignedBigInteger('model_id');

            // Optional UUID for external references
            $table->uuid('uuid')->nullable()->unique();

            // Collections & core file info
            $table->string('collection_name');
            $table->string('name');           // human-friendly title
            $table->string('file_name');      // stored filename
            $table->string('mime_type')->nullable();
            $table->string('disk');
            $table->string('conversions_disk')->nullable();
            $table->unsignedBigInteger('size'); // in bytes

            // Spatie ML v11 JSON columns
            $table->json('manipulations');
            $table->json('custom_properties');
            $table->json('generated_conversions');
            $table->json('responsive_images');

            // Ordering within a collection
            $table->unsignedInteger('order_column')->nullable();

            $table->timestamps();

            // Helpful index for owner lookups
            $table->index(['model_type', 'model_id']);
        });
    }
};
