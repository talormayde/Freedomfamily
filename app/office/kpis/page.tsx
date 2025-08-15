// app/office/kpis/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Page, Card } from '@/components/ui';
import { supabaseBrowser } from '@/lib/supabase-browser';

type Activity = {
  id: string;
  actor: string | null;
  type: 'qi'|'stp'|'guest'|'pv'|'other';
  value: number;
  occurred_at: string;
};

const TYPES: Activity['type'][] = ['qi','stp','guest','pv'];

export default function KPIPage() {
  const supa = supabaseBrowser();
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Activity[]>([]);
  const [today, setToday] = useState({ qi:0, stp:0, guest:0, pv:0 });
  const [addType, setAddType] = useState<Activity['type']>('qi');
  const [addVal, setAddVal] = useState(1);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supa.auth.getSession();
      const id = session?.user?.id ?? null;
      setUid(id);
      if (!id) { setLoading(false); return; }
      const { data, error } = await supa
        .from('activities')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(500);
      if (!error) setRows((data ?? []) as Activity[]);
      setLoading(false);
    })();
  }, [supa]);

  const weekly = useMemo(() => {
    const by = { qi:0, stp:0, guest:0, pv:0 };
    const tby = { qi:0, stp:0, guest:0, pv:0 };
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    const todayIso = now.toISOString().slice(0,10);
    rows.forEach(r => {
      const d = r.occurred_at.slice(0,10);
      if (d === todayIso && r.type in by) (tby as any)[r.type] += r.value;
      if (new Date(d) >= start && r.type in by) (by as any)[r.type] += r.value;
    });
    setToday(tby);
    return by;
  }, [rows]);

  const add = async () => {
    // trigger will set actor; don't send it from client
    const { error } = await supa.from('activities').insert([{ type: addType, value: addVal }]);
    if (!error) {
      const { data } = await supa.from('activities').select('*').order('occurred_at', { ascending: false }).limit(500);
      setRows((data ?? []) as Activity[]);
    }
  };

  if (loading) return <Page><div className="mt-10">Loading…</div></Page>;
  if (!uid) return <Page><Card>Please sign in.</Card></Page>;

  return (
    <Page>
      <h1>KPI Tracker</h1>

      <Card className="mt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['qi','stp','guest','pv'] as const).map(k => (
            <div key={k} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
              <div className="text-sm text-zinc-500">Today {k.toUpperCase()}</div>
              <div className="text-3xl font-semibold mt-1">{(today as any)[k]}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-4">
        <h3 className="text-lg font-semibold">Add Activity</h3>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2" value={addType} onChange={e=>setAddType(e.target.value as any)}>
            {TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
          </select>
          <input type="number" className="w-24 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900 px-3 py-2" value={addVal} onChange={e=>setAddVal(parseInt(e.target.value || '0'))}/>
          <button onClick={add} className="btn bg-sky-600 text-white">Add</button>
        </div>
      </Card>

      <Card className="mt-4">
        <h3 className="text-lg font-semibold">This Week</h3>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['qi','stp','guest','pv'] as const).map(k => (
            <div key={k} className="rounded-2xl bg-sky-50 dark:bg-zinc-900 p-4">
              <div className="text-sm text-zinc-500">Last 7 days {k.toUpperCase()}</div>
              <div className="text-2xl font-semibold mt-1">{(weekly as any)[k]}</div>
            </div>
          ))}
        </div>
      </Card>
    </Page>
  );
}
