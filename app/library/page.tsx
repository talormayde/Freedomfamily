'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Upload, Trash2 } from 'lucide-react';

type Item = { id: string; path: string; created_at: string; };

export default function LibraryPage() {
  const supa = supabaseBrowser();
  const [items, setItems] = useState<Item[]>([]);
  const [show, setShow] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const bucket = 'library';

  const load = async () => {
    const { data, error } = await supa.storage.from(bucket).list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' }});
    if (!error) {
      setItems((data ?? []).map((d) => ({ id: d.id!, path: d.name, created_at: d.created_at! })));
    }
  };

  useEffect(() => { load(); }, []);

  const upload = async () => {
    if (!file) return;
    const name = `${Date.now()}_${file.name}`;
    const { error } = await supa.storage.from(bucket).upload(name, file, { upsert: false });
    if (error) return alert(error.message);
    setFile(null);
    setShow(false);
    await load();
  };

  const remove = async (path: string) => {
    if (!confirm('Delete this file?')) return;
    const { error } = await supa.storage.from(bucket).remove([path]);
    if (error) return alert(error.message);
    await load();
  };

  const publicUrl = (path: string) => supa.storage.from(bucket).getPublicUrl(path).data.publicUrl;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <h1>Library</h1>
        <button onClick={() => setShow(true)} className="btn btn-sky inline-flex items-center gap-2">
          <Upload className="w-4 h-4" /> Upload
        </button>
      </div>

      <div className="mt-4">
        {items.length === 0 ? (
          <div className="rounded-2xl bg-white/80 dark:bg-zinc-900/70 shadow px-4 py-3">No library items yet.</div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((it) => (
              <li key={it.id} className="rounded-2xl bg-white/80 dark:bg-zinc-900/70 shadow p-4 flex items-start justify-between">
                <a className="font-medium hover:underline break-all" href={publicUrl(it.path)} target="_blank" rel="noreferrer">
                  {it.path.replace(/^\d+_/, '')}
                </a>
                <button className="btn-icon btn-danger" onClick={() => remove(it.path)} aria-label="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal */}
      {show && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setShow(false)}>
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
               onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10">
              <div className="text-lg font-semibold">Upload to Library</div>
              <button onClick={()=>setShow(false)} className="rounded-xl px-3 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-800">Close</button>
            </div>
            <div className="p-6 space-y-4">
              <input type="file" onChange={(e)=>setFile(e.target.files?.[0] ?? null)} />
              <p className="text-sm opacity-70">Accepted: any file type. Files become public in the Library bucket.</p>
              <div className="flex justify-end">
                <button className="btn btn-sky" onClick={upload} disabled={!file}>Upload</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}