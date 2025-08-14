// app/office/list-builder/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Pencil, Trash2 } from 'lucide-react';

type Prospect = {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  age: number | null;
  list: 'A' | 'B' | 'C' | null;
  how_known: string | null;
  location: string | null;
  relationship_status:
    | 'single'
    | 'dating'
    | 'engaged'
    | 'married'
    | 'single_with_kids'
    | 'married_with_kids'
    | 'unknown'
    | null;
  date_of_connection: string | null; // YYYY-MM-DD
  looking: 'looker' | 'non-looker' | 'learner' | 'no_ones_home' | 'curious' | 'pending' | null;
  last_step: string | null;
  last_step_date: string | null; // YYYY-MM-DD
  next_step: string | null;
  due_date: string | null; // YYYY-MM-DD
  notes: string | null;
  created_at: string;
};

// Option sets (single source of truth)
const LIST_OPTIONS = ['A', 'B', 'C'] as const;
const REL = [
  'single',
  'dating',
  'engaged',
  'married',
  'single_with_kids',
  'married_with_kids',
  'unknown',
] as const;
const LOOK = ['looker', 'non-looker', 'learner', 'no_ones_home', 'curious', 'pending'] as const;
const STEPS = [
  'Phone Call',
  'PQI',
  'QI1',
  'QI2',
  '1st Look',
  'Follow Up 1',
  '2nd Look',
  'Follow Up 2',
  '3rd Look',
  'Follow Up 3',
  'GSM',
  'Transition to Customer',
] as const;

type FilterField =
  | 'list'
  | 'relationship_status'
  | 'looking'
  | 'last_step'
  | 'next_step'
  | 'location'
  | 'age';

type DueFilter = 'Any' | 'Overdue' | 'Today' | 'Upcoming';

