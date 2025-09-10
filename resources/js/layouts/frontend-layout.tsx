import { type ReactNode, useMemo } from 'react';
import Navbar from '@/components/frontend/Navbar';

type NavLink = { label: string; href: string };

type FrontendLayoutProps = {
  children: ReactNode;
  useAnchors?: boolean; // on homepage, use #hash links; elsewhere, absolute links
  links?: NavLink[];
};

export default function FrontendLayout({ children, useAnchors = false, links }: FrontendLayoutProps) {
  const computedLinks = useMemo<NavLink[]>(() => {
    if (Array.isArray(links) && links.length) return links;
    if (useAnchors) {
      return [
        { label: 'Home', href: '#hero' },
        { label: 'About', href: '#about' },
        { label: 'Contact', href: '#contact' },
        { label: 'Gallery', href: '#gallery' },
      ];
    }
    return [
      { label: 'Home', href: '/#hero' },
      { label: 'About', href: '/#about' },
      { label: 'Contact', href: '/#contact' },
      { label: 'Galleries', href: '/galleries' },
    ];
  }, [links, useAnchors]);

  return (
    <>
      <Navbar links={computedLinks} />
      <main>{children}</main>
    </>
  );
}

