<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media as SpatieMedia;
use Spatie\Image\Enums\Fit;

class Gallery extends Model implements HasMedia
{
    use InteractsWithMedia;

    /** @var array<int, string> */
    protected $fillable = [
        'name',
        'slug',
        'description',
        'is_active',
        'order_column',
    ];

    /** @var array<int, string> */
    protected $appends = [
        'primary_url',
        'images_urls',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'is_active' => 'boolean',
        'order_column' => 'integer',
    ];

    public function registerMediaCollections(): void
    {
        $this
            ->addMediaCollection('images')
            ->acceptsMimeTypes([
                'image/jpeg',
                'image/png',
                'image/webp',
                'image/avif',
            ]);
    }

    public function registerMediaConversions(?SpatieMedia $media = null): void
    {
        // Grid conversions (used in cards/lists)
        $this
            ->addMediaConversion('grid_webp')
            ->format('webp')
            ->fit(Fit::Contain, 1024, 1024)
            ->withResponsiveImages()
            ->queued();

        $this
            ->addMediaConversion('grid_jpg')
            ->format('jpg')
            ->fit(Fit::Contain, 1024, 1024)
            ->withResponsiveImages()
            ->queued();

        // Hero/detail conversions (wider)
        $this
            ->addMediaConversion('hero_webp')
            ->format('webp')
            ->fit(Fit::Cover, 2048, 1152)
            ->withResponsiveImages()
            ->queued();

        $this
            ->addMediaConversion('hero_jpg')
            ->format('jpg')
            ->fit(Fit::Cover, 2048, 1152)
            ->withResponsiveImages()
            ->queued();
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

    /**
     * Build a responsive payload for the primary image.
     * Returns src (original/best), srcset strings for webp/jpg, sizes, and optional width/height hint.
     */
    public function primaryResponsive(): ?array
    {
        $media = $this->media()
            ->where('collection_name', 'images')
            ->orderBy('order_column')
            ->orderBy('id')
            ->first();

        if (! $media) {
            return null;
        }

        $gridWebp = $media->responsiveImages('grid_webp')->getSrcset();
        $gridJpg  = $media->responsiveImages('grid_jpg')->getSrcset();
        $placeholder = $media->responsiveImages('grid_webp')->getPlaceholderSvg()
            ?? $media->responsiveImages('grid_jpg')->getPlaceholderSvg();

        $firstFile = $media->responsiveImages('grid_webp')->files->first();
        $width  = $firstFile?->width();
        $height = $firstFile?->height();

        return [
            'src'    => $this->makeUrlForMedia($media) ?? $media->getUrl(),
            'srcset' => [
                'webp' => $gridWebp ?: null,
                'jpg'  => $gridJpg ?: null,
            ],
            'placeholder' => $placeholder ?: null,
            'sizes'  => '(min-width: 768px) 50vw, 100vw',
            'width'  => $width,
            'height' => $height,
        ];
    }
    /**
     * Scope: order galleries with nulls last, then by order_column, then id.
     */
    public function scopeOrdered($query)
    {
        return $query
            ->orderByRaw('CASE WHEN order_column IS NULL THEN 1 ELSE 0 END')
            ->orderBy('order_column')
            ->orderBy('id');
    }
}
