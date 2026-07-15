// qup-pulse-admin/src/app/messages/page.js
'use client';

// Inbox — accepted conversations, plus a Requests tab for pending threads
// someone else started. Localized via useLang().
//
// API:  GET  /chat/conversations            -> { conversations: [{ id, status, isInitiator,
//                                                otherUser, lastMessage, lastMessageAt, unread }] }
//       GET  /chat/requests                 -> { requests: [same shape, no unread] }
//       POST /chat/conversations/:id/accept -> { ok, conversationId, status }
//
// lastMessage is a plain string on the Conversation model (not an object), so
// it renders directly. '' for a thread with no messages yet, and the literal
// '📷' for an image — a marker the server sends deliberately so the client can
// localize it rather than the server picking a language (see deliver() in
// server/src/socket/chat.js).
//
// NOTE: listConversations filters `status: { $ne: 'pending' }` and listRequests
// filters `initiator: { $ne: req.userId }` — so a thread the VIEWER started and
// the other party hasn't accepted appears in neither, and is invisible here
// until they accept. The server-side $or fix in chatController.listConversations
// addresses that; without it this page looks empty after using Message on a
// profile.

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken } from '../../lib/api';
import { useLang } from '../../context/LandingLang';
import AppNav from '../../components/AppNav';
import { listConversations, listRequests, acceptConversation } from '../../lib/chatApi';

export default function MessagesPage() {
  const router = useRouter();
  const { t } = useLang();
  const m = t.app.messages;
  const s = t.app.settings;

  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('inbox'); // 'inbox' | 'requests'
  const [conversations, setConversations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      // Both tabs load up front so the Requests badge is correct without the
      // user having to open the tab first.
      const [c, r] = await Promise.all([listConversations(), listRequests()]);
      setConversations(c);
      setRequests(r);
    } catch (e) {
      setError(e.message || m.loadFailed);
    } finally {
      setReady(true);
    }
  }, [m.loadFailed]);

  useEffect(() => {
    if (!getToken()) { router.replace('/'); return; }
    load();
  }, [router, load]);

  async function accept(id) {
    setBusyId(id);
    setError('');
    try {
      await acceptConversation(id);
      router.push(`/messages/${id}`);
    } catch (e) {
      setError(e.message || m.acceptFailed);
      setBusyId(null);
    }
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-500 dark:bg-[#0b1016] dark:text-slate-400">
        {s.loading}
      </div>
    );
  }

  const rows = tab === 'inbox' ? conversations : requests;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1016] dark:text-slate-100">
      <AppNav />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">{m.title}</h1>

        {error ? (
          <p className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <div className="mb-4 flex gap-2">
          {['inbox', 'requests'].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                tab === k
                  ? 'bg-emerald-500 text-emerald-950'
                  : 'border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {k === 'inbox' ? m.inbox : m.requests}
              {k === 'requests' && requests.length > 0 ? (
                <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-bold text-white">
                  {requests.length}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-slate-300 bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-[#131c26] dark:text-slate-400 dark:shadow-none">
            {tab === 'inbox' ? m.noConversations : m.noRequests}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm dark:border-slate-800 dark:bg-[#131c26] dark:shadow-none">
            {rows.map((c, i) => (
              <Row
                key={c.id}
                convo={c}
                last={i === rows.length - 1}
                isRequest={tab === 'requests'}
                busy={busyId === c.id}
                onAccept={() => accept(c.id)}
                m={m}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ convo, last, isRequest, busy, onAccept, m }) {
  const u = convo.otherUser;
  const name = u?.displayName || u?.username || m.unknownUser;
  const avatar = u?.avatarUrl || u?.photos?.[0]?.url || '';
  const border = last ? '' : 'border-b border-slate-200 dark:border-slate-800';

  const body = (
    <>
      <div className="relative shrink-0">
        <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-semibold">{name.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        {u?.online ? (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-400 dark:border-[#131c26]" />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-white">{name}</p>
        <p className="truncate text-sm text-slate-500 dark:text-slate-400">
          {/* '📷' is a marker, not a preview — the server sends it untranslated
              so the client picks the language. Render the localized word. */}
          {convo.lastMessage === '📷' ? m.photoMessage : (convo.lastMessage || m.noMessagesYet)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {convo.lastMessageAt ? (
          <span className="text-xs text-slate-400 dark:text-slate-600">
            {new Date(convo.lastMessageAt).toLocaleDateString()}
          </span>
        ) : null}
        {convo.unread > 0 ? (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-bold text-emerald-950">
            {convo.unread}
          </span>
        ) : null}
      </div>
    </>
  );

  // A pending request isn't openable until accepted — the row is a plain div,
  // not a link, so a mis-tap can't drop you into a thread you haven't agreed to.
  if (isRequest) {
    return (
      <div className={`flex items-center gap-3 px-5 py-3.5 ${border}`}>
        {body}
        <button
          type="button"
          onClick={onAccept}
          disabled={busy}
          className="shrink-0 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-sm font-semibold text-emerald-950 transition hover:brightness-105 disabled:opacity-50"
        >
          {busy ? '…' : m.accept}
        </button>
      </div>
    );
  }

  return (
    <Link
      href={`/messages/${convo.id}`}
      className={`flex items-center gap-3 px-5 py-3.5 no-underline transition hover:bg-slate-50 dark:hover:bg-slate-800/50 ${border}`}
    >
      {body}
    </Link>
  );
}