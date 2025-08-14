'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Plus, Trash2, Pencil } from 'lucide-react';

type EventRow = {
  id: string;
  title: string;
  location: string | null;
  notes: string | null;
  start_at: string; // ISO
  end_at: string | null; // ISO
  kind: 'crm'|'custom'|null; // optional tag
  prospect_id: string | null;
};

function fmtDate(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}
function fmtTime(d?: string | null) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function CalendarPage() {
  const supa = supabaseBrowser();
  const [rows, setRows] = useState<EventRow[]>([]);
  const [view, setView] = useState<'month'|'week'|'day'|'list'>('list');
  const [open, setOpen] = useState<EventRow | null>(null);

  async function load() {
    const { data, error } = await supa.from('events').select('*').order('start_at');
    if (error) console.error(error);
    setRows((data ?? []) as any);
  }
  useEffect(()=>{ load(); }, []);

  const grouped = useMemo(() => {
    const m = new Map<string, EventRow[]>();
    rows.forEach(r => {
      const key = r.start_at.split('T')[0];
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    });
    return Array.from(m.entries()).sort((a,b)=> a[0] < b[0] ? -1 : 1);
  }, [rows]);

  async function save(ev: EventRow) {
    if (ev.id) {
      const { error } = await supa.from('events').update(ev).eq('id', ev.id);
      if (error) return alert(error.message);
    } else {
      const { error } = await supa.from('events').insert(ev);
      if (error) return alert(error.message);
    }
    setOpen(null);
    await load();
  }
  async function remove(id: string) {
    if (!confirm('Delete this event?')) return;
    const { error } = await supa.from('events').delete().eq('id', id);
    if (error) return alert(error.message);
    await load();
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1>Calendar</h1>
        <div className="flex gap-2">
          <select value={view} onChange={e=>setView(e.target.value as any)}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2">
            <option value="list">List</option>
            <option value="month">Month</option>
            <option value="week">Week</option>
            <option value="day">Day</option>
          </select>
          <button className="btn btn-sky inline-flex items-center gap-2" onClick={()=>setOpen(blankEvent())}>
            <Plus className="w-4 h-4" /> Add Event
          </button>
        </div>
      </div>

      {/* List view (full-width cards) */}
      {view === 'list' && (
        <div className="mt-6 space-y-6">
          {grouped.map(([date, items])=>(
            <section key={date}>
              <div className="text-sm font-semibold opacity-70 mb-2">{fmtDate(date)}</div>
              <div className="space-y-3">
                {items.map(ev=>(
                  <article key={ev.id} className="rounded-2xl bg-white/80 dark:bg-zinc-900/70 shadow p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold">{ev.title}</div>
                        <div className="text-xs opacity-70">
                          {fmtTime(ev.start_at)}{ev.end_at ? `–${fmtTime(ev.end_at)}` : ''}{ev.location ? ` • ${ev.location}` : ''}
                          {ev.kind === 'crm' && <span className="ml-2 inline-block text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">CRM</span>}
                        </div>
                        {ev.notes && <div className="text-sm mt-1 opacity-90 line-clamp-3">{ev.notes}</div>}
                        {ev.prospect_id && (
                          <div className="mt-1 text-sm">
                            <a className="text-sky-700 dark:text-sky-400 underline" href={`/office/list-builder?prospect=${ev.prospect_id}`}>
                              View prospect
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button className="btn-icon" onClick={()=>setOpen(ev)} aria-label="Edit"><Pencil className="w-4 h-4"/></button>
                        <button className="btn-icon btn-danger" onClick={()=>remove(ev.id)} aria-label="Delete"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
          {rows.length === 0 && (
            <div className="rounded-2xl bg-white/80 dark:bg-zinc-900/70 shadow px-4 py-3">No events yet.</div>
          )}
        </div>
      )}

      {/* Month/Week/Day views: placeholder frame so layout is full-width */}
      {view !== 'list' && (
        <div className="mt-6 rounded-2xl bg-white/80 dark:bg-zinc-900/70 shadow p-6 text-sm opacity-80">
          {view.toUpperCase()} view coming next — list view stays fully functional meanwhile.
        </div>
      )}

      {open && <EventModal initial={open} onClose={()=>setOpen(null)} onSave={save} />}
    </div>
  );
}

function blankEvent(): EventRow {
  const start = new Date();
  start.setMinutes(0,0,0);
  const end = new Date(start); end.setHours(end.getHours()+1);
  return {
    id: '' as any,
    title: '',
    location: '',
    notes: '',
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    kind: 'custom',
    prospect_id: null
  };
}

function EventModal({ initial, onClose, onSave }:{
  initial: EventRow; onClose: ()=>void; onSave:(e:EventRow)=>void;
}) {
  const [form, setForm] = useState<EventRow>(initial);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-zinc-900 shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
           onClick={(e)=>e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-black/5 dark:border-white/10 text-lg font-semibold">
          {form.id ? 'Edit Event' : 'Add Event'}
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-auto">
          <Field label="Title">
            <input className="form-input" value={form.title} onChange={e=>setForm({...form, title:e.target.value})}/>
          </Field>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Starts">
              <input type="datetime-local" className="form-input"
                value={form.start_at.slice(0,16)} onChange={e=>setForm({...form, start_at:new Date(e.target.value).toISOString()})}/>
            </Field>
            <Field label="Ends">
              <input type="datetime-local" className="form-input"
                value={form.end_at ? form.end_at.slice(0,16) : ''} onChange={e=>setForm({...form, end_at:e.target.value ? new Date(e.target.value).toISOString() : null})}/>
            </Field>
          </div>
          <Field label="Location">
            <input className="form-input" value={form.location || ''} onChange={e=>setForm({...form, location:e.target.value})}/>
          </Field>
          <Field label="Notes">
            <textarea className="form-input min-h-[90px]" value={form.notes || ''} onChange={e=>setForm({...form, notes:e.target.value})}/>
          </Field>
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
