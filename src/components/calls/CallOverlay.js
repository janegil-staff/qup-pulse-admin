// qup-pulse-admin/src/components/calls/CallOverlay.js
"use client";

// Full-screen call UI + incoming-call ring. Rendered once by CallRoot, above
// every page. Also shows a short notice when a call ends for a reason the
// user didn't cause (declined, no answer, busy, failed, no camera access).

import { useEffect, useRef, useState } from "react";
import { useCall, CALL_PHASE } from "../../lib/calls/CallContext";
import { reportCall } from "../../lib/calls/callsApi";
import { reportUser, blockUser } from "../../lib/feedApi";
import { useLang } from "../../context/LandingLang";

const EN = {
  calling: "Calling…",
  incomingVideo: "Incoming video call",
  incomingAudio: "Incoming call",
  connecting: "Connecting…",
  reconnecting: "Reconnecting…",
  accept: "Accept",
  decline: "Decline",
  cancel: "Cancel",
  end: "End",
  mute: "Mute",
  unmute: "Unmute",
  cameraOff: "Camera off",
  cameraOn: "Camera on",
  unknownUser: "Unknown",
  declined: "Call declined",
  noAnswer: "No answer",
  busy: "They're on another call",
  failed: "Could not connect the call",
  permissionDenied: "Allow camera and microphone access in your browser to make calls.",
  insecure: "Calls only work over https.",
  noConnection: "You're offline — try again in a moment.",
  noCamera: "No camera found — they can hear you but not see you.",
  noDevices: "No camera or microphone found — you can see and hear them, but they can't see or hear you.",
  report: "Report",
  reportTitle: "Report this call",
  reportPrompt: "What happened? The call will end after you report.",
  reportNote: "Add details (optional)",
  reportSubmit: "Report and end call",
  reportCancel: "Cancel",
  reportFailed: "Could not send the report. Try again.",
  reasonSpam: "Spam or scam",
  reasonHarassment: "Harassment",
  reasonInappropriate: "Inappropriate content",
  reasonMisinformation: "Fake or misleading profile",
  reasonOther: "Other",
  reportedTitle: "Thanks for reporting",
  reportedBody: "Our moderators will review it. Do you also want to block {name}? They won't be able to call or message you.",
  reportedBlock: "Block",
  reportedNotNow: "Not now",
  blocked: "{name} is blocked.",
};

// Mirrors REPORT_REASONS in the API's models/Report.js.
const REASONS = ["harassment", "inappropriate", "spam", "misinformation", "other"];
const REASON_KEY = {
  spam: "reasonSpam",
  harassment: "reasonHarassment",
  inappropriate: "reasonInappropriate",
  misinformation: "reasonMisinformation",
  other: "reasonOther",
};

// Reasons the user caused themselves, or a normal finish: no notice.
const SILENT = new Set([null, undefined, "hangup", "cancelled", "ended", "declined_by_me"]);

function noticeFor(reason, c) {
  switch (reason) {
    case "declined": return c.declined;
    case "timeout": return c.noAnswer;
    case "busy":
    case "already_in_call": return c.busy;
    case "permission_denied": return c.permissionDenied;
    case "insecure_context": return c.insecure;
    case "no_connection": return c.noConnection;
    default: return c.failed;
  }
}

function fmt(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// Soft two-tone ring via WebAudio — no audio file to host. Browsers may block
// it until the user has interacted with the page; that's fine, the overlay and
// the tab title still show the call.
function useRing(active, pattern) {
  useEffect(() => {
    if (!active) return undefined;
    let ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return undefined;
    }
    const beep = () => {
      try {
        const now = ctx.currentTime;
        pattern.forEach(([freq, start, dur]) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.frequency.value = freq;
          g.gain.setValueAtTime(0.0001, now + start);
          g.gain.exponentialRampToValueAtTime(0.12, now + start + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
          o.connect(g).connect(ctx.destination);
          o.start(now + start);
          o.stop(now + start + dur + 0.05);
        });
      } catch {}
    };
    beep();
    const iv = setInterval(beep, 3000);
    return () => {
      clearInterval(iv);
      ctx.close().catch(() => {});
    };
  }, [active, pattern]);
}

const RING = [[660, 0, 0.35], [880, 0.4, 0.35], [660, 1.0, 0.35], [880, 1.4, 0.35]];
const RINGBACK = [[440, 0, 1.2]];

