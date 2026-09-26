// qup-pulse-admin/src/lib/calls/callsApi.js
"use client";

// REST side of calling. Signaling itself is all Socket.IO (see CallContext).
//   getIceServers  GET /calls/ice-servers → { iceServers, relayAvailable }

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
const TOKEN_KEY = "qup_pulse_admin_jwt";

function headers() {
  const token =
    typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const FALLBACK_STUN = [{ urls: ["stun:stun.l.google.com:19302"] }];

export async function getIceServers() {
  try {
    const res = await fetch(`${API_URL}/calls/ice-servers`, {
      headers: headers(),
      cache: "no-store",
    });
    if (!res.ok) return FALLBACK_STUN;
    const data = await res.json();
    return data?.iceServers?.length ? data.iceServers : FALLBACK_STUN;
  } catch {
    return FALLBACK_STUN;
  }
}

// Flags the call record (Call.reported). The report moderators actually see is
// filed with reportUser — the API's call report doesn't reach the admin queue
// yet (TODO in callController.reportCall). Best-effort: never throws.
export async function reportCall(callId, reason, details = "") {
  try {
    await fetch(`${API_URL}/calls/${encodeURIComponent(callId)}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers() },
      body: JSON.stringify({ reason, details }),
    });
  } catch {
    /* the user report is what matters */
  }
}
