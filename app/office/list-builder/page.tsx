'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Card, Page } from '@/components/ui';

type Prospect = {
  id: string;
  owner: string | null;
  full_name: string;
  contact: string | null;
  status: string;
  last_touch: string | null; // ISO date string
  next_action: string | null;
  notes: string | null;
  created_at: string;
};

const STATUSES = ['QI1','QI2','STP','Guest','Followup','Won','Lost'] as const;

export default function ListBuilderPage() {
  const supa = supabaseBrowser();
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Form state
  const emptyForm: Omit<Prospect,'id'|'owner'|'created_at'> = {
    full_name: '',
    contact: '',
    status: 'QI1',
    last_touch: null,
    next_action: '',
    notes: ''
  } as any;

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const boot = async () => {
      const { data: { session } } = await supa.auth.getSession();
      const uid = session?.user?.id ?? null;
      setSessionUserId(uid);

      if (!uid) {
        setLoading(false);
        return;
      }

      const { data, error } = await supa
        .from('prospects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) setError(error.message);
      else setProspects((data ?? []) as Prospect[]);
      setLoading(false);
    };
    boot();

    const channel = supa
  .channel('prospects-realtime')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'prospects' },
    () => {
      // simple refetch on any change
      supa
        .from('prospects')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data }) => setProspects((data ?? []) as Prospect[]));
    }
  )
  .subscribe();

