'use client';
import { useEffect, useState } from 'react';
import { Page, Card } from '@/components/ui';
import { supabaseBrowser } from '@/lib/supabase-browser';

type Item = { name: string; url?: string };

export default function LibraryHome() {
  const supa = supabaseBrowser();
  const [uid, setUid] = useState<string | null>(null);
  const [files, setFiles] = useState<Item[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supa.auth.getSession();
      setUid(session?.user?.id ?? null);
      await refresh();
    })();
  }, []);

  const refresh = async () => {
    const { data } = await supa.storage.from('library').list('', { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });
    const rows = (data ?? []).map(x => ({ name: x.name }));
    // If bucket is public, we can prebuild URLs
    const withUrls = await Promise.all(rows.map(async r => {
      const { data } = supa.storage.from('library').getPublicUrl(r.name);
      return { ...r, url: data.publicUrl };
    }));
    setFiles(withUrls);
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    for (const file of Array.from(e.target.files)) {
      const path = `${Date.now()}_${file.name}`;
      const { error } = await supa.storage.from('library').upload(path, file, { upsert: false });
      if (error) alert(error.message);
    }
    setUploading(false);
    await refresh();
  };

  return (
    <Page>
      <h1>Library</h1>

      <Card className="mt-4">
        <div className="flex flex-wrap items-center gap-3">
          <input type="file" multiple onChange={onUpload} className="block" />
          <button onClick={refresh} className="btn bg-zinc-100 dark:bg-zinc-800">{uploading ? 'Uploading…' : 'Refresh'}</button>
        </div>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Upload audio (mp3/m4a), video (mp4), or PDFs.</p>
      </Card>

      <div className="mt-4 grid gap-4">
        {files.map(f => {
          const lower = f.name.toLowerCase();
          const isAudio = /\.(mp3|m4a|wav|ogg)$/.test(lower);
          const isVideo = /\.(mp4|webm|mov)$/.test(lower);
          const isPDF   = /\.pdf$/.test(lower);

          return (
            <Card key={f.name} className="overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{f.name}</div>
                  {f.url && <a href={f.url} target="_blank" className="text-sm text-sky-700">Open</a>}
                </div>
              </div>
              {isAudio && f.url && <audio controls src={f.url} className="mt-3 w-full" />}
              {isVideo && f.url && <video controls src={f.url} className="mt-3 w-full rounded-xl" />}
              {isPDF && f.url && (
                <div className="mt-3">
                  <iframe src={f.url} className="w-full h-96 rounded-xl" />
                </div>
              )}
            </Card>
          );
        })}
        {files.length === 0 && (
          <Card>No files yet. Upload above.</Card>
        )}
      </div>
    </Page>
  );
}
