// app/office/list-builder/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Pencil, Trash2, Plus, Loader2, Play } from 'lucide-react';

// ---------------- Types ----------------
type Prospect = {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  age: number | null;
  list: 'A'|'B'|'C'|null;
  how_known: string | null;
  location: string | null;
  relationship_status:
    | 'single' | 'dating' | 'engaged' | 'married'
    | 'single_with_kids' | 'married_with_kids' | 'unknown' | null;
  date_of_connection: string | null;  // YYYY-MM-DD
  looking: 'looker'|'non-looker'|'learner'|'no_ones_home'|'curious'|'pending'|null;
  last_step: string | null;
  last_step_date: string | null;      // YYYY-MM-DD
  next_step: string | null;
  due_date: string | null;            // YYYY-MM-DD
  notes: string | null;
  created_at: string;
};

const LIST = ['A','B','C'] as const;
const REL = ['single','dating','engaged','married','single_with_kids','married_with_kids','unknown'] as const;
const LOOK = ['looker','non-looker','learner','no_ones_home','curious','pending'] as const;
const STEPS = ['Phone Call','PQI','QI1','QI2','1st Look','Follow Up 1','2nd Look','Follow Up 2','3rd Look','Follow Up 3','GSM','Transition to Customer'] as const;

type FilterField =
  | 'list' | 'relationship_status' | 'looking'
  | 'last_step' | 'next_step' | 'location' | 'age';
type DueFilter = 'Any' | 'Overdue' | 'Today' | 'Upcoming';

