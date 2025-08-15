// app/office/outreach/sequence/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Suspense } from 'react';
import SequenceClient from './SequenceClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-zinc-500">Loading…</div>}>
      <SequenceClient />
    </Suspense>
  );
}
import { ArrowLeft, Phone, MessageSquare, CalendarPlus, BookOpen, Check, ChevronRight, Loader2, Copy } from 'lucide-react';

type Prospect = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

type Attempt = {
  id: string;
  prospect_id: string;
  channel: 'call'|'text';
  outcome: 'connected'|'left_vm'|'no_answer'|'bad_number'|'booked';
  notes: string | null;
  created_at: string;
};

// lightweight templates (feel free to expand)
const TEXT_TEMPLATES = {
  driversSeat: `Hey {{first}}, it’s {{me}}. Quick one—when’s a good time for 10 mins so I can put you in the driver’s seat and show you how LTD works?`,
  depthStrategy: `{{first}}, got a quick depth strategy I think fits you. Can I text you a 3-min overview and set a time to jam?`
} as const;

export default function OutreachRunner() {
  const supa = supabaseBrowser();
  const params = useSearchParams();
  const idsParam = params.get('ids') || ''; // comma-separated prospect ids
  const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean);

  const [rows, setRows] = useState<Prospect[]>([]);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (ids.length === 0) return;
      setBusy(true);
      const { data, error } = await supa.from('prospects').select('id,first_name,last_name,phone,email,notes').in('id', ids);
      setBusy(false);
      if (error) return alert(error.message);
      setRows((data ?? []) as Prospect[]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsParam]);

  const p = rows[i];
  const fullName = useMemo(() => p ? [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Prospect' : '', [p]);

  async function recordAttempt(channel: 'call'|'text', outcome: Attempt['outcome'], notes?: string) {
    if (!p) return;
    await supa.from('outreach_attempts').insert({
      prospect_id: p.id, channel, outcome, notes: notes ?? null
    } as any);
    if (outcome === 'booked') {
      // leave user on current card so they can also send materials, otherwise advance
      return;
    }
    // next prospect
    setI(curr => Math.min(rows.length - 1, curr + 1));
  }

  async function copy(templateKey: keyof typeof TEXT_TEMPLATES) {
    if (!p) return;
    const me = 'me'; // (optional) replace with profile name later
    const msg = TEXT_TEMPLATES[templateKey]
      .replaceAll('{{first}}', p.first_name || '')
      .replaceAll('{{me}}', me);
    await navigator.clipboard.writeText(msg);
    setCopied(templateKey);
    setTimeout(()=>setCopied(null), 1200);
  }

  if (ids.length === 0) {
    return (
      <div className="px-4 md:px-6 lg:px-8 max-w-[900px] mx-auto w-full">
        <div className="mt-6 rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-zinc-950/50 p-6">
          <h1 className="text-2xl font-semibold">Sequence</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">No prospects provided. Go back to List Builder, select a few, and click “Start Sequence”.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 lg:px-8 max-w-[1000px] mx-auto w-full">
      <div className="flex items-center justify-between mt-6">
        <a href="/office/list-builder" className="inline-flex items-center gap-2 text-sm hover:underline"><ArrowLeft className="h-4 w-4" /> Back to List</a>
        <div className="text-sm text-zinc-500">{i+1} of {rows.length}</div>
      </div>

      <div className="mt-4 rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-zinc-950/50 p-4 sm:p-6">
        {busy || !p ? (
          <div className="text-zinc-500 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">{fullName}</h1>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 break-words">
              {p.phone ? <>📞 <a className="underline" href={`tel:${p.phone}`}>{p.phone}</a></> : 'No phone'}{'  '}
              {p.email ? <> • ✉️ <a className="underline" href={`mailto:${p.email}`}>{p.email}</a></> : ''}
            </div>
            {p.notes && <div className="mt-2 text-sm">{p.notes}</div>}

            {/* Actions */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <a
                href={p.phone ? `tel:${p.phone}` : '#'}
                onClick={() => recordAttempt('call','connected')}
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-center hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <div className="inline-flex items-center gap-2"><Phone className="h-4 w-4" /> Call</div>
              </a>
              <button
                onClick={() => recordAttempt('call','left_vm')}
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Left VM
              </button>
              <button
                onClick={() => recordAttempt('call','no_answer')}
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                No Answer
              </button>
              <button
                onClick={() => recordAttempt('call','bad_number')}
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Bad Number
              </button>
            </div>

            {/* Text templates */}
            <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
              <div className="flex items-center gap-2 text-sm font-medium"><MessageSquare className="h-4 w-4" /> Text templates</div>
              <div className="mt-2 grid sm:grid-cols-2 gap-2">
                {(['driversSeat','depthStrategy'] as const).map(k => (
                  <button
                    key={k}
                    onClick={() => copy(k)}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <div className="font-medium">{k === 'driversSeat' ? 'Driver’s Seat' : 'Depth Strategy'}</div>
                    {copied === k ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Meeting & Materials */}
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              <button
                onClick={() => setMeetingOpen(true)}
                className="rounded-xl bg-sky-600 text-white px-4 py-2 hover:bg-sky-700 inline-flex items-center gap-2"
              >
                <CalendarPlus className="h-4 w-4" /> Book Meeting
              </button>
              <button
                onClick={() => setMaterialsOpen(true)}
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 inline-flex items-center gap-2"
              >
                <BookOpen className="h-4 w-4" /> Send Materials
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setI(curr => Math.min(rows.length-1, curr+1))}
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 text-white px-4 py-2 dark:bg-white dark:text-zinc-900"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>

      {meetingOpen && p && (
        <MeetingModal prospect={p} onClose={() => setMeetingOpen(false)} onBooked={() => recordAttempt('call','booked')} />
      )}
      {materialsOpen && p && (
        <MaterialsModal prospect={p} onClose={() => setMaterialsOpen(false)} />
      )}
    </div>
  );
}

/* ---------- Meeting Modal (creates events, gives .ics download) ---------- */
function MeetingModal({ prospect, onClose, onBooked }: { prospect: Prospect; onClose: () => void; onBooked: () => void; }) {
  const supa = supabaseBrowser();
  const [start, setStart] = useState<string>(() => new Date().toISOString());
  const [end, setEnd] = useState<string>(() => new Date(Date.now()+60*60*1000).toISOString());
  const [title, setTitle] = useState<string>(`Meeting with ${[prospect.first_name, prospect.last_name].filter(Boolean).join(' ')}`);

  const toInput = (iso: string) => {
    const d = new Date(iso);
    const pad = (n:number)=>String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  async function save() {
    // write to events
    const { error } = await supa.from('events').insert({
      title,
      description: `Booked from Outreach Runner`,
      start_at: new Date(start).toISOString(),
      end_at: new Date(end).toISOString(),
      prospect_id: prospect.id,
      location: ''
    } as any);
    if (error) return alert(error.message);

    // quick ICS download (client)
    const ics =
`BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${title}
DTSTART:${toICS(start)}
DTEND:${toICS(end)}
DESCRIPTION:Prospect ${prospect.first_name ?? ''} ${prospect.last_name ?? ''} (${prospect.email ?? ''})
END:VEVENT
END:VCALENDAR`;
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'meeting.ics'; a.click();
    URL.revokeObjectURL(url);

    onBooked();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[600] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
        <h3 className="text-lg font-semibold">Book Meeting</h3>
        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Title</span>
            <input className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2" value={title} onChange={e=>setTitle(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Start</span>
            <input type="datetime-local" className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2" value={toInput(start)} onChange={e=>setStart(new Date(e.target.value).toISOString())}/>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">End</span>
            <input type="datetime-local" className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2" value={toInput(end)} onChange={e=>setEnd(new Date(e.target.value).toISOString())}/>
          </label>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2">Cancel</button>
          <button onClick={save} className="rounded-xl bg-sky-600 text-white px-4 py-2 hover:bg-sky-700">Save</button>
        </div>
      </div>
    </div>
  );
}
function toICS(iso: string) {
  const d = new Date(iso);
  // UTC basic format: YYYYMMDDTHHMMSSZ
  const pad = (n:number)=>String(n).padStart(2,'0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/* ---------- Materials Modal (pulls from library bucket) ---------- */
function MaterialsModal({ prospect, onClose }: { prospect: Prospect; onClose: () => void; }) {
  const supa = supabaseBrowser();
  const [files, setFiles] = useState<{ name: string; path: string; }[]>([]);
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const { data, error } = await supa.storage.from('library').list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
      if (error) return;
      const onlyFiles = (data ?? []).filter((e:any) => e.metadata).map((e:any) => ({ name: e.name, path: e.name }));
      setFiles(onlyFiles);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyLinks() {
    const paths = files.filter(f => picked[f.path]).map(f => f.path);
    if (paths.length === 0) return;
    const links: string[] = [];
    for (const p of paths) {
      const { data } = await supa.storage.from('library').createSignedUrl(p, 60*60);
      if (data?.signedUrl) links.push(data.signedUrl);
    }
    await navigator.clipboard.writeText(links.join('\n'));
    alert('Links copied. Paste into your text/email.');
  }

  return (
    <div className="fixed inset-0 z-[600] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
        <h3 className="text-lg font-semibold">Send materials to {prospect.first_name ?? 'prospect'}</h3>
        <div className="mt-3 rounded-xl border border-zinc-200 dark:border-zinc-800 max-h-[50vh] overflow-auto">
          {files.length === 0 ? (
            <div className="p-4 text-sm text-zinc-500">No files found in library root.</div>
          ) : files.map(f => (
            <label key={f.path} className="flex items-center gap-3 px-3 py-2 border-b border-zinc-100/60 dark:border-zinc-800/60">
              <input type="checkbox" checked={!!picked[f.path]} onChange={(e)=>setPicked(prev=>({ ...prev, [f.path]: e.target.checked }))}/>
              <span className="truncate">{f.name}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2">Close</button>
          <button onClick={copyLinks} className="rounded-xl bg-sky-600 text-white px-4 py-2 hover:bg-sky-700">Copy Links</button>
        </div>
      </div>
    </div>
  );
}
