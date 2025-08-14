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
  list: 'A'|'B'|'C'|null;
  how_known: string | null;
  location: string | null;
  relationship_status: 'single'|'dating'|'engaged'|'married'|'single_with_kids'|'married_with_kids'|'unknown'|null;
  date_of_connection: string | null;
  looking: 'looker'|'non-looker'|'learner'|'no_ones_home'|'curious'|'pending'|null;
  last_step: string | null;
  last_step_date: string | null;
  next_step: string | null;
  due_date: string | null;
  notes: string | null;
  created_at: string;
};

const REL = ['single','dating','engaged','married','single_with_kids','married_with_kids','unknown'] as const;
const STEPS = ['Phone Call','PQI','QI1','QI2','1st Look','Follow Up 1','2nd Look','Follow Up 2','3rd Look','Follow Up 3','GSM','Transition to Customer'] as const;
const LOOK = ['looker','non-looker','learner','no_ones_home','curious','pending'] as const;

export default function ListBuilder() {
  const supa = supabaseBrowser();
  const [rows, setRows] = useState<Prospect[]>([]);
  const [q, setQ] = useState('');
  const [fList, setFList] = useState<'All'|'A'|'B'|'C'>('All');
  const [fRel, setFRel] = useState<'All'|typeof REL[number]>('All');
  const [fLast, setFLast] = useState<'All'|typeof STEPS[number]>('All');
  const [fNext, setFNext] = useState<'All'|typeof STEPS[number]>('All');
  const [fDue, setFDue] = useState<'Any'|'Overdue'|'Today'|'Upcoming'>('Any');

  // modal state omitted to keep file focused—assumes you already have your Add/Edit modal component
  const [editing, setEditing] = useState<Prospect|null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supa
        .from('prospects')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) setRows(data as Prospect[]);
    })();
  }, []);

  const filtered = useMemo(() => {
    const today = new Date();
    return rows.filter(r => {
      const matchQ =
        !q ||
        [r.first_name, r.last_name, r.phone, r.email]
          .join(' ')
          .toLowerCase()
          .includes(q.toLowerCase());

      const matchList = fList === 'All' || r.list === fList;

      const matchRel = fRel === 'All' || (r.relationship_status || 'unknown') === fRel;

      const matchLast = fLast === 'All' || (r.last_step || '') === fLast;
      const matchNext = fNext === 'All' || (r.next_step || '') === fNext;

      let matchDue = true;
      if (fDue !== 'Any') {
        const due = r.due_date ? new Date(r.due_date + 'T00:00:00') : null;
        if (!due) matchDue = false;
        else {
          const isToday =
            due.getFullYear() === today.getFullYear() &&
            due.getMonth() === today.getMonth() &&
            due.getDate() === today.getDate();
          if (fDue === 'Today') matchDue = isToday;
          if (fDue === 'Overdue') matchDue = due < new Date(today.toDateString());
          if (fDue === 'Upcoming') matchDue = due > new Date(today.toDateString());
        }
      }

      return matchQ && matchList && matchRel && matchLast && matchNext && matchDue;
    });
  }, [rows, q, fList, fRel, fLast, fNext, fDue]);

  async function remove(id: string) {
    await supa.from('prospects').delete().eq('id', id);
    setRows(rows => rows.filter(r => r.id !== id));
  }

  return (
    <div className="px-4 md:px-6 lg:px-8 max-w-[1200px] mx-auto w-full">
      <div className="flex items-center justify-between gap-3 mt-6">
        <h1 className="text-3xl font-semibold tracking-tight">List Builder</h1>
        <button
          onClick={() => setEditing({} as Prospect)}
          className="rounded-xl bg-sky-600 text-white font-medium px-4 py-2 hover:bg-sky-700">
          + Add Prospect
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-5 gap-3">
        <input
          placeholder="Search name / phone / email"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          className="lg:col-span-2 rounded-xl border border-zinc-200 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-300"
        />
        <select className="rounded-xl border border-zinc-200 px-3 py-2"
                value={fList}
                onChange={(e)=>setFList(e.target.value as any)}>
          {(['All','A','B','C'] as const).map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select className="rounded-xl border border-zinc-200 px-3 py-2"
                value={fRel}
                onChange={(e)=>setFRel(e.target.value as any)}>
          <option>All</option>
          {REL.map(v => <option key={v} value={v}>{v.replace(/_/g,' ')}</option>)}
        </select>
        <select className="rounded-xl border border-zinc-200 px-3 py-2"
                value={fLast}
                onChange={(e)=>setFLast(e.target.value as any)}>
          <option>All</option>
          {STEPS.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select className="rounded-xl border border-zinc-200 px-3 py-2"
                value={fNext}
                onChange={(e)=>setFNext(e.target.value as any)}>
          <option>All</option>
          {STEPS.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select className="rounded-xl border border-zinc-200 px-3 py-2"
                value={fDue}
                onChange={(e)=>setFDue(e.target.value as any)}>
          {(['Any','Overdue','Today','Upcoming'] as const).map(v => <option key={v}>{v}</option>)}
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-white/80 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">List</th>
              <th className="px-4 py-3 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-t border-zinc-100">
                <td className="px-4 py-3">{[r.first_name, r.last_name].filter(Boolean).join(' ')}</td>
                <td className="px-4 py-3">
                  {r.phone ? <a className="text-sky-700 underline" href={`tel:${r.phone}`}>{r.phone}</a> : '—'}
                </td>
                <td className="px-4 py-3">
                  {r.email ? <a className="text-sky-700 underline" href={`mailto:${r.email}`}>{r.email}</a> : '—'}
                </td>
                <td className="px-4 py-3">{r.list ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={()=>setEditing(r)} className="p-2 rounded-lg bg-white hover:bg-zinc-50 border border-zinc-200">
                      <Pencil size={16}/>
                    </button>
                    <button onClick={()=>remove(r.id)} className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700">
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500">No prospects yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Your existing Add/Edit modal can stay; key TS fix is to coerce nulls to '' in <select> values */}
    </div>
  );
}
