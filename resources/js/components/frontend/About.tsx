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
            className="prose prose-neutral dark:prose-invert max-w-none mt-4
                           prose-headings:font-semibold prose-headings:tracking-tight
                           prose-h1:mt-0 prose-h2:mt-0 prose-h3:mt-0 prose-h1:mb-2 prose-h2:mb-2 prose-h3:mb-2
                           prose-h1:whitespace-pre-wrap prose-h2:whitespace-pre-wrap prose-h3:whitespace-pre-wrap
                           prose-a:underline prose-a:decoration-2 hover:prose-a:decoration-4
                           prose-img:rounded-lg prose-hr:my-8 prose-pre:border prose-pre:rounded-lg
                           prose-p:whitespace-pre-wrap prose-li:whitespace-pre-wrap break-words prose-p:mt-1
                           prose-table:w-full prose-table:my-6 prose-th:text-left prose-td:align-top
                           prose-blockquote:my-6 prose-blockquote:border-l-4 prose-blockquote:pl-6 prose-blockquote:italic
                           prose-blockquote:border-neutral-300 dark:prose-blockquote:border-neutral-700
                           [&>blockquote]:relative [&>blockquote]:pl-6
                           [&>blockquote:before]:content-['“'] [&>blockquote:before]:absolute [&>blockquote:before]:-left-4
                           [&>blockquote:before]:text-4xl [&>blockquote:before]:leading-none
                           [&>blockquote:before]:text-neutral-400 dark:[&>blockquote:before]:text-neutral-500
                           [&_*[style*='text-align:center']]:text-center
                           [&_*[style*='text-align:right']]:text-right
                           [&_*[style*='text-align:justify']]:text-justify
                           [&>iframe]:w-full [&>iframe]:h-auto [&>iframe]:aspect-video
                           [&_mark]:rounded [&_mark]:px-1 [&_mark]:bg-yellow-200 dark:[&_mark]:bg-yellow-600/40
                           [&_*]:whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: about }}
          />
        ) : null}
      </RevealOnScroll>
    </section>
  );
}
