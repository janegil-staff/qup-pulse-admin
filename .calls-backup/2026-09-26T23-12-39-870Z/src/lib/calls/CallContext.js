// qup-pulse-admin/src/lib/calls/CallContext.js
"use client";

// 1:1 video calls on the web. Same socket protocol as the mobile app
// (call:invite / accept / offer / answer / ice / connected / end / decline /
// cancel), so web ↔ iOS ↔ Android calls all work against the one API.
//
// Mounted once in the root layout (components/calls/CallRoot.js), so an
// incoming call rings on whatever page the user is on.
//
// State machine:
//   idle → outgoing → connecting → active → idle
//   idle → incoming → connecting → active → idle
//
// Ordering: the callee builds its peer connection BEFORE emitting call:accept,
// because the server tells the caller to send the offer inside the accept
// handler. An offer that still arrives early is buffered.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getSocket } from "../socket";
import { listConversations, listRequests } from "../chatApi";
import { getIceServers } from "./callsApi";

export const CALL_PHASE = {
  IDLE: "idle",
  OUTGOING: "outgoing",
  INCOMING: "incoming",
  CONNECTING: "connecting",
  ACTIVE: "active",
  RECONNECTING: "reconnecting",
};

const SIGNAL_TIMEOUT_MS = 15000;

const INITIAL = {
  phase: CALL_PHASE.IDLE,
  callId: null,
  conversationId: null,
  media: "video",
  isCaller: false,
  peer: null,
  localStream: null,
  remoteStream: null,
  micEnabled: true,
  cameraEnabled: true,
  startedAt: null,
  lastEndReason: null,
  endedAt: null,
  error: null,
};

const CallContext = createContext(null);

// console.warn, not console.log: Chrome hides "Info" by default in some
// setups, and Next's dev server only forwards warnings/errors to the terminal.
// On production, enable with: localStorage.setItem("qup_call_debug", "1")
function debugOn() {
  if (process.env.NODE_ENV !== "production") return true;
  try {
    return window.localStorage.getItem("qup_call_debug") === "1";
  } catch {
    return false;
  }
}
const log = (...a) => {
  if (debugOn()) console.warn("[call]", ...a);
};

// Incoming events only carry the caller's id — find their name.
async function lookupPeer(conversationId, callerId) {
  try {
    const [convos, requests] = await Promise.all([
      listConversations().catch(() => []),
      listRequests().catch(() => []),
    ]);
    const all = [...(convos || []), ...(requests || [])];
    const c = all.find((x) => String(x.id ?? x._id) === String(conversationId));
    const u = c?.otherUser;
    if (!u) return null;
    return {
      id: String(u.id ?? u._id ?? callerId),
      displayName: u.displayName,
      username: u.username,
      avatarUrl: u.avatarUrl,
    };
  } catch {
    return null;
  }
}

// ── One RTCPeerConnection + local media ──────────────────────────────────────
class Peer {
  constructor(handlers) {
    this.h = handlers;
    this.pc = null;
    this.local = null;
    this.remote = null;
    this.pending = [];
    this.hasRemote = false;
  }

