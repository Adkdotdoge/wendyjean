<?php

namespace App\Filament\Resources\Galleries\Tables;

use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\ImageColumn;
use Illuminate\Support\Facades\Storage;
use Filament\Tables\Table;
use Illuminate\Support\Carbon;

class GalleriesTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                ImageColumn::make('preview')
                    ->label('Preview')
                    ->size(64)
                    ->square()
                    ->getStateUsing(function ($record) {
                        // 1) Spatie Media Library — prefer temporary (signed) URLs
                        try {
                            if (method_exists($record, 'getFirstTemporaryUrl')) {
                                $tmp = $record->getFirstTemporaryUrl('default', Carbon::now()->addMinutes(10));
                                if (! empty($tmp)) {
                                    return $tmp;
                                }
                            }
                        } catch (\Throwable $e) {
                            // fall through
                        }

                        try {
                            if (method_exists($record, 'getFirstMedia')) {
                                $media = $record->getFirstMedia(); // default collection
                                if ($media) {
                                    // If the media object can create a temporary URL (e.g., S3)
                                    if (method_exists($media, 'getTemporaryUrl')) {
                                        $tmp = $media->getTemporaryUrl(Carbon::now()->addMinutes(10));
                                        if (! empty($tmp)) {
                                            return $tmp;
                                        }
                                    }
                                    // As a last Spatie fallback (may be public-only)
                                    if (method_exists($media, 'getUrl')) {
                                        $url = $media->getUrl();
                                        if (! empty($url)) {
                                            return $url;
                                        }
                                    }
                                }
                            }
                        } catch (\Throwable $e) {
                            // fall through
                        }

                        // 2) Custom media() relation — try to build a temporary URL from disk/path
                        if (method_exists($record, 'media')) {
                            $first = $record->media()
                                ->orderByDesc('is_primary')
                                ->orderBy('sort_order')
                                ->orderBy('id')
                                ->first();

                            if ($first) {
                                // a) If the media model exposes a Spatie-like temporary URL
                                if (method_exists($first, 'getTemporaryUrl')) {
                                    try {
                                        $tmp = $first->getTemporaryUrl(Carbon::now()->addMinutes(10));
                                        if (! empty($tmp)) {
                                            return $tmp;
                                        }
                                    } catch (\Throwable $e) {
                                        // ignore
                                    }
                                }

                                // b) Disk-based temporary URL (e.g., S3/MinIO)
                                if (isset($first->disk, $first->path)) {
                                    try {
                                        if (method_exists(Storage::disk($first->disk), 'temporaryUrl')) {
                                            return Storage::disk($first->disk)->temporaryUrl(
                                                $first->path,
                                                Carbon::now()->addMinutes(10)
                                            );
                                        }
                                    } catch (\Throwable $e) {
                                        // ignore and fall through
                                    }

                                    // c) Non-temporary disk URL as a last resort (may 403 for private)
                                    try {
                                        return Storage::disk($first->disk)->url($first->path);
                                    } catch (\Throwable $e) {
                                        // ignore
                                    }
                                }

                                // d) Common direct fields
                                if (isset($first->url) && ! empty($first->url)) {
                                    return $first->url;
                                }
                                if (isset($first->file_name) && ! empty($first->file_name)) {
                                    try {
                                        // Attempts default disk
                                        return Storage::url($first->file_name);
                                    } catch (\Throwable $e) {
                                        // ignore
                                    }
                                }
                            }
                        }

                        // 3) Fallback to hero_image_path on the gallery itself
                        if (isset($record->hero_image_path) && $record->hero_image_path) {
                            try {
                                // Try temporary if disk() is known via model attributes (optional hook)
                                if (isset($record->hero_image_disk) && method_exists(Storage::disk($record->hero_image_disk), 'temporaryUrl')) {
                                    return Storage::disk($record->hero_image_disk)->temporaryUrl(
                                        $record->hero_image_path,
                                        Carbon::now()->addMinutes(10)
                                    );
                                }
                            } catch (\Throwable $e) {
                                // ignore
                            }

                            try {
                                return Storage::url($record->hero_image_path);
                            } catch (\Throwable $e) {
                                return $record->hero_image_path;
                            }
                        }

                        return null;
                    }),
                TextColumn::make('order_column')
                    ->label('#')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('name')
                    ->searchable(),
                TextColumn::make('slug')
                    ->searchable(),
                IconColumn::make('is_active')
                    ->boolean(),
                TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->reorderable('order_column')
            ->defaultSort('order_column')
            ->paginated(false)
            ->filters([
                //
            ])
            ->recordActions([
                EditAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }
}
