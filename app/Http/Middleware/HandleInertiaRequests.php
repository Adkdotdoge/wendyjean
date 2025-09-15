<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;
use App\Models\Gallery;
use Illuminate\Support\Carbon;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $request->user(),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'galleries' => function () {
                try {
                    // Auto-bust cache when galleries change by including last updated timestamp in the key
                    $lastUpdated = Gallery::query()->max('updated_at');
                    $stamp = $lastUpdated ? Carbon::parse($lastUpdated)->timestamp : 0;
                    $cacheKey = 'nav:galleries:v4:' . $stamp;
                    return cache()->remember($cacheKey, now()->addMinutes(10), function () {
                        return Gallery::query()
                            ->where('is_active', true)
                            ->ordered() // order by order_column ASC, nulls last
                            ->get(['id', 'name', 'slug', 'order_column'])
                            ->map(fn ($g) => [
                                'id' => $g->id,
                                'name' => $g->name,
                                'slug' => $g->slug,
                                'order_column' => $g->order_column,
                                'primary_url' => $g->primary_url, // accessor on Gallery model
                                'primary' => $g->primaryResponsive(),
                                'images_urls' => $g->images_urls,
                                // Optional alt text; you can surface from media custom_properties if desired
                                'alt_text' => null,
                            ]);
                    });
                } catch (\Throwable $e) {
                    return [];
                }
            },
        ];
    }
}
