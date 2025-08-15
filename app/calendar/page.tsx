// app/calendar/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Pencil, Trash2, Plus } from 'lucide-react';
import Link from 'next/link';

type EventRow = {
  id: string;
  title: string | null;
  description: string | null;
  start_at: string;      // ISO
  end_at: string | null; // ISO
  location: string | null;
  prospect_id: string | null;
  created_at: string;
};

type ViewMode = 'Month' | 'Week' | 'Day';

export default function CalendarPage() {
  const supa = supabaseBrowser();

  // soft auth gate
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supa.auth.getSession();
      if (mounted) {
        setAuthed(!!session);
        setLoadingAuth(false);
      }
    })();
    const { data: { subscription } } = supa.auth.onAuthStateChange((_e, sess) => {
      if (mounted) setAuthed(!!sess);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supa]);

  // calendar state
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('Week');
  const [cursor, setCursor] = useState<Date>(new Date());
  const [editing, setEditing] = useState<EventRow | null>(null);

  useEffect(() => {
    if (!authed) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supa
        .from('events')
        .select('*')
        .order('start_at', { ascending: true });
      if (!error && data) setRows(data as EventRow[]);
      setLoading(false);
    })();
  }, [authed, supa]);

  const fmtNice = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // period derivation
  const weekStart = useMemo(() => {
    const d = new Date(cursor);
    const day = d.getDay(); // 0 = Sun
    const diff = (day + 6) % 7; // Monday as first day
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [cursor]);

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const monthDays = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const inRange = (d: Date, start: Date, end: Date) => d >= start && d < end;

  const eventsThisWeek = useMemo(() => {
    const start = new Date(weekStart);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);
    return rows.filter((r) => inRange(new Date(r.start_at), start, end));
  }, [rows, weekStart]);

  const dayStart = new Date(cursor); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(cursor);   dayEnd.setHours(24, 0, 0, 0);

  const eventsThisDay = useMemo(() => rows.filter((r) => inRange(new Date(r.start_at), dayStart, dayEnd)), [rows, dayStart, dayEnd]);

  // CRUD
  async function saveEvent(payload: Partial<EventRow> & { id?: string }) {
    let startISO = payload.start_at!;
    let endISO = payload.end_at ?? null;
    if (endISO && new Date(endISO).getTime() < new Date(startISO).getTime()) {
      endISO = new Date(new Date(startISO).getTime() + 60 * 60 * 1000).toISOString();
    }

    const clean = {
      title: payload.title ?? '',
      description: payload.description ?? '',
      start_at: startISO,
      end_at: endISO,
      location: payload.location ?? '',
      prospect_id: payload.prospect_id ?? null,
    };

    if (payload.id) {
      const { data, error } = await supa
        .from('events')
        .update(clean)
        .eq('id', payload.id)
        .select('*')
        .single();
      if (error) return alert(error.message);
      setRows((prev) =>
        prev
          .map((r) => (r.id === payload.id ? (data as EventRow) : r))
          .sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at))
      );
    } else {
      const { data, error } = await supa.from('events').insert(clean).select('*').single();
      if (error) return alert(error.message);
      setRows((prev) =>
        [...prev, data as EventRow].sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at))
      );
    }
    setEditing(null);
  }

  async function removeEvent(id: string) {
    if (!confirm('Delete this event?')) return;
    const { error } = await supa.from('events').delete().eq('id', id);
    if (error) return alert(error.message);
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  if (loadingAuth) return <div className="p-6 text-zinc-500">Loading…</div>;

  if (!authed) {
    return (
      <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-white/80 dark:bg-zinc-900/70 border border-black/5 dark:border-white/10">
        <h1 className="text-2xl font-semibold">You’ll need your key</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          This room is for members. Head back to the door and request your key.
        </p>
        <Link href="/" className="inline-flex mt-4 rounded-xl bg-sky-600 text-white px-4 py-2 hover:bg-sky-700">
          Go to the door
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 lg:px-8 max-w-[1700px] mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
        <h1 className="text-3xl font-semibold tracking-tight">Calendar</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setEditing({
                id: '' as any,
                title: '',
                description: '',
                start_at: new Date().toISOString(),
                end_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                location: '',
                prospect_id: null,
                created_at: new Date().toISOString(),
              })
            }
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 text-white font-medium px-4 py-2 hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" /> New Event
          </button>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            {(['Month', 'Week', 'Day'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-2 text-sm ${view === v ? 'bg-zinc-100 dark:bg-zinc-800 font-medium' : ''}`}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <button className="px-3 py-2 text-sm" onClick={() => setCursor(new Date())}>Today</button>
            <button
              className="px-3 py-2 text-sm"
              onClick={() => {
                const d = new Date(cursor);
                if (view === 'Month') d.setMonth(d.getMonth() - 1);
                if (view === 'Week') d.setDate(d.getDate() - 7);
                if (view === 'Day') d.setDate(d.getDate() - 1);
                setCursor(d);
              }}
            >{'←'}</button>
            <button
              className="px-3 py-2 text-sm"
              onClick={() => {
                const d = new Date(cursor);
                if (view === 'Month') d.setMonth(d.getMonth() + 1);
                if (view === 'Week') d.setDate(d.getDate() + 7);
                if (view === 'Day') d.setDate(d.getDate() + 1);
                setCursor(d);
              }}
            >{'→'}</button>
          </div>
        </div>
      </div>

      {/* Views */}
      <div className="mt-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/50 p-3 sm:p-4">
        {view === 'Month' && (
          <div className="grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400 px-1">{d}</div>
            ))}
            {monthDays.map((d, i) => {
              const sameMonth = d.getMonth() === cursor.getMonth();
              const cellEvents = rows.filter((r) => {
                const sd = new Date(r.start_at);
                return sd.getFullYear() === d.getFullYear() && sd.getMonth() === d.getMonth() && sd.getDate() === d.getDate();
              });
              return (
                <div key={i} className={`min-h-[100px] rounded-xl border px-2 py-1 ${sameMonth ? 'border-zinc-200 dark:border-zinc-800' : 'border-transparent opacity-50'}`}>
                  <div className="text-xs mb-1">{d.getDate()}</div>
                  <div className="space-y-1">
                    {cellEvents.map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => setEditing(ev)}
                        className="w-full text-left text-xs rounded-lg px-2 py-1 bg-sky-50 dark:bg-zinc-900 border border-sky-200/70 dark:border-zinc-800 hover:bg-sky-100"
                        title={ev.description || ''}
                      >
                        {ev.title || '(no title)'}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === 'Week' && (
          <div className="grid grid-cols-7 gap-3">
            {weekDays.map((d, idx) => {
              const dayEvents = eventsThisWeek.filter((e) => {
                const sd = new Date(e.start_at);
                return sd.getFullYear() === d.getFullYear() && sd.getMonth() === d.getMonth() && sd.getDate() === d.getDate();
              });
              return (
                <div key={idx} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-2">
                  <div className="text-sm font-medium mb-2">
                    {d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  <div className="space-y-2">
                    {dayEvents.length === 0 && <div className="text-xs text-zinc-500">No events</div>}
                    {dayEvents.map((ev) => (
                      <div key={ev.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-2 bg-white/70 dark:bg-zinc-900">
                        <div className="text-sm font-semibold">{ev.title || '(no title)'}</div>
                        <div className="text-xs text-zinc-500">
                          {fmtNice(ev.start_at)}{ev.end_at ? ` – ${fmtNice(ev.end_at)}` : ''}
                        </div>
                        {ev.location && <div className="text-xs mt-1">📍 {ev.location}</div>}
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => setEditing(ev)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => removeEvent(ev.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs hover:bg-red-100"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                          {ev.prospect_id && (
                            <a href={`/office/list-builder?prospect=${ev.prospect_id}`} className="ml-auto text-xs underline" title="Open prospect">
                              View Prospect →
                            </a>
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

        {view === 'Day' && (
          <div>
            <div className="text-sm font-medium mb-3">
              {cursor.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="space-y-2">
              {eventsThisDay.length === 0 && <div className="text-sm text-zinc-500">No events for this day.</div>}
              {eventsThisDay.map((ev) => (
                <div key={ev.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 bg-white/70 dark:bg-zinc-900">
                  <div className="font-semibold">{ev.title || '(no title)'}</div>
                  <div className="text-xs text-zinc-500">
                    {fmtNice(ev.start_at)}{ev.end_at ? ` – ${fmtNice(ev.end_at)}` : ''}
                  </div>
                  {ev.description && <div className="text-sm mt-1">{ev.description}</div>}
                  {ev.location && <div className="text-xs mt-1">📍 {ev.location}</div>}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => setEditing(ev)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => removeEvent(ev.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs hover:bg-red-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                    {ev.prospect_id && (
                      <a href={`/office/list-builder?prospect=${ev.prospect_id}`} className="ml-auto text-xs underline">
                        View Prospect →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {editing && (
        <EventModal
          value={editing}
          onCancel={() => setEditing(null)}
          onSave={saveEvent}
        />
      )}
    </div>
  );
}

function EventModal({
  value,
  onCancel,
  onSave,
}: {
  value: EventRow;
  onCancel: () => void;
  onSave: (v: Partial<EventRow> & { id?: string }) => void;
}) {
  const [draft, setDraft] = useState<Partial<EventRow>>({
    id: value.id || undefined,
    title: value.title || '',
    description: value.description || '',
    start_at: value.start_at,
    end_at: value.end_at,
    location: value.location || '',
    prospect_id: value.prospect_id || null,
  });

  const toInput = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  };

  return (
    <div className="fixed inset-0 z-[500] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
        <h2 className="text-lg font-semibold mb-3">{draft.id ? 'Edit Event' : 'New Event'}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Title</span>
            <input
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
              value={draft.title as string}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Location</span>
            <input
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
              value={draft.location as string}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Description</span>
            <textarea
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
              value={draft.description as string}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={3}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Start</span>
            <input
              type="datetime-local"
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
              value={toInput(draft.start_at!)}
              onChange={(e) => setDraft({ ...draft, start_at: new Date(e.target.value).toISOString() })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">End</span>
            <input
              type="datetime-local"
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
              value={toInput(draft.end_at || draft.start_at!)}
              onChange={(e) => setDraft({ ...draft, end_at: new Date(e.target.value).toISOString() })}
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Prospect ID (optional)</span>
            <input
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
              placeholder="Paste a prospect UUID…"
              value={draft.prospect_id ?? ''}
              onChange={(e) => setDraft({ ...draft, prospect_id: e.target.value || null })}
            />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onCancel} className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2">
            Cancel
          </button>
          <button onClick={() => onSave(draft)} className="rounded-xl bg-sky-600 text-white px-4 py-2 hover:bg-sky-700">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
