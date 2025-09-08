import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

export type GalleryItem = { src: string; alt?: string; href?: string; all?: string[]; slug?: string; order_column?: number | null; name?: string };

function RevealOnScroll({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(id);
  }, [delay]);

  return (
    <div
      style={{ transitionDelay: `${delay}ms` }}
      className={[
        'transition-all duration-500 ease-out will-change-transform will-change-opacity',
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

function TiltImage({
  src,
  srcSet,
  sizes,
  preload = false,
  fetchPriority,
  alt,
  className = '',
  containerClassName = '',
  maxRotate = 8, // degrees
  maxTranslate = 8, // px
  tabIndex,
}: {
  src: string;
  srcSet?: string;
  sizes?: string;
  preload?: boolean;
  fetchPriority?: 'high' | 'low' | 'auto' | undefined;
  alt?: string;
  className?: string;
  containerClassName?: string;
  maxRotate?: number;
  maxTranslate?: number;
  tabIndex?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const orientationEnabledRef = useRef<boolean>(false);
  const orientationHandlerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);

  // Fade/scale-in when loaded, reset when src changes
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setLoaded(false); }, [src]);

  // Safety: ensure we reveal even if onLoad never fires (cache/odd responses)
  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => setLoaded(true), 800);
    return () => clearTimeout(t);
  }, [loaded, src]);

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

  function applyTransform(rx: number, ry: number, tx: number, ty: number) {
    if (!imgRef.current) return;
    const t = `rotateX(${rx}deg) rotateY(${ry}deg) translate3d(${tx}px, ${ty}px, 0)`;
    imgRef.current.style.transform = t;
  }

  function resetTransform() {
    if (!imgRef.current) return;
    imgRef.current.style.transform = 'none';
  }

  function scheduleApply(rx: number, ry: number, tx: number, ty: number) {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => applyTransform(rx, ry, tx, ty));
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!containerRef.current || prefersReducedMotion) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1
    const dx = (px - 0.5) * 2; // -1..1
    const dy = (py - 0.5) * 2; // -1..1

    const ry = dx * maxRotate;      // left/right -> Y rotation
    const rx = -dy * maxRotate;     // up/down -> X rotation (invert for natural tilt)
    const tx = dx * maxTranslate;
    const ty = dy * maxTranslate;

    scheduleApply(rx, ry, tx, ty);
  }

  function onPointerLeave() {
    if (prefersReducedMotion) return;
    scheduleApply(0, 0, 0, 0);
  }

  async function enableOrientationOnce() {
    if (orientationEnabledRef.current || prefersReducedMotion) return;

    try {
      // iOS permission gate
      // @ts-ignore
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        // @ts-ignore
        const res = await DeviceOrientationEvent.requestPermission();
        if (res !== 'granted') return;
      }
    } catch {
      // ignore
    }

    const handler = (e: DeviceOrientationEvent) => {
      if (!containerRef.current) return;
      const gamma = typeof e.gamma === 'number' ? e.gamma : 0; // left/right, approx -90..90
      const beta = typeof e.beta === 'number' ? e.beta : 0;   // front/back, approx -180..180

      // Normalize and clamp to [-1,1]
      const nx = Math.max(-45, Math.min(45, beta)) / 45;   // forward/back maps to X rotation
      const ny = Math.max(-45, Math.min(45, gamma)) / 45;  // left/right maps to Y rotation

      const rx = -nx * maxRotate;
      const ry = ny * maxRotate;
      const tx = ny * (maxTranslate * 0.6);
      const ty = nx * (maxTranslate * 0.6);

      scheduleApply(rx, ry, tx, ty);
    };

    orientationHandlerRef.current = handler;
    window.addEventListener('deviceorientation', handler, true);
    orientationEnabledRef.current = true;
  }

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (orientationHandlerRef.current) {
        window.removeEventListener('deviceorientation', orientationHandlerRef.current, true);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={[
        'relative will-change-transform',
        containerClassName,
      ].join(' ')}
      style={{ perspective: '800px' }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={enableOrientationOnce}
      onClick={enableOrientationOnce}
      onTouchStart={enableOrientationOnce}
      tabIndex={tabIndex}
      aria-label={alt}
    >
      <img
        ref={imgRef}
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt ?? ''}
        className={[
          'block w-full h-auto select-none',
          'transition-transform transition-opacity duration-200 ease-out will-change-transform transform-gpu',
          loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]',
          className,
        ].join(' ')}
        loading="lazy"
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        fetchPriority={fetchPriority}
      />
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

  async function openGalleryModal(item: GalleryItem) {
    const fallbackImgs = Array.isArray(item.all) && item.all.length > 0 ? item.all : [item.src];
    setModalImages(fallbackImgs);
    setIsModalMounted(true);
    requestAnimationFrame(() => setIsModalActive(true));

    if (!item.slug || !endpoint) return;

    try {
      setModalLoading(true);
      const base = endpoint.replace(/\/$/, '');
      const url = `${base}/${encodeURIComponent(item.slug)}?fresh=1`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      // Accept shapes: { images_urls: [] } | { data: { images_urls: [] } }
      const images = Array.isArray((raw as any).images_urls)
        ? (raw as any).images_urls
        : Array.isArray((raw as any)?.data?.images_urls)
        ? (raw as any).data.images_urls
        : null;

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
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {list.map((item, idx) => (
          <RevealOnScroll key={`${item.src}-${idx}`} delay={500 + idx * 250}>
            <div className="relative w-full overflow-hidden rounded-md shadow-sm">
              {linkToDetail && item.href ? (
                <a
                  href={item.href}
                  aria-label={item.alt ?? `Open ${idx + 1}`}
                  className="block h-full w-full"
                  onClick={(e) => {
                    e.preventDefault();
                    openGalleryModal(item);
                  }}
                >
                  <TiltImage
                    src={item.src}
                    alt={item.alt ?? `Gallery piece ${idx + 1}`}
                    className="w-full h-auto max-h-none object-contain"
                    preload={idx < 3}
                    fetchPriority={idx === 0 ? 'high' : undefined}
                  />
                </a>
              ) : (
                <button type="button" onClick={() => openGalleryModal(item)} className="block h-full w-full text-left">
                  <TiltImage
                    src={item.src}
                    alt={item.alt ?? `Gallery piece ${idx + 1}`}
                    className="w-full h-auto max-h-none object-contain"
                    preload={idx < 3}
                    fetchPriority={idx === 0 ? 'high' : undefined}
                  />
                </button>
              )}
            </div>
          </RevealOnScroll>
        ))}
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
              isModalActive ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1',
            ].join(' ')}
            style={{ WebkitOverflowScrolling: 'touch' } as any}
          >
            <div className="mx-auto max-w-screen-2xl">
              <div className="grid grid-cols-1 place-items-center gap-6">
                {modalImages.map((src, i) => (
                  <div key={`${src}-${i}`} className="w-full max-w-3xl mx-auto overflow-hidden rounded-lg">
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