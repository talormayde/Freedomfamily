'use client';

import { useEffect, useMemo, useState } from 'react';
import { Page, Card } from '@/components/ui';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Pencil, Trash2, Upload } from 'lucide-react';

type EventRow = {
  id: string;
  owner: string | null;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string; // ISO
  ends_at: string | null; // ISO
  created_at: string;
};

type Prospect = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  next_step: string | null;
  due_date: string | null; // yyyy-mm-dd
};

const isoFromDateTime = (date: string, time: string) =>
  new Date(`${date}T${time || '00:00'}:00`).toISOString();

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const today = () => new Date().toISOString().slice(0, 10);

export default function CalendarPage() {
  const supa = supabaseBrowser();

  const [uid, setUid] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [includeCRM, setIncludeCRM] = useState(true);

  // modal state
  const emptyForm = {
    id: null as string | null,
    title: '',
    description: '',
    location: '',
    startDate: today(),
    startTime: '09:00',
    endDate: today(),
    endTime: '10:00',
  };
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supa.auth.getSession();
      const id = session?.user?.id ?? null;
      setUid(id);
      if (!id) return;

      const { data: evts } = await supa
        .from('events')
        .select('*')
        .order('starts_at', { ascending: true });
      setEvents((evts ?? []) as EventRow[]);

      const { data: prs } = await supa
        .from('prospects')
        .select('id, first_name, last_name, next_step, due_date')
        .not('due_date', 'is', null);
      setProspects((prs ?? []) as Prospect[]);
    })();
  }, []);

  /** ---------- View window (day / week / month) ---------- */
  const range = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    if (view === 'day') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (view === 'week') {
      const dow = now.getDay(); // 0 Sun
      const mondayOffset = (dow + 6) % 7;
      start.setDate(now.getDate() - mondayOffset);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      // month
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(start.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    }
    return { start, end };
  }, [view]);

  const withinRange = (iso: string) => {
    const d = new Date(iso);
    return d >= range.start && d <= range.end;
  };

  /** ---------- Derived items ---------- */
  const viewEvents = useMemo(
    () => events.filter((e) => withinRange(e.starts_at)),
    [events, range]
  );

  const crmReminders = useMemo(() => {
    if (!includeCRM) return [] as { id: string; title: string; starts_at: string }[];
    return prospects
      .filter((p) => p.due_date && withinRange(`${p.due_date}T12:00:00Z`))
      .map((p) => ({
        id: `crm-${p.id}`,
        title:
          `${(p.first_name ?? '').trim()} ${(p.last_name ?? '').trim()}`.trim() +
          (p.next_step ? ` • ${p.next_step}` : ''),
        starts_at: `${p.due_date!}T12:00:00Z`,
      }));
  }, [prospects, includeCRM, range]);

  const grouped = useMemo(() => {
    const all = [
      ...viewEvents.map((e) => ({ kind: 'event' as const, date: e.starts_at.slice(0, 10), e })),
      ...crmReminders.map((c) => ({ kind: 'crm' as const, date: c.starts_at.slice(0, 10), c })),
    ];
    const by = new Map<string, typeof all>();
    all.forEach((x) => {
      if (!by.has(x.date)) by.set(x.date, [] as any);
      by.get(x.date)!.push(x);
    });
    return Array.from(by.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [viewEvents, crmReminders]);

  /** ---------- CRUD ---------- */
  const openCreate = () => {
    setForm({
      id: null,
      title: '',
      description: '',
      location: '',
      startDate: today(),
      startTime: '09:00',
      endDate: today(),
      endTime: '10:00',
    });
    setShowForm(true);
  };

  const openEdit = (e: EventRow) => {
    setForm({
      id: e.id,
      title: e.title,
      description: e.description ?? '',
      location: e.location ?? '',
      startDate: e.starts_at.slice(0, 10),
      startTime: e.starts_at.slice(11, 16),
      endDate: (e.ends_at ?? e.starts_at).slice(0, 10),
      endTime: (e.ends_at ?? e.starts_at).slice(11, 16),
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(emptyForm);
  };

  const save = async () => {
    if (!uid) return;
    if (!form.title.trim() || !form.startDate || !form.startTime) {
      alert('Title, start date & start time are required');
      return;
    }

    const starts_at = isoFromDateTime(form.startDate, form.startTime);
    const ends_at =
      form.endDate && form.endTime ? isoFromDateTime(form.endDate, form.endTime) : null;

    if (form.id) {
      // update
      const { error } = await supa
        .from('events')
        .update({
          title: form.title.trim(),
          description: form.description || null,
          location: form.location || null,
          starts_at,
          ends_at,
        })
        .eq('id', form.id);
      if (error) return alert(error.message);
    } else {
      // insert
      const { error } = await supa.from('events').insert([
        {
          owner: uid,
          title: form.title.trim(),
          description: form.description || null,
          location: form.location || null,
          starts_at,
          ends_at,
        },
      ]);
      if (error) return alert(error.message);
    }

    const { data } = await supa
      .from('events')
      .select('*')
      .order('starts_at', { ascending: true });
    setEvents((data ?? []) as EventRow[]);
    closeForm();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    const { error } = await supa.from('events').delete().eq('id', id);
    if (!error) setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  /** ---------- CSV import ---------- */
  const handleCSV = async (file: File) => {
    if (!uid) return;
    const text = await file.text();
    const rows = parseCSV(text); // simple CSV parser below

    // Expect header:
    // title,start_date,start_time,end_date,end_time,location,description
    const header = rows[0]?.map((s) => s.toLowerCase().trim()) ?? [];
    const req = ['title', 'start_date', 'start_time'];
    if (!req.every((k) => header.includes(k))) {
      alert('CSV must include at least: title,start_date,start_time');
      return;
    }
    const idx = (k: string) => header.indexOf(k);

    const payload = rows.slice(1).map((r) => {
      const title = (r[idx('title')] ?? '').trim();
      const sd = (r[idx('start_date')] ?? '').trim();
      const st = (r[idx('start_time')] ?? '').trim();
      if (!title || !sd || !st) return null;

      const ed = (r[idx('end_date')] ?? '').trim();
      const et = (r[idx('end_time')] ?? '').trim();
      const starts_at = isoFromDateTime(sd, st);
      const ends_at = ed && et ? isoFromDateTime(ed, et) : null;

      return {
        owner: uid,
        title,
        location: (r[idx('location')] ?? '').trim() || null,
        description: (r[idx('description')] ?? '').trim() || null,
        starts_at,
        ends_at,
      };
    }).filter(Boolean) as Omit<EventRow, 'id' | 'created_at'>[];

    if (payload.length === 0) {
      alert('No valid rows found.');
      return;
    }

    const { error } = await supa.from('events').insert(payload);
    if (error) return alert(error.message);

    const { data } = await supa
      .from('events')
      .select('*')
      .order('starts_at', { ascending: true });
    setEvents((data ?? []) as EventRow[]);
    alert(`Imported ${payload.length} event(s).`);
  };

  return (
    <Page>
      <div className="ff-wrap">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1>Calendar</h1>
          <div className="flex items-center gap-2">
            <select
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900 px-3 py-2"
              value={view}
              onChange={(e) => setView(e.target.value as any)}
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeCRM}
                onChange={(e) => setIncludeCRM(e.target.checked)}
              />
              Include CRM due items
            </label>

            <label className="btn btn-ghost cursor-pointer inline-flex items-center gap-2">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import CSV</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleCSV(e.target.files[0])}
              />
            </label>

            <button className="btn btn-sky" onClick={openCreate}>
              Add Event
            </button>
          </div>
        </div>

        {grouped.length === 0 && (
          <Card className="mt-4">Nothing scheduled in this view.</Card>
        )}

        {grouped.map(([date, list]) => (
          <section key={date} className="mt-6">
            <h3 className="text-lg font-semibold">{date}</h3>
            <div className="mt-2 grid gap-3">
              {list.map((row, i) => (
                <Card key={i} className="flex items-center justify-between gap-4">
                  {/* time */}
                  <div className="w-28 shrink-0 text-sm text-zinc-600 dark:text-zinc-300">
                    {row.kind === 'event'
                      ? `${fmtTime(row.e.starts_at)}${
                          row.e.ends_at ? `–${fmtTime(row.e.ends_at)}` : ''
                        }`
                      : 'All-day'}
                  </div>

                  {/* details */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">
                      {row.kind === 'event' ? row.e.title : row.c.title}
                      {row.kind === 'crm' && (
                        <span className="ml-2 text-xs rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5">
                          CRM
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-300 truncate">
                      {row.kind === 'event' && row.e.location ? row.e.location : ''}
                    </div>
                    {row.kind === 'event' && row.e.description && (
                      <div className="mt-1 text-sm line-clamp-2">{row.e.description}</div>
                    )}
                  </div>

                  {/* actions */}
                  {row.kind === 'event' && (
                    <div className="flex gap-2">
                      <button
                        className="btn-icon btn-ghost"
                        onClick={() => openEdit(row.e)}
                        title="Edit"
                        aria-label="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="btn-icon btn-danger"
                        onClick={() => remove(row.e.id)}
                        title="Delete"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </section>
        ))}

        {/* Modal */}
        {showForm && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
            onClick={closeForm}
          >
            <div
              className="w-full max-w-2xl rounded-3xl bg-white dark:bg-zinc-900 shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200/70 dark:border-zinc-800/70">
                <h3 className="text-lg font-semibold">
                  {form.id ? 'Edit Event' : 'Add Event'}
                </h3>
                <button
                  onClick={closeForm}
                  className="rounded-xl px-3 py-1.5 text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                >
                  Close
                </button>
              </div>

              <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="form-field md:col-span-2">
                  <span className="form-label">Title</span>
                  <input
                    className="form-input"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </label>

                <label className="form-field md:col-span-2">
                  <span className="form-label">Location</span>
                  <input
                    className="form-input"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                </label>

                <label className="form-field">
                  <span className="form-label">Start date</span>
                  <input
                    type="date"
                    className="form-input"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </label>
                <label className="form-field">
                  <span className="form-label">Start time</span>
                  <input
                    type="time"
                    className="form-input"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  />
                </label>

                <label className="form-field">
                  <span className="form-label">End date</span>
                  <input
                    type="date"
                    className="form-input"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </label>
                <label className="form-field">
                  <span className="form-label">End time</span>
                  <input
                    type="time"
                    className="form-input"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  />
                </label>

                <label className="form-field md:col-span-2">
                  <span className="form-label">Description</span>
                  <textarea
                    rows={4}
                    className="form-input"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 px-6 pb-6">
                <button
                  className="rounded-xl px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                  onClick={closeForm}
                >
                  Cancel
                </button>
                <button className="rounded-xl px-4 py-2 btn-sky" onClick={save}>
                  {form.id ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}

/** Lightweight CSV parser (handles quotes & commas) */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      cur.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++; // handle CRLF
      cur.push(field);
      rows.push(cur);
      cur = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field.length || cur.length) {
    cur.push(field);
    rows.push(cur);
  }
  return rows;
}