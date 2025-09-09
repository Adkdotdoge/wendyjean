import { type ReactNode, useEffect, useRef, useState} from 'react';
import { usePage } from '@inertiajs/react';


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
    <section id="about" className="mx-auto max-w-5xl scroll-mt-24 px-6 py-20 md:py-28">
      <RevealOnScroll>
        {about?.trim() ? (
          <div
            className="max-w-none mt-4 text-base leading-7 text-neutral-800 dark:text-neutral-200 break-words
                       [&_*]:whitespace-pre-wrap
                       [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:mt-0 [&_h1]:mb-2
                       [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:mt-0 [&_h2]:mb-2
                       [&_h3]:text-xl  [&_h3]:font-semibold [&_h3]:tracking-tight [&_h3]:mt-0 [&_h3]:mb-2
                       [&_p]:mt-1
                       [&_a]:underline [&_a]:decoration-2 hover:[&_a]:decoration-4
                       [&_img]:rounded-lg
                       [&_hr]:my-8
                       [&_pre]:border [&_pre]:rounded-lg
                       [&_table]:w-full [&_table]:my-6 [&_th]:text-left [&_td]:align-top
                       [&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:pl-6 [&_blockquote]:italic
                       [&_blockquote]:border-neutral-300 dark:[&_blockquote]:border-neutral-700
                       [&>blockquote]:relative [&>blockquote]:pl-6
                       [&>blockquote:before]:content-['“'] [&>blockquote:before]:absolute [&>blockquote:before]:-left-4
                       [&>blockquote:before]:text-4xl [&>blockquote:before]:leading-none
                       [&>blockquote:before]:text-neutral-400 dark:[&>blockquote:before]:text-neutral-500
                       [&_*[style*='text-align:center']]:text-center
                       [&_*[style*='text-align:right']]:text-right
                       [&_*[style*='text-align:justify']]:text-justify
                       [&>iframe]:w-full [&>iframe]:h-auto [&>iframe]:aspect-video"
            dangerouslySetInnerHTML={{ __html: about }}
          />
        ) : null}
      </RevealOnScroll>
    </section>
  );
}
