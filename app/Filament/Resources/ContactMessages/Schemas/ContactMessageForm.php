<?php

namespace App\Filament\Resources\ContactMessages\Schemas;

use Filament\Schemas\Schema;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Placeholder;

class ContactMessageForm
{
    public static function configure(Schema $schema): Schema
    {
        // Read-only view schema to keep things simple.
        return $schema->components([
            TextInput::make('name')
                ->label('Name')
                ->maxLength(120)
                ->disabled()
                ->dehydrated(false),

            TextInput::make('email')
                ->label('Email')
                ->email()
                ->maxLength(190)
                ->disabled()
                ->dehydrated(false),

            TextInput::make('phone')
                ->label('Phone')
                ->maxLength(50)
                ->disabled()
                ->dehydrated(false),

            TextInput::make('subject')
                ->label('Subject')
                ->maxLength(190)
                ->disabled()
                ->dehydrated(false),

            Textarea::make('message')
                ->label('Message')
                ->rows(8)
                ->columnSpanFull()
                ->disabled()
                ->dehydrated(false),

            TextInput::make('status')
                ->label('Status')
                ->disabled()
                ->dehydrated(false),

            Placeholder::make('meta_heading')
                ->label('—')
                ->content('Meta')
                ->columnSpanFull(),

            TextInput::make('ip')
                ->label('IP Address')
                ->disabled()
                ->dehydrated(false),

            TextInput::make('page_url')
                ->label('Page URL')
                ->disabled()
                ->dehydrated(false),

            TextInput::make('referrer')
                ->label('Referrer')
                ->disabled()
                ->dehydrated(false),

            TextInput::make('created_at')
                ->label('Received')
                ->disabled()
                ->dehydrated(false),
        ]);
    }
}
