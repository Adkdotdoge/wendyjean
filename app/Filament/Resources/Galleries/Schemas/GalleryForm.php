<?php

namespace App\Filament\Resources\Galleries\Schemas;

use Filament\Forms\Components\SpatieMediaLibraryFileUpload;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\KeyValue;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Form;
use Filament\Schemas\Schema as FilamentSchema;
use Illuminate\Support\Str;

class GalleryForm
{
    public static function schema(): array
    {
        return [
            TextInput::make('name')
                ->required()
                ->live(onBlur: true)
                ->afterStateUpdated(fn ($state, $set) => $set('slug', Str::slug($state))),

            TextInput::make('slug')
                ->required()
                ->unique(ignoreRecord: true),

            Textarea::make('description')
                ->rows(3)
                ->placeholder('Short description of this gallery…'),

            TextInput::make('medium')
                ->label('Medium')
                ->placeholder('e.g., Mixed media – cut paper and collage')
                ->maxLength(190),

            TextInput::make('style')
                ->label('Style')
                ->placeholder('e.g., Figurative')
                ->maxLength(190),

            KeyValue::make('attributes')
                ->label('Additional details')
                ->keyLabel('Label')
                ->valueLabel('Text')
                ->reorderable()
                ->addActionLabel('Add detail')
                ->helperText('Add any extra descriptors, like "Dedicated to" or materials.'),

            Toggle::make('is_active')
                ->default(true),

            SpatieMediaLibraryFileUpload::make('images')
                ->label('Gallery Images')
                ->collection('images')
                ->multiple()
                ->reorderable()               // drag to reorder; first image becomes cover
                ->appendFiles()               // ensure new uploads are appended (not prepended)
                ->panelLayout('grid')
                ->image()
                ->openable()
                ->downloadable()
                // ->disk('private')          // uncomment if you want to store on a private disk
                ->preserveFilenames()
                ->imageEditor()
                ->helperText('Drag to reorder. The first image becomes the gallery cover shown in the grid.')
                ->acceptedFileTypes(['image/jpeg','image/png','image/webp'])
                ->columnSpanFull(),
        ];
    }

    /**
     * Allow usage from either Filament v3 (Form) or v4 Schemas API (Schema).
     *
     * @param  \Filament\Forms\Form|\Filament\Schemas\Schema  $target
     * @return \Filament\Forms\Form|\Filament\Schemas\Schema
     */
    public static function configure($target)
    {
        if ($target instanceof Form) {
            return $target->schema(self::schema());
        }

        if ($target instanceof FilamentSchema) {
            // Filament Schemas: use components([...])
            return $target->components(self::schema());
        }

        return $target; // unknown type; noop
    }
}
