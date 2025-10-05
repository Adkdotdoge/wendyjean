import { type ReactNode, useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

const aboutImage = new URL('../../../images/wendy-left-bio.jpeg', import.meta.url).href;


// Local RevealOnScroll for About section animations
function RevealOnScroll({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            obs.unobserve(e.target);
          }
        });
      },
      { root: null, rootMargin: '0px', threshold: 0.15 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);


  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={[
        'transition-all duration-700 ease-out will-change-transform will-change-opacity',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

export default function About() {
  const { settings } = usePage<{ settings?: { heroUrl?: string | null; appName?: string | null; about?: string | null } }>().props;
  const about = settings?.about ?? '';
  return (
    <section
      id="about"
      className="mx-auto flex max-w-5xl scroll-mt-24 flex-col gap-10 px-6 py-20 md:flex-row md:items-start md:py-28"
    >
      <div className="mx-auto w-40 md:mx-0 md:w-72 md:shrink-0">
        <img
          src={aboutImage}
          alt="Portrait of Wendy Jean"
          className="w-full rounded-xl object-cover shadow-md"
        />
      </div>
      <RevealOnScroll className="md:flex-1">
        {about?.trim() ? (
          <article
            className="prose prose-neutral dark:prose-invert max-w-none mt-4 break-words
                       prose-a:underline prose-a:decoration-2 hover:prose-a:decoration-4
                       prose-img:rounded-lg prose-hr:my-8 prose-pre:border prose-pre:rounded-lg
                       prose-table:w-full prose-th:text-left prose-td:align-top md:mt-0"
            // Preserve manual line breaks from simpler editors
            style={{ whiteSpace: 'pre-wrap' }}
            dangerouslySetInnerHTML={{ __html: about }}
          />
        ) : null}
      </RevealOnScroll>
    </section>
  );
}
