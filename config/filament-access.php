<?php

return [

    /*
     * Emails allowed to access the Filament admin panel in non-local
     * environments. Comma-separated in .env; parsed here so the value
     * survives `php artisan config:cache` (env() returns null at runtime
     * when config is cached).
     */
    'admin_emails' => array_values(array_unique(array_filter(array_map(
        fn ($e) => strtolower(trim($e)),
        explode(',', (string) env('FILAMENT_ADMIN_EMAILS', ''))
    )))),

];
