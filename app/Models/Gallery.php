<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media as SpatieMedia;

class Gallery extends Model implements HasMedia
{
    use InteractsWithMedia;

    /** @var array<int, string> */
    protected $fillable = [
        'name',
        'slug',
        'description',
        'is_active',
    ];

    /** @var array<int, string> */
    protected $appends = [
        'primary_url',
        'images_urls',
    ];

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('images');
    }

    private function makeUrlForMedia(SpatieMedia $m): ?string
    {
        // Try a temporary URL when the disk supports it (e.g., S3)
        try {
            return $m->getTemporaryUrl(now()->addMinutes(30));
        } catch (\Throwable $e) {
            // fall through
        }

        // Fallback to a direct URL (public/local)
        try {
            return $m->getUrl();
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * @return array<int, string>
     */
    public function getImagesUrlsAttribute(): array
    {
        $items = $this->media()
            ->where('collection_name', 'images')
            ->orderByRaw('CASE WHEN order_column IS NULL THEN 1 ELSE 0 END')
            ->orderBy('order_column')
            ->get();

        return $items
            ->map(fn (SpatieMedia $m) => $this->makeUrlForMedia($m))
            ->filter()
            ->values()
            ->all();
    }

    public function getPrimaryUrlAttribute(): ?string
    {
        $urls = $this->images_urls;
        return $urls[0] ?? null;
    }
}