import { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { Icon } from '@/components/icon'; // your wrapper

type NavLink = {
  label: string;
  href: string;
  active?: boolean;
};

type NavbarProps = {
  brand?: { label: string; href?: string };
  links?: NavLink[];
  cta?: { label: string; href: string } | null;
};

export default function Navbar({
  brand = { label: 'WendyJean', href: '#hero' },
  links = [
    { label: 'Home', href: '#hero' },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' },
    { label: 'Gallery', href: '#gallery' },
  ],
  cta = { label: 'Order Now', href: '/order' },
}: NavbarProps) {
  const [open, setOpen] = useState(false);

  // Theme (light/dark) state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const page = usePage();
  const current = (page.url || '').split('?')[0];

  // Close mobile menu on route change
  useEffect(() => {
    setOpen(false);
  }, [current]);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const root = document.documentElement;
    const stored = (localStorage.getItem('theme') as 'light' | 'dark' | null);
    const preferred: 'light' | 'dark' =
      stored ?? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    if (preferred === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    setTheme(preferred);
  }, []);

  const toggleTheme = () => {
    const next: 'light' | 'dark' = theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    if (next === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', next);
    setTheme(next);
  };

  const baseLink =
    'inline-flex items-center py-2 px-3 rounded-md text-sm font-medium transition';
  const inactive =
    'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800';
  const active =
    'text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900';

  const handleAnchorClick = (evt: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
    evt.preventDefault();
    try {
      const el = document.querySelector(hash);
      if (el) {
        (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } finally {
      setOpen(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur dark:bg-gray-950/80">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
        <div className="flex h-14 items-center justify-between">
          {/* Left: Brand */}
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden inline-flex items-center justify-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Toggle menu"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <Icon iconNode={X} /> : <Icon iconNode={Menu} />}
            </button>

            <Link
              href={brand.href ?? '#hero'}
              className="text-lg font-semibold tracking-tight hover:opacity-90"
            >
              {brand.label}
            </Link>
          </div>

          {/* Center: Desktop links */}
          <div className="hidden lg:flex items-center gap-1">
            {links.map((l) => {
              const isActive = l.href.startsWith('#') ? false : (l.active ?? (l.href !== '/' ? current.startsWith(l.href) : current === '/'));
              if (l.href.startsWith('#')) {
                return (
                  <a
                    key={l.href + l.label}
                    href={l.href}
                    onClick={(e) => handleAnchorClick(e, l.href)}
                    className={`${baseLink} ${inactive}`}
                  >
                    {l.label}
                  </a>
                );
              }
              return (
                <Link
                  key={l.href + l.label}
                  href={l.href}
                  className={`${baseLink} ${isActive ? active : inactive}`}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>

          {/* Right: CTA / Auth */}
          <div className="hidden lg:flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className={`${baseLink} ${inactive} gap-2`}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <Icon iconNode={theme === 'dark' ? Sun : Moon} />
              <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>

            {cta && (
              <Link
                href={cta.href}
                className="hidden rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
              >
                {cta.label}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile panel */}
      {open && (
        <div className="lg:hidden border-t bg-white dark:bg-gray-950">
          <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 py-2">
            <div className="flex flex-col gap-1">
              {links.map((l) => {
                const isActive = l.href.startsWith('#') ? false : (l.active ?? (l.href !== '/' ? current.startsWith(l.href) : current === '/'));
                if (l.href.startsWith('#')) {
                  return (
                    <a
                      key={l.href + l.label}
                      href={l.href}
                      onClick={(e) => handleAnchorClick(e, l.href)}
                      className={`${baseLink} ${inactive}`}
                    >
                      {l.label}
                    </a>
                  );
                }
                return (
                  <Link
                    key={l.href + l.label}
                    href={l.href}
                    className={`${baseLink} ${isActive ? active : inactive}`}
                  >
                    {l.label}
                  </Link>
                );
              })}

              <button
                type="button"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                className={`${baseLink} ${inactive} flex items-center justify-between`}
              >
                <span>Theme: {theme === 'dark' ? 'Dark' : 'Light'}</span>
                <Icon iconNode={theme === 'dark' ? Sun : Moon} />
              </button>

              {cta && (
                <Link
                  href={cta.href}
                  className="mt-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                >
                  {cta.label}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}