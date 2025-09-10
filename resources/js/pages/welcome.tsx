import React, { useMemo } from 'react';
import { type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import FrontendLayout from '@/layouts/frontend-layout';
import Hero from '@/components/frontend/Hero';
import About from '@/components/frontend/About';
import Gallery, { type GalleryItem as GalleryItemType } from '@/components/frontend/Gallery';
import ContactForm from '@/components/frontend/ContactForm';

type PageProps = SharedData & {
  gallery: {
    // These should now be absolute, temporary URLs from the backend
    hero?: string | null;
    hero_dark?: string | null;
    // Accept either an array of strings (signed URLs) or objects
    items?: (string | GalleryItemType)[] | null;
    // Back-compat fields in case the backend uses different keys
    hero_url?: string | null;
    hero_dark_url?: string | null;
    images_urls?: string[] | null;
  } | null;
  galleries?: ({
    name: string;
    slug?: string | null;
    id?: number;
    primary_url?: string | null;
    alt_text?: string | null;
    primary?: {
      src?: string | null;
      srcset?: { webp?: string | null; jpg?: string | null; avif?: string | null } | null;
      sizes?: string | null;
      width?: number | null;
      height?: number | null;
    } | null;
  })[] | null;
};

// Normalize image paths: accept absolute URLs, "/..." root paths, or storage-relative paths like
// "galleries/1/hero.jpg" or "storage/galleries/1/hero.jpg" and map them to "/storage/..." for the frontend.
function normalizeSrc(src?: string | null): string | null {
  if (!src) return null;
  try {
    // Absolute URL? Return as-is.
    // This will succeed for http(s) URLs.
    // eslint-disable-next-line no-new
    new URL(src);
    return src;
  } catch {
    // Not an absolute URL
  }
  // Already root-relative
  if (src.startsWith('/')) return src;
  // Starts with "storage/..." without a leading slash
  if (src.startsWith('storage/')) return `/${src}`;
  // Otherwise treat as storage-relative (e.g., "galleries/1/hero.jpg")
  const trimmed = src.replace(/^\/+/, '');
  return `/storage/${trimmed}`;
}

export default function Welcome() {
  const { auth, gallery, galleries } = usePage<PageProps>().props;

  const heroSrc = normalizeSrc(gallery?.hero ?? gallery?.hero_url ?? null);
  const heroDarkSrc = normalizeSrc(gallery?.hero_dark ?? gallery?.hero_dark_url ?? null);

  const galleryItems: GalleryItemType[] = useMemo(() => {
    const list = (galleries ?? []) as NonNullable<PageProps['galleries']>;
    return list.reduce<GalleryItemType[]>((acc, g) => {
      const src = normalizeSrc(g.primary_url);
      if (src) acc.push({
        src,
        alt: g.alt_text ?? g.name,
        slug: g.slug ?? undefined,
        name: g.name,
        primary: g.primary && g.primary.src ? {
          src: normalizeSrc(g.primary.src) ?? src,
          srcset: g.primary.srcset ?? undefined,
          sizes: g.primary.sizes ?? undefined,
          width: g.primary.width ?? null,
          height: g.primary.height ?? null,
        } : undefined,
      });
      return acc;
    }, []);
  }, [galleries]);

  // Theme setup is centralized in use-appearance and app bootstrap; no duplicate logic here.

  return (
    <>
      <Head title="Welcome">
        <link rel="preconnect" href="https://fonts.bunny.net" />
        <link
          href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600"
          rel="stylesheet"
        />
        {heroSrc && (
          <link rel="preload" as="image" href={heroSrc} media="(prefers-color-scheme: light)" />
        )}
        {heroDarkSrc && (
          <link rel="preload" as="image" href={heroDarkSrc} media="(prefers-color-scheme: dark)" />
        )}
      </Head>

      <FrontendLayout useAnchors>
        <div className="bg-[#FDFDFC] text-[#1b1b18] dark:bg-[#0a0a0a] dark:text-[#EDEDEC]">
          {/* HERO: full width, 100vh image */}
          <Hero />
          {/* ABOUT SECTION */}
          <About />
          {/* GALLERY: 2-col row, items animate in */}
          <Gallery items={galleryItems} />
        </div>
        <div>
          <ContactForm />
        </div>
      </FrontendLayout>
    </>
  );
}
