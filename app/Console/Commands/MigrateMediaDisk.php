<?php

namespace App\Console\Commands;

use App\Models\Media;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Throwable;

class MigrateMediaDisk extends Command
{
    protected $signature = 'media:migrate-disk
        {--from= : Source disk name (default: each media row\'s current disk)}
        {--to=spaces : Destination disk name}
        {--delete-source : Delete files from the source disk after a successful copy}
        {--dry-run : Show what would happen without copying or updating anything}
        {--chunk=100 : DB chunk size}';

    protected $description = 'Copy media (originals, conversions, responsive images) from one disk to another and update spatie/laravel-medialibrary disk pointers.';

    public function handle(): int
    {
        $from = $this->option('from');
        $to = (string) $this->option('to');
        $deleteSource = (bool) $this->option('delete-source');
        $dryRun = (bool) $this->option('dry-run');
        $chunk = (int) $this->option('chunk');

        if (! array_key_exists($to, config('filesystems.disks', []))) {
            $this->error("Destination disk [{$to}] is not configured.");

            return self::FAILURE;
        }

        $destination = Storage::disk($to);

        $query = Media::query();
        if ($from !== null && $from !== '') {
            $query->where('disk', $from);
        }

        $total = (clone $query)->count();
        if ($total === 0) {
            $this->info('No media rows match the selection.');

            return self::SUCCESS;
        }

        $this->info(sprintf(
            '%s %d media row(s) -> disk [%s]%s%s',
            $dryRun ? 'Would migrate' : 'Migrating',
            $total,
            $to,
            $from ? " (from [{$from}])" : '',
            $deleteSource ? ' (source files will be deleted)' : ''
        ));

        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $copied = 0;
        $skipped = 0;
        $failed = 0;

        $query->orderBy('id')->chunkById($chunk, function ($rows) use (
            $to, $destination, $deleteSource, $dryRun, &$copied, &$skipped, &$failed, $bar
        ) {
            foreach ($rows as $media) {
                $sourceDisk = $media->disk;
                $sourceConvDisk = $media->conversions_disk ?: $media->disk;

                if ($sourceDisk === $to && $sourceConvDisk === $to) {
                    $skipped++;
                    $bar->advance();
                    continue;
                }

                try {
                    $this->copyMediaTree(Storage::disk($sourceDisk), $destination, (string) $media->id, $dryRun);

                    if ($sourceConvDisk !== $sourceDisk) {
                        $this->copyMediaTree(Storage::disk($sourceConvDisk), $destination, (string) $media->id, $dryRun);
                    }

                    if (! $dryRun) {
                        $media->disk = $to;
                        $media->conversions_disk = $to;
                        $media->saveQuietly();
                    }

                    if ($deleteSource && ! $dryRun) {
                        Storage::disk($sourceDisk)->deleteDirectory((string) $media->id);
                        if ($sourceConvDisk !== $sourceDisk) {
                            Storage::disk($sourceConvDisk)->deleteDirectory((string) $media->id);
                        }
                    }

                    $copied++;
                } catch (Throwable $e) {
                    $failed++;
                    $this->newLine();
                    $this->error(sprintf('Media #%d failed: %s', $media->id, $e->getMessage()));
                }

                $bar->advance();
            }
        });

        $bar->finish();
        $this->newLine(2);

        $this->info(sprintf(
            'Done. copied=%d skipped=%d failed=%d%s',
            $copied,
            $skipped,
            $failed,
            $dryRun ? ' (dry run — no changes written)' : ''
        ));

        return $failed === 0 ? self::SUCCESS : self::FAILURE;
    }

    /**
     * Recursively copy every file under the media-id "directory" from the source disk to the destination disk.
     * Spatie stores: {id}/{file_name}, {id}/conversions/*, {id}/responsive-images/*.
     */
    private function copyMediaTree($source, $destination, string $mediaId, bool $dryRun): void
    {
        if (! $source->exists($mediaId) && empty($source->allFiles($mediaId))) {
            return;
        }

        foreach ($source->allFiles($mediaId) as $path) {
            if ($destination->exists($path)) {
                continue;
            }

            if ($dryRun) {
                continue;
            }

            $stream = $source->readStream($path);
            if ($stream === null) {
                throw new \RuntimeException("Could not open stream for [{$path}]");
            }

            $destination->writeStream($path, $stream);

            if (is_resource($stream)) {
                fclose($stream);
            }
        }
    }
}
