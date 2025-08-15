// app/library/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import Link from 'next/link';
import {
  FolderPlus,
  Folder,
  File as FileIcon,
  Upload,
  Share2,
  ArrowLeft,
  Trash2,
  Link as LinkIcon,
} from 'lucide-react';

type Item = {
  name: string;        // filename or folder name
  path: string;        // full path in bucket
  type: 'file'|'folder';
  size?: number | null;
  updated_at?: string | null;
};

export default function LibraryPage() {
  const supa = supabaseBrowser();

  // auth gate
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supa.auth.getSession();
      if (mounted) setAuthed(!!session);
      const { data: { subscription } } = supa.auth.onAuthStateChange((_e, sess) => {
        if (mounted) setAuthed(!!sess);
      });
      setLoadingAuth(false);
      return () => subscription.unsubscribe();
    })();
    return () => { mounted = false; };
  }, []); // eslint-disable-line

  // library state
  const [cwd, setCwd] = useState<string>(''); // current "folder" prefix, '' is root
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  async function list(prefix: string) {
    setLoading(true); setErr(null);
    try {
      const { data, error } = await supa.storage.from('library').list(prefix || undefined, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw error;

      const out: Item[] = (data || []).map((e: any) => ({
        name: e.name,
        path: (prefix ? `${prefix}/` : '') + e.name,
        type: e.metadata ? 'file' : 'folder',
        size: e.metadata?.size ?? null,
        updated_at: e.updated_at ?? null,
      }));

      // Folders first for tidier grouping
      out.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1));
      setItems(out);
    } catch (e: any) {
      setErr(e.message || 'Failed to load library');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authed) return; // don’t hit storage until we know user is in
    list(cwd);
  }, [cwd, authed]); // eslint-disable-line

  function goUp() {
    if (!cwd) return;
    const parts = cwd.split('/').filter(Boolean);
    parts.pop();
    setCwd(parts.join('/'));
  }

  async function createFolder() {
    const name = prompt('Folder name?');
    if (!name) return;
    const key = (cwd ? `${cwd}/` : '') + name + '/.keep';
    const { error } = await supa.storage
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
    if (data?.signedUrl) {
      await navigator.clipboard.writeText(data.signedUrl);
      alert('Share link copied!');
    }
  }

  async function shareFolder(prefixPath: string) {
    // Export a .txt with signed links for immediate children (files only).
    const { data, error } = await supa.storage.from('library').list(prefixPath);
    if (error) return alert(error.message);
    const files = (data || []).filter(e => e.metadata);
    const urls: string[] = [];
    for (const f of files) {
      const full = `${prefixPath}/${f.name}`;
      const { data: link } = await supa.storage.from('library').createSignedUrl(full, 60 * 60);
      if (link?.signedUrl) urls.push(link.signedUrl);
    }
    if (urls.length === 0) {
      alert('This folder has no files to share.');
      return;
    }
    const blob = new Blob([urls.join('\n')], { type: 'text/plain' });
    const dl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = dl;
    a.download = (prefixPath.split('/').pop() || 'folder') + '-links.txt';
    a.click();
    URL.revokeObjectURL(dl);
  }

  async function remove(item: Item) {
    if (!confirm(`Delete ${item.type} "${item.name}"?`)) return;
    if (item.type === 'file') {
      const { error } = await supa.storage.from('library').remove([item.path]);
      if (error) return alert(error.message);
    } else {
      // shallow-delete: immediate children + optional .keep
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

  // --- RENDER ---

  // Auth loading state
  if (loadingAuth) {
    return <div className="p-6 text-zinc-500">Loading…</div>;
  }

  // Soft gate for non-members (same style as Office)
  if (!authed) {
    return (
      <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-white/80 dark:bg-zinc-900/70 border border-black/5 dark:border-white/10">
        <h1 className="text-2xl font-semibold">You’ll need your key</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          This room is for members. Head back to the door and request your key.
        </p>
        <Link
          href="/"
          className="inline-flex mt-4 rounded-xl bg-sky-600 text-white px-4 py-2 hover:bg-sky-700"
        >
          Go to the door
        </Link>
      </div>
    );
  }

  // Authenticated Library UI (unchanged look/feel)
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
                  if (f) uploadFile(f);
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
                      onClick={() => {
                        if (item.type === 'folder') {
                          setCwd(item.path);
                        } else {
                          supa.storage
                            .from('library')
                            .createSignedUrl(item.path, 60)
                            .then(({ data, error }) => {
                              if (error) return alert(error.message);
                              if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                            });
                        }
                      }}
                    >
                      {item.name}
                    </button>
                    <div className="text-xs text-zinc-500 truncate">
                      {item.updated_at ? ` • ${new Date(item.updated_at).toLocaleString()}` : ''}
                      {typeof item.size === 'number' ? ` • ${(item.size / 1024).toFixed(1)} KB` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      title="Share"
                      onClick={async () => {
  try {
    if (item.type === 'file') {
      const { data, error } = await supa.storage.from('library').createSignedUrl(item.path, 60 * 60);
      if (error || !data?.signedUrl) return alert(error?.message || 'No link.');
      try {
        await navigator.clipboard.writeText(data.signedUrl);
        alert('Link copied!');
      } catch {
        prompt('Copy link:', data.signedUrl);
      }
    } else {
      // folder -> export links for all files inside (same as your shareFolder)
      const { data, error } = await supa.storage.from('library').list(item.path);
      if (error) return alert(error.message);
      const files = (data || []).filter(e => e.metadata);
      const urls: string[] = [];
      for (const f of files) {
        const full = `${item.path}/${f.name}`;
        const { data: link } = await supa.storage.from('library').createSignedUrl(full, 60 * 60);
        if (link?.signedUrl) urls.push(link.signedUrl);
      }
      const blob = new Blob([urls.join('\n')], { type: 'text/plain' });
      const dl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dl;
      a.download = (item.path.split('/').pop() || 'folder') + '-links.txt';
      a.click();
      URL.revokeObjectURL(dl);
    }
  } catch (e:any) {
    alert(e.message || 'Could not create share link.');
  }
}}
                      <Share2 className="h-4 w-4" />
                    </button>
                    <button
                      title="Copy link"
                      onClick={async () => {
  const targetPath = item.type === 'file' ? item.path : item.path + '/';
  try {
    const { data, error } = await supa.storage.from('library').createSignedUrl(targetPath, 60 * 60);
    if (error || !data?.signedUrl) return alert(error?.message || 'No link.');
    try {
      await navigator.clipboard.writeText(data.signedUrl);
      alert('Link copied!');
    } catch {
      prompt('Copy link:', data.signedUrl);
    }
  } catch (e:any) {
    alert(e.message || 'Could not copy link.');
  }
}}
                      className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50"
                    >
                      <LinkIcon className="h-4 w-4" />
                    </button>
                    <button
                      title="Delete"
                      onClick={() => remove(item)}
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
