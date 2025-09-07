<?php

namespace App\Filament\Pages;

use App\Models\SiteSetting;
use Filament\Forms;
use Filament\Pages\Page;
use Filament\Schemas\Schema;
use Filament\Notifications\Notification;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Actions\Action;
use Filament\Support\Enums\Width;
use Filament\Schemas\Components\Section;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\RichEditor;
use Filament\Forms\Components\KeyValue;
use Filament\Schemas\Components\Grid;
use Filament\Forms\Get;
use Filament\Forms\Set;
use Filament\Forms\Components\ViewField;
use Filament\Forms\Components\Placeholder;
use Filament\Schemas\Components\Group;
use Filament\Schemas\Components\Fieldset;
use Filament\Forms\Components\SpatieMediaLibraryFileUpload;
use Livewire\Attributes\On; // (Filament v4 / Livewire 3)
use UnitEnum;
use BackedEnum;

class SiteSettings extends Page implements HasForms
{
    use InteractsWithForms;

    protected static BackedEnum|string|null $navigationIcon = 'heroicon-o-cog-6-tooth';
    protected static ?string $navigationLabel = 'Site Settings';
    protected static ?string $title = 'Site Settings';
    protected static UnitEnum|string|null $navigationGroup = 'Configuration';
    protected string $view = 'filament.pages.site-settings';

    /** @var array<string, mixed>|null */
    public ?array $data = [];

    public SiteSetting $record;

    public function mount(): void
    {
        // Ensure we always have exactly one record to edit.
        $this->record = SiteSetting::query()->firstOrCreate([], [
            'app_name' => 'My App',
            'about' => null,
            'options' => [],
        ]);

        // Prime the form with current values
        $this->form->fill([
            'app_name' => $this->record->app_name,
            'about'    => $this->record->about,
            'options'  => $this->record->options,
            // Media is handled by Filament ML component via relationships
        ]);
    }

    public function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('General')
                    ->description('Basic info about your app.')
                    ->schema([
                        TextInput::make('app_name')
                            ->label('App Name')
                            ->required()
                            ->maxLength(150),

                        RichEditor::make('about')
                            ->label('About')
                            ->toolbarButtons([
                                ['bold', 'italic', 'underline', 'strike', 'subscript', 'superscript', 'link', 'clearFormatting', 'highlight', 'code', 'horizontalRule'],
                                ['h1', 'h2', 'h3', 'lead', 'small'],
                                ['alignStart', 'alignCenter', 'alignEnd', 'alignJustify'],
                                ['blockquote', 'codeBlock', 'bulletList', 'orderedList'],
                                ['table', 'attachFiles'],
                                ['undo', 'redo'],
                            ])
                            ->floatingToolbars([
                                'paragraph' => [
                                    'bold', 'italic', 'underline', 'strike', 'subscript', 'superscript',
                                ],
                                'heading' => [
                                    'h1', 'h2', 'h3',
                                ],
                                'table' => [
                                    'tableAddColumnBefore', 'tableAddColumnAfter', 'tableDeleteColumn',
                                    'tableAddRowBefore', 'tableAddRowAfter', 'tableDeleteRow',
                                    'tableMergeCells', 'tableSplitCell', 'tableToggleHeaderRow', 'tableDelete',
                                ],
                            ])
                            ->helperText('Tip: Press Shift+Enter for a line break (\n) without starting a new paragraph.')
                            ->columnSpanFull(),
                    ])
                    ->columns(1),

                Section::make('Hero Image')
                    ->description('Upload a single hero image for the site.')
                    ->schema([
                        SpatieMediaLibraryFileUpload::make('hero')
                            ->collection('hero')
                            ->label('Hero Image')
                            ->image()
                            ->maxFiles(1)
                            ->openable()
                            ->downloadable()
                            // ->disk('private') // uncomment if your 'hero' collection uses a private disk
                            ->helperText('Recommended: large landscape image.'),
                    ]),

                Section::make('Options (Advanced)')
                    ->description('Key/value JSON for quick feature flags or extra settings.')
                    ->schema([
                        KeyValue::make('options')
                            ->addButtonLabel('Add option')
                            ->keyLabel('Key')
                            ->valueLabel('Value')
                            ->columnSpanFull(),
                    ]),
            ])
            ->statePath('data')->model($this->record);
    }

    protected function getFormActions(): array
    {
        return [
            Action::make('save')
                ->label('Save Settings')
                ->action('save')
                ->keyBindings(['mod+s'])
                ->color('primary'),
        ];
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('save')
                ->label('Save Settings')
                ->action('save')
                ->keyBindings(['mod+s'])
                ->color('primary'),
        ];
    }

    public function save(): void
    {
        // Save scalar fields
        $state = $this->form->getState();

        $this->record->fill([
            'app_name' => $state['app_name'] ?? $this->record->app_name,
            'about'    => $state['about'] ?? $this->record->about,
            'options'  => $state['options'] ?? $this->record->options,
        ])->save();

        // Save media relationships (Spatie ML component)
        $this->form->model($this->record)->saveRelationships();

        Notification::make()
            ->title('Settings saved')
            ->success()
            ->send();
    }

    public function getMaxContentWidth(): Width|string|null
    {
        return Width::SevenExtraLarge; // nice wide form for the hero preview
    }
}