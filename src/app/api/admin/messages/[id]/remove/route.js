// qup-pulse-admin/src/app/api/admin/messages/[id]/remove/route.js
//
// Proxies POST /api/admin/messages/:id/remove to the Express API's
// POST /admin/messages/:id/remove.
//
// Sibling of the removed-list handler, and needed for the same reason:
// MessageModerationControls calls the Next route, so without this the Remove
// button 404s while the controller sits there working. adminRemoveMessage has
// been complete on the server for a while.
//
// Auth is pass-through: the Authorization header is forwarded untouched and
// requireModerator on the Express route is the boundary. No role check here —
// this handler has no database access to check against, and a second,
// independently-written gate is a place for the two to disagree.
//
// Removal is a MODERATOR action, not an admin one: global, asymmetric (the
// sender keeps a tombstone, the recipient's thread loses the message), and
// reversible via the restore sibling.

import { NextResponse } from "next/server";

// Never cache a moderation action.
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

  // Only `reason` is forwarded. It is the one field adminRemoveMessage reads,
  // and it ends up in the audit trail — passing the body through wholesale
  // would let the client write fields the server never validated.
  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason : "";

  try {
    const upstream = await fetch(
      `${API_BASE.replace(/\/$/, "")}/admin/messages/${encodeURIComponent(
        id,
      )}/remove`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: auth,
        },
        body: JSON.stringify({ reason }),
        cache: "no-store",
      },
    );

    // Forward status and body as-is. Rewriting a 403 into a 500 would hide the
    // difference between "not staff" and "server broke" — and in this panel a
    // mishandled 403 used to log the user out.
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    console.error("[api/admin/messages/:id/remove] upstream failed", err);
    return NextResponse.json(
      { error: "Could not reach the API" },
      { status: 502 },
    );
  }
}
