<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;
use App\Models\SiteSetting;
use Spatie\MediaLibrary\MediaCollections\Models\Media as SpatieMedia;


class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Inertia::share('settings', function () {
            $settings = SiteSetting::first();
            
            $heroUrl = null;

            if ($settings) {
                $media = SpatieMedia::query()
                    ->where('model_type', SiteSetting::class)
                    ->where('model_id', $settings->getKey())
                    ->where('collection_name', 'hero')
                    ->orderBy('order_column')
                    ->first();

                if ($media) {
                    try {
                        $heroUrl = $media->getTemporaryUrl(now()->addMinutes(15));
                    } catch (\Throwable $e) {
                        $heroUrl = $media->getUrl();
                    }
                }
            }

            return [
                'appName' => $settings->app_name ?? null,
                'heroUrl' => $heroUrl,
                'about'   => $settings->about ?? null,
            ];
        });
    }
}
