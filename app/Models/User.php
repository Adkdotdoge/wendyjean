<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;

class User extends Authenticatable implements FilamentUser
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Restrict who can access Filament panels (production-safe).
     * Set FILAMENT_ADMIN_EMAILS in your .env (comma-separated) to allow access.
     */
    public function canAccessPanel(Panel $panel): bool
    {
        // Always allow in local/dev
        if (app()->environment('local')) {
            return true;
        }

        // Allow only listed emails in production/staging
        $allowed = array_filter(array_map('trim', explode(',', (string) env('FILAMENT_ADMIN_EMAILS', ''))));

        return in_array($this->email, $allowed, true);
    }
}
