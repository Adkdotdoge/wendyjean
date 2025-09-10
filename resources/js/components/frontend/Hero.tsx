import { usePage } from '@inertiajs/react';

export default function Hero() {
  const { settings } = usePage<{ settings?: { heroUrl?: string | null; appName?: string | null; about?: string | null } }>().props;
  const src = settings?.heroUrl ?? null;
  const appName = settings?.appName ?? 'App Name';
  // Extract a plain-text tagline from rich HTML if needed
  const aboutHtml = settings?.about ?? 'Painter • Illustrator • Mixed Media';
  const about = (() => {
    if (!aboutHtml) return '';
    if (typeof window === 'undefined') {
      // server-side: naive strip tags
      return String(aboutHtml).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    const div = document.createElement('div');
    div.innerHTML = aboutHtml;
    const text = (div.textContent || div.innerText || '').trim();
    return text.length > 160 ? text.slice(0, 157) + '…' : text;
  })();
  return (
    <section
      id="hero"
      className="relative flex min-h-screen w-full items-center justify-center pt-16 bg-gray-200 dark:bg-neutral-800"
      style={src ? { backgroundImage: `url('${src}')`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
    >
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-white dark:text-sky-950 md:text-6xl drop-shadow-2xl drop-shadow-black dark:drop-shadow-white">
          {appName}
        </h1>
        <p className="mt-4 text-lg text-white/90 dark:text-sky-950/90 md:text-xl drop-shadow-2xl drop-shadow-black">
          Painter • Illustrator • Mixed Media
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <a
            href="#gallery"
            className="rounded-md bg-white/90 px-5 py-2 text-sm font-medium text-[#1b1b18] hover:bg-white dark:bg-[#EDEDEC]/90 dark:text-[#0a0a0a] dark:hover:bg-[#EDEDEC]"
          >
            View Gallery
          </a>
          <a
            href="#about"
            className="rounded-md border bg-sky-100 border-white px-5 py-2 text-sm font-medium text-black hover:bg-sky-50/80 dark:border-white/60 dark:text-black dark:hover:bg-white/10"
          >
            About the Artist
          </a>
        </div>
      </div>
    </section>
  );
}
