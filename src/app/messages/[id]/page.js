// qup-pulse-admin/src/app/messages/[id]/page.js
'use client';

// Thread view — history + send via REST, live receive via Socket.IO.
//
// REST:   GET  /chat/conversations/:id/messages?before= -> { messages: [toClient()] }
//         POST /chat/conversations/:id/messages          -> { message: toClient() }
//         POST /chat/conversations/:id/read              -> { ok }
//         POST /chat/conversations/:id/accept            -> { ok, status }
//         POST /upload (multipart, field "image")        -> { url, publicId }
//
// Socket: chat:join {conversationId}  -> ack { ok } | { error }   REQUIRED
//         chat:typing {conversationId}              (fire and forget)
//         chat:leave {conversationId}
//         chat:message  <- Message.toClient(), for EVERY message in the room
//                          including our own echo
//         chat:typing   <- { userId }
//         chat:accepted <- { conversationId, status }
//
// Sending is over REST (sendMessage). It used to be a Socket.IO emit
// (chat:send / chat:sendImage) awaiting an ack; that server handler was removed
// and the ack never came back, leaving the send button stuck on "…". The server
// now persists over REST and broadcasts chat:message to the room, so the bubble
// still arrives live via the listener below (deduped by id).
//
// The message-request SEND GATE has been removed server-side: both participants
// can send freely regardless of status. The Requests tab and Accept button
// remain as an informational/moderation surface, but the composer is never
// locked. (The old pendingLocked / canSendText cosmetic lock is gone to match.)

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken } from '../../../lib/api';
import { useLang } from '../../../context/LandingLang';
import AppNav from '../../../components/AppNav';
import {
    getMessages, markRead, acceptConversation, listConversations, listRequests, sendMessage,
} from '../../../lib/chatApi';
import { uploadImage } from '../../../lib/profileSettingsApi';
import { getSocket } from '../../../lib/socket';

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
        // no such thread) is the ONLY signal we get.
        socket.emit('chat:join', { conversationId: id }, (ack) => {
            if (ack?.error) setError(ack.error || m.joinFailed);
        });

        // The server echoes our own sends into the room, so this covers both
        // directions. Dedupe by id.
        const onMessage = (msg) => {
            if (String(msg.conversationId) !== id) return;
            setMessages((prev) => (prev.some((x) => String(x.id) === String(msg.id)) ? prev : [...prev, msg]));
        };

        const onTyping = () => {
            setTheyreTyping(true);
            clearTimeout(typingTimer.current);
            typingTimer.current = setTimeout(() => setTheyreTyping(false), 3000);
        };

        // The other party accepted. Flip local status so the header/labels update.
        const onAccepted = ({ conversationId, status }) => {
            if (String(conversationId) !== id) return;
            setConvo((prev) => (prev ? { ...prev, status: status || 'accepted' } : prev));
        };

        socket.on('chat:message', onMessage);
        socket.on('chat:typing', onTyping);
        socket.on('chat:accepted', onAccepted);

        return () => {
            socket.off('chat:message', onMessage);
            socket.off('chat:typing', onTyping);
            socket.off('chat:accepted', onAccepted);
            socket.emit('chat:leave', { conversationId: id });
            clearTimeout(typingTimer.current);
        };
    }, [id, m.joinFailed]);

    useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

    // The JWT's `sub` is the user id.
    function myIdFromToken() {
        try {
            const tok = getToken();
            return String(JSON.parse(atob(tok.split('.')[1])).sub);
        } catch {
            return null;
        }
    }

    async function send() {
        const body = text.trim();
        if (!body || sending) return;
        setSending(true);
        setError('');
        try {
            setText(''); // clear optimistically; the bubble arrives via chat:message
            const { message } = await sendMessage(id, { text: body });
            // Render immediately in case the socket echo is slow/absent (deduped).
            if (message) {
                setMessages((prev) =>
                    prev.some((x) => String(x.id) === String(message.id)) ? prev : [...prev, message]);
            }
        } catch (e) {
            setText(body); // put it back so the typing isn't lost
            setError(e.message || m.sendFailed);
        } finally {
            setSending(false);
        }
    }

    // Two steps: POST /upload for a Cloudinary URL, then sendMessage with it.
    async function sendImage(file) {
        setUploading(true);
        setError('');
        try {
            const { url } = await uploadImage(file);
            const { message } = await sendMessage(id, { imageUrl: url });
            if (message) {
                setMessages((prev) =>
                    prev.some((x) => String(x.id) === String(message.id)) ? prev : [...prev, message]);
            }
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
    // offer them a button that always fails. The Accept surface stays as a
    // moderation affordance; it no longer gates sending.
    const showAccept = convo?.status === 'pending' && !convo?.isInitiator;
    // Images still require an accepted conversation for BOTH parties — an
    // unsolicited image in a location-based app is a known abuse vector.
    const canSendImage = convo?.status === 'accepted';

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
                    {/* Image upload requires an ACCEPTED conversation — an unsolicited
              image in a location-based app is a known abuse vector, so the
              recipient opts in first. */}
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
                        onChange={(e) => {
                            setText(e.target.value.slice(0, 2000)); // Message schema maxlength
                            getSocket()?.emit('chat:typing', { conversationId: id });
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                        placeholder={m.placeholder}
                        className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-[#131c26] dark:disabled:bg-slate-900 dark:disabled:text-slate-600"
                    />

                    <button
                        type="button"
                        onClick={send}
                        disabled={sending || !text.trim()}
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