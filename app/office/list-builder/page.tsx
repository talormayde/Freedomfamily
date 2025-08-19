// app/office/list-builder/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Upload, Play, Pencil, Trash2, Loader2 } from 'lucide-react';

/** Pipeline steps (dropdowns) */
const STEPS = [
  'Connection','Phone Call','PQI','QI 1','QI 2',
  'Info Session – 1st Look','Follow Up – 1',
  'Info Session – 2nd Look','Follow Up – 2',
  'Info Session – 3rd Look','GSM (Getting Started Meeting)','Launch'
] as const;
type Step = typeof STEPS[number];

type Prospect = {
  id: string;
  owner_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  source: 'A'|'B'|'C'|null;         // <- replaces legacy "list"
  looking: string | null;
  last_step: Step | null;
  next_step: Step | null;
  due_date: string | null;          // YYYY-MM-DD
  notes: string | null;
  updated_at: string;
};

export default function ListBuilderPage() {
  const supa = supabaseBrowser();

  const [uid, setUid] = useState<string | null>(null);
  const [rows, setRows] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [q, setQ] = useState('');
  const [src, setSrc] = useState<''|'A'|'B'|'C'>('');

  // selection / modals
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supa.auth.getSession();
      const me = session?.user?.id ?? null;
      setUid(me);
      if (!me) { setLoading(false); return; }

      setLoading(true);
      const { data, error } = await supa
        .from('prospects')
        .select('id, owner_id, first_name, last_name, phone, email, source, looking, last_step, next_step, due_date, notes, updated_at')
        .eq('owner_id', me)
        .order('updated_at', { ascending: false });
      if (error) console.error(error);
      setRows((data ?? []) as Prospect[]);
      setLoading(false);
    })();
  }, [supa]);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return rows.filter(r => {
      const blob = [r.first_name, r.last_name, r.phone, r.email, r.notes].join(' ').toLowerCase();
      const okQ = k ? blob.includes(k) : true;
      const okS = src ? r.source === src : true;
      return okQ && okS;
    });
  }, [rows, q, src]);

  function toggleAll(v: boolean) {
    const next: Record<string, boolean> = {};
    filtered.forEach(r => { next[r.id] = v; });
    setSel(next);
  }

  async function saveProspect(p: Partial<Prospect> & { id?: string }) {
    if (!uid) return;
    const clean = {
      owner_id: uid,
      first_name: p.first_name ?? '',
      last_name:  p.last_name ?? '',
      phone:      p.phone ?? '',
      email:      p.email ?? '',
      source:     (p.source ?? null) as any,
      looking:    p.looking ?? null,
      last_step:  p.last_step ?? null,
      next_step:  p.next_step ?? null,
      due_date:   p.due_date ?? null,
      notes:      p.notes ?? '',
    };
    if (p.id) {
      const { data, error } = await supa.from('prospects').update(clean).eq('id', p.id).select('*').single();
      if (error) return alert(error.message);
      setRows(prev => prev.map(r => r.id === p.id ? (data as any) : r));
    } else {
      const { data, error } = await supa.from('prospects').insert(clean).select('*').single();
      if (error) return alert(error.message);
      setRows(prev => [data as any, ...prev]);
    }
    setEditing(null);
  }

  async function removeProspect(id: string) {
    if (!confirm('Delete this prospect?')) return;
    const { error } = await supa.from('prospects').delete().eq('id', id);
    if (error) return alert(error.message);
    setRows(prev => prev.filter(r => r.id !== id));
  }

  async function importCSV(rowsIn: ProspectCSVRow[]) {
    if (!uid) return;
    if (!rowsIn.length) return;
    const payload = rowsIn.map(r => ({
      owner_id: uid,
      first_name: r.first_name || '',
      last_name:  r.last_name || '',
      phone:      r.phone || '',
      email:      r.email || '',
      source:     (r.source as any) ?? null,
      looking:    r.looking || null,
      last_step:  (r.last_step as Step) || null,
      next_step:  (r.next_step as Step) || null,
      due_date:   r.due_date || null,
      notes:      r.notes || '',
    }));
    const { error } = await supa.from('prospects').insert(payload);
    if (error) return alert(error.message);
    const { data } = await supa
      .from('prospects')
      .select('id, owner_id, first_name, last_name, phone, email, source, looking, last_step, next_step, due_date, notes, updated_at')
      .eq('owner_id', uid)
      .order('updated_at', { ascending: false });
    setRows((data ?? []) as Prospect[]);
    setImportOpen(false);
  }

  if (!uid) return <div className="p-6 text-zinc-500">Please sign in.</div>;
  if (loading) return <div className="p-6 text-zinc-500">Loading…</div>;

  const selectedIds = Object.entries(sel).filter(([_,v])=>v).map(([k])=>k);

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-[1300px] mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
        <h1 className="text-3xl font-semibold tracking-tight">List Builder</h1>
        <div className="flex items-center gap-2">
          <button onClick={()=>setImportOpen(true)} className="glassbtn inline-flex items-center gap-2">
            <Upload className="h-4 w-4" /> Import CSV
          </button>
          <Link
            href={selectedIds.length ? `/office/outreach/sequence?ids=${selectedIds.join(',')}` : '#'}
            className={`glassbtn inline-flex items-center gap-2 ${selectedIds.length ? '' : 'pointer-events-none opacity-50'}`}
          >
            <Play className="h-4 w-4" /> Start Sequence
          </Link>
          <button onClick={()=>setEditing({} as any)} className="glassbtn-primary">+ Add Prospect</button>
        </div>
      </div>

      {/* Filter bar (liquid glass) */}
      <div className="mt-4 rounded-[20px] border border-white/60 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl ring-1 ring-black/5 p-3 sm:p-4">
        <div className="grid gap-3 md:grid-cols-[200px_1fr_160px_auto_auto] items-center">
          <select value={src} onChange={e=>setSrc(e.target.value as any)} className="glassfld">
            <option value="">Source (A/B/C)</option>
            <option value="A">A-List</option><option value="B">B-List</option><option value="C">C-List</option>
          </select>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name / phone / email / notes…" className="glassfld" />
          <div />
          <button className="glassbtn-primary">Apply</button>
          <button onClick={()=>{ setQ(''); setSrc(''); }} className="glassbtn">Reset</button>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 rounded-[20px] overflow-hidden border border-white/60 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl ring-1 ring-black/5">
        <div className="grid grid-cols-[42px_1.1fr_.6fr_.8fr_.9fr_.9fr_.9fr_1fr_120px] gap-3 px-3 py-2 text-xs bg-white/60 dark:bg-white/10">
          <div>
            <input type="checkbox"
              checked={filtered.length>0 && filtered.every(r=>sel[r.id])}
              onChange={(e)=>toggleAll(e.target.checked)}
            />
          </div>
          <div>Name</div><div>Source</div><div>Looking</div>
          <div>Last Step</div><div>Next Step</div><div>Due</div>
          <div>Contact</div><div>Actions</div>
        </div>

        {filtered.map(r => (
          <div key={r.id} className="grid grid-cols-[42px_1.1fr_.6fr_.8fr_.9fr_.9fr_.9fr_1fr_120px] gap-3 items-center px-3 py-2 border-t border-white/40 dark:border-white/10">
            <div><input type="checkbox" checked={!!sel[r.id]} onChange={(e)=>setSel(prev=>({ ...prev, [r.id]: e.target.checked }))}/></div>
            <div className="truncate">
              <div className="font-medium">{[r.first_name, r.last_name].filter(Boolean).join(' ') || '—'}</div>
            </div>
            <div>{r.source || '—'}</div>
            <div className="capitalize">{r.looking || '—'}</div>
            <div className="truncate">{r.last_step || '—'}</div>
            <div className="truncate">{r.next_step || '—'}</div>
            <div className="truncate">{r.due_date || '—'}</div>
            <div className="truncate">
              {r.phone ? <a className="underline" href={`tel:${r.phone}`}>{r.phone}</a> : '—'}
              {r.email ? <span> · <a className="underline" href={`mailto:${r.email}`}>{r.email}</a></span> : ''}
            </div>
            <div className="flex items-center gap-2">
              <button className="icobtn" title="Edit" onClick={()=>setEditing(r)}><Pencil className="h-4 w-4" /></button>
              <button className="icobtn danger" title="Delete" onClick={()=>removeProspect(r.id)}><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && <div className="p-6 text-zinc-500">No matches.</div>}
      </div>

      {/* Editor */}
      {editing && <EditModal value={editing} onClose={()=>setEditing(null)} onSave={saveProspect} />}

      {/* Importer */}
      {importOpen && <ImportCSVModal onClose={()=>setImportOpen(false)} onImport={importCSV} />}

      {/* Glass utilities for consistent finish */}
      <style jsx global>{`
        .glassbtn {
          @apply rounded-xl px-4 py-2 border border-white/60 dark:border-white/10 bg-white/50 dark:bg-white/10 backdrop-blur shadow-sm ring-1 ring-black/5 hover:bg-white/70 transition;
        }
        .glassbtn-primary {
          @apply rounded-xl px-4 py-2 bg-sky-600 text-white shadow-[0_6px_18px_rgba(2,132,199,0.35)] hover:bg-sky-700 transition;
        }
        .glassfld {
          @apply h-11 w-full rounded-xl border border-white/60 dark:border-white/10 bg-white/70 dark:bg-white/10 px-3 backdrop-blur focus:outline-none focus:ring-2 focus:ring-sky-400/60;
        }
        .icobtn {
          @apply grid place-items-center h-9 w-9 rounded-xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-white/10 backdrop-blur hover:bg-white/80 ring-1 ring-black/5;
        }
        .icobtn.danger { @apply border-red-200/60 bg-red-50/60 text-red-700 hover:bg-red-100; }
      `}</style>
    </div>
  );
}

