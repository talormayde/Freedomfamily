'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Card, Page } from '@/components/ui';

type Prospect = {
  id: string;
  owner: string | null;
  // Legacy fields you may still have:
  full_name: string | null;
  contact: string | null;
  status: string;

  // New fields
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  age: number | null;
  list_bucket: 'A'|'B'|'C'|null;
  how_known: string | null;
  location: string | null;
  relationship_status: 'single'|'dating'|'engaged'|'married'|'single_with_kids'|'married_with_kids'|'unknown'|null;
  date_of_connection: string | null; // ISO date string
  looking: 'looker'|'non-looker'|'leaner'|'no_ones_home'|'curious'|'pending'|null;
  last_step: 'Phone Call'|'PQI'|'QI1'|'QI2'|'1st Look'|'Follow Up 1'|'2nd Look'|'Follow Up 2'|'3rd Look'|'Follow Up 3'|'GSM'|null;
  last_step_date: string | null;
  next_step: 'Phone Call'|'PQI'|'QI1'|'QI2'|'1st Look'|'Follow Up 1'|'2nd Look'|'Follow Up 2'|'3rd Look'|'Follow Up 3'|'GSM'|'Transition to Customer'|null;
  due_date: string | null;

  notes: string | null;
  created_at: string;
};

const PIPE_STATUSES = ['QI1','QI2','STP','Guest','Followup','Won','Lost'] as const; // legacy
const REL_OPTIONS = ['single','dating','engaged','married','single_with_kids','married_with_kids','unknown'] as const;
const LOOKING = ['looker','non-looker','leaner','no_ones_home','curious','pending'] as const;
const STEPS = ['Phone Call','PQI','QI1','QI2','1st Look','Follow Up 1','2nd Look','Follow Up 2','3rd Look','Follow Up 3','GSM'] as const;
const NEXT_STEPS = [...STEPS, 'Transition to Customer'] as const;

