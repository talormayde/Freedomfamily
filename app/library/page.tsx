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
  name: string;              // filename or folder name
  path: string;              // full key in bucket
  type: 'file' | 'folder';
  size?: number | null;
  updated_at?: string | null;
};

const BUCKET = 'library';

export default function LibraryPage() {
  const supa = supabaseBrowser();

  const [cwd, setCwd] = useState<string>('');      // current "folder" (prefix). '' = root
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  // ---- helpers --------------------------------------------------------------

  const bucket = () => supa.storage.from(BUCKET);
  const join = (...segs: (string | undefined)[]) => segs.filter(Boolean).join('/');

  async function list(prefix: string) {
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await bucket().list(prefix || undefined, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw error;

      const out: Item[] =
        (data || []).map((e: any) => ({
          name: e.name,
          path: join(prefix, e.name),
          type: e.metadata ? 'file' : 'folder', // Supabase: folders have no metadata
          size: e.metadata?.size ?? null,
          updated_at: e.updated_at ?? null,
        })) || [];

      setItems(out);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load library.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    list(cwd);
  }, [cwd]);

  function goUp() {
    if (!cwd) return;
    const parts = cwd.split('/').filter(Boolean);
    parts.pop();
    setCwd(parts.join('/'));
  }

  // ---- create / upload ------------------------------------------------------

  async function createFolder() {
    const name = prompt('Folder name?');
    if (!name) return;

    // conflict check
    const { data: siblings } = await bucket().list(cwd || undefined);
    if ((siblings || []).some((e: any) => e.name === name && !e.metadata)) {
      alert('A folder with that name already exists here.');
      return;
    }

    // create a placeholder so the folder shows in list()
    const key = join(cwd, name, '.keep');
    const { error } = await bucket().upload(
      key,
      new Blob(['keep'], { type: 'text/plain' }),
      { upsert: true }
    );
    if (error) {
      alert(error.message);
      return;
    }
    await list(cwd);
  }

  async function uploadFile(file: File) {
    const key = join(cwd, file.name);

    // optional conflict check (upsert: true would overwrite)
    const { data: siblings } = await bucket().list(cwd || undefined);
    if ((siblings || []).some((e: any) => e.name === file.name && e.metadata)) {
      const ok = confirm('A file with that name exists. Overwrite?');
      if (!ok) return;
    }

    const { error } = await bucket().upload(key, file, { upsert: true });
    if (error) {
      alert(error.message);
      return;
    }
    await list(cwd);
  }

  // ---- open / share / copy --------------------------------------------------

  async function openItem(item: Item) {
    if (item.type === 'folder') {
      setCwd(item.path);
      return;
    }
    const { data, error } = await bucket().createSignedUrl(item.path, 60 * 60);
    if (error) {
      alert(error.message);
      return;
    }
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  async function shareFile(path: string) {
    const { data, error } = await bucket().createSignedUrl(path, 60 * 60);
    if (error) return alert(error.message);

    try {
      await navigator.clipboard.writeText(data.signedUrl);
      alert('Share link copied to clipboard!');
    } catch {
      // iOS fallback
      prompt('Copy link:', data.signedUrl);
    }
  }

  async function shareFolder(prefixPath: string) {
    // For folders we export a quick file of signed links to the children (shallow).
    const { data, error } = await bucket().list(prefixPath);
    if (error) return alert(error.message);

    const files = (data || []).filter((e: any) => e.metadata);
    const urls: string[] = [];

    for (const f of files) {
      const full = join(prefixPath, f.name);
      const { data: link } = await bucket().createSignedUrl(full, 60 * 60);
      if (link?.signedUrl) urls.push(link.signedUrl);
    }

    if (urls.length === 0) return alert('No files to share in this folder.');

    const blob = new Blob([urls.join('\n')], { type: 'text/plain' });
    const dl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = dl;
    a.download = (prefixPath.split('/').pop() || 'folder') + '-links.txt';
    a.click();
    URL.revokeObjectURL(dl);
  }

  async function copyLink(item: Item) {
    // Copy a single signed URL (file) or the folder “index” text (same as shareFolder).
    if (item.type === 'file') {
      const { data, error } = await bucket().createSignedUrl(item.path, 60 * 60);
      if (error) return alert(error.message);

      try {
        await navigator.clipboard.writeText(data.signedUrl);
        alert('Link copied!');
      } catch {
        prompt('Copy link:', data.signedUrl);
      }
      return;
    }

    // Folder: create a signed URL pack (same as shareFolder), but copy to clipboard instead
    const { data, error } = await bucket().list(item.path);
    if (error) return alert(error.message);

    const files = (data || []).filter((e: any) => e.metadata);
    if (files.length === 0) return alert('No files inside this folder.');

    const lines: string[] = [];
    for (const f of files) {
      const full = join(item.path, f.name);
      const { data: link } = await bucket().createSignedUrl(full, 60 * 60);
      if (link?.signedUrl) lines.push(link.signedUrl);
    }
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      alert('Folder file links copied!');
    } catch {
      prompt('Copy links:', text);
    }
  }

  // ---- rename (file + (shallow) folder) ------------------------------------

  async function renameItem(item: Item) {
    const currentName = item.name;
    const newName = prompt(`Rename ${item.type}`, currentName || '');
    if (!newName || newName === currentName) return;

    // parent prefix ('' when at root)
    const parent = (() => {
      const parts = item.path.split('/').filter(Boolean);
      parts.pop();
      return parts.join('/');
    })();

    // conflicts
    const { data: siblings } = await bucket().list(parent || undefined);
    const conflict = (siblings || []).some((e: any) =>
      e.name === newName && (!!e.metadata === (item.type === 'file'))
    );
    if (conflict) {
      alert(`A ${item.type} with that name already exists here.`);
      return;
    }

    try {
      if (item.type === 'file') {
        const dest = join(parent, newName);
        const { error } = await bucket().move(item.path, dest);
        if (error) throw error;
      } else {
        // shallow folder rename: move each child under new prefix
        const newPrefix = join(parent, newName);
        const { data, error } = await bucket().list(item.path);
        if (error) throw error;

        for (const entry of data || []) {
          const from = join(item.path, entry.name);
          const to = join(newPrefix, entry.name);
          const mv = await bucket().move(from, to);
          if (mv.error) throw new Error(`Failed moving ${entry.name}: ${mv.error.message}`);
        }

        // move .keep if present
        await bucket().move(join(item.path, '.keep'), join(newPrefix, '.keep')).catch(() => {});
      }

      await list(parent);
    } catch (e: any) {
      alert(e?.message || 'Rename failed.');
    }
  }

  // ---- delete ---------------------------------------------------------------

  async function remove(item: Item) {
    if (!confirm(`Delete ${item.type} "${item.name}"?`)) return;

    try {
      if (item.type === 'file') {
        const { error } = await bucket().remove([item.path]);
        if (error) throw error;
      } else {
        // shallow delete of folder contents
        const { data, error } = await bucket().list(item.path);
        if (error) throw error;

        const keys = (data || []).map((e: any) => join(item.path, e.name));
        if (keys.length) {
          const { error: delErr } = await bucket().remove(keys);
          if (delErr) throw delErr;
        }
        // remove placeholder if present
        await bucket().remove([join(item.path, '.keep')]).catch(() => {});
      }

      await list(cwd);
    } catch (e: any) {
      alert(e?.message || 'Delete failed.');
    }
  }

  // ---- UI -------------------------------------------------------------------

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-screen-2xl px-2 sm:px-4">
        <div className="flex items-center justify-between py-4">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Library</h1>
          <div className="flex items-center gap-2">
            <button
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
                    {item.type === 'folder' ? (
                      <Folder className="h-5 w-5 text-amber-600" />
                    ) : (
                      <FileIcon className="h-5 w-5 text-sky-600" />
                    )}

                    <button
                      className="truncate text-left hover:underline"
                      onClick={() => void openItem(item)}
                      title={item.type === 'folder' ? 'Open folder' : 'Open file'}
                    >
                      {item.name}
                    </button>

                    <div className="text-xs text-zinc-500 truncate">
                      {item.updated_at ? ` • ${new Date(item.updated_at).toLocaleString()}` : ''}
                      {typeof item.size === 'number' ? ` • ${(item.size / 1024).toFixed(1)} KB` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Share */}
                    <button
                      title="Share"
                      onClick={() =>
                        item.type === 'file' ? void shareFile(item.path) : void shareFolder(item.path)
                      }
                      className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>

                    {/* Copy link */}
                    <button
                      title="Copy link"
                      onClick={() => void copyLink(item)}
                      className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50"
                    >
                      <LinkIcon className="h-4 w-4" />
                    </button>

                    {/* Rename */}
                    <button
                      title="Rename"
                      onClick={() => void renameItem(item)}
                      className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    {/* Delete */}
                    <button
                      title="Delete"
                      onClick={() => void remove(item)}
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
