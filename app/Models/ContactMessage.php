<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ContactMessage extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * Mass assignable attributes.
     */
    protected $fillable = [
        'name',
        'email',
        'phone',
        'subject',
        'message',
        'status',
        'ip',
        'user_agent',
        'page_url',
        'referrer',
    ];

    /**
     * Attribute casting.
     */
    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Scope: only unread/new messages.
     */
    public function scopeUnread($query)
    {
        return $query->where('status', 'new');
    }

    /**
     * Helper: mark as read.
     */
    public function markAsRead(): void
    {
        if ($this->status !== 'read') {
            $this->status = 'read';
            $this->save();
        }
    }

    /**
     * Helper: archive the message.
     */
    public function archive(): void
    {
        $this->status = 'archived';
        $this->save();
    }
}
