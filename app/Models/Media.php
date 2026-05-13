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
        // Any disk with a configured public URL (e.g. the Spaces CDN) gets the
        // stable URL so the CDN can cache across visitors. Fall back to a signed
        // temporary URL only for private/local disks.
        if (config("filesystems.disks.{$this->disk}.url")) {
            try {
                return $this->getUrl();
            } catch (\Throwable $e) {
                // fall through
            }
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
