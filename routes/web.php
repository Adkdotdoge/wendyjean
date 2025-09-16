<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Models\Gallery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Spatie\MediaLibrary\MediaCollections\Models\Media as SpatieMedia;
use App\Http\Controllers\Public\ContactMessageController;
use App\Http\Controllers\Public\OfferController;
use App\Models\Gallery as GalleryModel;

Route::get('/', function () {
    // Return a richer shape including order_column and key details for captions
    $galleries = Gallery::query()
        ->ordered() // order by order_column ASC, nulls last
        ->get(['id','name','slug','order_column'])
        ->map(fn (Gallery $g) => [
            'id' => $g->id,
            'name' => $g->name,
            'slug' => $g->slug,
            'order_column' => $g->order_column,
            'primary_url' => $g->primary_url,
            'primary' => $g->primaryResponsive(),
            'is_sold' => $g->is_sold,
            'medium' => $g->medium,
            'style' => $g->style,
            'attributes' => $g->attributes,
            'starting_offer' => $g->starting_offer,
            'current_offer' => $g->current_offer,
            // Keep href for any consumers that rely on it
            'href' => url("/galleries/{$g->slug}"),
        ])->values();

    return Inertia::render('welcome', [
        'galleries' => $galleries,
    ]);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';

// --- Lightweight JSON API for galleries ---
Route::get('/api/galleries', function () {
    $rows = Gallery::query()
        ->where('is_active', true)
        ->ordered() // order by order_column ASC, nulls last
        ->get(['id','name','slug','order_column']);

    return response()->json(
        $rows->map(fn (Gallery $g) => [
            'name'         => $g->name,
            'slug'         => $g->slug,
            'order_column' => $g->order_column,
            'primary_url'  => $g->primary_url,
            'primary'      => $g->primaryResponsive(),
            'images_urls'  => $g->images_urls,
            'medium'       => $g->medium,
            'style'        => $g->style,
            'attributes'   => $g->attributes ?? [],
            'starting_offer' => $g->starting_offer,
            'current_offer'  => $g->current_offer,
            'is_sold'        => $g->is_sold,
        ])->values()
    );
});

Route::get('/api/galleries/{slug}', function (string $slug) {
    /** @var App\Models\Gallery $gallery */
    $gallery = Gallery::query()->where('slug', $slug)->firstOrFail();

    // The Gallery accessor already returns ALL images in order, including the primary as index 0
    $imagesUrls = $gallery->images_urls;

    return response()->json([
        'id' => $gallery->id,
        'name' => $gallery->name,
        'slug' => $gallery->slug,
        'primary' => $gallery->primaryResponsive(),
        'description' => $gallery->description,
        'primary_url' => $gallery->primary_url,
        'images_urls' => $imagesUrls,
        'medium' => $gallery->medium,
        'style' => $gallery->style,
        'attributes' => $gallery->attributes ?? [],
        'starting_offer' => $gallery->starting_offer,
        'current_offer'  => $gallery->current_offer,
        'is_sold'        => $gallery->is_sold,
        // optional compatibility alias
        'images' => $imagesUrls,
    ]);
});

// --- Signed media proxy for private/local disks ---
Route::get('/media/{media}', function (Request $request, SpatieMedia $media) {
    abort_unless($request->hasValidSignature(), 401);
    return Storage::disk($media->disk)->response($media->getPath(), $media->file_name);
})->name('media.proxy');

Route::post('/contact', [ContactMessageController::class, 'store'])
    ->name('contact.store')
    ->middleware('throttle:10,1'); // optional: rate-limit bots

// Offers
Route::post('/api/galleries/{slug}/offer', [OfferController::class, 'store'])
    ->middleware('throttle:8,1');
// --- Gallery pages (Inertia) ---
Route::get('/galleries', function () {
    $galleries = GalleryModel::query()
        ->where('is_active', true)
        ->ordered()
        ->get(['id','name','slug','order_column'])
        ->map(fn (GalleryModel $g) => [
            'id' => $g->id,
            'name' => $g->name,
            'slug' => $g->slug,
            'order_column' => $g->order_column,
            'primary_url' => $g->primary_url,
            'images_urls' => $g->images_urls,
            'primary' => $g->primaryResponsive(),
            'is_sold' => $g->is_sold,
            'medium' => $g->medium,
            'style' => $g->style,
            'attributes' => $g->attributes,
            'starting_offer' => $g->starting_offer,
            'current_offer' => $g->current_offer,
        ])->values();

    return Inertia::render('galleries/index', [
        'galleries' => $galleries,
    ]);
})->name('galleries.index');

Route::get('/galleries/{slug}', function (string $slug) {
    /** @var GalleryModel $gallery */
    $gallery = GalleryModel::query()->where('slug', $slug)->firstOrFail();

    $page = Inertia::render('galleries/show', [
        'gallery' => [
            'id' => $gallery->id,
            'name' => $gallery->name,
            'slug' => $gallery->slug,
            'description' => $gallery->description,
            'primary_url' => $gallery->primary_url,
            'images_urls' => $gallery->images_urls,
            'primary' => $gallery->primaryResponsive(),
            'is_sold' => $gallery->is_sold,
            'medium' => $gallery->medium,
            'style' => $gallery->style,
            'attributes' => $gallery->attributes,
            'starting_offer' => $gallery->starting_offer,
            'current_offer' => $gallery->current_offer,
        ],
    ]);

    // Provide server-side OG data so crawlers (FB) see it without JS
    $ogImage = $gallery->primary_url;
    if ($ogImage && ! str_starts_with($ogImage, 'http')) {
        $ogImage = url($ogImage);
    }
    $primary = $gallery->primaryResponsive();

    return $page->withViewData([
        'og_image' => $ogImage,
        'og_image_alt' => $gallery->name,
        'og_image_width' => $primary['width'] ?? null,
        'og_image_height' => $primary['height'] ?? null,
        'og_title' => $gallery->name,
        'og_description' => $gallery->description ?: $gallery->name,
    ]);
})->name('galleries.show');

// --- ThreeD standalone page ---
Route::get('/3d', function () {
    return Inertia::render('three-d');
})->name('threeD');
