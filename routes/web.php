<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Models\Gallery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Spatie\MediaLibrary\MediaCollections\Models\Media as SpatieMedia;
use App\Http\Controllers\Public\ContactMessageController;
use App\Models\Gallery as GalleryModel;

Route::get('/', function () {
    $galleries = Gallery::query()
        ->ordered() // order by order_column ASC, nulls last
        ->get(['id','name','slug','order_column'])
        ->map(fn (Gallery $g) => [
            'src' => $g->primary_url,
            'alt' => $g->name,
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
        ])->values();

    return Inertia::render('galleries/index', [
        'galleries' => $galleries,
    ]);
})->name('galleries.index');

Route::get('/galleries/{slug}', function (string $slug) {
    /** @var GalleryModel $gallery */
    $gallery = GalleryModel::query()->where('slug', $slug)->firstOrFail();

    return Inertia::render('galleries/show', [
        'gallery' => [
            'id' => $gallery->id,
            'name' => $gallery->name,
            'slug' => $gallery->slug,
            'description' => $gallery->description,
            'primary_url' => $gallery->primary_url,
            'images_urls' => $gallery->images_urls,
        ],
    ]);
})->name('galleries.show');
