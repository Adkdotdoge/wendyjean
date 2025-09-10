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
  const images = Array.isArray(gallery.images_urls)
    ? gallery.images_urls
    : (gallery.primary_url ? [gallery.primary_url] : []);
  const primarySrc = images[0] ?? null;
  const rest = images.slice(1);

  return (
    <>
      <Head title={gallery.name} />
      <FrontendLayout>
        <main className="mx-auto max-w-6xl px-6 py-10">
          {/* Two-column hero: left text, right primary image */}
          <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{gallery.name}</h1>
              {gallery.description && (
                <div className="prose prose-neutral dark:prose-invert mt-4 whitespace-pre-wrap">
                  {gallery.description}
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-900">
              {primarySrc ? (
                <img
                  src={primarySrc}
                  alt={`${gallery.name} image 1`}
                  className="block h-auto w-full object-contain"
                  loading="eager"
                  decoding="async"
                  sizes="(min-width: 768px) 50vw, 100vw"
                />
              ) : null}
            </div>
          </section>

          {/* Additional images full-width below */}
          {rest.length > 0 && (
            <section className="mt-10 grid grid-cols-1 gap-6">
              {rest.map((src, i) => (
                <div key={`${src}-${i + 2}`} className="overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-900">
                  <img
                    src={src}
                    alt={`${gallery.name} image ${i + 2}`}
                    className="block h-auto w-full object-contain"
                    loading="lazy"
                    decoding="async"
                    sizes="100vw"
                  />
                </div>
              ))}
            </section>
          )}
        </main>
      </FrontendLayout>
    </>
  );
}