export default function ListBuilderPage() {
  const supa = supabaseBrowser();
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [listFilter, setListFilter] = useState<string>('');
  const [dueFilter, setDueFilter] = useState<'overdue'|'today'|'upcoming'|''>('');

  // Form state
  const emptyForm = {
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    age: '' as any,
    list_bucket: 'C' as 'A'|'B'|'C',
    how_known: '',
    location: '',
    relationship_status: 'unknown' as Prospect['relationship_status'],
    date_of_connection: null as string | null,
    looking: 'pending' as Prospect['looking'],
    last_step: null as Prospect['last_step'],
    last_step_date: null as string | null,
    next_step: null as Prospect['next_step'],
    due_date: null as string | null,
    notes: '',
    // legacy compatibility
    status: 'Followup' as string,
    contact: '' as string
  };

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);

  useEffect(() => {
    const boot = async () => {
      const { data: { session } } = await supa.auth.getSession();
      const uid = session?.user?.id ?? null;
      setSessionUserId(uid);

      if (!uid) { setLoading(false); return; }

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prospects' }, () => {
        supa
          .from('prospects')
          .select('*')
          .order('created_at', { ascending: false })
          .then(({ data }) => setProspects((data ?? []) as Prospect[]));
      })
      .subscribe();

    return () => { supa.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let arr = prospects;
    if (statusFilter) arr = arr.filter(p => (p.status ?? '') === statusFilter);
    if (listFilter) arr = arr.filter(p => (p.list_bucket ?? '') === listFilter);
    if (dueFilter) {
      const today = new Date().toISOString().slice(0,10);
      if (dueFilter === 'overdue') arr = arr.filter(p => p.due_date && p.due_date < today);
      if (dueFilter === 'today')   arr = arr.filter(p => p.due_date === today);
      if (dueFilter === 'upcoming')arr = arr.filter(p => p.due_date && p.due_date > today);
    }
    if (q) {
      const needle = q.toLowerCase();
      arr = arr.filter(p =>
        (p.first_name ?? '').toLowerCase().includes(needle) ||
        (p.last_name ?? '').toLowerCase().includes(needle) ||
        (p.email ?? '').toLowerCase().includes(needle) ||
        (p.phone ?? '').toLowerCase().includes(needle) ||
        (p.location ?? '').toLowerCase().includes(needle) ||
        (p.notes ?? '').toLowerCase().includes(needle) ||
        (p.how_known ?? '').toLowerCase().includes(needle)
      );
    }
    return arr;
  }, [prospects, q, statusFilter, listFilter, dueFilter]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (p: Prospect) => {
    setEditingId(p.id);
    setForm({
      first_name: p.first_name ?? '',
      last_name: p.last_name ?? '',
      phone: p.phone ?? '',
      email: p.email ?? '',
      age: (p.age as any) ?? '',
      list_bucket: (p.list_bucket as any) ?? 'C',
      how_known: p.how_known ?? '',
      location: p.location ?? '',
      relationship_status: (p.relationship_status as any) ?? 'unknown',
      date_of_connection: p.date_of_connection ?? null,
      looking: (p.looking as any) ?? 'pending',
      last_step: p.last_step ?? null,
      last_step_date: p.last_step_date ?? null,
      next_step: p.next_step ?? null,
      due_date: p.due_date ?? null,
      notes: p.notes ?? '',
      // legacy
      status: p.status ?? 'Followup',
      contact: p.contact ?? ''
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!sessionUserId) { alert('Please sign in first.'); return; }
    if (!form.first_name.trim() && !form.last_name.trim()) { alert('First or last name is required'); return; }

    const payload = {
      owner: sessionUserId,
      first_name: form.first_name || null,
      last_name: form.last_name || null,
      phone: form.phone || null,
      email: form.email || null,
      age: form.age === '' ? null : Number(form.age),
      list_bucket: form.list_bucket,
      how_known: form.how_known || null,
      location: form.location || null,
      relationship_status: form.relationship_status,
      date_of_connection: form.date_of_connection || null,
      looking: form.looking,
      last_step: form.last_step || null,
      last_step_date: form.last_step_date || null,
      next_step: form.next_step || null,
      due_date: form.due_date || null,
      notes: form.notes || null,
      // keep legacy fields synced where possible
      full_name: `${form.first_name ?? ''} ${form.last_name ?? ''}`.trim() || null,
      contact: form.contact || null,
      status: form.status || 'Followup'
    };

    if (editingId) {
      const { error } = await supa.from('prospects').update(payload).eq('id', editingId);
      if (error) { alert(error.message); return; }
    } else {
      const { error } = await supa.from('prospects').insert([payload]);
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
      ['First Name','Last Name','Phone','Email','Age','List','How Known','Location','Relationship','Date of Connection','Looking','Last Step','Last Step Date','Next Step','Due Date','Notes'],
      ...filtered.map(p => [
        p.first_name ?? '', p.last_name ?? '', p.phone ?? '', p.email ?? '', p.age ?? '',
        p.list_bucket ?? '', p.how_known ?? '', p.location ?? '', p.relationship_status ?? '',
        p.date_of_connection ?? '', p.looking ?? '', p.last_step ?? '', p.last_step_date ?? '',
        p.next_step ?? '', p.due_date ?? '', (p.notes ?? '').replace(/\n/g,' ')
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
        <p className="mt-2 text-zinc-600 dark:text-zinc-300">Go back to the home screen and use the key to enter.</p>
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
      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-4 py-3 text-base shadow-inner outline-none focus:ring-2 focus:ring-sky-400"
          placeholder="Search name, phone, email, notes…"
          value={q}
          onChange={e=>setQ(e.target.value)}
        />
        <select className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-4 py-3" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
          <option value="">All legacy statuses</option>
          {PIPE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-4 py-3" value={listFilter} onChange={e=>setListFilter(e.target.value)}>
          <option value="">All lists</option>
          {['A','B','C'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-4 py-3" value={dueFilter} onChange={e=>setDueFilter(e.target.value as any)}>
          <option value="">Any due date</option>
          <option value="overdue">Overdue</option>
          <option value="today">Due Today</option>
          <option value="upcoming">Upcoming</option>
        </select>
      </div>

      {/* Table */}
      <Card className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-zinc-500 dark:text-zinc-400">
            <tr className="[&>th]:py-2 [&>th]:px-2">
              <th>Name</th><th>Phone</th><th>Email</th><th>List</th><th>Looking</th><th>Last Step</th><th>Next Step</th><th>Due</th><th>Where</th><th></th>
            </tr>
          </thead>
          <tbody className="align-top">
            {filtered.map(p => (
              <tr key={p.id} className="border-t border-dashed border-zinc-200/70 dark:border-zinc-800/70 [&>td]:py-3 [&>td]:px-2">
                <td className="font-medium">{[p.first_name, p.last_name].filter(Boolean).join(' ') || p.full_name}</td>
                <td className="text-zinc-600 dark:text-zinc-300">{p.phone}</td>
                <td className="text-zinc-600 dark:text-zinc-300">{p.email}</td>
                <td>{p.list_bucket}</td>
                <td>{p.looking}</td>
                <td>{p.last_step}</td>
                <td>{p.next_step}</td>
                <td>{p.due_date ?? ''}</td>
                <td className="text-zinc-600 dark:text-zinc-300">{p.location}</td>
                <td className="text-right">
                  <div className="inline-flex gap-2">
                    <button onClick={()=>openEdit(p)} className="btn bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-3 py-1.5 text-xs">Edit</button>
                    <button onClick={()=>remove(p.id)} className="btn bg-rose-600 text-white px-3 py-1.5 text-xs">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="py-10 text-center text-zinc-500">No prospects yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={()=>setShowForm(false)}>
          <div className="w-full max-w-3xl card" onClick={e=>e.stopPropagation()}>
            <h3 className="text-lg font-semibold">{editingId ? 'Edit Prospect' : 'Add Prospect'}</h3>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <input className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2" placeholder="First name" value={form.first_name} onChange={e=>setForm({...form, first_name: e.target.value})}/>
              <input className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2" placeholder="Last name" value={form.last_name} onChange={e=>setForm({...form, last_name: e.target.value})}/>
              <select className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2" value={form.list_bucket} onChange={e=>setForm({...form, list_bucket: e.target.value as any})}>
                {['A','B','C'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <input className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2" placeholder="Phone" value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})}/>
              <input type="email" className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2" placeholder="Email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})}/>
              <input type="number" className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2" placeholder="Age" value={form.age} onChange={e=>setForm({...form, age: e.target.value})}/>

              <input className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2 md:col-span-2" placeholder="How do you know them?" value={form.how_known} onChange={e=>setForm({...form, how_known: e.target.value})}/>
              <input className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2" placeholder="Where do they live?" value={form.location} onChange={e=>setForm({...form, location: e.target.value})}/>

              <select className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2" value={form.relationship_status} onChange={e=>setForm({...form, relationship_status: e.target.value as any})}>
                {REL_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
              </select>
              <input type="date" className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2" value={form.date_of_connection ?? ''} onChange={e=>setForm({...form, date_of_connection: e.target.value || null})}/>
              <select className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2" value={form.looking ?? 'pending'} onChange={e=>setForm({...form, looking: e.target.value as any})}>
                {LOOKING.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
              </select>

              <select className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2" value={form.last_step ?? ''} onChange={e=>setForm({...form, last_step: (e.target.value || null) as any})}>
                <option value="">Last step…</option>
                {STEPS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="date" className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2" value={form.last_step_date ?? ''} onChange={e=>setForm({...form, last_step_date: e.target.value || null})}/>
              <select className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2" value={form.next_step ?? ''} onChange={e=>setForm({...form, next_step: (e.target.value || null) as any})}>
                <option value="">Next step…</option>
                {NEXT_STEPS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <input type="date" className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2" value={form.due_date ?? ''} onChange={e=>setForm({...form, due_date: e.target.value || null})}/>
              <textarea className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2 md:col-span-3" rows={4} placeholder="Additional notes" value={form.notes ?? ''} onChange={e=>setForm({...form, notes: e.target.value})}/>
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