// qup-pulse-admin/src/app/messages/[id]/page.js
'use client';

// Thread view — history via REST, live send/receive via Socket.IO.
//
// REST:   GET  /chat/conversations/:id/messages?before= -> { messages: [toClient()] }
//         POST /chat/conversations/:id/read             -> { ok }
//         POST /chat/conversations/:id/accept           -> { ok, status }
//         POST /upload (multipart, field "image")       -> { url, publicId }
//
// Socket: chat:join {conversationId}  -> ack { ok } | { error }   REQUIRED
//         chat:send {conversationId, text}      -> ack { ok, message }
//         chat:sendImage {conversationId, imageUrl} -> ack { ok, message }
//         chat:typing {conversationId}          (fire and forget)
//         chat:leave {conversationId}
//         chat:message <- Message.toClient(), for EVERY message in the room
//                         including our own echo
//         chat:typing  <- { userId }
//
// Message shape: { id, conversationId, sender: toPublic(), text, imageUrl?,
//                  createdAt }. imageUrl is OMITTED on text messages, not null.
//
// The server exposes no GET for a single conversation, so the header comes from
// filtering listConversations()/listRequests(). Two extra round-trips; a
// GET /chat/conversations/:id would be better.
//
// PENDING RULES (mirrored from chat:send in server/src/socket/chat.js):
//   - The INITIATOR gets exactly one message on a pending thread — the opener,
//     so the recipient has something to judge the request on. After that the
//     composer locks until accept. The server enforces this with a
//     countDocuments check and returns PENDING_LIMIT; the disable here is
//     cosmetic, to avoid a send that visibly fails.
//   - The RECIPIENT is unrestricted: replying to a request is implicit consent.
//   - Images are accepted-only for BOTH parties, regardless of message count.
// The two gates are separate on purpose: canSendText can be true while
// canSendImage is false (the opener), and vice versa never happens.

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken } from '../../../lib/api';
import { useLang } from '../../../context/LandingLang';
import AppNav from '../../../components/AppNav';
import {
    getMessages, markRead, acceptConversation, listConversations, listRequests,
} from '../../../lib/chatApi';
import { uploadImage } from '../../../lib/profileSettingsApi';
import { getSocket, emitAck } from '../../../lib/socket';

