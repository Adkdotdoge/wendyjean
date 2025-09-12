<?php

namespace App\Filament\Resources\Galleries\Tables;

use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\ImageColumn;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Schema;
use Filament\Tables\Table;
use Illuminate\Support\Carbon;

class GalleriesTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn ($query) => $query->with('media'))
            ->columns([
                ImageColumn::make('preview')
                    ->label('Preview')
                    ->size(64)
                    ->square()
                    ->getStateUsing(function ($record) {
                        // Prefer lightweight conversion for admin tables
                        try {
                            if (method_exists($record, 'getFirstMedia')) {
                                $media = $record->getFirstMedia('images');
                                if ($media) {
                                    // Try temporary URL for the conversion if disk supports it
                                    try {
                                        return $media->getTemporaryUrl(\Illuminate\Support\Carbon::now()->addMinutes(10), 'admin_thumb');
                                    } catch (\Throwable $e) {
                                        // Fallback to regular conversion URL
                                        return $media->getUrl('admin_thumb');
                                    }
                                }
                            }
                        } catch (\Throwable $e) {
                            // fall through to existing heuristics
                        }
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
                                ->orderBy('order_column')
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
                    ->searchable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('current_offer')
                    ->label('Offer')
                    ->numeric(2)
                    ->prefix('$')
                    ->placeholder('—')
                    ->toggleable(isToggledHiddenByDefault: true),
                IconColumn::make('is_sold')
                    ->label('Sold')
                    ->boolean(),
                TextColumn::make('medium')
                    ->toggleable(isToggledHiddenByDefault: true)
                    ->wrap(),
                TextColumn::make('style')
                    ->toggleable(isToggledHiddenByDefault: true)
                    ->wrap(),
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
