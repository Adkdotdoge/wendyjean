import { Head, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import FrontendLayout from '@/layouts/frontend-layout';

type GalleryDetail = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  primary_url?: string | null;
  images_urls?: string[] | null;
  primary?: {
    src?: string | null;
    srcset?: { webp?: string | null; jpg?: string | null } | null;
    sizes?: string | null;
    width?: number | null;
    height?: number | null;
    placeholder?: string | null;
  } | null;
  is_sold?: boolean | null;
  medium?: string | null;
  style?: string | null;
  attributes?: Record<string, string> | null;
  starting_offer?: number | string | null;
  current_offer?: number | string | null;
};

type PageProps = { gallery: GalleryDetail };

export default function GalleryShow() {
  const { gallery } = usePage<PageProps>().props;
  const images = useMemo(() => {
    return Array.isArray(gallery.images_urls)
      ? gallery.images_urls
      : (gallery.primary_url ? [gallery.primary_url] : []);
  }, [gallery.images_urls, gallery.primary_url]);
  const primarySrc = images[0] ?? null;
  const rest = images.slice(1);

  // Offer form state (matches modal behavior)
  const [offerName, setOfferName] = useState('');
  const [offerEmail, setOfferEmail] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState<string | null>(null);

  return (
    <>
      <Head title={gallery.name} />
      <FrontendLayout>
        <main className="mx-auto max-w-6xl px-6 py-10">
          {/* Two-column hero: left text, right primary image */}
          <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{gallery.name}</h1>
              {/* Details block */}
              <div className="mt-4 space-y-2 text-sm">
                {gallery.is_sold && (
                  <div className="inline-flex items-center gap-2 rounded bg-neutral-100 px-2 py-1 text-xs uppercase tracking-wide text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">Sold</div>
                )}
                {gallery.starting_offer != null && (
                  <div><span className="font-medium">Starting offer:</span> ${String(gallery.starting_offer)}</div>
                )}
                {gallery.current_offer != null && (
                  <div><span className="font-medium">Current offer:</span> ${String(gallery.current_offer)}</div>
                )}
                {gallery.medium && (
                  <div><span className="font-medium">Medium:</span> {gallery.medium}</div>
                )}
                {gallery.style && (
                  <div><span className="font-medium">Style:</span> {gallery.style}</div>
                )}
              </div>
              {gallery.description && (
                <div className="prose prose-neutral dark:prose-invert mt-4 whitespace-pre-wrap">
                  {gallery.description}
                </div>
              )}
              {gallery.attributes && Object.keys(gallery.attributes).length > 0 && (
                <div className="mt-4 space-y-1 text-sm">
                  {Object.entries(gallery.attributes).map(([key, val]) => (
                    <div key={key}><span className="font-medium">{key}:</span> {val}</div>
                  ))}
                </div>
              )}

              {/* Offer form */}
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('offer-form');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  Make Offer
                </button>
              </div>
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

          {/* Offer form section */}
          <section id="offer-form" className="mt-10 max-w-md">
            <h2 className="text-xl font-semibold tracking-tight">Make an Offer</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setOfferSubmitting(true);
                setOfferSuccess(null);
                try {
                  const token = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content;
                  const res = await fetch(`/api/galleries/${encodeURIComponent(gallery.slug)}/offer`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(token ? { 'X-CSRF-TOKEN': token } : {}) },
                    body: JSON.stringify({
                      name: offerName,
                      email: offerEmail,
                      amount: parseFloat(offerAmount),
                      message: offerMessage || undefined,
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data?.message || 'Failed to submit');
                  setOfferSuccess(data?.message || 'Offer submitted. Thank you!');
                } catch (err: any) {
                  setOfferSuccess(err?.message || 'Failed to submit');
                } finally {
                  setOfferSubmitting(false);
                }
              }}
              className="mt-4 space-y-2"
            >
              <input
                type="text"
                placeholder="Your name"
                value={offerName}
                onChange={(e) => setOfferName(e.target.value)}
                required
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-500 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500"
              />
              <input
                type="email"
                placeholder="Email"
                value={offerEmail}
                onChange={(e) => setOfferEmail(e.target.value)}
                required
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-500 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Offer amount (USD)"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                required
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-500 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500"
              />
              <textarea
                placeholder="Message (optional)"
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-500 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="submit"
                disabled={offerSubmitting}
                className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {offerSubmitting ? 'Submitting…' : 'Submit offer'}
              </button>
              {offerSuccess && (
                <div className="text-xs text-neutral-700">{offerSuccess}</div>
              )}
            </form>
          </section>
        </main>
      </FrontendLayout>
    </>
  );
}
