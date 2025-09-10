import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@inertiajs/react';
// Shared image decode/cache across grid & modal to avoid duplicate work
const __imgDecodeCache: Map<string, Promise<void>> = new Map();
const __imgCompleteCache: Set<string> = new Set();
import { usePage } from '@inertiajs/react';

export type GalleryItem = {
  src: string;
  alt?: string;
  href?: string;
  all?: string[];
  slug?: string;
  order_column?: number | null;
  name?: string;
  description?: string | null;
  primary?: {
    src: string;
    srcset?: { webp?: string | null; jpg?: string | null; avif?: string | null };
    sizes?: string;
    width?: number | null;
    height?: number | null;
  };
};


function TiltImage({
  src,
  srcSet,
  sizes,
  sources,
  eager = true,
  preload = true,
  fetchPriority,
  alt,
  className = '',
  containerClassName = '',
  maxRotate = 8, // degrees
  maxTranslate = 8, // px
  tabIndex,
  scrollTiltMobile = true,
}: {
  src: string;
  srcSet?: string;
  sizes?: string;
  sources?: Array<{ type: string; srcSet: string; sizes?: string }>;
  eager?: boolean;
  preload?: boolean;
  fetchPriority?: 'high' | 'low' | 'auto' | undefined;
  alt?: string;
  className?: string;
  containerClassName?: string;
  maxRotate?: number;
  maxTranslate?: number;
  tabIndex?: number;
  scrollTiltMobile?: boolean;
}) {
  // Determine pointer type and adjust intensity accordingly
  const isCoarse = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  // Make desktop a bit subtler, mobile/coarse a bit stronger so it's visible
  const effectiveMaxRotate = isCoarse ? maxRotate * 1.6 : maxRotate * 0.8;
  const effectiveMaxTranslate = isCoarse ? maxTranslate * 1.2 : maxTranslate * 0.8;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pointerActiveRef = useRef(false);

  // Local loading state for opacity transition/spinner
  const [loaded, setLoaded] = useState(false);

  // Optional: inject <link rel="preload" as="image"> for key images
  useEffect(() => {
    if (!preload || !src) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    if (srcSet) link.setAttribute('imagesrcset', srcSet);
    if (sizes) link.setAttribute('imagesizes', sizes);
    document.head.appendChild(link);
    return () => {
      try { document.head.removeChild(link); } catch {}
    };
  }, [preload, src, srcSet, sizes]);

  // Gracefully disable for users who prefer reduced motion
  const prefersReducedMotion = typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDataSaver = typeof navigator !== 'undefined' && (navigator as any)?.connection?.saveData === true;
  const isLowEnd = typeof navigator !== 'undefined' && typeof (navigator as any)?.hardwareConcurrency === 'number' && (navigator as any).hardwareConcurrency <= 4;
  const effectsDisabled = prefersReducedMotion || isDataSaver || isLowEnd;

  function applyTransform(rx: number, ry: number, tx: number, ty: number) {
    if (effectsDisabled) return;
    if (!imgRef.current) return;
    const t = `rotateX(${rx}deg) rotateY(${ry}deg) translate3d(${tx}px, ${ty}px, 0)`;
    imgRef.current.style.transform = t;
  }

  function resetTransform() {
    if (!imgRef.current) return;
    imgRef.current.style.transform = 'none';
  }

  function scheduleApply(rx: number, ry: number, tx: number, ty: number) {
    if (effectsDisabled) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => applyTransform(rx, ry, tx, ty));
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (effectsDisabled) return;
    pointerActiveRef.current = true;
    if (!containerRef.current || prefersReducedMotion) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1
    const dx = (px - 0.5) * 2; // -1..1
    const dy = (py - 0.5) * 2; // -1..1

    // Pull toward the pointer: when the pointer is to the right/bottom,
    // lean the image toward it.
    const ry = -dx * effectiveMaxRotate;     // invert sign to lean toward pointer
    const rx =  dy * effectiveMaxRotate;     // invert sign to lean toward pointer
    const tx =  dx * effectiveMaxTranslate; // translate toward pointer
    const ty =  dy * effectiveMaxTranslate; // translate toward pointer

    scheduleApply(rx, ry, tx, ty);
  }

  function onPointerLeave() {
    if (effectsDisabled) return;
    pointerActiveRef.current = false;
    if (prefersReducedMotion) return;
    scheduleApply(0, 0, 0, 0);
  }

  function applyScrollTilt() {
    if (effectsDisabled) return;
    if (!containerRef.current || prefersReducedMotion) return;
    // Avoid fighting with direct pointer control
    if (pointerActiveRef.current) return;
    // NOTE: With IO removed, always run scroll tilt if pointer not active
    const rect = containerRef.current.getBoundingClientRect();
    const vh = Math.max(window.innerHeight || 0, 1);
    // Use the container center position relative to viewport center
    const cy = rect.top + rect.height / 2;
    let ny = ((cy / vh) - 0.5) * 2; // -1 .. 1 (top..bottom)
    // Clamp
    ny = Math.max(-1, Math.min(1, ny));
    // Pull with scroll. Stronger on coarse/mobile so it reads; subtler on desktop.
    const rotateScale = isCoarse ? 1.6 : 0.7;
    const translateScale = isCoarse ? 1.0 : 0.6;
    const rx =  ny * (effectiveMaxRotate * rotateScale);
    const ry =  0;
    const tx =  0;
    const ty =  ny * (effectiveMaxTranslate * translateScale);
    scheduleApply(rx, ry, tx, ty);
  }
  useEffect(() => {
    if (!scrollTiltMobile) return;
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    if (effectsDisabled) return;

    // Run on all devices; pointer movement will override when active.

    let ticking = false;
    const onTick = () => {
      ticking = false;
      applyScrollTilt();
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onTick);
      }
    };
    const onResize = onScroll;

    // Initial kick so items get a transform without waiting for first scroll
    requestAnimationFrame(onTick);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll as any);
      window.removeEventListener('resize', onResize as any);
    };
  }, [scrollTiltMobile, prefersReducedMotion, maxRotate, maxTranslate, effectsDisabled]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={[
        'relative will-change-transform',
        'transition-transform duration-200 ease-out',
        containerClassName,
      ].join(' ')}
      style={{ perspective: '800px' }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      tabIndex={tabIndex}
      aria-label={alt}
    >
      {Array.isArray(sources) && sources.length > 0 ? (
        <picture>
          {sources.map((s, idx) => (
            <source key={idx} type={s.type} srcSet={s.srcSet} sizes={s.sizes ?? sizes} />
          ))}
          <img
            ref={imgRef}
            src={src}
            srcSet={srcSet}
            sizes={sizes}
            alt={alt ?? ''}
            className={[
              'block w-full h-auto select-none dark:bg-neutral-800',
              'transform-gpu',
              'transition-transform duration-200 ease-out',
              'transition-opacity duration-200',
              loaded ? 'opacity-100' : 'opacity-0',
              className,
            ].join(' ')}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            draggable={false}
            onLoad={() => {
              try { __imgCompleteCache.add(src); } catch {}
              setLoaded(true);
            }}
            fetchPriority={fetchPriority}
          />
        </picture>
      ) : (
        <img
          ref={imgRef}
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt ?? ''}
          className={[
            'block w-full h-auto select-none dark:bg-neutral-800',
            'transform-gpu',
            'transition-transform duration-200 ease-out',
            'transition-opacity duration-200',
            loaded ? 'opacity-100' : 'opacity-0',
            className,
          ].join(' ')}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          onLoad={() => {
            try { __imgCompleteCache.add(src); } catch {}
            setLoaded(true);
          }}
          fetchPriority={fetchPriority}
        />
      )}
      {!loaded && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          {/* soft skeleton background to signal loading */}
          <div className="absolute inset-0 animate-pulse bg-neutral-200/70 dark:bg-neutral-800/70" />
          <div className="relative h-6 w-6 rounded-full border-2 border-neutral-300 border-t-transparent animate-spin" aria-hidden="true" />
          <span className="sr-only">Loading image…</span>
        </div>
      )}
    </div>
  );
}

