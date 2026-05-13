<?php

return [

    /*
     * Headers applied when uploading media to a remote disk (e.g. DO Spaces).
     * Spatie media URLs are immutable per upload (the path is keyed by media id
     * and filename, which never change), so a long max-age is safe.
     */
    'remote' => [
        'extra_headers' => [
            'CacheControl' => 'public, max-age=31536000, immutable',
        ],
    ],

];
