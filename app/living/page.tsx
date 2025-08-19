// app/living/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Megaphone, Send } from 'lucide-react';

type Announcement = {
  id: string;
  title: string;
  body: string;
  author: string | null;
  created_at: string; // ISO
};

type ChatMessage = {
  id: string;
  message: string;
  sender: string | null;
  created_at: string; // ISO
};

function fmtDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit'
  });
}

export default function LivingRoomPage() {
  const supa = supabaseBrowser();

  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  // data
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // compose
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newMsg, setNewMsg]   = useState('');

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // auth (client)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supa.auth.getSession();
      if (mounted) setAuthed(!!session);
    })();
    const { data: { subscription } } = supa.auth.onAuthStateChange((_e, sess) => {
      if (mounted) setAuthed(!!sess);
    });
    return () => subscription.unsubscribe();
  }, [supa]);

  // initial load + realtime
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const [a, m] = await Promise.all([
        supa.from('announcements').select('*').order('created_at', { ascending: false }),
        supa.from('chat_messages').select('*').order('created_at', { ascending: true }).limit(500),
      ]);
      if (!cancelled) {
        if (!a.error && a.data) setAnnouncements(a.data as Announcement[]);
        if (!m.error && m.data) setMessages(m.data as ChatMessage[]);
        setLoading(false);
      }
    })();

    const ch = supa
      .channel('living-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, payload => {
        setAnnouncements(prev => {
          if (payload.eventType === 'INSERT') return [payload.new as Announcement, ...prev];
          if (payload.eventType === 'UPDATE') return prev.map(x => x.id === (payload.new as any).id ? (payload.new as Announcement) : x);
          if (payload.eventType === 'DELETE') return prev.filter(x => x.id !== (payload.old as any).id);
          return prev;
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, payload => {
        setMessages(prev => {
          if (payload.eventType === 'INSERT') return [...prev, payload.new as ChatMessage];
          if (payload.eventType === 'UPDATE') return prev.map(x => x.id === (payload.new as any).id ? (payload.new as ChatMessage) : x);
          if (payload.eventType === 'DELETE') return prev.filter(x => x.id !== (payload.old as any).id);
          return prev;
        });
      })
      .subscribe();

    return () => { cancelled = true; supa.removeChannel(ch); };
  }, [supa]);

  // autoscroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function postAnnouncement() {
    if (!newTitle.trim() || !newBody.trim()) return;
    const { data: { session } } = await supa.auth.getSession();
    const author = session?.user?.email || 'member';
    const { error } = await supa.from('announcements').insert({
      title: newTitle.trim(), body: newBody.trim(), author
    });
    if (error) return alert(error.message);
    setNewTitle(''); setNewBody('');
  }

  async function sendMessage() {
    if (!newMsg.trim()) return;
    const { data: { session } } = await supa.auth.getSession();
    if (!session) { alert('Sign in to chat.'); return; }
    const sender = session.user.email || 'member';
    const { error } = await supa.from('chat_messages').insert({ message: newMsg.trim(), sender });
    if (error) return alert(error.message);
    setNewMsg('');
  }

  // soft gate for unauthenticated
  if (!authed) {
    return (
      <div className="min-h-dvh grid place-items-center px-4">
        <div className="max-w-md w-full rounded-[22px] border border-white/60 dark:border-white/10 bg-white/70 dark:bg-white/10 backdrop-blur-xl ring-1 ring-black/5 p-6 text-center">
          <h1 className="text-2xl font-semibold">You’ll need your key</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            The Living Room is for members. Head back to the door to request your key.
          </p>
          <Link href="/" className="mt-4 inline-flex rounded-xl bg-sky-600 text-white px-4 py-2 hover:bg-sky-700">
            Go to the door
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-[1200px] mx-auto w-full py-8">
      <h1 className="text-2xl font-semibold mb-4">Welcome Home</h1>

      {loading ? (
        <div className="text-zinc-500">Loading…</div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Announcements */}
          <section className="glasscard p-5">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-amber-600" />
              <h2 className="text-lg font-semibold">Announcements</h2>
            </div>

            {/* Composer */}
            <div className="mt-3 grid gap-2 rounded-xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-white/10 p-3 backdrop-blur">
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Title"
                className="glassfld"
              />
              <textarea
                rows={3}
                value={newBody}
                onChange={e => setNewBody(e.target.value)}
                placeholder="What’s new?"
                className="glassfld"
              />
              <div className="flex justify-end">
                <button onClick={postAnnouncement} className="glassbtn-primary">Post</button>
              </div>
            </div>

            {/* List */}
            <div className="mt-4 space-y-3">
              {announcements.length === 0 && (
                <div className="text-sm text-zinc-500">No announcements yet.</div>
              )}
              {announcements.map(a => (
                <div key={a.id} className="rounded-xl border border-white/60 dark:border-white/10 bg-white/70 dark:bg-white/10 p-3 backdrop-blur">
                  <div className="font-semibold">{a.title}</div>
                  <div className="text-sm mt-1 whitespace-pre-wrap">{a.body}</div>
                  <div className="mt-2 text-xs text-zinc-500">
                    {a.author ? `${a.author} • ` : ''}{fmtDate(a.created_at)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Community Chat */}
          <section className="glasscard p-5 flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Community Chat</h2>
              <div className="text-xs text-zinc-500">Realtime</div>
            </div>

            <div className="mt-3 grow min-h-[320px] max-h-[480px] overflow-y-auto rounded-xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-white/10 p-3 backdrop-blur">
              {messages.length === 0 && (
                <div className="text-sm text-zinc-500">No messages yet. Say hi 👋</div>
              )}
              <div className="space-y-2">
                {messages.map(m => (
                  <div key={m.id} className="rounded-lg border border-white/60 dark:border-white/10 bg-white/70 dark:bg-white/10 p-2 backdrop-blur">
                    <div className="text-xs text-zinc-500">
                      {m.sender || 'member'} • {fmtDate(m.created_at)}
                    </div>
                    <div className="text-sm whitespace-pre-wrap mt-1">{m.message}</div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </div>

            <form
              className="mt-3 flex items-center gap-2"
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            >
              <input
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                placeholder="Write a message…"
                className="glassfld w-full"
              />
              <button type="submit" className="glassbtn-primary inline-flex items-center gap-2" title="Send">
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </section>
        </div>
      )}

      {/* Shared “liquid glass” utilities */}
      <style jsx global>{`
        .glasscard{
          @apply rounded-[22px] border border-white/60 dark:border-white/10
                 bg-white/60 dark:bg-white/5 backdrop-blur-xl ring-1 ring-black/5
                 shadow-[0_8px_40px_rgba(0,0,0,0.10)];
        }
        .glassbtn{
          @apply rounded-xl px-4 py-2 border border-white/60 dark:border-white/10
                 bg-white/50 dark:bg-white/10 backdrop-blur ring-1 ring-black/5
                 hover:bg-white/70 transition;
        }
        .glassbtn-primary{
          @apply rounded-xl px-4 py-2 bg-sky-600 text-white
                 shadow-[0_6px_18px_rgba(2,132,199,0.35)] hover:bg-sky-700 transition;
        }
        .glassfld{
          @apply h-11 rounded-xl border border-white/60 dark:border-white/10
                 bg-white/70 dark:bg-white/10 px-3 backdrop-blur
                 focus:outline-none focus:ring-2 focus:ring-sky-400/60;
        }
      `}</style>
    </div>
  );
}