return () => {
  supa.removeChannel(channel);
};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let arr = prospects;
    if (statusFilter) arr = arr.filter(p => p.status === statusFilter);
    if (q) {
      const needle = q.toLowerCase();
      arr = arr.filter(p =>
        (p.full_name ?? '').toLowerCase().includes(needle) ||
        (p.contact ?? '').toLowerCase().includes(needle) ||
        (p.notes ?? '').toLowerCase().includes(needle)
      );
    }
    return arr;
  }, [prospects, q, statusFilter]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (p: Prospect) => {
    setEditingId(p.id);
    setForm({
      full_name: p.full_name,
      contact: p.contact ?? '',
      status: p.status,
      last_touch: p.last_touch,
      next_action: p.next_action ?? '',
      notes: p.notes ?? ''
    } as any);
    setShowForm(true);
  };

  const save = async () => {
    if (!sessionUserId) { alert('Please sign in first.'); return; }
    if (!form.full_name.trim()) { alert('Name is required'); return; }

    if (editingId) {
      const { error } = await supa.from('prospects')
        .update({
          full_name: form.full_name.trim(),
          contact: form.contact || null,
          status: form.status,
          last_touch: form.last_touch || null,
          next_action: form.next_action || null,
          notes: form.notes || null
        })
        .eq('id', editingId);
      if (error) { alert(error.message); return; }
    } else {
      const { error } = await supa.from('prospects')
        .insert([{
          owner: sessionUserId,
          full_name: form.full_name.trim(),
          contact: form.contact || null,
          status: form.status,
          last_touch: form.last_touch || null,
          next_action: form.next_action || null,
          notes: form.notes || null
        }]);
      if (error) { alert(error.message); return; }
    }
    setShowForm(false);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this prospect?')) return;
    const { error } = await supa.from('prospects').delete().eq('id', id);
    if (error) alert(error.message);
  };

  const toCSV = () => {
    const rows = [
      ['Full Name','Contact','Status','Last Touch','Next Action','Notes'],
      ...filtered.map(p => [
        p.full_name, p.contact ?? '', p.status, p.last_touch ?? '', p.next_action ?? '', (p.notes ?? '').replace(/\n/g,' ')
      ])
    ];
    const csv = rows.map(r => r.map(field => {
      const s = String(field ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
    }).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'prospects.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <Page><div className="mt-10">Loading…</div></Page>;
  if (!sessionUserId) return (
    <Page>
      <Card>
        <h3 className="text-lg font-semibold">Sign in to use List Builder</h3>
        <p className="mt-2 text-zinc-600 dark:text-zinc-300">Go back to the home screen and use the magic-link to enter.</p>
      </Card>
    </Page>
  );
  if (error) return <Page><div className="mt-10 text-rose-600">{error}</div></Page>;

  return (
    <Page>
      <div className="flex items-center justify-between gap-3">
        <h1>List Builder</h1>
        <div className="flex gap-2">
          <button onClick={toCSV} className="btn bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700">Export CSV</button>
          <button onClick={openNew} className="btn bg-sky-600 text-white">Add Prospect</button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-4 py-3 text-base shadow-inner outline-none focus:ring-2 focus:ring-sky-400"
          placeholder="Search name, contact, notes…"
          value={q}
          onChange={e=>setQ(e.target.value)}
        />
        <select
          className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-4 py-3 text-base shadow-inner outline-none focus:ring-2 focus:ring-sky-400"
          value={statusFilter}
          onChange={e=>setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <Card className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-zinc-500 dark:text-zinc-400">
            <tr className="[&>th]:py-2 [&>th]:px-2">
              <th>Name</th><th>Contact</th><th>Status</th><th>Last Touch</th><th>Next Action</th><th>Notes</th><th></th>
            </tr>
          </thead>
          <tbody className="align-top">
            {filtered.map(p => (
              <tr key={p.id} className="border-t border-dashed border-zinc-200/70 dark:border-zinc-800/70 [&>td]:py-3 [&>td]:px-2">
                <td className="font-medium">{p.full_name}</td>
                <td className="text-zinc-600 dark:text-zinc-300">{p.contact}</td>
                <td><span className="inline-flex rounded-xl px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-800">{p.status}</span></td>
                <td>{p.last_touch ?? ''}</td>
                <td className="text-zinc-600 dark:text-zinc-300">{p.next_action}</td>
                <td className="text-zinc-600 dark:text-zinc-300 max-w-[28ch] truncate" title={p.notes ?? ''}>{p.notes}</td>
                <td className="text-right">
                  <div className="inline-flex gap-2">
                    <button onClick={()=>openEdit(p)} className="btn bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-3 py-1.5 text-xs">Edit</button>
                    <button onClick={()=>remove(p.id)} className="btn bg-rose-600 text-white px-3 py-1.5 text-xs">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="py-10 text-center text-zinc-500">No prospects yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={()=>setShowForm(false)}>
          <div className="w-full max-w-lg card" onClick={e=>e.stopPropagation()}>
            <h3 className="text-lg font-semibold">{editingId ? 'Edit Prospect' : 'Add Prospect'}</h3>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1">
                <span className="text-sm text-zinc-600 dark:text-zinc-300">Full Name</span>
                <input className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2" value={form.full_name} onChange={e=>setForm({...form, full_name: e.target.value})}/>
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-zinc-600 dark:text-zinc-300">Contact</span>
                <input className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2" value={form.contact ?? ''} onChange={e=>setForm({...form, contact: e.target.value})}/>
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-zinc-600 dark:text-zinc-300">Status</span>
                <select className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2" value={form.status} onChange={e=>setForm({...form, status: e.target.value})}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-zinc-600 dark:text-zinc-300">Last Touch</span>
                <input type="date" className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2"
                  value={form.last_touch ?? ''} onChange={e=>setForm({...form, last_touch: e.target.value || null})}/>
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-zinc-600 dark:text-zinc-300">Next Action</span>
                <input className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2" value={form.next_action ?? ''} onChange={e=>setForm({...form, next_action: e.target.value})}/>
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-zinc-600 dark:text-zinc-300">Notes</span>
                <textarea className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2" rows={4} value={form.notes ?? ''} onChange={e=>setForm({...form, notes: e.target.value})}/>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700" onClick={()=>setShowForm(false)}>Cancel</button>
              <button className="btn bg-sky-600 text-white" onClick={save}>{editingId ? 'Save Changes' : 'Create Prospect'}</button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