/* ---------- Edit Modal ---------- */
function EditModal({ value, onClose, onSave }: {
  value: Partial<Prospect>;
  onClose: () => void;
  onSave: (v: Partial<Prospect> & { id?: string }) => void;
}) {
  const [draft, setDraft] = useState<Partial<Prospect>>({
    id: value.id,
    first_name: value.first_name ?? '',
    last_name:  value.last_name ?? '',
    phone:      value.phone ?? '',
    email:      value.email ?? '',
    source:     value.source ?? null,
    looking:    value.looking ?? 'pending',
    last_step:  value.last_step ?? null,
    next_step:  value.next_step ?? null,
    due_date:   value.due_date ?? null,
    notes:      value.notes ?? '',
  });

  return (
    <div className="fixed inset-0 z-[500] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-[22px] border border-white/60 dark:border-white/10 bg-white/70 dark:bg-white/10 backdrop-blur-xl ring-1 ring-black/5 p-5 sm:p-6">
        <h3 className="text-lg font-semibold">{draft.id ? 'Edit Prospect' : 'Add Prospect'}</h3>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="First name"><input className="glassfld" value={draft.first_name as any} onChange={e=>setDraft(d=>({ ...d, first_name: e.target.value }))}/></Field>
          <Field label="Last name"><input className="glassfld" value={draft.last_name as any} onChange={e=>setDraft(d=>({ ...d, last_name: e.target.value }))}/></Field>
          <Field label="Phone"><input className="glassfld" value={draft.phone as any} onChange={e=>setDraft(d=>({ ...d, phone: e.target.value }))}/></Field>
          <Field label="Email"><input className="glassfld" value={draft.email as any} onChange={e=>setDraft(d=>({ ...d, email: e.target.value }))}/></Field>

          <Field label="Source (A/B/C)">
            <select className="glassfld" value={draft.source ?? ''} onChange={e=>setDraft(d=>({ ...d, source: (e.target.value || null) as any }))}>
              <option value="">—</option><option value="A">A-List</option><option value="B">B-List</option><option value="C">C-List</option>
            </select>
          </Field>

          <Field label="Looking">
            <select className="glassfld" value={draft.looking ?? 'pending'} onChange={e=>setDraft(d=>({ ...d, looking: e.target.value }))}>
              {['pending','looker','non-looker','learner','no one’s home','curious'].map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </Field>

          <Field label="Last Step">
            <select className="glassfld" value={draft.last_step ?? ''} onChange={e=>setDraft(d=>({ ...d, last_step: (e.target.value || null) as any }))}>
              <option value="">—</option>{STEPS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          <Field label="Next Step">
            <select className="glassfld" value={draft.next_step ?? ''} onChange={e=>setDraft(d=>({ ...d, next_step: (e.target.value || null) as any }))}>
              <option value="">—</option>{STEPS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          <Field label="Due date"><input type="date" className="glassfld" value={draft.due_date ?? ''} onChange={e=>setDraft(d=>({ ...d, due_date: e.target.value || null }))}/></Field>

          <div className="sm:col-span-2">
            <Field label="Notes"><textarea rows={4} className="glassfld" value={draft.notes as any} onChange={e=>setDraft(d=>({ ...d, notes: e.target.value }))}/></Field>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="glassbtn">Cancel</button>
          <button onClick={()=>onSave(draft)} className="glassbtn-primary">{draft.id ? 'Save' : 'Add to List'}</button>
        </div>
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-sm text-zinc-700 dark:text-zinc-300 grid gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

/* ---------- CSV Import ---------- */
type ProspectCSVRow = {
  first_name?: string; last_name?: string; phone?: string; email?: string;
  source?: 'A'|'B'|'C'; looking?: string; last_step?: string; next_step?: string;
  due_date?: string; notes?: string;
};

function ImportCSVModal({ onClose, onImport }: {
  onClose: () => void;
  onImport: (rows: ProspectCSVRow[]) => void;
}) {
  const [rows, setRows] = useState<ProspectCSVRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(file: File) {
    try {
      setErr(null);
      const text = await file.text();
      const [head, ...lines] = text.split(/\r?\n/).filter(Boolean);
      const cols = head.split(',').map(c => c.trim().toLowerCase());
      const out: ProspectCSVRow[] = lines.map(line => {
        const cells = line.split(',');
        const rec: any = {};
        cols.forEach((c, i) => rec[c] = (cells[i] ?? '').trim());
        return rec;
      });
      setRows(out.slice(0, 2000));
    } catch (e: any) {
      setErr(e?.message || 'Could not parse CSV.');
    }
  }

  return (
    <div className="fixed inset-0 z-[510] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-[22px] border border-white/60 dark:border-white/10 bg-white/70 dark:bg-white/10 backdrop-blur-xl ring-1 ring-black/5 p-5 sm:p-6">
        <h3 className="text-lg font-semibold">Import Contacts (CSV)</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Columns: <code>first_name,last_name,phone,email,source(A/B/C),looking,last_step,next_step,due_date,notes</code>
        </p>
        <div className="mt-3 flex items-center gap-3">
          <input type="file" accept=".csv,text/csv" onChange={(e)=>{ const f = e.target.files?.[0]; if (f) void handleFile(f); }} />
          <button disabled={!rows.length} onClick={()=>onImport(rows)} className="glassbtn-primary">
            Import {rows.length ? `(${rows.length})` : ''}
          </button>
          <button onClick={onClose} className="glassbtn">Close</button>
        </div>
        {!!err && <div className="mt-2 text-red-600 text-sm">{err}</div>}
      </div>
    </div>
  );
}
