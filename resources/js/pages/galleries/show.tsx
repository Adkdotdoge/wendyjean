import { Head, usePage } from '@inertiajs/react';
import FrontendLayout from '@/layouts/frontend-layout';

type GalleryDetail = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  primary_url?: string | null;
  images_urls?: string[] | null;
};

type PageProps = { gallery: GalleryDetail };

export default function GalleryShow() {
  const { gallery } = usePage<PageProps>().props;
  const images = Array.isArray(gallery.images_urls) ? gallery.images_urls : (gallery.primary_url ? [gallery.primary_url] : []);

  return (
    <>
      <Head title={gallery.name} />
      <FrontendLayout>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">{gallery.name}</h1>
          {gallery.description && (
            <div className="prose prose-neutral dark:prose-invert mt-3 whitespace-pre-wrap">
              {gallery.description}
            </div>
          )}
        </header>

        <section className="grid grid-cols-1 gap-6">
          {images.map((src, i) => (
            <div key={`${src}-${i}`} className="overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-900">
              <img
                src={src}
                alt={`${gallery.name} image ${i + 1}`}
                className="block h-auto w-full object-contain"
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
            </div>
          ))}
        </section>
      </main>
      </FrontendLayout>
    </>
  );
}