  async startMedia(media) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("insecure_context"); // needs https (or localhost)
    }
    this.local = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video:
        media === "video"
          ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
          : false,
    });
    this.h.onLocal(this.local);
  }

  createPc(iceServers) {
    const pc = new RTCPeerConnection({ iceServers, bundlePolicy: "max-bundle" });
    pc.onicecandidate = (e) => e.candidate && this.h.onIce(e.candidate.toJSON());
    pc.ontrack = (e) => {
      const stream = e.streams[0] || new MediaStream([e.track]);
      this.remote = stream;
      this.h.onRemote(stream);
    };
    pc.onconnectionstatechange = () => this.h.onState(pc.connectionState);
    this.local?.getTracks().forEach((t) => pc.addTrack(t, this.local));
    this.pc = pc;
  }

  async offer() {
    const o = await this.pc.createOffer();
    await this.pc.setLocalDescription(o);
    return { type: o.type, sdp: o.sdp };
  }

  async answer(offer) {
    await this.pc.setRemoteDescription(offer);
    this.hasRemote = true;
    await this.flush();
    const a = await this.pc.createAnswer();
    await this.pc.setLocalDescription(a);
    return { type: a.type, sdp: a.sdp };
  }

  async applyAnswer(answer) {
    await this.pc.setRemoteDescription(answer);
    this.hasRemote = true;
    await this.flush();
  }

  async addIce(c) {
    if (!c) return;
    if (!this.pc || !this.hasRemote) {
      this.pending.push(c);
      return;
    }
    try {
      await this.pc.addIceCandidate(c);
    } catch (e) {
      log("addIceCandidate failed", e?.message);
    }
  }

  async flush() {
    const q = this.pending;
    this.pending = [];
    for (const c of q) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await this.pc.addIceCandidate(c);
      } catch (e) {
        log("queued candidate failed", e?.message);
      }
    }
  }

  setMic(on) {
    this.local?.getAudioTracks().forEach((t) => (t.enabled = on));
  }

  setCam(on) {
    this.local?.getVideoTracks().forEach((t) => (t.enabled = on));
  }

  destroy() {
    try { this.local?.getTracks().forEach((t) => t.stop()); } catch {}
    try { this.pc?.close(); } catch {}
    this.pc = null;
    this.local = null;
    this.remote = null;
    this.pending = [];
    this.hasRemote = false;
  }
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function CallProvider({ children }) {
  const [state, setState] = useState(INITIAL);
  const [socket, setSocket] = useState(null);

  const peerRef = useRef(null);
  const callIdRef = useRef(null);
  const phaseRef = useRef(CALL_PHASE.IDLE);
  const pendingOfferRef = useRef(null);

  // The socket is a lazily-created singleton keyed on the token in
  // localStorage (lib/socket.js). Re-check periodically so we pick it up after
  // login and drop it after logout, on any page.
  useEffect(() => {
    const sync = () => {
      const s = getSocket();
      setSocket((prev) => {
        if (prev !== s) log("socket", s ? (s.connected ? "connected" : "created, not connected yet") : "none (not logged in?)");
        return prev === s ? prev : s;
      });
    };
    sync();
    const iv = setInterval(sync, 3000);
    window.addEventListener("storage", sync);
    return () => {
      clearInterval(iv);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const patch = useCallback((u) => {
    if (u.phase) phaseRef.current = u.phase;
    setState((p) => ({ ...p, ...u }));
  }, []);

  const teardown = useCallback((reason = null) => {
    log("teardown", reason);
    peerRef.current?.destroy();
    peerRef.current = null;
    callIdRef.current = null;
    pendingOfferRef.current = null;
    phaseRef.current = CALL_PHASE.IDLE;
    setState({ ...INITIAL, lastEndReason: reason, endedAt: Date.now() });
  }, []);

  // Handlers read callIdRef rather than capturing an id: the caller creates
  // its media before the server has assigned one.
  const buildPeer = useCallback(
    () => {
      const peer = new Peer({
        onLocal: (s) => patch({ localStream: s }),
        onRemote: (s) => patch({ remoteStream: s }),
        onIce: (candidate) =>
          socket?.emit("call:ice", { callId: callIdRef.current, candidate }),
        onState: (st) => {
          const callId = callIdRef.current;
          log("connectionState", st);
          if (st === "connected") {
            socket?.emit("call:connected", { callId });
            patch({ phase: CALL_PHASE.ACTIVE, startedAt: Date.now() });
          } else if (st === "disconnected") {
            patch({ phase: CALL_PHASE.RECONNECTING });
          } else if (st === "failed") {
            socket?.emit("call:end", { callId });
            teardown("failed");
          }
        },
      });
      peerRef.current = peer;
      return peer;
    },
    [socket, patch, teardown],
  );

  // ── Outgoing ──
  const startCall = useCallback(
    async ({ conversationId, peer, media = "video" }) => {
      log("startCall", { conversationId, socket: !!socket, connected: !!socket?.connected, phase: phaseRef.current });
      if (!socket?.connected) {
        log("not starting — socket is not connected");
        patch({ error: "no_connection", endedAt: Date.now() });
        return;
      }
      if (phaseRef.current !== CALL_PHASE.IDLE) {
        log("not starting — already in phase", phaseRef.current);
        return;
      }

      patch({
        phase: CALL_PHASE.OUTGOING,
        conversationId,
        peer,
        media,
        isCaller: true,
        cameraEnabled: media === "video",
        micEnabled: true,
        error: null,
        lastEndReason: null,
      });

      // Ask for camera/mic up front so a denied permission never rings the
      // other side.
      const p = buildPeer();
      try {
        await p.startMedia(media);
      } catch (e) {
        log("media error", e?.name, e?.message);
        teardown(e?.message === "insecure_context" ? "insecure_context" : "permission_denied");
        return;
      }

      socket.timeout(SIGNAL_TIMEOUT_MS).emit(
        "call:invite",
        { conversationId, media },
        (err, res) => {
          log("invite ack", err ? "TIMEOUT" : res);
          if (err) return teardown("no_server_response");
          if (!res?.ok) return teardown(res?.error || "invite_failed");
          if (phaseRef.current === CALL_PHASE.IDLE) {
            // Cancelled while the invite was in flight.
            socket.emit("call:cancel", { callId: res.call.callId });
            return;
          }
          callIdRef.current = res.call.callId;
          patch({ callId: res.call.callId });
          // The offer itself waits for call:accepted.
          p.createPc(
            res.iceServers?.length
              ? res.iceServers
              : [{ urls: ["stun:stun.l.google.com:19302"] }],
          );
        },
      );
    },
    [socket, patch, teardown, buildPeer],
  );

  const cancelCall = useCallback(() => {
    if (callIdRef.current) socket?.emit("call:cancel", { callId: callIdRef.current });
    teardown("cancelled");
  }, [socket, teardown]);

  // ── Incoming ──
  const acceptCall = useCallback(async () => {
    const callId = callIdRef.current;
    if (!callId || !socket) return;
    patch({ phase: CALL_PHASE.CONNECTING });

    let peer;
    try {
      peer = buildPeer();
      await peer.startMedia(state.media);
      peer.createPc(await getIceServers());
    } catch (e) {
      log("media error (callee)", e?.name || e?.message);
      socket.emit("call:decline", { callId });
      teardown(e?.message === "insecure_context" ? "insecure_context" : "permission_denied");
      return;
    }

    socket.timeout(SIGNAL_TIMEOUT_MS).emit("call:accept", { callId }, async (err, res) => {
      if (err) return teardown("no_server_response");
      if (!res?.ok) return teardown(res?.error || "accept_failed");
      const buffered = pendingOfferRef.current;
      if (buffered?.callId === callId) {
        pendingOfferRef.current = null;
        try {
          const answer = await peer.answer(buffered.sdp);
          socket.emit("call:answer", { callId, sdp: answer });
        } catch (e) {
          log("answer failed", e?.message);
          socket.emit("call:end", { callId });
          teardown("failed");
        }
      }
    });
  }, [socket, state.media, patch, teardown, buildPeer]);

  const declineCall = useCallback(() => {
    if (callIdRef.current) socket?.emit("call:decline", { callId: callIdRef.current });
    teardown("declined_by_me");
  }, [socket, teardown]);

  const endCall = useCallback(() => {
    if (callIdRef.current) socket?.emit("call:end", { callId: callIdRef.current });
    teardown("hangup");
  }, [socket, teardown]);

  const toggleMic = useCallback(() => {
    setState((p) => {
      peerRef.current?.setMic(!p.micEnabled);
      return { ...p, micEnabled: !p.micEnabled };
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setState((p) => {
      peerRef.current?.setCam(!p.cameraEnabled);
      return { ...p, cameraEnabled: !p.cameraEnabled };
    });
  }, []);

  // ── Socket events ──
  useEffect(() => {
    if (!socket) return undefined;

    const onIncoming = (call) => {
      log("incoming", call.callId);
      if (callIdRef.current || phaseRef.current !== CALL_PHASE.IDLE) {
        socket.emit("call:decline", { callId: call.callId });
        return;
      }
      callIdRef.current = call.callId;
      patch({
        phase: CALL_PHASE.INCOMING,
        callId: call.callId,
        conversationId: call.conversationId,
        media: call.media,
        isCaller: false,
        cameraEnabled: call.media === "video",
        micEnabled: true,
        peer: { id: call.callerId },
        error: null,
        lastEndReason: null,
      });
      lookupPeer(call.conversationId, call.callerId).then((peer) => {
        if (peer && callIdRef.current === call.callId) patch({ peer });
      });
    };

    const onHandled = ({ callId }) => {
      if (callIdRef.current === callId && phaseRef.current === CALL_PHASE.INCOMING) {
        teardown(null); // answered in another tab / on the phone
      }
    };

    const onAccepted = async ({ callId }) => {
      if (callIdRef.current !== callId) return;
      const peer = peerRef.current;
      if (!peer?.pc) {
        socket.emit("call:end", { callId });
        return teardown("failed");
      }
      patch({ phase: CALL_PHASE.CONNECTING });
      try {
        socket.emit("call:offer", { callId, sdp: await peer.offer() });
      } catch (e) {
        log("offer failed", e?.message);
        socket.emit("call:end", { callId });
        teardown("failed");
      }
    };

    const onOffer = async ({ callId, sdp }) => {
      if (callIdRef.current !== callId) return;
      const peer = peerRef.current;
      if (!peer?.pc) {
        pendingOfferRef.current = { callId, sdp };
        return;
      }
      try {
        socket.emit("call:answer", { callId, sdp: await peer.answer(sdp) });
      } catch (e) {
        log("answer failed", e?.message);
        socket.emit("call:end", { callId });
        teardown("failed");
      }
    };

    const onAnswer = async ({ callId, sdp }) => {
      if (callIdRef.current !== callId) return;
      try {
        await peerRef.current?.applyAnswer(sdp);
      } catch (e) {
        log("applyAnswer failed", e?.message);
        socket.emit("call:end", { callId });
        teardown("failed");
      }
    };

    const onIce = ({ callId, candidate }) => {
      if (callIdRef.current === callId) peerRef.current?.addIce(candidate);
    };

    const onConnected = ({ callId, answeredAt }) => {
      if (callIdRef.current !== callId) return;
      patch({
        phase: CALL_PHASE.ACTIVE,
        startedAt: answeredAt ? new Date(answeredAt).getTime() : Date.now(),
      });
    };

    const onEnded = ({ callId, endReason }) => {
      if (callIdRef.current === callId) teardown(endReason || "ended");
    };

    const events = {
      "call:incoming": onIncoming,
      "call:handled": onHandled,
      "call:accepted": onAccepted,
      "call:offer": onOffer,
      "call:answer": onAnswer,
      "call:ice": onIce,
      "call:connected": onConnected,
      "call:ended": onEnded,
    };
    Object.entries(events).forEach(([e, fn]) => socket.on(e, fn));
    return () => Object.entries(events).forEach(([e, fn]) => socket.off(e, fn));
  }, [socket, patch, teardown]);

  // Hang up if the tab closes mid-call so the other side isn't left waiting.
  useEffect(() => {
    const onUnload = () => {
      if (callIdRef.current) {
        const ev = phaseRef.current === CALL_PHASE.INCOMING ? "call:decline" : "call:end";
        socket?.emit(ev, { callId: callIdRef.current });
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [socket]);

  useEffect(() => () => peerRef.current?.destroy(), []);

  // Inspect from the browser console: window.__qupCall
  useEffect(() => {
    window.__qupCall = {
      phase: state.phase,
      callId: state.callId,
      lastEndReason: state.lastEndReason,
      error: state.error,
      socket: socket ? { id: socket.id, connected: socket.connected } : null,
    };
  }, [state, socket]);

  const value = useMemo(
    () => ({
      ...state,
      canCall: Boolean(socket),
      isInCall: state.phase !== CALL_PHASE.IDLE,
      startCall,
      acceptCall,
      declineCall,
      cancelCall,
      endCall,
      toggleMic,
      toggleCamera,
    }),
    [state, socket, startCall, acceptCall, declineCall, cancelCall, endCall, toggleMic, toggleCamera],
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used inside <CallProvider>");
  return ctx;
}
