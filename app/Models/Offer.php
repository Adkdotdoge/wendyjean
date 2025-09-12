<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Offer extends Model
{
    protected $fillable = [
        'gallery_id', 'name', 'email', 'amount', 'message', 'status', 'ip', 'user_agent',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function gallery(): BelongsTo
    {
        return $this->belongsTo(Gallery::class);
    }
}

