'use client';

import { useEffect, useMemo, useState } from 'react';
import { Page, Card } from '@/components/ui';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Pencil, Trash2, Plus } from 'lucide-react';

type Prospect = {
  id: string;
  owner: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  age: string | null;
  list_bucket: 'A'|'B'|'C';
  how_known: string | null;
  location: string | null;
  relationship_status: 'single'|'dating'|'engaged'|'married'|'single_with_kids'|'married_with_kids'|'unknown'|null;
  date_of_connection: string | null;  // yyyy-mm-dd
  looking: 'looker'|'non-looker'|'leaner'|'no_ones_home'|'curious'|'pending'|null;
  last_step: string | null;
  last_step_date: string | null;      // yyyy-mm-dd
  next_step: string | null;
  due_date: string | null;            // yyyy-mm-dd
  notes: string | null;
  created_at: string;
};

const REL_OPTIONS: Prospect['relationship_status'][] = ['single','dating','engaged','married','single_with_kids','married_with_kids','unknown'];
const LOOK_OPTIONS: NonNullable<Prospect['looking']>[] = ['looker','non-looker','leaner','no_ones_home','curious','pending'];
const LAST_STEPS = ['Phone Call','PQI','QI1','QI2','1st Look','Follow Up 1','2nd Look','Follow Up 2','3rd Look','Follow Up 3','GSM'];
const NEXT_STEPS = [...LAST_STEPS, 'Transition to Customer'] as const;

