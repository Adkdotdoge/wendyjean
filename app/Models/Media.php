<?php

namespace App\Models;

use Spatie\MediaLibrary\MediaCollections\Models\Media as SpatieMedia;

/**
 * Your app-level Media model now extends Spatie's Media model and matches
 * the polymorphic schema from the new migration (model_type/model_id,
 * collection_name, custom_properties, order_column, etc.).
 */
class Media extends SpatieMedia
{
    /**
     * Expose convenient attributes `$media->url` and `$media->temporary_url`.
     */
    protected $appends = ['url', 'temporary_url'];


    /*
    |--------------------------------------------------------------------------
    | Accessors
    |--------------------------------------------------------------------------
    */
    public function getUrlAttribute(): ?string
    {
        // Prefer a stable URL for public disks, otherwise try a temporary URL
        try {
            if (in_array($this->disk, ['public', 'spaces'], true)) {
                return $this->getUrl();
            }
        } catch (\Throwable $e) {
            // ignore and try temp URL next
        }

        try {
            return $this->getTemporaryUrl(now()->addMinutes(30));
        } catch (\Throwable $e) {
            try {
                return $this->getUrl();
            } catch (\Throwable $e2) {
                return null;
            }
        }
    }

    public function getTemporaryUrlAttribute(): ?string
    {
        try {
            return $this->getTemporaryUrl(now()->addMinutes(30));
        } catch (\Throwable $e) {
            try {
                return $this->getUrl();
            } catch (\Throwable $e2) {
                return null;
            }
        }
    }
}