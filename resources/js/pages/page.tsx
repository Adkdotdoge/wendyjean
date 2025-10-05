import { Head, usePage } from '@inertiajs/react';
import FrontendLayout from '@/layouts/frontend-layout';
import type { SharedData } from '@/types';

interface PagePayload {
  id: number;
  title: string;
  nav_label?: string | null;
  content: string;
  updated_at?: string | null;
}

type PageProps = SharedData & {
  page: PagePayload;
};

export default function Page() {
  const { page: payload, name } = usePage<PageProps>().props;

  const title = payload?.title ?? 'Page';
  const updatedAt = payload?.updated_at ? new Date(payload.updated_at) : null;

  return (
    <FrontendLayout>
      <Head title={`${title} • ${name}`} />
      <section className="mx-auto max-w-4xl px-6 py-16 md:py-20">
        <header className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 md:text-4xl">
            {title}
          </h1>
          {updatedAt && (
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              Updated {updatedAt.toLocaleDateString()}
            </p>
          )}
        </header>
        <article
          className="prose prose-neutral mx-auto mt-10 max-w-none dark:prose-invert"
          style={{ whiteSpace: 'pre-wrap' }}
          dangerouslySetInnerHTML={{ __html: payload?.content ?? '' }}
        />
      </section>
    </FrontendLayout>
  );
}