function Video({ stream, muted, mirror, className }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream || null;
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={`${className} ${mirror ? "-scale-x-100" : ""}`}
    />
  );
}

function RoundButton({ onClick, label, danger, success, active, children }) {
  const tone = danger
    ? "bg-red-500 hover:bg-red-600 text-white"
    : success
      ? "bg-emerald-500 hover:bg-emerald-600 text-emerald-950"
      : active
        ? "bg-white text-slate-900"
        : "bg-white/15 hover:bg-white/25 text-white";
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1.5">
      <span className={`grid h-14 w-14 place-items-center rounded-full text-xl transition ${tone}`}>
        {children}
      </span>
      <span className="text-xs text-white/80">{label}</span>
    </button>
  );
}

export default function CallOverlay() {
  const call = useCall();
  const { t } = useLang();
  const c = { ...EN, ...(t?.app?.calls || {}) };
  const {
    phase, media, peer, isCaller, localStream, remoteStream, micEnabled,
    cameraEnabled, startedAt, lastEndReason, error, endedAt, localMedia, callId,
  } = call;

  // Report during a call (App Review 1.2). Filed as a USER report so it lands
  // in the existing moderation queue, tagged with the call id. The call ends,
  // then the user is offered a block. `afterReport` survives the overlay
  // closing because this component stays mounted.
  const peerId = peer?.id ?? peer?._id ?? null;
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [reportErr, setReportErr] = useState("");
  const [afterReport, setAfterReport] = useState(null); // { id, name }

  async function submitReport() {
    if (!reason || !peerId || sending) return;
    setSending(true);
    setReportErr("");
    try {
      const tag = `[Video call${callId ? ` ${callId}` : ""}]`;
      await reportUser(peerId, reason, `${tag} ${note.trim()}`.trim().slice(0, 500));
      if (callId) reportCall(callId, reason, note.trim());
      const reportedName = peer?.displayName || peer?.username || "";
      setReportOpen(false);
      setReason(null);
      setNote("");
      call.endCall();
      setAfterReport({ id: peerId, name: reportedName });
    } catch {
      setReportErr(c.reportFailed);
    } finally {
      setSending(false);
    }
  }

  const [now, setNow] = useState(Date.now());
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (phase !== CALL_PHASE.ACTIVE) return undefined;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [phase]);

  // One notice per ended call.
  const shownFor = useRef(null);
  useEffect(() => {
    const reason = error || lastEndReason;
    if (!endedAt || shownFor.current === endedAt || SILENT.has(reason)) return undefined;
    shownFor.current = endedAt;
    setNotice(noticeFor(reason, c));
    const tm = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(tm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endedAt, error, lastEndReason]);

  const incoming = phase === CALL_PHASE.INCOMING;
  useRing(incoming, RING);
  useRing(phase === CALL_PHASE.OUTGOING, RINGBACK);

  // Flash the tab title so a call is noticed in a background tab.
  const name = peer?.displayName || peer?.username || c.unknownUser;
  useEffect(() => {
    if (!incoming) return undefined;
    const original = document.title;
    let on = false;
    const iv = setInterval(() => {
      on = !on;
      document.title = on ? `📞 ${name}` : original;
    }, 1000);
    return () => {
      clearInterval(iv);
      document.title = original;
    };
  }, [incoming, name]);

  const afterDialog = afterReport ? (
    <div className="fixed inset-0 z-[1001] grid place-items-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-slate-900 shadow-xl dark:bg-[#131c26] dark:text-slate-100">
        <h3 className="text-lg font-bold">{c.reportedTitle}</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {c.reportedBody.replace("{name}", afterReport.name)}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setAfterReport(null)}
            className="rounded-lg px-3.5 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {c.reportedNotNow}
          </button>
          <button
            type="button"
            onClick={async () => {
              const who = afterReport;
              setAfterReport(null);
              try {
                await blockUser(who.id);
                setNotice(c.blocked.replace("{name}", who.name));
                setTimeout(() => setNotice(null), 4000);
              } catch {
                /* profile page still offers block */
              }
            }}
            className="rounded-lg bg-red-500 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-red-600"
          >
            {c.reportedBlock}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (phase === CALL_PHASE.IDLE) {
    if (afterDialog) return afterDialog;
    return notice ? (
      <div className="fixed inset-x-0 bottom-6 z-[1000] flex justify-center px-4">
        <div className="rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg dark:bg-slate-800">
          {notice}
        </div>
      </div>
    ) : null;
  }

  const status = {
    [CALL_PHASE.OUTGOING]: c.calling,
    [CALL_PHASE.INCOMING]: media === "video" ? c.incomingVideo : c.incomingAudio,
    [CALL_PHASE.CONNECTING]: c.connecting,
    [CALL_PHASE.RECONNECTING]: c.reconnecting,
    [CALL_PHASE.ACTIVE]: startedAt ? fmt(now - startedAt) : "",
  }[phase];

  const showRemote = media === "video" && remoteStream && phase !== CALL_PHASE.INCOMING;
  const showLocal = media === "video" && localStream && cameraEnabled;

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-slate-950 text-white" role="dialog" aria-modal="true">
      {showRemote ? (
        <Video stream={remoteStream} className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      {/* Audio-only calls still need an element to play the remote track. */}
      {!showRemote && remoteStream ? <Video stream={remoteStream} className="hidden" /> : null}

      {showLocal ? (
        <Video
          stream={localStream}
          muted
          mirror
          className="absolute right-4 top-4 z-10 h-40 w-28 rounded-2xl border border-white/20 bg-black object-cover shadow-lg sm:h-48 sm:w-36"
        />
      ) : null}

      {peerId && !incoming ? (
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className="absolute left-4 top-4 z-20 rounded-full bg-black/45 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/60"
        >
          🚩 {c.report}
        </button>
      ) : null}

      {reportOpen ? (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-slate-900 shadow-xl dark:bg-[#131c26] dark:text-slate-100">
            <h3 className="text-lg font-bold">{c.reportTitle}</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{c.reportPrompt}</p>
            <div className="mt-3 space-y-1.5">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`w-full rounded-xl border px-4 py-2 text-left text-sm transition ${
                    reason === r
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
                      : "border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  }`}
                >
                  {c[REASON_KEY[r]]}
                </button>
              ))}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={450}
              rows={3}
              placeholder={c.reportNote}
              className="mt-3 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
            />
            {reportErr ? <p className="mt-2 text-sm text-red-500">{reportErr}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setReportOpen(false); setReportErr(""); }}
                className="rounded-lg px-3.5 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {c.reportCancel}
              </button>
              <button
                type="button"
                disabled={!reason || sending}
                onClick={submitReport}
                className="rounded-lg bg-red-500 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-40"
              >
                {c.reportSubmit}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="relative z-10 mt-20 flex flex-col items-center text-center">
        {!showRemote ? (
          <div className="mb-4 grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-white/10 text-3xl font-semibold">
            {peer?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={peer.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              name.slice(0, 1).toUpperCase()
            )}
          </div>
        ) : null}
        <h2 className="text-2xl font-bold drop-shadow">{name}</h2>
        <p className="mt-1 text-sm text-white/80 drop-shadow">{status}</p>
        {media === "video" && (localMedia === "audio" || localMedia === "none") ? (
          <p className="mt-3 max-w-xs rounded-lg bg-black/50 px-3 py-2 text-xs text-white/90">
            {localMedia === "none" ? c.noDevices : c.noCamera}
          </p>
        ) : null}
      </div>

      <div className="relative z-10 mt-auto flex justify-center gap-6 pb-10">
        {incoming ? (
          <>
            <RoundButton onClick={call.declineCall} label={c.decline} danger>✕</RoundButton>
            <RoundButton onClick={call.acceptCall} label={c.accept} success>✓</RoundButton>
          </>
        ) : phase === CALL_PHASE.OUTGOING && isCaller ? (
          <RoundButton onClick={call.cancelCall} label={c.cancel} danger>✕</RoundButton>
        ) : (
          <>
            {localMedia !== "none" ? (
              <RoundButton onClick={call.toggleMic} label={micEnabled ? c.mute : c.unmute} active={!micEnabled}>
                {micEnabled ? "🎙️" : "🔇"}
              </RoundButton>
            ) : null}
            {media === "video" && localMedia === "video" ? (
              <RoundButton onClick={call.toggleCamera} label={cameraEnabled ? c.cameraOff : c.cameraOn} active={!cameraEnabled}>
                {cameraEnabled ? "🎥" : "🚫"}
              </RoundButton>
            ) : null}
            <RoundButton onClick={call.endCall} label={c.end} danger>✕</RoundButton>
          </>
        )}
      </div>
    </div>
  );
}
