import { type ReactNode, useMemo } from 'react';
import { usePage } from '@inertiajs/react';
import Navbar from '@/components/frontend/Navbar';
import type { SharedData } from '@/types';

type NavLink = { label: string; href: string };

type FrontendLayoutProps = {
  children: ReactNode;
  useAnchors?: boolean; // on homepage, use #hash links; elsewhere, absolute links
  links?: NavLink[];
};

export default function FrontendLayout({ children, useAnchors = false, links }: FrontendLayoutProps) {
  const { pages: sharedPages } = usePage<SharedData>().props;

  const computedLinks = useMemo<NavLink[]>(() => {
    const staticLinks: NavLink[] = Array.isArray(links) && links.length
      ? links
      : useAnchors
        ? [
            { label: 'Home', href: '#hero' },
            { label: 'About', href: '#about' },
            { label: 'Contact', href: '#contact' },
            { label: 'Gallery', href: '#gallery' },
          ]
        : [
            { label: 'Home', href: '/#hero' },
            { label: 'About', href: '/#about' },
            { label: 'Contact', href: '/#contact' },
            { label: 'Galleries', href: '/galleries' },
          ];

    const dynamicLinks: NavLink[] = Array.isArray(sharedPages)
      ? sharedPages
          .map((page: any) => ({
            label: String(page?.nav_label ?? page?.title ?? 'Page'),
            href: `/pages/${page?.slug}`,
          }))
          .filter((link) => link.label.trim().length > 0 && link.href)
      : [];

    const merged = [...staticLinks];
    dynamicLinks.forEach((link) => {
      if (!merged.some((existing) => existing.href === link.href)) {
        merged.push(link);
      }
    });

    return merged;
  }, [links, sharedPages, useAnchors]);

  return (
    <>
      <Navbar links={computedLinks} />
      <main>{children}</main>
    </>
  );
}
