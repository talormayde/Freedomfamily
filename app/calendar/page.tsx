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
  ends_at: string | null;
  created_at: string;
};

export default function CalendarPage() {
  const supa = supabaseBrowser();
  const [uid, setUid] = useState<string | null>(null);
  const [items, setItems] = useState<Event[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title:'', description:'', location:'', date:'', start:'', end:'' });

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supa.auth.getSession();
      const id = session?.user?.id ?? null;
      setUid(id);
      if (!id) return;
      const { data } = await supa.from('events').select('*').order('starts_at', { ascending: true });
      setItems((data ?? []) as Event[]);
    })();
  }, []);

  const grouped = useMemo(() => {
    const m = new Map<string, Event[]>();
    items.forEach(e => {
      const d = e.starts_at.slice(0,10);
      if (!m.has(d)) m.set(d, []);
      m.get(d)!.push(e);
    });
    return Array.from(m.entries()).sort(([a],[b]) => a.localeCompare(b));
  }, [items]);

  const save = async () => {
    if (!uid) return;
    if (!form.title.trim() || !form.date || !form.start) return alert('Title, date, and start time required.');
    const starts_at = new Date(`${form.date}T${form.start}:00`).toISOString();
    const ends_at = form.end ? new Date(`${form.date}T${form.end}:00`).toISOString() : null;

    const { error } = await supa.from('events').insert([{
      owner: uid,
      title: form.title.trim(),
      description: form.description || null,
      location: form.location || null,
      starts_at, ends_at
    }]);
    if (error) return alert(error.message);
    setShowForm(false);
    const { data } = await supa.from('events').select('*').order('starts_at', { ascending: true });
    setItems((data ?? []) as Event[]);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    const { error } = await supa.from('events').delete().eq('id', id);
    if (!error) setItems(items.filter(i => i.id !== id));
  };

  return (
    <Page>
      <div className="flex items-center justify-between">
        <h1>Calendar</h1>
        <button className="btn bg-sky-600 text-white" onClick={()=>setShowForm(true)}>Add Event</button>
      </div>

      {grouped.length === 0 && <Card className="mt-4">No events yet.</Card>}

      {grouped.map(([date, arr]) => (
        <div key={date} className="mt-6">
          <h3 className="text-lg font-semibold">{date}</h3>
          <div className="mt-2 grid gap-3">
            {arr.map(e => (
              <Card key={e.id} className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{e.title}</div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-300">
                    {new Date(e.starts_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    {e.ends_at ? ` – ${new Date(e.ends_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}
                    {e.location ? ` • ${e.location}` : ''}
                  </div>
                  {e.description && <div className="mt-1 text-sm">{e.description}</div>}
                </div>
                <button className="btn bg-rose-600 text-white" onClick={()=>remove(e.id)}>Delete</button>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={()=>setShowForm(false)}>
          <div className="w-full max-w-lg card" onClick={e=>e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Add Event</h3>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2 md:col-span-2" placeholder="Title" value={form.title} onChange={e=>setForm({...form, title: e.target.value})}/>
              <input className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2 md:col-span-2" placeholder="Location" value={form.location} onChange={e=>setForm({...form, location: e.target.value})}/>
              <input type="date" className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2" value={form.date} onChange={e=>setForm({...form, date: e.target.value})}/>
              <input type="time" className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2" value={form.start} onChange={e=>setForm({...form, start: e.target.value})}/>
              <input type="time" className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2" value={form.end} onChange={e=>setForm({...form, end: e.target.value})}/>
              <textarea className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2 md:col-span-2" rows={4} placeholder="Description" value={form.description} onChange={e=>setForm({...form, description: e.target.value})}/>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn bg-zinc-100 dark:bg-zinc-800" onClick={()=>setShowForm(false)}>Cancel</button>
              <button className="btn bg-sky-600 text-white" onClick={save}>Create</button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
