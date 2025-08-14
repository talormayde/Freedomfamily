'use client';

import { useEffect, useState } from 'react';
import { Page, Card } from '@/components/ui';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Share2, Download, Upload } from 'lucide-react';

type LibraryItem = {
  id: string;
  title: string;
  description: string | null;
  url: string; // direct link to file
  type: 'audio' | 'video' | 'pdf' | 'doc';
  created_at: string;
};

export default function LibraryPage() {
  const supa = supabaseBrowser();
  const [uid, setUid] = useState<string | null>(null);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supa.auth.getSession();
      const id = session?.user?.id ?? null;
      setUid(id);
      if (!id) return;

      // Pull from your `library_items` table in Supabase
      const { data, error } = await supa
        .from('library_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error) setItems((data ?? []) as LibraryItem[]);
      setLoading(false);
    })();
  }, []);

  const shareItem = async (item: LibraryItem) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: item.description ?? '',
          url: item.url
        });
      } catch (err) {
        console.error('Share cancelled or failed', err);
      }
    } else {
      await navigator.clipboard.writeText(item.url);
      alert('Link copied to clipboard');
    }
  };

  return (
    <Page>
      <div className="w-full">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1>Library</h1>
          {uid && (
            <button
              className="btn btn-sky inline-flex items-center gap-2"
              onClick={() => alert('Upload modal here')}
            >
              <Upload className="w-4 h-4" /> Upload
            </button>
          )}
        </div>

        {loading && <Card className="mt-4">Loading library…</Card>}

        {!loading && items.length === 0 && (
          <Card className="mt-4">No library items yet.</Card>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className="flex flex-col">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                {item.description && (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300 line-clamp-3">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-icon btn-ghost"
                    title="Download / View"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    className="btn-icon btn-ghost"
                    onClick={() => shareItem(item)}
                    title="Share"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Page>
  );
}