export default function ListBuilderPage() {
  const supa = supabaseBrowser();
  const [uid, setUid] = useState<string | null>(null);
  const [rows, setRows] = useState<Prospect[]>([]);
  const [q, setQ] = useState('');

  // modal state + scroll lock for iPhone
  const emptyForm: Partial<Prospect> = { first_name:'', last_name:'', phone:'', email:'', age:'', list_bucket:'C', how_known:'', location:'', relationship_status:'unknown', date_of_connection:null, looking:'pending', last_step:null, last_step_date:null, next_step:null, due_date:null, notes:'' };
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Prospect>>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { document.body.style.overflow = showForm ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [showForm]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supa.auth.getSession();
      const id = session?.user?.id ?? null;
      setUid(id);
      if (!id) return;
      const { data } = await supa.from('prospects').select('*').order('created_at', { ascending: false });
      setRows((data ?? []) as Prospect[]);
    })();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(r =>
      [r.first_name, r.last_name, r.email, r.phone].some(v => (v ?? '').toLowerCase().includes(t))
    );
  }, [rows, q]);

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };
  const openEdit = (p: Prospect) => { setForm({ ...p }); setEditingId(p.id); setShowForm(true); };

  const save = async () => {
    if (!uid) return;
    const payload = {
      owner: uid,
      first_name: (form.first_name ?? '').trim() || null,
      last_name: (form.last_name ?? '').trim() || null,
      phone: (form.phone ?? '').trim() || null,
      email: (form.email ?? '').trim() || null,
      age: (form.age ?? '').trim() || null,
      list_bucket: (form.list_bucket ?? 'C') as 'A'|'B'|'C',
      how_known: (form.how_known ?? '').trim() || null,
      location: (form.location ?? '').trim() || null,
      relationship_status: (form.relationship_status ?? 'unknown') as Prospect['relationship_status'],
      date_of_connection: form.date_of_connection ?? null,
      looking: (form.looking ?? 'pending') as Prospect['looking'],
      last_step: form.last_step ?? null,
      last_step_date: form.last_step_date ?? null,
      next_step: form.next_step ?? null,
      due_date: form.due_date ?? null,
      notes: form.notes ?? null,
    };
    if (editingId) {
      const { error } = await supa.from('prospects').update(payload).eq('id', editingId);
      if (error) return alert(error.message);
    } else {
      const { error } = await supa.from('prospects').insert([payload]);
      if (error) return alert(error.message);
    }
    const { data } = await supa.from('prospects').select('*').order('created_at', { ascending: false });
    setRows((data ?? []) as Prospect[]);
    setShowForm(false);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this prospect?')) return;
    const { error } = await supa.from('prospects').delete().eq('id', id);
    if (!error) setRows(rows.filter(r => r.id !== id));
  };

  return (
    <Page>
      <div className="w-full">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1>List Builder</h1>
          <button className="btn btn-sky inline-flex items-center gap-2" onClick={openCreate}><Plus className="w-4 h-4"/> Add Prospect</button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input className="form-input" placeholder="Search name / phone / email" value={q} onChange={(e)=>setQ(e.target.value)} />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="table min-w-[900px]">
            <thead>
              <tr>
                <th>Name</th><th>Phone</th><th>Email</th><th>List</th><th>Looking</th><th>Next Step</th><th>Due Date</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>{[p.first_name,p.last_name].filter(Boolean).join(' ')}</td>
                  <td>{p.phone ? <a className="text-sky-600 underline" href={`tel:${p.phone}`}>{p.phone}</a> : '-'}</td>
                  <td className="truncate max-w-[240px]">{p.email ? <a className="text-sky-600 underline" href={`mailto:${p.email}`}>{p.email}</a> : '-'}</td>
                  <td>{p.list_bucket}</td>
                  <td>{p.looking?.replace(/_/g,' ') ?? ''}</td>
                  <td>{p.next_step ?? ''}</td>
                  <td>{p.due_date ?? ''}</td>
                  <td className="text-right">
                    <div className="inline-flex gap-2">
                      <button className="btn-icon btn-ghost" onClick={()=>openEdit(p)} title="Edit" aria-label="Edit"><Pencil className="w-4 h-4"/></button>
                      <button className="btn-icon btn-danger" onClick={()=>remove(p.id)} title="Delete" aria-label="Delete"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 overscroll-contain" onClick={()=>setShowForm(false)}>
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-zinc-900 shadow-2xl ring-1 ring-black/5 dark:ring-white/10" onClick={(e)=>e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200/70 dark:border-zinc-800/70">
                <h3 className="text-lg font-semibold">{editingId ? 'Edit Prospect' : 'Add Prospect'}</h3>
                <button onClick={()=>setShowForm(false)} className="rounded-xl px-3 py-1.5 text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700">Close</button>
              </div>

              <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="form-field"><span className="form-label">First name</span>
                  <input className="form-input" value={form.first_name ?? ''} onChange={(e)=>setForm({...form, first_name:e.target.value})}/>
                </label>
                <label className="form-field"><span className="form-label">Last name</span>
                  <input className="form-input" value={form.last_name ?? ''} onChange={(e)=>setForm({...form, last_name:e.target.value})}/>
                </label>
                <label className="form-field"><span className="form-label">List</span>
                  <select className="form-input" value={form.list_bucket ?? 'C'} onChange={(e)=>setForm({...form, list_bucket:e.target.value as any})}>
                    {['A','B','C'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="form-field"><span className="form-label">Phone</span>
                  <input className="form-input" value={form.phone ?? ''} onChange={(e)=>setForm({...form, phone:e.target.value})}/>
                </label>
                <label className="form-field"><span className="form-label">Email</span>
                  <input type="email" className="form-input" value={form.email ?? ''} onChange={(e)=>setForm({...form, email:e.target.value})}/>
                </label>
                <label className="form-field"><span className="form-label">Age</span>
                  <input type="number" className="form-input" value={form.age ?? ''} onChange={(e)=>setForm({...form, age:e.target.value})}/>
                </label>

                <label className="form-field md:col-span-2"><span className="form-label">How do you know them?</span>
                  <input className="form-input" value={form.how_known ?? ''} onChange={(e)=>setForm({...form, how_known:e.target.value})}/>
                </label>
                <label className="form-field"><span className="form-label">Where do they live?</span>
                  <input className="form-input" value={form.location ?? ''} onChange={(e)=>setForm({...form, location:e.target.value})}/>
                </label>

                <label className="form-field"><span className="form-label">Relationship status</span>
                  <select className="form-input" value={form.relationship_status ?? 'unknown'} onChange={(e)=>setForm({...form, relationship_status:e.target.value as any})}>
                    {REL_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                  </select>
                </label>
                <label className="form-field"><span className="form-label">Date of connection</span>
                  <input type="date" className="form-input" value={form.date_of_connection ?? ''} onChange={(e)=>setForm({...form, date_of_connection:e.target.value || null})}/>
                </label>
                <label className="form-field"><span className="form-label">Looking?</span>
                  <select className="form-input" value={form.looking ?? 'pending'} onChange={(e)=>setForm({...form, looking:e.target.value as any})}>
                    {LOOK_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                  </select>
                </label>

                <label className="form-field"><span className="form-label">Last step</span>
                  <select className="form-input" value={form.last_step ?? ''} onChange={(e)=>setForm({...form, last_step:(e.target.value || null) as any})}>
                    <option value="">—</option>
                    {LAST_STEPS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="form-field"><span className="form-label">Last step date</span>
                  <input type="date" className="form-input" value={form.last_step_date ?? ''} onChange={(e)=>setForm({...form, last_step_date:e.target.value || null})}/>
                </label>
                <label className="form-field"><span className="form-label">Next step</span>
                  <select className="form-input" value={form.next_step ?? ''} onChange={(e)=>setForm({...form, next_step:(e.target.value || null) as any})}>
                    <option value="">—</option>
                    {NEXT_STEPS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>

                <label className="form-field"><span className="form-label">Due date</span>
                  <input type="date" className="form-input" value={form.due_date ?? ''} onChange={(e)=>setForm({...form, due_date:e.target.value || null})}/>
                </label>
                <label className="form-field md:col-span-3"><span className="form-label">Additional notes</span>
                  <textarea rows={4} className="form-input" value={form.notes ?? ''} onChange={(e)=>setForm({...form, notes:e.target.value})}/>
                </label>
              </div>

              <div className="flex justify-end gap-2 px-6 pb-6">
                <button className="rounded-xl px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700" onClick={()=>setShowForm(false)}>Cancel</button>
                <button className="rounded-xl px-4 py-2 btn-sky" onClick={save}>{editingId ? 'Save Changes' : 'Create Prospect'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}