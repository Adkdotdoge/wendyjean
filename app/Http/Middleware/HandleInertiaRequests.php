<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;
use App\Models\Gallery;

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
                    return cache()->remember('nav:galleries:v2', now()->addMinutes(10), function () {
                        return Gallery::query()
                            ->where('is_active', true)
                            ->orderBy('name')
                            ->with('primaryMedia:id,gallery_id,alt_text')
                            ->get(['id', 'name', 'slug'])
                            ->map(fn ($g) => [
                                'id' => $g->id,
                                'name' => $g->name,
                                'slug' => $g->slug,
                                'primary_url' => $g->primary_url, // accessor on Gallery model
                                'images_urls' => $g->images_urls,
                                'alt_text' => optional($g->primaryMedia)->alt_text,
                            ]);
                    });
                } catch (\Throwable $e) {
                    return [];
                }
            },
        ];
    }
}