type ServerGallery = {
  name: string;
  slug?: string;
  primary_url?: string | null;
  images_urls?: string[];
  order_column?: number | null;
};

type PageProps = {
  galleries?: Array<{
    name: string;
    slug?: string;
    primary_url?: string | null;
    images_urls?: string[];
    order_column?: number | null;
  }> | (() => any);
};

// Sort helper: by order_column ASC, nulls last, then by name/slug for stability
const orderSorter = (a: any, b: any) => {
  const toNum = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
  };
  const ao = toNum(a?.order_column);
  const bo = toNum(b?.order_column);
  if (ao !== bo) return ao - bo; // ascending; flip to bo - ao for descending
  const an = String(a?.name ?? a?.slug ?? '').toLowerCase();
  const bn = String(b?.name ?? b?.slug ?? '').toLowerCase();
  return an.localeCompare(bn);
};

export default function Gallery({ items, endpoint = '/api/galleries', linkToDetail = false }: { items?: GalleryItem[]; endpoint?: string; linkToDetail?: boolean }) {
  const [fetched, setFetched] = useState<GalleryItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalMounted, setIsModalMounted] = useState(false);
  const [isModalActive, setIsModalActive] = useState(false);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [modalTitle, setModalTitle] = useState<string | null>(null);
  const [modalDescription, setModalDescription] = useState<string | null>(null);
  const [modalSlug, setModalSlug] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const modalScrollRef = useRef<HTMLDivElement | null>(null);

  const page = usePage<PageProps>();
  const sharedGalleriesRaw = ((): any => {
    const g = page?.props?.galleries as any;
    return typeof g === 'function' ? g() : g;
  })();
  const listFromShared: GalleryItem[] = Array.isArray(sharedGalleriesRaw)
    ? [...sharedGalleriesRaw]
        .filter((g) => g && typeof g === 'object' && g.primary_url)
        .sort(orderSorter)
        .map((g: any) => ({
          src: String(g.primary_url),
          alt: g.name || 'Gallery',
          href: undefined as string | undefined,
          all: Array.isArray(g.images_urls) ? g.images_urls.filter(Boolean).map(String) : [String(g.primary_url)],
          order_column: Number.isFinite(Number(g.order_column)) ? Number(g.order_column) : undefined,
          name: g.name,
          slug: g.slug,
          primary: g.primary ? {
            src: String(g.primary.src || g.primary_url || g.src || ''),
            srcset: g.primary.srcset,
            sizes: g.primary.sizes,
            width: g.primary.width ?? null,
            height: g.primary.height ?? null,
          } : undefined,
        }))
    : [];

  const listFromProps = Array.isArray(items) ? items : [];

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (listFromProps.length > 0 || listFromShared.length > 0 || !endpoint) return;
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(endpoint, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();
        // Accept several payload shapes: Array | { data: [] } | { galleries: [] }
        const rows: ServerGallery[] = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as any).data)
          ? (raw as any).data
          : Array.isArray((raw as any).galleries)
          ? (raw as any).galleries
          : [];

        // Helpful debug in dev: see what we actually received
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.debug('Galleries API payload:', raw);
          // eslint-disable-next-line no-console
          console.debug('Normalized rows:', rows);
        }

        const sortedRows: ServerGallery[] = rows.slice().sort(orderSorter);

        const mapped: GalleryItem[] = sortedRows
          .filter((g) => g && typeof g === 'object' && !!g.primary_url)
          .map((g) => {
            const all = Array.isArray(g.images_urls)
              ? g.images_urls.filter(Boolean).map(String)
              : g.primary_url
              ? [String(g.primary_url)]
              : [];
            return {
              src: String(g.primary_url),
              alt: g.name || 'Gallery',
              href: undefined, // set below if you have detail pages
              all,
              order_column: Number.isFinite(Number(g.order_column)) ? Number(g.order_column) : undefined,
              name: g.name,
              slug: g.slug,
              primary: g.primary ? {
                src: String(g.primary.src || g.primary_url || g.src || ''),
                srcset: g.primary.srcset,
                sizes: g.primary.sizes,
                width: g.primary.width ?? null,
                height: g.primary.height ?? null,
              } : undefined,
            } as GalleryItem;
          });

        if (linkToDetail) {
          for (let i = 0; i < sortedRows.length; i++) {
            const g = sortedRows[i];
            if (g?.slug && mapped[i]) {
              mapped[i].href = `/galleries/${g.slug}`;
            }
          }
        }

        if (!cancelled) setFetched(mapped);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load galleries');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [endpoint, listFromProps.length, listFromShared.length, linkToDetail]);

  const list: GalleryItem[] = useMemo(() => {
    const base = (listFromProps.length > 0)
      ? listFromProps
      : (listFromShared.length > 0)
      ? listFromShared
      : Array.isArray(fetched)
      ? fetched
      : [];

    const toNum = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY; // nulls/undefined last
    };

    return base.slice().sort((a, b) => {
      const ao = toNum((a as any).order_column);
      const bo = toNum((b as any).order_column);
      if (ao !== bo) return ao - bo; // ascending; flip to bo - ao for descending
      const an = String((a as any).name ?? a.slug ?? a.alt ?? '').toLowerCase();
      const bn = String((b as any).name ?? b.slug ?? b.alt ?? '').toLowerCase();
      return an.localeCompare(bn);
    });
  }, [listFromProps, listFromShared, fetched]);

  // Preload all unique gallery and modal images when list changes
  useEffect(() => {
    const urls = new Set<string>();
    for (const it of list) {
      if (it?.src) urls.add(String(it.src));
      if (Array.isArray(it?.all)) {
        for (const u of it.all) if (u) urls.add(String(u));
      }
    }
    urls.forEach((u) => {
      if (__imgCompleteCache.has(u)) return;
      if (__imgDecodeCache.has(u)) return;
      const p = new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = u;
      });
      __imgDecodeCache.set(u, p);
    });
  }, [list]);

  const [leftCol, rightCol] = useMemo(() => {
    const left: Array<{ item: GalleryItem; i: number }> = [];
    const right: Array<{ item: GalleryItem; i: number }> = [];
    list.forEach((item, i) => {
      (i % 2 === 0 ? left : right).push({ item, i });
    });
    return [left, right] as const;
  }, [list]);

  async function openGalleryModal(item: GalleryItem) {
    const fallbackImgs = Array.isArray(item.all) && item.all.length > 0 ? item.all : [item.src];
    setModalImages(fallbackImgs);
    setModalTitle(item.name ?? item.alt ?? 'Gallery');
    setModalDescription(item.description ?? null);
    setIsModalMounted(true);
    setModalSlug(item.slug ?? null);
    requestAnimationFrame(() => setIsModalActive(true));

    if (!item.slug || !endpoint) return;

    try {
      setModalLoading(true);
      const base = endpoint.replace(/\/$/, '');
      const url = `${base}/${encodeURIComponent(item.slug)}?fresh=1`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      // Accept shapes: { images_urls, name, description } | { data: { ... } }
      const payload: any = (raw && typeof raw === 'object' && 'data' in raw) ? (raw as any).data : raw;
      const images = Array.isArray(payload?.images_urls) ? payload.images_urls : null;

      if (typeof payload?.name === 'string') {
        setModalTitle(payload.name);
      }
      if (typeof payload?.description === 'string' && payload.description.trim().length > 0) {
        setModalDescription(payload.description);
      }
      if (typeof payload?.slug === 'string') {
        setModalSlug(payload.slug);
      }

      if (Array.isArray(images) && images.length > 0) {
        const list = images.filter(Boolean).map(String);
        // Replace only if order/content changed to avoid flicker
        if (JSON.stringify(list) !== JSON.stringify(fallbackImgs)) {
          setModalImages(list);
        }
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('Failed to fetch gallery details:', e);
      }
    } finally {
      setModalLoading(false);
    }
  }

  function closeModal() {
    setIsModalActive(false);
    setTimeout(() => setIsModalMounted(false), 200);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeModal();
    }
    if (isModalMounted) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isModalMounted]);

  useEffect(() => {
    if (!isModalMounted) return;

    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY;

    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      paddingRight: body.style.paddingRight,
      overscrollBehavior: (body.style as any).overscrollBehavior || '',
      touchAction: body.style.touchAction,
    } as const;

    const scrollBarGap = window.innerWidth - html.clientWidth;

    // Lock body
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    if (scrollBarGap > 0) {
      body.style.paddingRight = `${scrollBarGap}px`;
    }
    (body.style as any).overscrollBehavior = 'contain';
    // body.style.touchAction = 'none'; // Removed to allow modal content scrolling

    // Removed: Prevent background touch scrolling on iOS

    return () => {
      // Removed: document.removeEventListener('touchmove', preventTouchMove);
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      body.style.paddingRight = prev.paddingRight;
      (body.style as any).overscrollBehavior = prev.overscrollBehavior;
      // Removed: body.style.touchAction = prev.touchAction || '';
      // Restore scroll position
      window.scrollTo(0, scrollY);
    };
  }, [isModalMounted]);

  return (
    <section id="gallery" className="mx-auto max-w-6xl scroll-mt-24 px-6 pb-24">
      <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Galleries</h2>
      {loading && <div className="mt-6 text-sm opacity-70">Loading galleries…</div>}
      {error && <div className="mt-6 text-sm text-red-600">{error}</div>}
      <div className="mt-8 md:flex md:gap-6">
        {/* Left column (items at indices 0,2,4,...) */}
        <div className="space-y-6 md:w-1/2">
          {leftCol.map(({ item, i }) => (
            <div
              key={`${item.src}-${i}`}
              className="relative w-full overflow-hidden rounded-md shadow-sm bg-neutral-100 dark:bg-neutral-900"
              style={{ contentVisibility: 'auto', containIntrinsicSize: '480px' } as any}
            >
              {linkToDetail && item.href ? (
                <>
                  <a
                    href={item.href}
                    aria-label={item.alt ?? `Open ${i + 1}`}
                    className="block h-full w-full"
                    onClick={(e) => {
                      e.preventDefault();
                      openGalleryModal(item);
                    }}
                  >
                    <TiltImage
                      src={item.primary?.src || item.src}
                      alt={item.alt ?? `Gallery piece ${i + 1}`}
                      className="w-full h-auto max-h-none object-contain"
                      eager={i === 0}
                      preload={i === 0}
                      fetchPriority={i === 0 ? 'high' : 'low'}
                      sizes={item.primary?.sizes || "(min-width: 768px) 50vw, 100vw"}
                      srcSet={item.primary?.srcset?.jpg || undefined}
                      sources={[
                        ...(item.primary?.srcset?.webp ? [{ type: 'image/webp', srcSet: item.primary.srcset.webp, sizes: item.primary?.sizes }] : []),
                      ]}
                    />
                  </a>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openGalleryModal(item); }}
                    className="absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-400 text-white shadow-md ring-1 ring-white/60 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-white/80"
                    aria-label={item.alt ? `Open ${item.alt}` : 'Open gallery'}
                    title={item.alt ? `Open ${item.alt}` : 'Open gallery'}
                  >
                    +
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => openGalleryModal(item)} className="block h-full w-full text-left">
                    <TiltImage
                      src={item.primary?.src || item.src}
                      alt={item.alt ?? `Gallery piece ${i + 1}`}
                      className="w-full h-auto max-h-none object-contain"
                      eager={i === 0}
                      preload={i === 0}
                      fetchPriority={i === 0 ? 'high' : 'low'}
                      sizes={item.primary?.sizes || "(min-width: 768px) 50vw, 100vw"}
                      srcSet={item.primary?.srcset?.jpg || undefined}
                      sources={[
                        ...(item.primary?.srcset?.webp ? [{ type: 'image/webp', srcSet: item.primary.srcset.webp, sizes: item.primary?.sizes }] : []),
                      ]}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openGalleryModal(item); }}
                    className="absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-400 text-white shadow-md ring-1 ring-white/60 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-white/80"
                    aria-label={item.alt ? `Open ${item.alt}` : 'Open gallery'}
                    title={item.alt ? `Open ${item.alt}` : 'Open gallery'}
                  >
                    +
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Right column (items at indices 1,3,5,...) */}
        <div className="space-y-6 md:w-1/2 mt-6 md:mt-0">
          {rightCol.map(({ item, i }) => (
            <div
              key={`${item.src}-${i}`}
              className="relative w-full overflow-hidden rounded-md shadow-sm bg-neutral-100 dark:bg-neutral-900"
              style={{ contentVisibility: 'auto', containIntrinsicSize: '480px' } as any}
            >
              {linkToDetail && item.href ? (
                <>
                  <a
                    href={item.href}
                    aria-label={item.alt ?? `Open ${i + 1}`}
                    className="block h-full w-full"
                    onClick={(e) => {
                      e.preventDefault();
                      openGalleryModal(item);
                    }}
                  >
                    <TiltImage
                      src={item.src}
                      alt={item.alt ?? `Gallery piece ${i + 1}`}
                      className="w-full h-auto max-h-none object-contain"
                      eager={i === 0}
                      preload={i === 0}
                      fetchPriority={i === 0 ? 'high' : 'low'}
                    />
                  </a>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openGalleryModal(item); }}
                    className="absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-400 text-white shadow-md ring-1 ring-white/60 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-white/80"
                    aria-label={item.alt ? `Open ${item.alt}` : 'Open gallery'}
                    title={item.alt ? `Open ${item.alt}` : 'Open gallery'}
                  >
                    +
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => openGalleryModal(item)} className="block h-full w-full text-left">
                    <TiltImage
                      src={item.src}
                      alt={item.alt ?? `Gallery piece ${i + 1}`}
                      className="w-full h-auto max-h-none object-contain"
                      eager={i === 0}
                      preload={i === 0}
                      fetchPriority={i === 0 ? 'high' : 'low'}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openGalleryModal(item); }}
                    className="absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-400 text-white shadow-md ring-1 ring-white/60 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-white/80"
                    aria-label={item.alt ? `Open ${item.alt}` : 'Open gallery'}
                    title={item.alt ? `Open ${item.alt}` : 'Open gallery'}
                  >
                    +
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {!loading && list.length === 0 && (
          <div className="text-sm text-muted-foreground">No galleries to display yet.</div>
        )}
      </div>
      {isModalMounted && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50">
          {/* Overlay */}
          <div
            className={[
              'absolute inset-0 z-0 bg-black/70 transition-opacity duration-200 ease-out',
              isModalActive ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
            onClick={closeModal}
          />

          {/* Close button */}
          <button
            type="button"
            onClick={closeModal}
            className="absolute right-4 top-4 z-30 rounded-md px-3 py-1 text-sm text-white/90 hover:bg-white/10 focus:outline-none"
            aria-label="Close"
          >
            ✕
          </button>

          {/* Bottom-centered floating close button */}
          <button
            type="button"
            onClick={closeModal}
            className="absolute bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-base text-white backdrop-blur hover:bg-white/20 focus:outline-none"
            aria-label="Close gallery"
          >
            ✕ Close
          </button>

          {modalLoading && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-md bg-black/50 px-3 py-1 text-sm text-white">
              Loading…
            </div>
          )}

          {/* Fullscreen content */}
          <div
            ref={modalScrollRef}
            className={[
              'relative z-10 h-full w-full overflow-y-auto overscroll-contain p-4 sm:p-8 transition-all duration-200 ease-out',
              'will-change-transform will-change-opacity',
              isModalActive ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1',
            ].join(' ')}
            style={{ WebkitOverflowScrolling: 'touch' } as any}
          >
            <div className="mx-auto max-w-screen-2xl">
              {(modalTitle || modalDescription) && (
                <div className="mx-auto mb-6 max-w-3xl text-center">
                  {modalTitle && (
                    <h3 className="text-lg font-semibold text-white/95 dark:text-white">{modalTitle}</h3>
                  )}
                  {modalDescription && (
                    <>
                      <p
                        className="mt-2 text-sm text-white/85 dark:text-white/80"
                        style={{ display: '-webkit-box', WebkitLineClamp: 3 as any, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}
                      >
                        {modalDescription}
                      </p>
                      {modalSlug && (
                        <div className="mt-3">
                          <Link
                            href={`/galleries/${modalSlug}`}
                            className="inline-flex items-center gap-1 rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
                          >
                            Read more
                            <span aria-hidden>→</span>
                          </Link>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 place-items-center gap-6">
                {modalImages.map((src, i) => (
                  <div
                    key={`${src}-${i}`}
                    className="w-full max-w-3xl mx-auto overflow-hidden rounded-lg transition-opacity duration-200 ease-out"
                  >
                    <TiltImage
                      src={src}
                      alt={`Gallery image ${i + 1}`}
                      className="w-full h-auto max-h-[100svh] object-contain cursor-zoom-in"
                      containerClassName="rounded-lg"
                      tabIndex={0}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
