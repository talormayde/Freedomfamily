'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Upload,
  Plus,
  Link as LinkIcon,
  Phone,
  Mail
} from 'lucide-react';

// ---------- Utilities ----------
function fmtOrdinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function fmtLong(d: Date) {
  return `${d.toLocaleString('en-US', { month: 'long' })} ${fmtOrdinal(d.getDate())}, ${d.getFullYear()}`;
}
function toLocalInputValue(d: Date | null) {
  if (!d) return '';
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInputValue(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }
function startOfWeek(d: Date) {
  const c = new Date(d);
  const day = c.getDay(); // 0 Sun
  c.setDate(c.getDate() - day);
  c.setHours(0,0,0,0);
  return c;
}
function addMonths(d: Date, m: number) {
  return new Date(d.getFullYear(), d.getMonth() + m, Math.min(d.getDate(), 28));
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

type HubEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start: string;     // ISO
  end: string | null;
  all_day: boolean | null;
  crm_prospect_id: string | null;
  _source?: 'events' | 'crm';
  _prospect?: Prospect | null;
};

type Prospect = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  next_due_date: string | null; // ISO Date
  notes: string | null;
};

type ViewMode = 'month' | 'list';

export default function CalendarPage() {
  const supa = supabaseBrowser();
  const [view, setView] = useState<ViewMode>('month');
  const [cursorMonth, setCursorMonth] = useState<Date>(startOfMonth(new Date()));
  const [includeCRM, setIncludeCRM] = useState<boolean>(true);

  const [events, setEvents] = useState<HubEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<HubEvent | null>(null);

  // Form state for add/edit
  const [form, setForm] = useState<{
    title: string;
    location: string;
    description: string;
    start: string; // local input
    end: string;   // local input
    crm_email: string; // optional helper to attach to prospect by email
  }>({
    title: '',
    location: '',
    description: '',
    start: '',
    end: '',
    crm_email: ''
  });

  const monthRange = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursorMonth));
    const end = endOfMonth(cursorMonth);
    // extend to full weeks (6 rows)
    const days: Date[] = [];
    const d = new Date(start);
    while (days.length < 42) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return { start, end, days };
  }, [cursorMonth]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      // --- 1) events table for current month window (+1 week pad)
      const start = new Date(monthRange.start);
      const end = new Date(monthRange.end);
      end.setDate(end.getDate() + 7);

      const { data: ev, error: evErr } = await supa
        .from('events')
        .select('*')
        .gte('start', start.toISOString())
        .lte('start', end.toISOString())
        .order('start', { ascending: true });

      if (evErr) throw evErr;

      let merged: HubEvent[] = (ev || []).map((e: any) => ({
        ...e,
        _source: 'events' as const,
        _prospect: null
      }));

      // --- 2) add CRM due items as pseudo-events if toggled
      if (includeCRM) {
        const mStart = startOfMonth(cursorMonth);
        const mEnd = endOfMonth(cursorMonth);
        const { data: prs, error: pErr } = await supa
          .from('prospects')
          .select('id,first_name,last_name,phone,email,next_due_date,notes')
          .gte('next_due_date', mStart.toISOString().slice(0,10))
          .lte('next_due_date', mEnd.toISOString().slice(0,10));

        if (pErr) throw pErr;
        const crmEvents: HubEvent[] = (prs || []).filter(p => p.next_due_date).map(p => {
          const s = new Date(p.next_due_date as string);
          s.setHours(9, 0, 0, 0);
          const e = new Date(s); e.setHours(10,0,0,0);
          return {
            id: `crm-${p.id}`,
            title: `${(p.first_name || '').trim()} ${(p.last_name || '').trim()}`.trim() || 'Prospect follow-up',
            description: p.notes || null,
            location: 'CRM Follow-up',
            start: s.toISOString(),
            end: e.toISOString(),
            all_day: false,
            crm_prospect_id: p.id,
            _source: 'crm',
            _prospect: p as Prospect
          };
        });
        merged = merged.concat(crmEvents);
      }

      setEvents(merged);
    } catch (e: any) {
      setError(e.message || 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursorMonth, includeCRM]);

  // ---------- CRUD ----------
  function openCreate() {
    setEditing(null);
    setForm({
      title: '',
      location: '',
      description: '',
      start: toLocalInputValue(new Date()) || '',
      end: toLocalInputValue(new Date(new Date().getTime() + 60 * 60 * 1000)) || '',
      crm_email: ''
    });
    setModalOpen(true);
  }
  function openEdit(ev: HubEvent) {
    setEditing(ev);
    setForm({
      title: ev.title || '',
      location: ev.location || '',
      description: ev.description || '',
      start: toLocalInputValue(new Date(ev.start)) || '',
      end: toLocalInputValue(ev.end ? new Date(ev.end) : new Date(ev.start)) || '',
      crm_email: ''
    });
    setModalOpen(true);
  }
  async function saveForm() {
    const payload = {
      title: form.title.trim(),
      location: form.location.trim() || null,
      description: form.description.trim() || null,
      start: fromLocalInputValue(form.start)?.toISOString(),
      end: fromLocalInputValue(form.end)?.toISOString(),
      all_day: false as boolean,
      crm_prospect_id: null as string | null
    };
    if (!payload.title || !payload.start) {
      alert('Title and start are required');
      return;
    }

    // Optionally resolve crm_prospect_id by email
    if (form.crm_email) {
      const { data: p } = await supa
        .from('prospects')
        .select('id')
        .eq('email', form.crm_email.trim())
        .maybeSingle();
      if (p?.id) payload.crm_prospect_id = p.id;
    }

    if (editing) {
      const { error } = await supa.from('events').update(payload).eq('id', editing.id);
      if (error) return alert(error.message);
    } else {
      const { error } = await supa.from('events').insert(payload as any);
      if (error) return alert(error.message);
    }
    setModalOpen(false);
    await loadData();
  }
  async function deleteEvent(ev: HubEvent) {
    if (ev._source === 'crm') return; // non-deletable pseudo-event
    if (!confirm('Delete this event?')) return;
    const { error } = await supa.from('events').delete().eq('id', ev.id);
    if (error) return alert(error.message);
    await loadData();
  }

  // ---------- CSV Import ----------
  function parseCSV(text: string) {
    // Very small, simple CSV parser (no quotes/escapes). Columns:
    // title,location,description,startISO,endISO,crm_email
    return text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean)
      .map(line => {
        const [title, location, description, start, end, crm_email] = line.split(',').map(s => (s ?? '').trim());
        return { title, location, description, start, end, crm_email };
      });
  }
  async function importCSV(f: File) {
    const text = await f.text();
    const rows = parseCSV(text);
    for (const r of rows) {
      setForm({
        title: r.title || '',
        location: r.location || '',
        description: r.description || '',
        start: r.start ? toLocalInputValue(new Date(r.start)) : '',
        end: r.end ? toLocalInputValue(new Date(r.end)) : '',
        crm_email: r.crm_email || ''
      });
      // Save immediately; this keeps it simple for now
      await saveForm();
    }
  }

  // ---------- Rendering helpers ----------
  const eventsByDay = useMemo(() => {
    const map = new Map<string, HubEvent[]>();
    monthRange.days.forEach(d => map.set(d.toDateString(), []));
    events.forEach(ev => {
      const dKey = new Date(ev.start).toDateString();
      if (!map.has(dKey)) map.set(dKey, []);
      map.get(dKey)!.push(ev);
    });
    return map;
  }, [events, monthRange.days]);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-4">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" /> Calendar
          </h1>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-zinc-200 bg-white/70 backdrop-blur px-1 dark:border-zinc-700">
              <button
                onClick={() => setView('month')}
                className={`px-3 py-1.5 rounded-lg text-sm ${view === 'month' ? 'bg-sky-600 text-white' : 'text-zinc-700 dark:text-zinc-200'}`}
              >
                Month
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1.5 rounded-lg text-sm ${view === 'list' ? 'bg-sky-600 text-white' : 'text-zinc-700 dark:text-zinc-200'}`}
              >
                List
              </button>
            </div>

            <label className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-xl border border-zinc-200 bg-white/70 dark:border-zinc-700">
              <input
                type="checkbox"
                checked={includeCRM}
                onChange={(e) => setIncludeCRM(e.target.checked)}
              />
              Include CRM due items
            </label>

            <label className="relative inline-flex items-center">
              <input
                type="file"
                accept=".csv,text/csv"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importCSV(f);
                  e.currentTarget.value = '';
                }}
              />
              <span className="inline-flex items-center gap-2 rounded-xl bg-white/80 border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
                <Upload className="h-4 w-4" /> Import CSV
              </span>
            </label>

            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 text-white px-4 py-2 text-sm shadow-sm hover:bg-sky-700"
            >
              <Plus className="h-4 w-4" /> Add Event
            </button>
          </div>
        </div>

        {/* Month controls */}
        <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white/70 px-3 py-2 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => setCursorMonth(addMonths(cursorMonth, -1))}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-lg font-medium">
              {cursorMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <button
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => setCursorMonth(addMonths(cursorMonth, 1))}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          {loading && <div className="text-sm text-zinc-500">Loading…</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
      </div>

      {/* Views */}
      <div className="mx-auto mt-4 w-full max-w-screen-2xl px-2 sm:px-4">
        {view === 'month' ? (
          <div className="grid grid-cols-7 gap-2 sm:gap-3">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="text-xs sm:text-sm font-medium text-zinc-500 px-2">{d}</div>
            ))}
            {monthRange.days.map((d, i) => {
              const inMonth = d.getMonth() === cursorMonth.getMonth();
              const dayEvents = eventsByDay.get(d.toDateString()) || [];
              return (
                <div
                  key={i}
                  className={`min-h-[120px] rounded-2xl border px-2 py-2 sm:px-3 sm:py-3 ${inMonth ? 'bg-white/80 border-zinc-200 dark:border-zinc-700' : 'bg-white/40 border-zinc-100 dark:border-zinc-800'}`}
                >
                  <div className={`text-xs sm:text-sm font-medium ${isSameDay(d, new Date()) ? 'text-sky-700' : 'text-zinc-600'}`}>
                    {d.getDate()}
                  </div>
                  <div className="mt-1 space-y-1">
                    {dayEvents.map(ev => (
                      <button
                        key={ev.id}
                        onClick={() => openEdit(ev)}
                        className={`w-full text-left rounded-xl px-2 py-1 text-xs sm:text-sm border hover:shadow-sm ${
                          ev._source === 'crm'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                        }`}
                        title={ev.title}
                      >
                        <div className="truncate font-medium">{ev.title}</div>
                        <div className="truncate text-[11px] sm:text-xs opacity-80">
                          {new Date(ev.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          {ev.end ? ` – ${new Date(ev.end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}
                          {ev.location ? ` • ${ev.location}` : ''}
                          {ev._source === 'crm' ? ' • CRM' : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // List view
          <div className="space-y-4">
            {/* Group by day */}
            {[...events.reduce((map, ev) => {
              const k = new Date(ev.start).toDateString();
              if (!map.has(k)) map.set(k, []);
              map.get(k)!.push(ev);
              return map;
            }, new Map<string, HubEvent[]>()).entries()]
              .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
              .map(([k, evs]) => {
                const day = new Date(k);
                return (
                  <div key={k} className="rounded-2xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-700">
                    <div className="text-sm sm:text-base font-semibold mb-2">{fmtLong(day)}</div>
                    <div className="space-y-3">
                      {evs.map(ev => (
                        <div key={ev.id} className="rounded-xl border border-zinc-200 bg-white/90 px-3 py-3 flex items-start justify-between gap-3 dark:border-zinc-700">
                          <div className="min-w-0">
                            <div className="font-medium">
                              {ev.title}{' '}
                              {ev._source === 'crm' && (
                                <span className="ml-2 inline-block rounded-full bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 align-middle">CRM</span>
                              )}
                            </div>
                            <div className="text-xs sm:text-sm text-zinc-600">
                              {new Date(ev.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                              {ev.end ? ` – ${new Date(ev.end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}
                              {ev.location ? ` • ${ev.location}` : ''}
                            </div>
                            {ev.description && (
                              <div className="mt-1 text-xs sm:text-sm text-zinc-700">{ev.description}</div>
                            )}
                            {/* Prospect quick actions */}
                            {!!ev._prospect && (
                              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                                {ev._prospect.phone && (
                                  <a href={`tel:${ev._prospect.phone}`} className="inline-flex items-center gap-1 text-sky-700 hover:underline">
                                    <Phone className="h-4 w-4" /> {ev._prospect.phone}
                                  </a>
                                )}
                                {ev._prospect.email && (
                                  <a href={`mailto:${ev._prospect.email}`} className="inline-flex items-center gap-1 text-sky-700 hover:underline">
                                    <Mail className="h-4 w-4" /> {ev._prospect.email}
                                  </a>
                                )}
                                <a href={`/office/list-builder?prospect=${ev._prospect.id}`} className="inline-flex items-center gap-1 text-sky-700 hover:underline">
                                  <LinkIcon className="h-4 w-4" /> View prospect
                                </a>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => openEdit(ev)}
                              className="p-2 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-50"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {ev._source !== 'crm' && (
                              <button
                                onClick={() => deleteEvent(ev)}
                                className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 hover:bg-red-100"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 backdrop-blur-sm p-4" onClick={() => setModalOpen(false)}>
          <div
            className="w-full max-w-xl rounded-2xl bg-white p-4 sm:p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">{editing ? 'Edit Event' : 'Add Event'}</div>
              <button className="text-zinc-500 hover:text-zinc-800" onClick={() => setModalOpen(false)}>Close</button>
            </div>

            {editing?._source === 'crm' && (
              <div className="mb-3 text-xs sm:text-sm rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2">
                This is a CRM follow-up item. You can edit text, time, and attach it as a real calendar entry if you want to **Save**; deleting CRM items happens in the List Builder.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-zinc-600">Title</span>
                <input className="rounded-xl border border-zinc-200 px-3 py-2" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-zinc-600">Location</span>
                <input className="rounded-xl border border-zinc-200 px-3 py-2" value={form.location} onChange={e=>setForm({...form, location:e.target.value})} />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs font-medium text-zinc-600">Description</span>
                <textarea className="rounded-xl border border-zinc-200 px-3 py-2" rows={3} value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-zinc-600">Start (local)</span>
                <input type="datetime-local" className="rounded-xl border border-zinc-200 px-3 py-2" value={form.start} onChange={e=>setForm({...form, start:e.target.value})} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-zinc-600">End (local)</span>
                <input type="datetime-local" className="rounded-xl border border-zinc-200 px-3 py-2" value={form.end} onChange={e=>setForm({...form, end:e.target.value})} />
              </label>

              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs font-medium text-zinc-600">Attach to prospect by email (optional)</span>
                <input placeholder="you@example.com" className="rounded-xl border border-zinc-200 px-3 py-2" value={form.crm_email} onChange={e=>setForm({...form, crm_email:e.target.value})} />
              </label>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="px-4 py-2 rounded-xl border border-zinc-300 bg-white" onClick={()=>setModalOpen(false)}>Cancel</button>
              <button className="px-4 py-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700" onClick={saveForm}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
