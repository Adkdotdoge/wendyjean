<?php

namespace App\Http\Controllers\Frontend;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use Inertia\Inertia;

class SiteSettingsController extends Controller
{
    public function index()
    {
        $settings = SiteSetting::first();

        return response()->json([
            'appName' => $settings->app_name,
            'about'   => $settings->about,
            'heroUrl' => $settings->hero_url,
        ]);
    }
}
