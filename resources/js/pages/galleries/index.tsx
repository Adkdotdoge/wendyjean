import { Head, usePage } from '@inertiajs/react';
import FrontendLayout from '@/layouts/frontend-layout';
import Gallery, { type GalleryItem } from '@/components/frontend/Gallery';

type GalleryRow = {
  id: number;
  name: string;
  slug: string;
  order_column?: number | null;
  primary_url?: string | null;
  images_urls?: string[] | null;
};

type PageProps = {
  galleries: GalleryRow[];
};

export default function GalleriesIndex() {
  const { galleries } = usePage<PageProps>().props;

  const items: GalleryItem[] = (galleries || []).map((g) => ({
    src: g.primary_url || '',
    alt: g.name,
    name: g.name,
    slug: g.slug,
    href: `/galleries/${g.slug}`,
    all: Array.isArray(g.images_urls) ? g.images_urls : undefined,
    order_column: g.order_column ?? undefined,
  })).filter((x) => x.src);

  return (
    <>
      <Head title="Galleries" />
      <FrontendLayout>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Galleries</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Explore all collections. Click any card to view details.
        </p>
        <div className="mt-8">
          <Gallery items={items} linkToDetail={true} />
        </div>
      </main>
      </FrontendLayout>
    </>
  );
}
