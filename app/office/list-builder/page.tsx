'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Pencil, Trash2, Plus, X } from 'lucide-react';

type Prospect = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  age: number | null;
  list: 'A'|'B'|'C'|null;
  how_known: string | null;
  location: string | null;
  relationship_status: 'single'|'dating'|'engaged'|'married'|'single_with_kids'|'married_with_kids'|'unknown'|null;
  date_of_connection: string | null;
  looking: 'looker'|'non-looker'|'leaner'|'no_ones_home'|'curious'|'pending'|null;
  last_step: string | null;
  last_step_date: string | null;
  next_step: string | null;
  due_date: string | null;
  notes: string | null;
};

const REL = ['single','dating','engaged','married','single_with_kids','married_with_kids','unknown'] as const;
const LISTS = ['A','B','C'] as const;

export default function ListBuilderPage() {
  const supa = supabaseBrowser();
  const [rows, setRows] = useState<Prospect[]>([]);
  const [q, setQ] = useState('');
  const [listFilter, setListFilter] = useState<'All'|'A'|'B'|'C'>('All');
  const [openForm, setOpenForm] = useState<Prospect | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supa.from('prospects').select('*').order('last_name').order('first_name');
    if (error) console.error(error);
    setRows((data ?? []) as any);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let out = rows;
    if (listFilter !== 'All') out = out.filter(r => r.list === listFilter);
    if (q.trim()) {
      const s = q.toLowerCase();
      out = out.filter(r =>
        [r.first_name, r.last_name, r.phone, r.email].some(v => (v || '').toLowerCase().includes(s))
      );
    }
    return out;
  }, [rows, q, listFilter]);

  async function save(p: Prospect) {
    const payload = { ...p, list: (p.list || null), relationship_status: (p.relationship_status || 'unknown') };
    if (p.id) {
      const { error } = await supa.from('prospects').update(payload).eq('id', p.id);
      if (error) return alert(error.message);
    } else {
      const { error } = await supa.from('prospects').insert(payload);
      if (error) return alert(error.message);
    }
    setOpenForm(null);
    await load();
  }

  async function del(id: string) {
    if (!confirm('Delete this prospect?')) return;
    const { error } = await supa.from('prospects').delete().eq('id', id);
    if (error) return alert(error.message);
    await load();
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1>List Builder</h1>
        <button onClick={() => setOpenForm(blankProspect())} className="btn btn-sky inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Prospect
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <input
          value={q}
          onChange={e=>setQ(e.target.value)}
          placeholder="Search name / phone / email"
          className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2 min-w-[260px]"
        />
        <select
          value={listFilter}
          onChange={e=>setListFilter(e.target.value as any)}
          className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2"
        >
          <option>All</option>
          <option>A</option><option>B</option><option>C</option>
        </select>
      </div>

      <div className="mt-6 rounded-2xl bg-white/80 dark:bg-zinc-900/70 shadow overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-zinc-50/70 dark:bg-zinc-800/40">
            <tr className="text-left">
              <Th>Name</Th><Th>Phone</Th><Th>Email</Th><Th>List</Th><Th className="w-24">Actions</Th>
            </tr>
          </thead>
        {loading ? (
          <tbody><tr><td className="px-4 py-6 opacity-70" colSpan={5}>Loading…</td></tr></tbody>
        ) : filtered.length === 0 ? (
          <tbody><tr><td className="px-4 py-6 opacity-70" colSpan={5}>No prospects yet.</td></tr></tbody>
        ) : (
          <tbody>
            {filtered.map(p=>(
              <tr key={p.id} className="border-t border-black/5 dark:border-white/10">
                <Td>{(p.first_name||'') + ' ' + (p.last_name||'')}</Td>
                <Td>{p.phone ? <a className="text-sky-700 dark:text-sky-400 underline" href={`tel:${p.phone}`}>{p.phone}</a> : '—'}</Td>
                <Td>{p.email ? <a className="text-sky-700 dark:text-sky-400 underline" href={`mailto:${p.email}`}>{p.email}</a> : '—'}</Td>
                <Td>{p.list ?? '—'}</Td>
                <Td>
                  <div className="flex gap-2">
                    <button className="btn-icon" onClick={()=>setOpenForm(p)} aria-label="Edit"><Pencil className="w-4 h-4"/></button>
                    <button className="btn-icon btn-danger" onClick={()=>del(p.id)} aria-label="Delete"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        )}
        </table>
      </div>

      {openForm && (
        <ProspectModal
          initial={openForm}
          onClose={()=>setOpenForm(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function Th({ children, className='' }: any) {
  return <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${className}`}>{children}</th>;
}
function Td({ children, className='' }: any) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}

function blankProspect(): Prospect {
  return {
    id: '' as any,
    first_name: '', last_name: '', phone: '', email: '',
    age: null, list: 'C', how_known: '', location: '',
    relationship_status: 'unknown', date_of_connection: null,
    looking: 'pending', last_step: null, last_step_date: null,
    next_step: null, due_date: null, notes: ''
  };
}

function ProspectModal({
  initial, onClose, onSave
}: { initial: Prospect; onClose: () => void; onSave: (p: Prospect) => void; }) {
  const [form, setForm] = useState<Prospect>(initial);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-zinc-900 shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
           onClick={(e)=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10">
          <div className="text-lg font-semibold">{form.id ? 'Edit Prospect' : 'Add Prospect'}</div>
          <button className="btn-icon" onClick={onClose}><X className="w-4 h-4"/></button>
        </div>

        {/* Scrollable content on mobile */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-auto">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="First name">
              <input className="form-input" value={form.first_name || ''} onChange={e=>setForm({...form, first_name:e.target.value})}/>
            </Field>
            <Field label="Last name">
              <input className="form-input" value={form.last_name || ''} onChange={e=>setForm({...form, last_name:e.target.value})}/>
            </Field>
            <Field label="List">
              <select className="form-input" value={form.list ?? 'C'} onChange={e=>setForm({...form, list: e.target.value as any})}>
                {LISTS.map(l=><option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Phone">
              <input className="form-input" value={form.phone || ''} onChange={e=>setForm({...form, phone:e.target.value})}/>
            </Field>
            <Field label="Email">
              <input type="email" className="form-input" value={form.email || ''} onChange={e=>setForm({...form, email:e.target.value})}/>
            </Field>
            <Field label="Age">
              <input type="number" className="form-input" value={form.age ?? ''} onChange={e=>setForm({...form, age: e.target.value ? Number(e.target.value) : null})}/>
            </Field>
            <Field label="How do you know them?">
              <input className="form-input" value={form.how_known || ''} onChange={e=>setForm({...form, how_known:e.target.value})}/>
            </Field>
            <Field label="Where do they live?">
              <input className="form-input" value={form.location || ''} onChange={e=>setForm({...form, location:e.target.value})}/>
            </Field>
            <Field label="Relationship status">
              <select className="form-input" value={form.relationship_status ?? 'unknown'} onChange={e=>setForm({...form, relationship_status: e.target.value as any})}>
                {REL.map(r=><option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}
              </select>
            </Field>
            <Field label="Date of connection">
              <input type="date" className="form-input"
                value={form.date_of_connection ?? ''}
                onChange={e=>setForm({...form, date_of_connection: e.target.value || null})}/>
            </Field>
            <Field label="Last step">
              <input className="form-input" value={form.last_step || ''} onChange={e=>setForm({...form, last_step:e.target.value})}/>
            </Field>
            <Field label="Last step date">
              <input type="date" className="form-input" value={form.last_step_date ?? ''} onChange={e=>setForm({...form, last_step_date:e.target.value || null})}/>
            </Field>
            <Field label="Next step">
              <input className="form-input" value={form.next_step || ''} onChange={e=>setForm({...form, next_step:e.target.value})}/>
            </Field>
            <Field label="Due date">
              <input type="date" className="form-input" value={form.due_date ?? ''} onChange={e=>setForm({...form, due_date:e.target.value || null})}/>
            </Field>
            <div className="md:col-span-2">
              <Field label="Notes">
                <textarea className="form-input min-h-[90px]" value={form.notes || ''} onChange={e=>setForm({...form, notes:e.target.value})}/>
              </Field>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-black/5 dark:border-white/10 flex justify-end gap-3">
          <button className="rounded-xl bg-zinc-200 dark:bg-zinc-800 px-4 py-2" onClick={onClose}>Cancel</button>
          <button className="btn btn-sky" onClick={()=>onSave(form)}>Save</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="form-field block">
      <span className="form-label">{label}</span>
      {children}
    </label>
  );
}
