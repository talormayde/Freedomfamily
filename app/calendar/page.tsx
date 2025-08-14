'use client';
import { useEffect, useMemo, useState } from 'react';
import { Page, Card } from '@/components/ui';
import { supabaseBrowser } from '@/lib/supabase-browser';

type Event = {
  id: string;
  owner: string | null;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string; // ISO
  ends_at: string | null; // ISO
  created_at: string;
};
type Prospect = { id: string; first_name: string|null; last_name: string|null; next_step: string|null; due_date: string|null };

const toISO = (date: string, time: string) => new Date(`${date}T${time}:00`).toISOString();
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const todayStr = () => new Date().toISOString().slice(0,10);

export default function CalendarPage() {
  const supa = supabaseBrowser();
  const [uid, setUid] = useState<string | null>(null);
  const [items, setItems] = useState<Event[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [view, setView] = useState<'day'|'week'|'month'>('week');
  const [includeCRM, setIncludeCRM] = useState(true);

  // modal state
  const emptyForm = { id: null as string|null, title:'', description:'', location:'', startDate:'', startTime:'', endDate:'', endTime:'' };
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => {
    setForm({
      id: null,
      title: '',
      description: '',
      location: '',
      startDate: todayStr(),
      startTime: '09:00',
      endDate: todayStr(),
      endTime: '10:00',
    });
    setShowForm(true);
  };
  const openEdit = (e: Event) => {
    const sd = e.starts_at.slice(0,10);
    const st = e.starts_at.slice(11,16);
    const ed = (e.ends_at ?? e.starts_at).slice(0,10);
    const et = (e.ends_at ?? e.starts_at).slice(11,16);
    setForm({
      id: e.id,
      title: e.title,
      description: e.description ?? '',
      location: e.location ?? '',
      startDate: sd, startTime: st,
      endDate: ed, endTime: et,
    });
    setShowForm(true);
  };

  const resetAndClose = () => { setShowForm(false); setForm(emptyForm); };

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supa.auth.getSession();
      const id = session?.user?.id ?? null;
      setUid(id);
      if (!id) return;
      const { data: evts } = await supa.from('events').select('*').order('starts_at', { ascending: true });
      setItems((evts ?? []) as Event[]);
      const { data: prs } = await supa.from('prospects').select('id, first_name, last_name, next_step, due_date').not('due_date','is',null);
      setProspects((prs ?? []) as Prospect[]);
    })();
  }, []);

  // computed ranges for views
  const range = useMemo(() => {
    const base = new Date();
    const start = new Date(base);
    const end = new Date(base);
    if (view === 'day') {
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
    } else if (view === 'week') {
      const day = base.getDay(); // 0 Sun
      const diff = (day + 6) % 7; // start Mon
      start.setDate(base.getDate() - diff);
      start.setHours(0,0,0,0);
      end.setDate(start.getDate() + 6);
      end.setHours(23,59,59,999);
    } else {
      // month
      start.setDate(1); start.setHours(0,0,0,0);
      end.setMonth(start.getMonth()+1, 0); end.setHours(23,59,59,999);
    }
    return { start, end };
  }, [view]);

  const within = (iso: string) => {
    const d = new Date(iso);
    return d >= range.start && d <= range.end;
  };

  const crmEvents = useMemo(() => {
    if (!includeCRM) return [] as { id:string; title:string; starts_at:string }[];
    return prospects
      .filter(p => p.due_date && within(`${p.due_date}T12:00:00Z`))
      .map(p => ({
        id: `crm-${p.id}`,
        title: `${(p.first_name ?? '')} ${(p.last_name ?? '')}`.trim() + (p.next_step ? ` • ${p.next_step}` : ''),
        starts_at: `${p.due_date}T12:00:00Z`
      }));
  }, [prospects, includeCRM, range]);

  const viewItems = useMemo(() => {
    return items.filter(i => within(i.starts_at));
  }, [items, range]);

  const grouped = useMemo(() => {
    const all = [
      ...viewItems.map(e => ({ kind:'event' as const, date: e.starts_at.slice(0,10), e })),
      ...crmEvents.map(c => ({ kind:'crm' as const, date: c.starts_at.slice(0,10), c })),
    ];
    const m = new Map<string, typeof all>();
    all.forEach(x => { if (!m.has(x.date)) m.set(x.date, [] as any); m.get(x.date)!.push(x); });
    return Array.from(m.entries()).sort(([a],[b]) => a.localeCompare(b));
  }, [viewItems, crmEvents]);

  const save = async () => {
    if (!uid) return;
    if (!form.title.trim() || !form.startDate || !form.startTime) return alert('Title, start date & time are required.');
    const starts_at = toISO(form.startDate, form.startTime);
    const ends_at = (form.endDate && form.endTime) ? toISO(form.endDate, form.endTime) : null;

    if (form.id) {
      const { error } = await supa.from('events').update({
        title: form.title.trim(),
        description: form.description || null,
        location: form.location || null,
        starts_at, ends_at
      }).eq('id', form.id);
      if (error) return alert(error.message);
    } else {
      const { error } = await supa.from('events').insert([{
        owner: uid, title: form.title.trim(), description: form.description || null, location: form.location || null, starts_at, ends_at
      }]);
      if (error) return alert(error.message);
    }
    const { data } = await supa.from('events').select('*').order('starts_at', { ascending: true });
    setItems((data ?? []) as Event[]);
    resetAndClose();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    const { error } = await supa.from('events').delete().eq('id', id);
    if (!error) setItems(items.filter(i => i.id !== id));
  };

  return (
    <Page>
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1>Calendar</h1>
          <div className="flex items-center gap-2">
            <select className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900 px-3 py-2" value={view} onChange={e=>setView(e.target.value as any)}>
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeCRM} onChange={e=>setIncludeCRM(e.target.checked)} />
              Include CRM due items
            </label>
            <button className="btn bg-sky-600 text-white" onClick={openCreate}>Add Event</button>
          </div>
        </div>

        {grouped.length === 0 && <Card className="mt-4">Nothing scheduled in this view.</Card>}

        {grouped.map(([date, arr]) => (
          <div key={date} className="mt-6">
            <h3 className="text-lg font-semibold">{date}</h3>
            <div className="mt-2 grid gap-3">
              {arr.map((row, i) => (
                <Card key={i} className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">
                      {row.kind === 'event' ? row.e.title : row.c.title}
                      {row.kind === 'crm' && <span className="ml-2 text-xs rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5">CRM</span>}
                    </div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-300">
                      {row.kind === 'event'
                        ? `${fmtTime(row.e.starts_at)}${row.e.ends_at ? ` – ${fmtTime(row.e.ends_at)}` : ''}${row.e.location ? ` • ${row.e.location}` : ''}`
                        : 'All-day reminder'}
                    </div>
                    {row.kind === 'event' && row.e.description && <div className="mt-1 text-sm">{row.e.description}</div>}
                  </div>
                  {row.kind === 'event' ? (
                    <div className="flex gap-2">
                      <button className="btn bg-zinc-100 dark:bg-zinc-800" onClick={() => openEdit(row.e)}>Edit</button>
                      <button className="btn bg-rose-600 text-white" onClick={() => remove(row.e.id)}>Delete</button>
                    </div>
                  ) : null}
                </Card>
              ))}
            </div>
          </div>
        ))}

        {/* Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={resetAndClose}>
            <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-zinc-900 shadow-2xl ring-1 ring-black/5 dark:ring-white/10" onClick={(e)=>e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200/70 dark:border-zinc-800/70">
                <h3 className="text-lg font-semibold">{form.id ? 'Edit Event' : 'Add Event'}</h3>
                <button onClick={resetAndClose} className="rounded-xl px-3 py-1.5 text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700">Close</button>
              </div>

              <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="form-field md:col-span-2">
                  <span className="form-label">Title</span>
                  <input className="form-input" value={form.title} onChange={e=>setForm({...form, title:e.target.value})}/>
                </label>
                <label className="form-field md:col-span-2">
                  <span className="form-label">Location</span>
                  <input className="form-input" value={form.location} onChange={e=>setForm({...form, location:e.target.value})}/>
                </label>

                <label className="form-field">
                  <span className="form-label">Start date</span>
                  <input type="date" className="form-input" value={form.startDate} onChange={e=>setForm({...form, startDate:e.target.value})}/>
                </label>
                <label className="form-field">
                  <span className="form-label">Start time</span>
                  <input type="time" className="form-input" value={form.startTime} onChange={e=>setForm({...form, startTime:e.target.value})}/>
                </label>

                <label className="form-field">
                  <span className="form-label">End date</span>
                  <input type="date" className="form-input" value={form.endDate} onChange={e=>setForm({...form, endDate:e.target.value})}/>
                </label>
                <label className="form-field">
                  <span className="form-label">End time</span>
                  <input type="time" className="form-input" value={form.endTime} onChange={e=>setForm({...form, endTime:e.target.value})}/>
                </label>

                <label className="form-field md:col-span-2">
                  <span className="form-label">Description</span>
                  <textarea rows={4} className="form-input" value={form.description} onChange={e=>setForm({...form, description:e.target.value})}/>
                </label>
              </div>

              <div className="flex justify-end gap-2 px-6 pb-6">
                <button className="rounded-xl px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700" onClick={resetAndClose}>Cancel</button>
                <button className="rounded-xl px-4 py-2 bg-sky-600 text-white" onClick={save}>{form.id ? 'Save Changes' : 'Create Event'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
