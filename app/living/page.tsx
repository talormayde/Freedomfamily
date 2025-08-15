// app/living/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Card, Page } from '@/components/ui';
import { Send, Megaphone } from 'lucide-react';

// ---------- Types ----------
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

// ---------- Helpers ----------
function fmtDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ---------- Page ----------
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
  const [newMsg, setNewMsg] = useState('');

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // auth soft-gate (client)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supa.auth.getSession();
      if (mounted) setAuthed(!!session);
      const { data: { subscription } } = supa.auth.onAuthStateChange((_e, sess) => {
        if (mounted) setAuthed(!!sess);
      });
      return () => subscription.unsubscribe();
    })();
    return () => { mounted = false; };
  }, []);

  // initial load
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

    // realtime subscriptions
    const ch = supa
      .channel('living-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, payload => {
        setAnnouncements(prev => {
          if (payload.eventType === 'INSERT') {
            return [payload.new as Announcement, ...prev];
          }
          if (payload.eventType === 'UPDATE') {
            return prev.map(x => (x.id === (payload.new as any).id ? (payload.new as Announcement) : x));
          }
          if (payload.eventType === 'DELETE') {
            return prev.filter(x => x.id !== (payload.old as any).id);
          }
          return prev;
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, payload => {
        setMessages(prev => {
          if (payload.eventType === 'INSERT') {
            return [...prev, payload.new as ChatMessage];
          }
          if (payload.eventType === 'UPDATE') {
            return prev.map(x => (x.id === (payload.new as any).id ? (payload.new as ChatMessage) : x));
          }
          if (payload.eventType === 'DELETE') {
            return prev.filter(x => x.id !== (payload.old as any).id);
          }
          return prev;
        });
      })
      .subscribe();

    return () => {
      cancelled = true;
      supa.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // autoscroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // actions
  async function postAnnouncement() {
    if (!newTitle.trim() || !newBody.trim()) return;
    const { data: { session } } = await supa.auth.getSession();
    const author = session?.user?.email || 'member';
    const { error } = await supa
      .from('announcements')
      .insert({ title: newTitle.trim(), body: newBody.trim(), author });
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

  // unauth soft gate
  if (!authed) {
    return (
      <Page>
        <Card className="p-5">
          <h1 className="text-2xl font-semibold">You’ll need your key</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            The Living Room is for members. Head back to the door to request your key.
          </p>
          <Link href="/" className="mt-4 inline-flex rounded-xl bg-sky-600 text-white px-4 py-2 hover:bg-sky-700">
            Go to the door
          </Link>
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <h1>Living Room</h1>

      {loading ? (
        <div className="mt-4 text-zinc-500">Loading…</div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* Announcements */}
          <Card className="p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-amber-600" />
              <h2 className="text-lg font-semibold">Announcements</h2>
            </div>

            {/* Create announcement */}
            <div className="mt-3 grid gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Title"
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
              />
              <textarea
                value={newBody}
                onChange={e => setNewBody(e.target.value)}
                placeholder="What’s new?"
                rows={3}
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
              />
              <div className="flex justify-end">
                <button
                  onClick={postAnnouncement}
                  className="rounded-xl bg-sky-600 text-white px-4 py-2 hover:bg-sky-700"
                >
                  Post
                </button>
              </div>
            </div>

            {/* List */}
            <div className="mt-4 space-y-3">
              {announcements.length === 0 && (
                <div className="text-sm text-zinc-500">No announcements yet.</div>
              )}
              {announcements.map(a => (
                <div key={a.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-white/70 dark:bg-zinc-900">
                  <div className="font-semibold">{a.title}</div>
                  <div className="text-sm mt-1 whitespace-pre-wrap">{a.body}</div>
                  <div className="mt-2 text-xs text-zinc-500">
                    {a.author ? `${a.author} • ` : ''}{fmtDate(a.created_at)}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Community Chat */}
          <Card className="p-4 sm:p-5 flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Community Chat</h2>
              <div className="text-xs text-zinc-500">Realtime</div>
            </div>

            <div className="mt-3 grow min-h-[320px] max-h-[480px] overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 bg-white/60 dark:bg-zinc-900">
              {messages.length === 0 && (
                <div className="text-sm text-zinc-500">No messages yet. Say hi 👋</div>
              )}
              <div className="space-y-2">
                {messages.map(m => (
                  <div key={m.id} className="rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 p-2">
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
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 text-white px-4 py-2 hover:bg-sky-700"
                title="Send"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </Card>
        </div>
      )}
    </Page>
  );
}
