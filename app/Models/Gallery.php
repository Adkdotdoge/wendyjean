<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Image\Enums\Fit;
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
        'medium',
        'style',
        'attributes',
        'starting_offer',
        'current_offer',
        'is_sold',
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
        'attributes' => 'array',
        'starting_offer' => 'decimal:2',
        'current_offer' => 'decimal:2',
        'is_sold' => 'boolean',
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
        // Tiny admin preview (sync) for fast Filament tables/forms
        $this
            ->addMediaConversion('admin_thumb')
            ->format('webp')
            ->fit(Fit::Contain, 256, 256)
            ->performOnCollections('images');

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
            // Some Spatie\Image versions do not provide Fit::Cover; use Contain for compatibility
            ->fit(Fit::Contain, 2048, 1152)
            ->withResponsiveImages()
            ->queued();

        $this
            ->addMediaConversion('hero_jpg')
            ->format('jpg')
            ->fit(Fit::Contain, 2048, 1152)
            ->withResponsiveImages()
            ->queued();
    }

    private function makeUrlForMedia(SpatieMedia $m): ?string
    {
        // Disks with a configured public URL (e.g. the Spaces CDN) return that
        // stable URL so the CDN can serve a cache hit across visitors. Fall back
        // to signed temporary URLs only for private buckets / raw local.
        if (config("filesystems.disks.{$m->disk}.url")) {
            try {
                return $m->getUrl();
            } catch (\Throwable $e) {
                // fall through
            }
        }

        try {
            return $m->getTemporaryUrl(now()->addMinutes(30));
        } catch (\Throwable $e) {
            // fall through
        }

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
        // getMedia() uses the eager-loaded `media` relation when present,
        // avoiding a per-row query during list rendering.
        return $this->getMedia('images')
            ->sortBy(fn (SpatieMedia $m) => [$m->order_column ?? PHP_INT_MAX, $m->id])
            ->values()
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
        $media = $this->getMedia('images')
            ->sortBy(fn (SpatieMedia $m) => [$m->order_column ?? PHP_INT_MAX, $m->id])
            ->first();

        if (! $media) {
            return null;
        }

        $gridWebp = $media->responsiveImages('grid_webp')->getSrcset();
        $gridJpg = $media->responsiveImages('grid_jpg')->getSrcset();
        $placeholder = $media->responsiveImages('grid_webp')->getPlaceholderSvg()
            ?? $media->responsiveImages('grid_jpg')->getPlaceholderSvg();

        $firstFile = $media->responsiveImages('grid_webp')->files->first();
        $width = $firstFile?->width();
        $height = $firstFile?->height();

        return [
            'src' => $this->makeUrlForMedia($media) ?? $media->getUrl(),
            'srcset' => [
                'webp' => $gridWebp ?: null,
                'jpg' => $gridJpg ?: null,
            ],
            'placeholder' => $placeholder ?: null,
            'sizes' => '(min-width: 768px) 50vw, 100vw',
            'width' => $width,
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