export default function ListBuilder() {
  const supa = supabaseBrowser();

  const [rows, setRows] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New unified filter UI state
  const [filter, setFilter] = useState<{ field: FilterField; value: string }>({
    field: 'list',
    value: '',
  });
  const [search, setSearch] = useState('');
  const [due, setDue] = useState<DueFilter>('Any');

  // Modal/editing placeholder (wire to your existing modal if you have one)
  const [editing, setEditing] = useState<Prospect | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrorMsg(null);
      const { data, error } = await supa
        .from('prospects')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        setErrorMsg(error.message);
      } else {
        setRows((data || []) as Prospect[]);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const todayDateOnly = new Date(new Date().toDateString());
    const toDate = (s?: string | null) => (s ? new Date(`${s}T00:00:00`) : null);

    return rows.filter((r) => {
      // Search across name/phone/email
      const matchQ =
        !search ||
        [r.first_name ?? '', r.last_name ?? '', r.phone ?? '', r.email ?? '']
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase());

      // Field + value filter
      let matchField = true;
      if (filter.value.trim() !== '') {
        switch (filter.field) {
          case 'list':
            matchField = (r.list ?? '') === filter.value;
            break;
          case 'relationship_status':
            matchField = (r.relationship_status ?? 'unknown') === filter.value;
            break;
          case 'looking':
            matchField = (r.looking ?? '') === filter.value;
            break;
          case 'last_step':
            matchField = (r.last_step ?? '') === filter.value;
            break;
          case 'next_step':
            matchField = (r.next_step ?? '') === filter.value;
            break;
          case 'location':
            matchField = (r.location ?? '').toLowerCase().includes(filter.value.toLowerCase());
            break;
          case 'age':
            matchField = String(r.age ?? '').trim() === filter.value.trim();
            break;
        }
      }

      // Due filter (by due_date)
      let matchDue = true;
      if (due !== 'Any') {
        const d = toDate(r.due_date);
        if (!d) {
          matchDue = false;
        } else {
          if (due === 'Today') matchDue = d.getTime() === todayDateOnly.getTime();
          if (due === 'Overdue') matchDue = d.getTime() < todayDateOnly.getTime();
          if (due === 'Upcoming') matchDue = d.getTime() > todayDateOnly.getTime();
        }
      }

      return matchQ && matchField && matchDue;
    });
  }, [rows, search, filter, due]);

  async function remove(id: string) {
    if (!confirm('Delete this prospect?')) return;
    const { error } = await supa.from('prospects').delete().eq('id', id);
    if (error) {
      alert(error.message);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  const fmtDate = (s?: string | null) => {
    if (!s) return '';
    // Render like "Aug 16, 2025"
    const d = new Date(`${s}T00:00:00`);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Compute the option set for the "Value" control depending on field
  const valueOptions: string[] | null = useMemo(() => {
    switch (filter.field) {
      case 'list':
        return [...LIST_OPTIONS];
      case 'relationship_status':
        return [...REL];
      case 'looking':
        return [...LOOK];
      case 'last_step':
      case 'next_step':
        return [...STEPS];
      default:
        return null; // free text input (location, age)
    }
  }, [filter.field]);

  return (
    <div className="px-4 md:px-6 lg:px-8 max-w-[1700px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mt-6">
        <h1 className="text-3xl font-semibold tracking-tight">List Builder</h1>
        <button
          onClick={() => setEditing({} as Prospect)}
          className="rounded-xl bg-sky-600 text-white font-medium px-4 py-2 hover:bg-sky-700"
        >
          + Add Prospect
        </button>
      </div>

      {/* Info / Error */}
      {errorMsg && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3">
          {errorMsg}
        </div>
      )}

      {/* Filter Bar (brand-aligned, labeled) */}
      <div className="mt-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/50 p-3 sm:p-4">
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
    {/* Field */}
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
        Select field
      </span>
      <select
        className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
        value={filter.field}
        onChange={(e) => setFilter({ field: e.target.value as any, value: '' })}
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
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
        Select option
      </span>
      {valueOptions ? (
        <select
          className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          value={filter.value}
          onChange={(e) => setFilter({ ...filter, value: e.target.value })}
        >
          <option value="">— Select —</option>
          {valueOptions.map((o) => (
            <option key={o} value={o}>
              {o.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      ) : (
        <input
          className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
          placeholder={filter.field === 'age' ? 'Type age (e.g., 27)' : 'Type a value…'}
          value={filter.value}
          onChange={(e) => setFilter({ ...filter, value: e.target.value })}
        />
      )}
    </label>

    {/* Search */}
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
        Search (name / phone / email)
      </span>
      <input
        className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
        placeholder="Start typing…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </label>

    {/* Due */}
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
        Due
      </span>
      <select
        className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
        value={due}
        onChange={(e) => setDue(e.target.value as any)}
      >
        <option>Any</option>
        <option>Overdue</option>
        <option>Today</option>
        <option>Upcoming</option>
      </select>
    </label>

    {/* Actions */}
    <div className="flex items-end gap-2">
      <button
        className="w-full rounded-xl bg-sky-600 text-white px-4 py-2 hover:bg-sky-700"
        // reactive filters apply automatically — button kept for UX affordance
        onClick={() => {}}
      >
        Apply
      </button>
      <button
        onClick={() => { setFilter({ field: 'list', value: '' }); setSearch(''); setDue('Any'); }}
        className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2"
      >
        Reset
      </button>
    </div>
  </div>
</div>
      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/50">
        {loading ? (
          <div className="p-6 text-zinc-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-zinc-500">No prospects found.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-zinc-200/70 dark:border-zinc-800/60">
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
              {filtered.map((r) => {
                const fullName = [r.first_name, r.last_name].filter(Boolean).join(' ') || '—';
                return (
                  <tr key={r.id} className="align-top">
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
                    <td className="px-3 py-2">{fmtDate(r.due_date) || '—'}</td>
                    <td className="px-3 py-2">
                      {r.phone ? (
                        <a className="hover:underline" href={`tel:${r.phone}`}>
                          {r.phone}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {r.email ? (
                        <a className="hover:underline" href={`mailto:${r.email}`}>
                          {r.email}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
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

      {/* TODO: hook your existing Add/Edit modal to `editing` state */}
      {/* Example:
          {editing && <ProspectModal value={editing} onClose={()=>setEditing(null)} onSaved={(newRow)=>{...}} />}
      */}
    </div>
  );
}