export default function ThreadPage() {
    const router = useRouter();
    const params = useParams();
    const id = String(params?.id || '');
    const { t } = useLang();
    const m = t.app.messages;
    const s = t.app.settings;

    const [ready, setReady] = useState(false);
    const [convo, setConvo] = useState(null);
    const [meId, setMeId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [theyreTyping, setTheyreTyping] = useState(false);
    const bottomRef = useRef(null);
    const typingTimer = useRef(null);

    const scrollToBottom = useCallback(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        if (!getToken()) { router.replace('/'); return; }
        setMeId(myIdFromToken());
        let cancelled = false;

        (async () => {
            try {
                const [convos, reqs, msgs] = await Promise.all([
                    listConversations(),
                    listRequests(),
                    getMessages(id),
                ]);
                if (cancelled) return;

                setConvo([...convos, ...reqs].find((x) => String(x.id) === id) || null);
                setMessages(msgs);
                // Tell AppNav to refresh its badge; the receipt just cleared this thread's
                // unread and nothing else would tell it.
                markRead(id)
                    .then(() => window.dispatchEvent(new Event('chat:read')))
                    .catch(() => { });
            } catch (e) {
                if (!cancelled) setError(e.message || m.loadFailed);
            } finally {
                if (!cancelled) setReady(true);
            }
        })();

        return () => { cancelled = true; };
    }, [id, router, m.loadFailed]);

    useEffect(() => {
        const socket = getSocket();
        if (!socket || !id) return;

        // The ack is not optional. A rejected join (not a participant, blocked, or
        // no such thread) is the ONLY signal we get — ignore it and the thread
        // looks fine and simply never receives a message.
        emitAck('chat:join', { conversationId: id }).catch((e) => {
            setError(e.message || m.joinFailed);
        });

        // The server echoes our own sends into the room, so this covers both
        // directions. Dedupe by id: chat:send's ack also returns the message and
        // both can land.
        const onMessage = (msg) => {
            if (String(msg.conversationId) !== id) return;
            setMessages((prev) => (prev.some((x) => String(x.id) === String(msg.id)) ? prev : [...prev, msg]));
        };
        const onTyping = () => {
            setTheyreTyping(true);
            clearTimeout(typingTimer.current);
            typingTimer.current = setTimeout(() => setTheyreTyping(false), 3000);
        };

        socket.on('chat:message', onMessage);
        socket.on('chat:typing', onTyping);

        return () => {
            socket.off('chat:message', onMessage);
            socket.off('chat:typing', onTyping);
            socket.emit('chat:leave', { conversationId: id });
            clearTimeout(typingTimer.current);
        };
    }, [id, m.joinFailed]);

    useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

    // The JWT's `sub` is the user id — the same claim authSocket reads in
    // server/src/socket/chat.js. Reading it directly avoids a /me round-trip and a
    // dependency on that endpoint's envelope shape.
    function myIdFromToken() {
        try {
            const t = getToken();
            return String(JSON.parse(atob(t.split('.')[1])).sub);
        } catch {
            return null;
        }
    }

    async function send() {
        const body = text.trim();
        if (!body || sending || !canSendText) return;
        setSending(true);
        setError('');
        try {
            setText(''); // clear optimistically; the bubble arrives via chat:message
            await emitAck('chat:send', { conversationId: id, text: body });
        } catch (e) {
            setText(body); // put it back so the typing isn't lost
            // PENDING_LIMIT means the opener already landed and the thread is
            // waiting on accept. Reachable despite canSendText: the disable is
            // driven by local `messages`, which a second tab or a race can lag.
            setError(e.code === 'PENDING_LIMIT' || e.message === 'PENDING_LIMIT'
                ? m.textPending
                : (e.message || m.sendFailed));
        } finally {
            setSending(false);
        }
    }

    // Two steps: POST /upload for a Cloudinary URL, then chat:sendImage with it.
    // The server validates the host (res.cloudinary.com, or a local /uploads/
    // path in dev) and rejects anything else, so a URL from elsewhere won't stick.
    async function sendImage(file) {
        setUploading(true);
        setError('');
        try {
            const { url } = await uploadImage(file);
            await emitAck('chat:sendImage', { conversationId: id, imageUrl: url });
        } catch (e) {
            setError(e.message || m.sendFailed);
        } finally {
            setUploading(false);
        }
    }

    async function accept() {
        setError('');
        try {
            const r = await acceptConversation(id);
            setConvo((prev) => (prev ? { ...prev, status: r.status || 'accepted' } : prev));
        } catch (e) {
            setError(e.message || m.acceptFailed);
        }
    }

    if (!ready) {
        return (
            <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-500 dark:bg-[#0b1016] dark:text-slate-400">
                {s.loading}
            </div>
        );
    }

    const u = convo?.otherUser;
    const name = u?.displayName || u?.username || m.unknownUser;
    const avatar = u?.avatarUrl || u?.photos?.[0]?.url || '';
    // Only the RECIPIENT can accept — the server 400s the initiator, so don't
    // offer them a button that always fails.
    const showAccept = convo?.status === 'pending' && !convo?.isInitiator;
    const canSendImage = convo?.status === 'accepted';
    // The initiator's one-message allowance, spent. `messages.length` is the
    // whole thread, which is the same count the server takes — on a pending
    // thread only the initiator can have written, so there's nothing to filter.
    const pendingLocked =
        convo?.status === 'pending' && convo?.isInitiator && messages.length >= 1;
    const canSendText = !pendingLocked;

    return (
        <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-[#0b1016] dark:text-slate-100">
            <AppNav />

            <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-6">
                <div className="mb-3 flex items-center gap-3">
                    <Link
                        href="/messages"
                        className="text-sm font-semibold text-slate-500 no-underline hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                    >
                        ←
                    </Link>
                    <div className="relative shrink-0">
                        <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800">
                            {avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={avatar} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-xs font-semibold">{name.slice(0, 1).toUpperCase()}</span>
                            )}
                        </div>
                        {u?.online ? (
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400 dark:border-[#0b1016]" />
                        ) : null}
                    </div>
                    <div className="min-w-0">
                        {u?.username ? (
                            <Link
                                href={`/profile/${encodeURIComponent(u.username)}`}
                                className="truncate text-[15px] font-bold text-slate-900 no-underline hover:underline dark:text-white"
                            >
                                {name}
                            </Link>
                        ) : (
                            <span className="truncate text-[15px] font-bold text-slate-900 dark:text-white">{name}</span>
                        )}
                        {theyreTyping ? (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">{m.typing}</p>
                        ) : null}
                    </div>
                </div>

                {error ? (
                    <p className="mb-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
                        {error}
                    </p>
                ) : null}

                {showAccept ? (
                    <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 dark:border-slate-800 dark:bg-[#131c26]">
                        <p className="text-sm text-slate-600 dark:text-slate-300">{m.pendingBody}</p>
                        <button
                            type="button"
                            onClick={accept}
                            className="shrink-0 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-sm font-semibold text-emerald-950 transition hover:brightness-105"
                        >
                            {m.accept}
                        </button>
                    </div>
                ) : null}

                {/* The initiator's counterpart to showAccept. Without this the composer
            just goes dead after one message with no explanation — the disabled
            input's title only surfaces on hover, and not at all on touch. */}
                {pendingLocked ? (
                    <div className="mb-3 rounded-xl border border-slate-300 bg-white px-4 py-3 dark:border-slate-800 dark:bg-[#131c26]">
                        <p className="text-sm text-slate-600 dark:text-slate-300">{m.textPending}</p>
                    </div>
                ) : null}

                <div className="flex-1 space-y-2 overflow-y-auto rounded-2xl border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#131c26] dark:shadow-none">
                    {messages.length === 0 ? (
                        <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">{m.noMessagesYet}</p>
                    ) : (
                        messages.map((msg) => (
                            <Bubble
                                key={msg.id}
                                msg={msg}
                                mine={meId != null && String(msg.sender?.id) === meId}
                            />
                        ))
                    )}
                    <div ref={bottomRef} />
                </div>

                <div className="mt-3 flex items-center gap-2">
                    {/* Image upload. chat:sendImage requires an ACCEPTED conversation — an
    unsolicited image in a location-based app is a known abuse vector, so the
    recipient opts in first. Disabled rather than left to fail with the
    server's untranslated error string.

    The tooltip is CSS, not the native `title` attribute: a `title` on a label
    wrapping a disabled input fires unreliably in Chrome, and never fires on
    touch at all. `group` + `group-hover` renders it ourselves. */}
                    <div className="group relative shrink-0">
                        <label
                            className={`grid h-12 w-12 place-items-center rounded-xl border border-slate-300 text-xl font-semibold transition dark:border-slate-700 ${canSendImage
                                ? 'cursor-pointer text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                                : 'cursor-not-allowed text-slate-300 dark:text-slate-700'
                                }`}
                        >
                            {uploading ? '…' : '+'}
                            <input
                                type="file"
                                accept="image/*"
                                disabled={!canSendImage || uploading}
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    e.target.value = ''; // reset so the same file can be picked twice
                                    if (f) sendImage(f);
                                }}
                                className="hidden"
                            />
                        </label>

                        {!canSendImage ? (
                            <span
                                role="tooltip"
                                className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 w-56 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 dark:bg-slate-700"
                            >
                                {m.photoPending}
                            </span>
                        ) : null}
                    </div>
                    <input
                        value={text}
                        disabled={!canSendText}
                        title={canSendText ? undefined : m.textPending}
                        onChange={(e) => {
                            setText(e.target.value.slice(0, 2000)); // Message schema maxlength
                            getSocket()?.emit('chat:typing', { conversationId: id });
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                        placeholder={canSendText ? m.placeholder : m.textPendingPlaceholder}
                        className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-[#131c26] dark:disabled:bg-slate-900 dark:disabled:text-slate-600"
                    />

                    <button
                        type="button"
                        onClick={send}
                        disabled={sending || !text.trim() || !canSendText}
                        title={canSendText ? undefined : m.textPending}
                        className="shrink-0 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:brightness-105 disabled:opacity-50"
                    >
                        {sending ? '…' : m.send}
                    </button>
                </div>
            </div>
        </div>
    );
}

// imageUrl is omitted (not null) on text messages, so truthiness is enough.
// Text and image are mutually exclusive per the schema.
function Bubble({ msg, mine }) {
    return (
        <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${mine
                    ? 'bg-emerald-500 text-emerald-950'
                    : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                    }`}
            >
                {msg.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={msg.imageUrl} alt="" className="max-h-72 rounded-xl object-cover" />
                ) : (
                    <p className="whitespace-pre-wrap text-[15px]">{msg.text}</p>
                )}
                <p className={`mt-1 text-[11px] ${mine ? 'text-emerald-900/60' : 'text-slate-400 dark:text-slate-500'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
}