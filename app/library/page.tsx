// app/library/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import {
  FolderPlus,
  Folder,
  File as FileIcon,
  Upload,
  Share2,
  ArrowLeft,
  Trash2,
  Link as LinkIcon,
  Pencil,
} from 'lucide-react';

type Item = {
  name: string;
  path: string; // full key in bucket (no leading slash)
  type: 'file' | 'folder';
  size?: number | null;
  updated_at?: string | null;
};

export default function LibraryPage() {
  const supa = supabaseBrowser();
  const [uid, setUid] = useState<string | null>(null);
  const [base, setBase] = useState<string>('');      // "<uid>"
  const [cwd, setCwd] = useState<string>('');        // relative to base, '' = root
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supa.auth.getSession();
      const me = session?.user?.id ?? null;
      setUid(me);
      setBase(me ?? '');
    })();
  }, [supa]);

  async function list(relPrefix: string) {
    if (!base) return;
    setLoading(true); setErr(null);
    const prefix = [base, relPrefix].filter(Boolean).join('/');
    const { data, error } = await supa.storage.from('library').list(prefix || undefined, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) { setErr(error.message); setLoading(false); return; }
    const out: Item[] = (data || []).map((e: any) => ({
      name: e.name,
      path: (prefix ? `${prefix}/` : '') + e.name,
      type: e.metadata ? 'file' : 'folder',
      size: e.metadata?.size ?? null,
      updated_at: e.updated_at ?? null,
    }));
    setItems(out);
    setLoading(false);
  }

  useEffect(() => { if (base) list(cwd); }, [base, cwd]); // eslint-disable-line

  const parentOf = (full: string) => {
    const parts = full.split('/').filter(Boolean); parts.pop(); return parts.join('/');
  };

  function goUp() { if (!cwd) return; const p = cwd.split('/').filter(Boolean); p.pop(); setCwd(p.join('/')); }

  async function createFolder() {
    if (!base) return;
    const name = prompt('Folder name?');
    if (!name) return;
    const key = [base, cwd, name, '.keep'].filter(Boolean).join('/');
    const { error } = await supa.storage.from('library').upload(key, new Blob(['keep'], { type: 'text/plain' }), { upsert: true });
    if (error) return alert(error.message);
    await list(cwd);
  }

  async function uploadFile(file: File) {
    if (!base) return;
    const key = [base, cwd, file.name].filter(Boolean).join('/');
    const { error } = await supa.storage.from('library').upload(key, file, { upsert: true });
    if (error) return alert(error.message);
    await list(cwd);
  }

  function openItem(item: Item) {
    if (item.type === 'folder') { setCwd([cwd, item.name].filter(Boolean).join('/')); return; }
    supa.storage.from('library').createSignedUrl(item.path, 60 * 60).then(({ data, error }) => {
      if (error) return alert(error.message);
      if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    });
  }

  async function shareFile(path: string) {
    const { data, error } = await supa.storage.from('library').createSignedUrl(path, 60 * 60);
    if (error) return alert(error.message);
    const url = data?.signedUrl; if (!url) return;
    if ((navigator as any).share) {
      try { await (navigator as any).share({ url, title: path.split('/').pop()! }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(url); alert('Share link copied!'); } catch { prompt('Copy link:', url); }
  }

  async function shareFolder(prefixPath: string) {
    const { data, error } = await supa.storage.from('library').list(prefixPath);
    if (error) return alert(error.message);
    const files = (data || []).filter((e) => e.metadata);
    if (files.length === 0) return alert('Folder has no files to share.');
    const urls: string[] = [];
    for (const f of files) {
      const full = `${prefixPath}/${f.name}`;
      const { data: link } = await supa.storage.from('library').createSignedUrl(full, 60 * 60);
      if (link?.signedUrl) urls.push(`${f.name}\n${link.signedUrl}\n`);
    }
    const blob = new Blob([urls.join('\n')], { type: 'text/plain' });
    const dl = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = dl; a.download = (prefixPath.split('/').pop() || 'folder') + '-share-links.txt'; a.click();
    URL.revokeObjectURL(dl);
  }

  async function copyLink(item: Item) {
    if (item.type === 'folder') {
      const pseudo = `library://${item.path}/`;
      try { await navigator.clipboard.writeText(pseudo); alert('Folder prefix copied (folders can’t have a single signed link).'); }
      catch { prompt('Copy folder prefix:', pseudo); }
      return;
    }
    const { data, error } = await supa.storage.from('library').createSignedUrl(item.path, 60 * 60);
    if (error) return alert(error.message);
    const url = data?.signedUrl; if (!url) return;
    try { await navigator.clipboard.writeText(url); alert('Link copied!'); } catch { prompt('Copy link:', url); }
  }

  async function remove(item: Item) {
    if (!confirm(`Delete ${item.type} "${item.name}"?`)) return;
    if (item.type === 'file') {
      const { error } = await supa.storage.from('library').remove([item.path]);
      if (error) return alert(error.message);
    } else {
      const { data, error } = await supa.storage.from('library').list(item.path);
      if (error) return alert(error.message);
      const keys = (data || []).map((e: any) => `${item.path}/${e.name}`);
      if (keys.length) {
        const { error: delErr } = await supa.storage.from('library').remove(keys);
        if (delErr) return alert(delErr.message);
      }
      await supa.storage.from('library').remove([item.path + '/.keep']).catch(() => {});
    }
    await list(cwd);
  }

  function toggleRename(id: string) { setRenamingId((c) => (c === id ? null : id)); }

  async function renameInline(item: Item, newNameRaw: string) {
    const newName = newNameRaw.trim();
    if (!newName || newName === item.name) { setRenamingId(null); return; }
    const parent = parentOf(item.path);

    const { data: siblings } = await supa.storage.from('library').list(parent || undefined);
    const conflict = (siblings || []).some((e: any) => e.name === newName && (!!e.metadata === (item.type === 'file')));
    if (conflict) return alert(`A ${item.type} with that name already exists here.`);

    try {
      if (item.type === 'file') {
        const dest = [parent, newName].filter(Boolean).join('/');
        const { error } = await supa.storage.from('library').move(item.path, dest);
        if (error) throw error;
      } else {
        const newPrefix = [parent, newName].filter(Boolean).join('/');
        const { data, error } = await supa.storage.from('library').list(item.path);
        if (error) throw error;
        for (const entry of data || []) {
          const from = `${item.path}/${entry.name}`;
          const to = `${newPrefix}/${entry.name}`;
          const mv = await supa.storage.from('library').move(from, to);
          if (mv.error) throw new Error(mv.error.message);
        }
        await supa.storage.from('library').move(item.path + '/.keep', newPrefix + '/.keep').catch(() => {});
      }
      setRenamingId(null);
      await list(parent.replace(`${base}/`, '').replace(base, ''));
    } catch (e: any) {
      alert(e?.message || 'Rename failed.');
    }
  }

  if (!uid) return <div className="p-6 text-zinc-500">Please sign in…</div>;

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-screen-2xl px-2 sm:px-4">
        <div className="flex items-center justify-between py-4">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Library</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={createFolder}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/80 px-3 py-2 text-sm hover:bg-white/90"
            >
              <FolderPlus className="h-4 w-4" /> New Folder
            </button>

            <label className="relative inline-flex items-center">
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadFile(f);
                  e.currentTarget.value = '';
                }}
              />
              <span className="inline-flex items-center gap-2 rounded-xl bg-sky-600 text-white px-3 py-2 text-sm hover:bg-sky-700">
                <Upload className="h-4 w-4" /> Upload
              </span>
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200/70 dark:border-zinc-800/60">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goUp}
                disabled={!cwd}
                className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <ArrowLeft className="h-4 w-4" /> Up
              </button>
              <div className="text-sm text-zinc-500 break-all">/{cwd}</div>
            </div>
            {err && <div className="text-sm text-red-600">{err}</div>}
          </div>

          {loading ? (
            <div className="p-6 text-zinc-500">Loading…</div>
          ) : (
            <div className="divide-y divide-zinc-200/70 dark:divide-zinc-800/60">
              {items.length === 0 && <div className="p-6 text-zinc-500">Empty.</div>}

              {items.map((item) => (
                <div key={item.path} className="px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.type === 'folder' ? <Folder className="h-5 w-5 text-amber-600" /> : <FileIcon className="h-5 w-5 text-sky-600" />}

                    {renamingId === item.path ? (
                      <RenameForm
                        initial={item.name}
                        onCancel={() => setRenamingId(null)}
                        onSubmit={(val) => renameInline(item, val)}
                      />
                    ) : (
                      <button
                        className="truncate text-left hover:underline"
                        onClick={(e) => { e.stopPropagation(); openItem(item); }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => { e.stopPropagation(); openItem(item); }}
                        title={item.type === 'folder' ? 'Open folder' : 'Open file'}
                      >
                        {item.name}
                      </button>
                    )}

                    <div className="text-xs text-zinc-500 truncate">
                      {item.updated_at ? ` • ${new Date(item.updated_at).toLocaleString()}` : ''}
                      {typeof item.size === 'number' ? ` • ${(item.size / 1024).toFixed(1)} KB` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 relative z-10">
                    <button
                      type="button"
                      aria-label="Share"
                      onClick={(e) => { e.stopPropagation(); item.type === 'file' ? void shareFile(item.path) : void shareFolder(item.path); }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => { e.stopPropagation(); item.type === 'file' ? void shareFile(item.path) : void shareFolder(item.path); }}
                      className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      aria-label="Copy link"
                      onClick={(e) => { e.stopPropagation(); void copyLink(item); }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => { e.stopPropagation(); void copyLink(item); }}
                      className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50"
                    >
                      <LinkIcon className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      aria-label="Rename"
                      onClick={(e) => { e.stopPropagation(); setRenamingId(item.path); }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => { e.stopPropagation(); setRenamingId(item.path); }}
                      className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      aria-label="Delete"
                      onClick={(e) => { e.stopPropagation(); void remove(item); }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => { e.stopPropagation(); void remove(item); }}
                      className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RenameForm({
  initial, onCancel, onSubmit,
}: { initial: string; onCancel: () => void; onSubmit: (v: string) => void; }) {
  const [val, setVal] = useState(initial);
  return (
    <form
      className="flex items-center gap-2 min-w-0"
      onSubmit={(e) => { e.preventDefault(); onSubmit(val); }}
    >
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="min-w-0 max-w-[40ch] truncate rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-sm"
      />
      <button type="submit" className="px-2 py-1 rounded-md text-sm bg-sky-600 text-white hover:bg-sky-700">Save</button>
      <button type="button" onClick={onCancel} className="px-2 py-1 rounded-md text-sm border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900">Cancel</button>
    </form>
  );
}
