import React from 'react';
import { useForm } from '@inertiajs/react';

type ContactFormValues = {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  page_url?: string;
  hp?: string; // honeypot
};

export default function ContactForm() {
  const { data, setData, post, processing, errors, reset, recentlySuccessful } =
    useForm<ContactFormValues>({
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
      page_url: typeof window !== 'undefined' ? window.location.href : '',
      hp: '', // bots fill this; users won't see it
    });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    post('/contact', {
      onSuccess: () => reset('message', 'subject'), // keep name/email around if you want
    });
  }

return (
    <section className="contact-form w-full px-1 flex justify-around bg-sky-100 dark:bg-neutral-950 py-12 text-gray-900 dark:text-neutral-100">
    <form onSubmit={submit} className="space-y-4 w-2xl p-5 border-sky-500/50 border-4 rounded-3xl">
    <h2>Send me a message!</h2>
      {/* Success flash (Inertia shares via props.flash?.success, but this catches recent form success) */}
      {recentlySuccessful && (
        <div className="rounded-md bg-green-50 text-green-800 p-3 text-sm dark:bg-green-900/20 dark:text-green-200 dark:ring-1 dark:ring-green-900/40">Thanks! Your message was sent.</div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-800 dark:text-neutral-200">Name</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => setData('name', e.target.value)}
          className="wj-input mt-1 w-full rounded-md border px-3 py-2 bg-white text-gray-900 placeholder-gray-500 border-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          required
        />
        {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-800 dark:text-neutral-200">Email</label>
        <input
          type="email"
          value={data.email}
          onChange={(e) => setData('email', e.target.value)}
          className="wj-input mt-1 w-full rounded-md border px-3 py-2 bg-white text-gray-900 placeholder-gray-500 border-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          required
        />
        {errors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-800 dark:text-neutral-200">Phone (optional)</label>
        <input
          type="tel"
          value={data.phone || ''}
          onChange={(e) => setData('phone', e.target.value)}
          className="wj-input mt-1 w-full rounded-md border px-3 py-2 bg-white text-gray-900 placeholder-gray-500 border-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
        />
        {errors.phone && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-800 dark:text-neutral-200">Subject (optional)</label>
        <input
          type="text"
          value={data.subject || ''}
          onChange={(e) => setData('subject', e.target.value)}
          className="wj-input mt-1 w-full rounded-md border px-3 py-2 bg-white text-gray-900 placeholder-gray-500 border-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
        />
        {errors.subject && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.subject}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-800 dark:text-neutral-200">Message</label>
        <textarea
          value={data.message}
          onChange={(e) => setData('message', e.target.value)}
          className="wj-input mt-1 w-full rounded-md border px-3 py-2 min-h-[140px] bg-white text-gray-900 placeholder-gray-500 border-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          required
        />
        {errors.message && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.message}</p>}
      </div>

      {/* Honeypot + metadata (hidden) */}
      <input
        type="text"
        name="hp"
        value={data.hp || ''}
        onChange={(e) => setData('hp', e.target.value)}
        className="hidden"
        autoComplete="off"
        tabIndex={-1}
      />
      <input type="hidden" name="page_url" value={data.page_url} />

      <button
        type="submit"
        disabled={processing}
        className="inline-flex items-center rounded-md border px-4 py-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-sky-600 text-white border-sky-700 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-sky-500 dark:hover:bg-sky-400 dark:text-neutral-900 dark:border-sky-600 dark:focus:ring-sky-400"
      >
        {processing ? 'Sending…' : 'Send message'}
      </button>
    </form>
    </section>
  );
}