// --------------- Page ------------------
export default function ListBuilder() {
  const supa = supabaseBrowser();
  const [rows, setRows] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string|null>(null);

  // filters
  const [search, setSearch] = useState('');
  const [due, setDue] = useState<DueFilter>('Any');
  const [filter, setFilter] = useState<{field: FilterField; value: string}>({ field: 'list', value: '' });

  // selection (for sequences / bulk actions)
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // modal state
  const [editing, setEditing] = useState<Prospect|{id?: string}|null>(null);

  // load data
  useEffect(() => {
    (async () => {
      setLoading(true); setErrorMsg(null);
      const { data, error } = await supa
        .from('prospects')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) setErrorMsg(error.message);
      setRows((data ?? []) as Prospect[]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // derived
  const todayDateOnly = new Date(new Date().toDateString());
  const valueOptions: string[] | null = useMemo(() => {
    switch (filter.field) {
      case 'list': return [...LIST];
      case 'relationship_status': return [...REL];
      case 'looking': return [...LOOK];
      case 'last_step':
      case 'next_step': return [...STEPS];
      default: return null;
    }
  }, [filter.field]);

  const filtered = useMemo(() => {
    const toDate = (s?: string|null) => s ? new Date(`${s}T00:00:00`) : null;

    return rows.filter(r => {
      // search
      const matchQ =
        !search ||
        [r.first_name ?? '', r.last_name ?? '', r.phone ?? '', r.email ?? '']
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase());

      // field/value
      let matchField = true;
      if (filter.value.trim() !== '') {
        switch (filter.field) {
          case 'list': matchField = (r.list ?? '') === filter.value; break;
          case 'relationship_status': matchField = (r.relationship_status ?? 'unknown') === filter.value; break;
          case 'looking': matchField = (r.looking ?? '') === filter.value; break;
          case 'last_step': matchField = (r.last_step ?? '') === filter.value; break;
          case 'next_step': matchField = (r.next_step ?? '') === filter.value; break;
          case 'location': matchField = (r.location ?? '').toLowerCase().includes(filter.value.toLowerCase()); break;
          case 'age': matchField = String(r.age ?? '').trim() === filter.value.trim(); break;
        }
      }

      // due
      let matchDue = true;
      if (due !== 'Any') {
        const d = toDate(r.due_date);
        if (!d) matchDue = false;
        else {
          const cmp = d.getTime() - todayDateOnly.getTime();
          if (due === 'Today')   matchDue = cmp === 0;
          if (due === 'Overdue') matchDue = cmp <  0;
          if (due === 'Upcoming')matchDue = cmp >  0;
        }
      }

      return matchQ && matchField && matchDue;
    });
  }, [rows, search, filter, due, todayDateOnly]);

  // actions
  async function remove(id: string) {
    if (!confirm('Delete this prospect?')) return;
    const { error } = await supa.from('prospects').delete().eq('id', id);
    if (error) return alert(error.message);
    setRows(prev => prev.filter(r => r.id !== id));
  }

  function toggleAll(current: Prospect[]) {
    setSelected(sel => {
      const allSelected = current.every(r => sel[r.id]);
      if (allSelected) {
        const copy = {...sel};
        current.forEach(r => delete copy[r.id]);
        return copy;
      } else {
        const copy = {...sel};
        current.forEach(r => copy[r.id] = true);
        return copy;
      }
    });
  }

  function startSequence() {
    const ids = Object.keys(selected).filter(k => selected[k]);
    if (ids.length === 0) {
      alert('Pick at least one prospect (checkbox).');
      return;
    }
    // Send to outreach runner
    const qs = new URLSearchParams({ ids: ids.join(',') });
    window.location.href = `/office/outreach/sequence?${qs.toString()}`;
  }

  const fmtDate = (s?: string | null) =>
    s ? new Date(`${s}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  // ---------------- UI -----------------
  return (
    <div className="px-4 md:px-6 lg:px-8 max-w-[1700px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mt-6">
        <h1 className="text-3xl font-semibold tracking-tight">List Builder</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={startSequence}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 px-4 py-2 text-sm hover:bg-white"
            title="Start an outreach run with the selected prospects"
          >
            <Play className="h-4 w-4" /> Start Sequence
          </button>
          <button
            onClick={() => setEditing({})}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 text-white font-medium px-4 py-2 hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" /> Add Prospect
          </button>
        </div>
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3">
          {errorMsg}
        </div>
      )}

      {/* Filter Bar (tight spacing / labels) */}
      <div className="mt-4 rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-zinc-950/50 px-3 py-3 sm:px-4 sm:py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[220px_260px_1fr_180px_120px] gap-2 sm:gap-3">
          {/* Field */}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Select field</span>
            <select
              className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3"
              value={filter.field}
              onChange={(e) => setFilter({ field: e.target.value as FilterField, value: '' })}
            >
              <option value="list">List</option>
              <option value="relationship_status">Relationship status</option>
              <option value="looking">Looking</option>
              <option value="last_step">Last step</option>
              <option value="next_step">Next step</option>
              <option value="location">Location</option>
              <option value="age">Age</option>
            </select>
          </label>

          {/* Value */}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Select option</span>
            {valueOptions ? (
              <select
                className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3"
                value={filter.value}
                onChange={(e) => setFilter({ ...filter, value: e.target.value })}
              >
                <option value="">— Select —</option>
                {valueOptions.map(o => <option key={o} value={o}>{o.replace(/_/g,' ')}</option>)}
              </select>
            ) : (
              <input
                className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3"
                placeholder={filter.field === 'age' ? 'Type age…' : 'Type a value…'}
                value={filter.value}
                onChange={(e) => setFilter({ ...filter, value: e.target.value })}
              />
            )}
          </label>

          {/* Search */}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Search (name / phone / email)</span>
            <input
              className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3"
              placeholder="Start typing…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          {/* Due */}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Due</span>
            <select
              className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3"
              value={due}
              onChange={(e) => setDue(e.target.value as DueFilter)}
            >
              <option>Any</option>
              <option>Overdue</option>
              <option>Today</option>
              <option>Upcoming</option>
            </select>
          </label>

          {/* Apply/Reset (kept for affordance) */}
          <div className="flex items-end gap-2">
            <button className="h-10 w-full rounded-xl bg-sky-600 text-white px-4 hover:bg-sky-700" onClick={() => { /* filters are reactive */ }}>
              Apply
            </button>
            <button
              className="h-10 w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4"
              onClick={() => { setFilter({ field: 'list', value: '' }); setSearch(''); setDue('Any'); }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-zinc-950/50">
        {loading ? (
          <div className="p-6 text-zinc-500 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-zinc-500">No prospects found.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-zinc-200/70 dark:border-zinc-800/60">
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    onChange={() => toggleAll(filtered)}
                    checked={filtered.length > 0 && filtered.every(r => selected[r.id])}
                  />
                </th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">List</th>
                <th className="px-3 py-2">Looking</th>
                <th className="px-3 py-2">Last Step</th>
                <th className="px-3 py-2">Next Step</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/60">
              {filtered.map(r => {
                const fullName = [r.first_name, r.last_name].filter(Boolean).join(' ') || '—';
                return (
                  <tr key={r.id} className="align-top">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={!!selected[r.id]}
                        onChange={(e) => setSelected(prev => ({ ...prev, [r.id]: e.target.checked }))}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{fullName}</div>
                      <div className="text-xs text-zinc-500">
                        {r.location || ''} {r.relationship_status ? `• ${r.relationship_status.replace(/_/g, ' ')}` : ''}
                      </div>
                    </td>
                    <td className="px-3 py-2">{r.list ?? '—'}</td>
                    <td className="px-3 py-2">{r.looking ?? '—'}</td>
                    <td className="px-3 py-2">
                      <div>{r.last_step ?? '—'}</div>
                      <div className="text-xs text-zinc-500">{fmtDate(r.last_step_date)}</div>
                    </td>
                    <td className="px-3 py-2">{r.next_step ?? '—'}</td>
                    <td className="px-3 py-2">{fmtDate(r.due_date)}</td>
                    <td className="px-3 py-2">{r.phone ? <a className="hover:underline" href={`tel:${r.phone}`}>{r.phone}</a> : '—'}</td>
                    <td className="px-3 py-2">{r.email ? <a className="hover:underline" href={`mailto:${r.email}`}>{r.email}</a> : '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          title="Edit"
                          onClick={() => setEditing(r)}
                          className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          title="Delete"
                          onClick={() => remove(r.id)}
                          className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit modal */}
      {editing && (
        <ProspectModal
          value={editing as Prospect | { id?: string }}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            setRows(prev => {
              const i = prev.findIndex(p => p.id === saved.id);
              if (i === -1) return [saved, ...prev];
              const copy = [...prev]; copy[i] = saved; return copy;
            });
          }}
        />
      )}
    </div>
  );
}

// ---------------- Modal (inline helper) ----------------
function ProspectModal({
  value,
  onClose,
  onSaved
}: {
  value: Partial<Prospect>;
  onClose: () => void;
  onSaved: (row: Prospect) => void;
}) {
  const supa = supabaseBrowser();
  const isEdit = !!value.id;

  const [draft, setDraft] = useState<Partial<Prospect>>({
    id: value.id,
    first_name: value.first_name ?? '',
    last_name: value.last_name ?? '',
    phone: value.phone ?? '',
    email: value.email ?? '',
    list: value.list ?? null,
    relationship_status: value.relationship_status ?? 'unknown',
    looking: value.looking ?? 'pending',
    last_step: value.last_step ?? '',
    last_step_date: value.last_step_date ?? '',
    next_step: value.next_step ?? '',
    due_date: value.due_date ?? '',
    location: value.location ?? '',
    how_known: value.how_known ?? '',
    age: value.age ?? null,
    notes: value.notes ?? '',
  });
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const payload = {
      first_name: draft.first_name || '',
      last_name: draft.last_name || '',
      phone: (draft.phone || '') as string,
      email: (draft.email || '') as string,
      list: (draft.list ?? null) as any,
      relationship_status: (draft.relationship_status ?? 'unknown') as any,
      looking: (draft.looking ?? 'pending') as any,
      last_step: draft.last_step || null,
      last_step_date: draft.last_step_date || null,
      next_step: draft.next_step || null,
      due_date: draft.due_date || null,
      location: draft.location || null,
      how_known: draft.how_known || null,
      age: draft.age ?? null,
      notes: draft.notes || null,
    };

    if (isEdit) {
      const { data, error } = await supa.from('prospects').update(payload).eq('id', draft.id).select('*').single();
      setBusy(false);
      if (error) return alert(error.message);
      onSaved(data as Prospect);
    } else {
      const { data, error } = await supa.from('prospects').insert(payload).select('*').single();
      setBusy(false);
      if (error) return alert(error.message);
      onSaved(data as Prospect);
    }
  }

  return (
    <div className="fixed inset-0 z-[500] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
        <h2 className="text-lg font-semibold">{isEdit ? 'Edit Prospect' : 'Add Prospect'}</h2>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Text label="First name" value={draft.first_name as string} onChange={v => setDraft(d => ({...d, first_name: v}))}/>
          <Text label="Last name"  value={draft.last_name  as string} onChange={v => setDraft(d => ({...d, last_name: v}))}/>
          <Text label="Phone"      value={draft.phone      as string} onChange={v => setDraft(d => ({...d, phone: v}))}/>
          <Text label="Email"      value={draft.email      as string} onChange={v => setDraft(d => ({...d, email: v}))}/>
          <Select label="List" value={(draft.list ?? '') as any} onChange={v => setDraft(d => ({...d, list: v as any}))} options={['','A','B','C']} />
          <Select label="Relationship" value={(draft.relationship_status ?? 'unknown') as any} onChange={v => setDraft(d => ({...d, relationship_status: v as any}))} options={['unknown',...REL]} />
          <Select label="Looking" value={(draft.looking ?? 'pending') as any} onChange={v => setDraft(d => ({...d, looking: v as any}))} options={LOOK as unknown as string[]} />
          <Text label="Location"   value={draft.location   as string} onChange={v => setDraft(d => ({...d, location: v}))}/>
          <Text label="How do you know?" value={draft.how_known as string} onChange={v => setDraft(d => ({...d, how_known: v}))}/>
          <Text label="Age" type="number" value={String(draft.age ?? '')} onChange={v => setDraft(d => ({...d, age: v ? parseInt(v,10) : null}))}/>
          <Text label="Last step" value={draft.last_step as string} onChange={v => setDraft(d => ({...d, last_step: v}))}/>
          <DateField label="Last step date" value={draft.last_step_date as string} onChange={v => setDraft(d => ({...d, last_step_date: v}))}/>
          <Text label="Next step" value={draft.next_step as string} onChange={v => setDraft(d => ({...d, next_step: v}))}/>
          <DateField label="Due date" value={draft.due_date as string} onChange={v => setDraft(d => ({...d, due_date: v}))}/>
          <Area label="Notes" className="sm:col-span-2" value={draft.notes as string} onChange={v => setDraft(d => ({...d, notes: v}))}/>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2">Cancel</button>
          <button onClick={save} disabled={busy} className="rounded-xl bg-sky-600 text-white px-4 py-2 hover:bg-sky-700 disabled:opacity-60">
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- tiny form helpers ----------
function Text({ label, value, onChange, type='text', className='' }: { label: string; value: string; onChange:(v:string)=>void; type?:string; className?:string }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">{label}</span>
      <input type={type} className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2" value={value} onChange={e=>onChange(e.target.value)} />
    </label>
  );
}
function Area({ label, value, onChange, className='' }: { label:string; value:string; onChange:(v:string)=>void; className?:string }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">{label}</span>
      <textarea rows={3} className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2" value={value} onChange={e=>onChange(e.target.value)} />
    </label>
  );
}
function Select({ label, value, onChange, options, className='' }: { label:string; value:string; onChange:(v:string)=>void; options:string[]; className?:string }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">{label}</span>
      <select className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2" value={value} onChange={e=>onChange(e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o || '—'}</option>)}
      </select>
    </label>
  );
}
function DateField({ label, value, onChange, className='' }: { label:string; value:string; onChange:(v:string)=>void; className?:string }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">{label}</span>
      <input type="date" className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2" value={value || ''} onChange={e=>onChange(e.target.value)} />
    </label>
  );
}
