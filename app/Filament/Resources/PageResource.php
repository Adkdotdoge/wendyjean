<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PageResource\Pages;
use App\Models\Page;
use Filament\Forms\Components\RichEditor;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Table;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use UnitEnum;
use BackedEnum;

class PageResource extends Resource
{
    protected static ?string $model = Page::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedDocumentText;

    protected static string|UnitEnum|null $navigationGroup = 'Content';

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Section::make('Page details')
                ->schema([
                    Grid::make(2)->schema([
                        TextInput::make('title')
                            ->required(),
                        TextInput::make('slug')
                            ->required()
                            ->unique(table: 'pages', column: 'slug', ignoreRecord: true)
                            ->helperText('Slug used in the page URL.'),
                        TextInput::make('nav_label')
                            ->label('Navigation label')
                            ->helperText('Defaults to the page title when left blank.')
                            ->maxLength(120),
                        TextInput::make('nav_order')
                            ->numeric()
                            ->label('Navigation order')
                            ->helperText('Lower numbers appear first.')
                            ->default(0),
                    ]),
                    Grid::make(2)->schema([
                        Toggle::make('is_published')
                            ->label('Published')
                            ->default(true),
                        Toggle::make('show_in_nav')
                            ->label('Show in navigation')
                            ->helperText('Toggle off to hide this page from the public navigation.')
                            ->default(true),
                    ]),
                ]),
            Section::make('Content')
                ->schema([
                    RichEditor::make('content')
                        ->columnSpanFull()
                        ->fileAttachmentsDisk('public')
                        ->fileAttachmentsDirectory('pages/attachments')
                        ->fileAttachmentsVisibility('public')
                        ->toolbarButtons([
                            'bold',
                            'italic',
                            'underline',
                            'strike',
                            'bulletList',
                            'orderedList',
                            'blockquote',
                            'codeBlock',
                            'link',
                            'attachFiles',
                            'undo',
                            'redo',
                        ])
                        ->required(),
                ])
                ->collapsible(false)
                ->columns(1),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('title')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('slug')
                    ->label('URL')
                    ->toggleable()
                    ->copyable()
                    ->copyMessage('Slug copied to clipboard')
                    ->copyMessageDuration(1500)
                    ->sortable(),
                IconColumn::make('is_published')
                    ->boolean()
                    ->label('Published'),
                IconColumn::make('show_in_nav')
                    ->boolean()
                    ->label('In nav'),
                TextColumn::make('updated_at')
                    ->label('Updated')
                    ->dateTime()
                    ->sortable()
                    ->since(),
            ])
            ->filters([
                TernaryFilter::make('is_published')
                    ->label('Published'),
                TernaryFilter::make('show_in_nav')
                    ->label('In navigation'),
            ])
            ->recordActions([
                EditAction::make(),
                DeleteAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('nav_order');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ManagePages::route('/'),
        ];
    }
}
