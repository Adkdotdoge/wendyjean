<?php

namespace App\Filament\Resources\Offers\Schemas;

use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Schemas\Schema;

class OfferForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema->components([
            Select::make('gallery_id')
                ->relationship('gallery', 'name')
                ->label('Gallery')
                ->searchable()
                ->preload()
                ->required(),

            TextInput::make('name')
                ->required()
                ->maxLength(120),

            TextInput::make('email')
                ->label('Email address')
                ->email()
                ->required()
                ->maxLength(190),

            TextInput::make('amount')
                ->label('Amount (USD)')
                ->numeric()
                ->inputMode('decimal')
                ->step('0.01')
                ->minValue(0)
                ->prefix('$')
                ->required(),

            Textarea::make('message')
                ->rows(3)
                ->columnSpanFull(),

            Select::make('status')
                ->label('Review status')
                ->options([
                    'new' => 'New',
                    'accepted' => 'Accepted',
                    'rejected' => 'Rejected',
                ])
                ->native(false)
                ->required()
                ->default('new'),

            TextInput::make('ip')
                ->label('IP')
                ->disabled()
                ->dehydrated(false),

            Textarea::make('user_agent')
                ->label('User agent')
                ->rows(2)
                ->disabled()
                ->dehydrated(false)
                ->columnSpanFull(),
        ]);
    }
}
