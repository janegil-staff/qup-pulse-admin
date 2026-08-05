// qup-pulse-admin/src/app/api/chat/messages/[id]/retract/route.js
//
// Proxies POST /api/chat/messages/:id/retract to the Express API's
// POST /chat/messages/:id/retract.
//
// Same shape as the admin message proxies, and missing for the same reason:
// the web client calls the Next route, so the Express route being mounted is
// necessary but not sufficient. Both halves have to exist or the call 404s
// with no way to tell which layer produced it.
//
// NO BODY. Retraction takes no arguments — the sender is withdrawing their own
// message and there is nothing to configure. Anything posted is dropped rather
// than forwarded.
//
// AUTH is pass-through; requireAuth on the Express route is the boundary. This
// handler deliberately does not check whether the caller is the sender: that
// is msg.sender !== me inside retractMessage, which has the document in hand.
// A second check here would have to re-fetch the message and could disagree.
//
// STATUS CODES the client should expect, all forwarded unchanged:
//   200 + { ok, messageId }              retracted
//   200 + { ok, alreadyRetracted }       no-op; double click or second device
//   403 code "not_sender"                someone else's message — hide, not retract
//   409 code "message_reported"          under moderation review, cannot be withdrawn
//
// The 409 matters in the UI: it is the one case where the confirm dialog's
// promise does not hold, and it needs its own message rather than a generic
// failure. Reported messages stay put so a moderator's review cannot be timed
// around by removing and restoring.
//
// IRREVERSIBLE by decision. There is no unretract route and there should not
// be one; the confirm dialog already tells the sender so.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_BASE =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "";

export async function POST(request, { params }) {
  if (!API_BASE) {
    return NextResponse.json(
      {
        error:
          "API base URL is not configured. Set API_URL or NEXT_PUBLIC_API_URL.",
      },
      { status: 500 },
    );
  }

  const auth = request.headers.get("authorization");
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Next 15 hands params in as a promise. Awaiting a plain object is harmless,
  // so this works on 14 as well.
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing message id" }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `${API_BASE.replace(/\/$/, "")}/chat/messages/${encodeURIComponent(
        id,
      )}/retract`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: auth,
        },
        cache: "no-store",
      },
    );

    // Forwarded as-is. The client distinguishes not_sender from
    // message_reported by the `code` field, so rewriting either the status or
    // the body here would collapse two different outcomes into one.
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    console.error("[api/chat/messages/:id/retract] upstream failed", err);
    return NextResponse.json(
      { error: "Could not reach the API" },
      { status: 502 },
    );
  }
}
