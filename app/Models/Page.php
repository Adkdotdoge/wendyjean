<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Page extends Model
{
    use HasFactory;

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'title',
        'slug',
        'nav_label',
        'nav_order',
        'show_in_nav',
        'is_published',
        'content',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'show_in_nav' => 'boolean',
        'is_published' => 'boolean',
        'nav_order' => 'integer',
    ];

    protected static function booted(): void
    {
        static::saving(function (Page $page) {
            $base = $page->slug ?: $page->title;
            $slugBase = Str::slug($base ?? 'page');
            if ($slugBase === '') {
                $slugBase = 'page';
            }

            $slug = $slugBase;
            $counter = 2;

            $query = static::query()->where('slug', $slug);
            if ($page->exists) {
                $query->where('id', '!=', $page->id);
            }

            while ($query->exists()) {
                $slug = $slugBase.'-'.$counter;
                $counter++;
                $query = static::query()->where('slug', $slug);
                if ($page->exists) {
                    $query->where('id', '!=', $page->id);
                }
            }

            $page->slug = $slug;

            if (! $page->nav_label) {
                $page->nav_label = $page->title;
            }
        });
    }

    public function getNavTitleAttribute(): string
    {
        return $this->nav_label ?: $this->title;
    }
}
