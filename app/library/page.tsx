// app/library/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
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
  name: string; // filename or folder name
  path: string; // full path in bucket (no leading slash)
  type: 'file' | 'folder';
  size?: number | null;
  updated_at?: string | null;
};

export default function LibraryPage() {
  const supa = supabaseBrowser();

  const [cwd, setCwd] = useState<string>(''); // current folder ('' = root)
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  // inline rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);

  // ---------- data ----------
  async function list(prefix: string) {
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supa.storage.from('library').list(prefix || undefined, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw error;

      const out: Item[] =
        (data || []).map((e: any) => ({
          name: e.name,
          path: (prefix ? `${prefix}/` : '') + e.name,
          type: e.metadata ? 'file' : 'folder',
          size: e.metadata?.size ?? null,
          updated_at: e.updated_at ?? null,
        })) ?? [];

      setItems(out);
    } catch (e: any) {
      setErr(e.message || 'Failed to load library');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    list(cwd);
  }, [cwd]);

  // parent prefix of a path
  const parentOf = (fullPath: string) => {
    const parts = fullPath.split('/').filter(Boolean);
    parts.pop();
    return parts.join('/');
  };

  // ---------- actions ----------
  function openItem(item: Item) {
    if (item.type === 'folder') {
      setCwd(item.path);
      return;
    }
    // file: sign & open
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    supa.storage
      .from('library')
      .createSignedUrl(item.path, 60 * 60)
      .then(({ data, error }) => {
        if (error) {
          alert(error.message);
          return;
        }
        if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      });
  }

  async function createFolder() {
    const name = prompt('Folder name?');
    if (!name) return;

    // create a placeholder to guarantee the prefix exists
    const key = (cwd ? `${cwd}/` : '') + name + '/.keep';
    const { error } = await supa
      .storage
      .from('library')
      .upload(key, new Blob(['keep'], { type: 'text/plain' }), { upsert: true });

    if (error) return alert(error.message);
    await list(cwd);
  }

  async function uploadFile(file: File) {
    const key = (cwd ? `${cwd}/` : '') + file.name;
    const { error } = await supa.storage.from('library').upload(key, file, { upsert: true });
    if (error) return alert(error.message);
    await list(cwd);
  }

  async function shareFile(path: string) {
    const { data, error } = await supa.storage.from('library').createSignedUrl(path, 60 * 60); // 1h
    if (error) return alert(error.message);
    const url = data?.signedUrl;
    if (!url) return;

    // try native share first
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({ url, title: path.split('/').pop() });
        return;
      } catch {
        /* fall through to clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      alert('Share link copied to clipboard.');
    } catch {
      prompt('Copy link:', url); // iOS fallback
    }
  }

  async function shareFolder(prefixPath: string) {
    // cannot sign a "folder"; generate a .txt with signed URLs for contained files (shallow)
    const { data, error } = await supa.storage.from('library').list(prefixPath);
    if (error) return alert(error.message);

    const files = (data || []).filter((e: any) => !!e.metadata);
    if (files.length === 0) {
      alert('Folder has no files to share.');
      return;
    }

    const urls: string[] = [];
    for (const f of files) {
      const full = `${prefixPath}/${f.name}`;
      const { data: link } = await supa.storage.from('library').createSignedUrl(full, 60 * 60);
      if (link?.signedUrl) urls.push(`${f.name}\n${link.signedUrl}\n`);
    }

    const blob = new Blob([urls.join('\n')], { type: 'text/plain' });
    const dl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = dl;
    a.download = (prefixPath.split('/').pop() || 'folder') + '-share-links.txt';
    a.click();
    URL.revokeObjectURL(dl);
  }

  async function copyLink(item: Item) {
    if (item.type === 'folder') {
      // no “real” folder link; provide a quick heads-up and copy the prefix for reference
      const pseudo = `library://${item.path}/`;
      try {
        await navigator.clipboard.writeText(pseudo);
        alert('Folder prefix copied (note: Supabase cannot create a single signed link for folders).');
      } catch {
        prompt('Copy folder prefix:', pseudo);
      }
      return;
    }

    const { data, error } = await supa.storage.from('library').createSignedUrl(item.path, 60 * 60);
    if (error) return alert(error.message);
    const url = data?.signedUrl;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      alert('Link copied!');
    } catch {
      prompt('Copy link:', url);
    }
  }

  async function remove(item: Item) {
    if (!confirm(`Delete ${item.type} "${item.name}"?`)) return;

    if (item.type === 'file') {
      const { error } = await supa.storage.from('library').remove([item.path]);
      if (error) return alert(error.message);
    } else {
      // shallow delete (contents in that prefix)
      const { data, error } = await supa.storage.from('library').list(item.path);
      if (error) return alert(error.message);
      const keys = (data || []).map((e: any) => `${item.path}/${e.name}`);
      if (keys.length) {
        const { error: delErr } = await supa.storage.from('library').remove(keys);
        if (delErr) return alert(delErr.message);
      }
      // remove placeholder if present
      await supa.storage.from('library').remove([`${item.path}/.keep`]).catch(() => {});
    }
    await list(cwd);
  }

  // ---------- rename ----------
  function toggleRename(id: string) {
    setRenamingId((curr) => (curr === id ? null : id));
  }

  async function renameItemInline(item: Item, newNameRaw: string) {
    const newName = newNameRaw.trim();
    if (!newName || newName === item.name) {
      setRenamingId(null);
      return;
    }

    const parent = parentOf(item.path);

    // prevent overwrite by checking siblings
    const { data: siblings } = await supa.storage.from('library').list(parent || undefined);
    const conflict = (siblings || []).some(
      (e: any) => e.name === newName && (!!e.metadata === (item.type === 'file')),
    );
    if (conflict) {
      alert(`A ${item.type} with that name already exists here.`);
      return;
    }

    try {
      if (item.type === 'file') {
        const dest = [parent, newName].filter(Boolean).join('/');
        const { error } = await supa.storage.from('library').move(item.path, dest);
        if (error) throw error;
      } else {
        // folder: shallow rename by moving each child to the new prefix
        const newPrefix = [parent, newName].filter(Boolean).join('/');
        const { data, error } = await supa.storage.from('library').list(item.path);
        if (error) throw error;

        for (const entry of data || []) {
          const from = `${item.path}/${entry.name}`;
          const to = `${newPrefix}/${entry.name}`;
          const mv = await supa.storage.from('library').move(from, to);
          if (mv.error) throw new Error(`Failed moving ${entry.name}: ${mv.error.message}`);
        }
        // move placeholder if it exists
        await supa.storage.from('library').move(`${item.path}/.keep`, `${newPrefix}/.keep`).catch(() => {});
      }

      setRenamingId(null);
      await list(parent);
    } catch (e: any) {
      alert(e?.message || 'Rename failed.');
    }
  }

  // ---------- small helpers for actions (iOS-hardened) ----------
  function shareClick(item: Item) {
    if (item.type === 'file') return void shareFile(item.path);
    return void shareFolder(item.path);
  }
  function copyClick(item: Item) {
    return void copyLink(item);
  }

  // ---------- UI ----------
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
                onClick={() => setCwd((p) => parentOf(p))}
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
                  {/* LEFT: icon + name/rename + meta */}
                  <div className="flex items-center gap-3 min-w-0">
                    {item.type === 'folder' ? (
                      <Folder className="h-5 w-5 text-amber-600" />
                    ) : (
                      <FileIcon className="h-5 w-5 text-sky-600" />
                    )}

                    {renamingId === item.path ? (
                      <RenameForm
                        initial={item.name}
                        onCancel={() => setRenamingId(null)}
                        onSubmit={(val) => renameItemInline(item, val)}
                      />
                    ) : (
                      <button
                        className="truncate text-left hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openItem(item);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => {
                          e.stopPropagation();
                          openItem(item);
                        }}
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

                  {/* RIGHT: actions (iOS-hardened) */}
                  <div className="flex items-center gap-2 relative z-10">
                    <button
                      type="button"
                      aria-label="Share"
                      onClick={(e) => {
                        e.stopPropagation();
                        shareClick(item);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        shareClick(item);
                      }}
                      className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      aria-label="Copy link"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyClick(item);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        copyClick(item);
                      }}
                      className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50"
                    >
                      <LinkIcon className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      aria-label="Rename"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRename(item.path);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        toggleRename(item.path);
                      }}
                      className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      aria-label="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        void remove(item);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        void remove(item);
                      }}
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

/* ---------- tiny rename form ---------- */
function RenameForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: string;
  onCancel: () => void;
  onSubmit: (v: string) => void;
}) {
  const [val, setVal] = useState(initial);
  return (
    <form
      className="flex items-center gap-2 min-w-0"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(val);
      }}
    >
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="min-w-0 max-w-[40ch] truncate rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-sm"
      />
      <button
        type="submit"
        className="px-2 py-1 rounded-md text-sm bg-sky-600 text-white hover:bg-sky-700"
      >
        Save
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="px-2 py-1 rounded-md text-sm border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
      >
        Cancel
      </button>
    </form>
  );
}
