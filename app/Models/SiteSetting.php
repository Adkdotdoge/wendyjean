<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class SiteSetting extends Model implements HasMedia
{
    use InteractsWithMedia;

    protected $fillable = [
        'app_name',
        'about',
        'options',
    ];

    protected $casts = [
        'options' => 'array',
    ];

    /**
     * Register a single-file media collection for the hero image.
     * You can point this to your private disk if you're serving
     * temp URLs (S3, etc.), or 'public' if you want a public URL.
     */
    public function registerMediaCollections(): void
    {
        $this
            ->addMediaCollection('hero')
            ->singleFile()
            ->acceptsMimeTypes([
                'image/jpeg',
                'image/png',
                'image/webp',
                'image/avif',
            ]);
            // ->useDisk('private'); // uncomment if you’re using a private disk
    }

    /**
     * Convenience accessor to get a usable URL for the hero image.
     * Attempts a temporary URL first (S3/private), falls back to a normal URL.
     */
    public function getHeroUrlAttribute(): ?string
    {
        $media = $this->getFirstMedia('hero');
        if (! $media) {
            return null;
        }

        try {
            // Temporary URL for private disks that support it (e.g., S3)
            return $media->getTemporaryUrl(now()->addMinutes(15));
        } catch (\Throwable $e) {
            // Public or local fallback
            return $media->getUrl();
        }
    }
}