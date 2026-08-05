// qup-pulse-admin/src/app/api/admin/messages/retracted/route.js
//
// Proxies GET /api/admin/messages/retracted to the Express API's
// GET /admin/messages/retracted.
//
// The missing half of the retracted surface. adminChatApi.js builds its URL
// from NEXT_PUBLIC_API_URL, which is "/api" — so the browser calls this Next
// route, not DigitalOcean directly. Without this handler Next returns 404
// before the API is ever contacted, and the page renders an empty list that
// looks identical to "nothing has been retracted".
//
// Sibling of the removed-messages handler and deliberately identical in shape.
//
// Auth is pass-through: the Authorization header is forwarded untouched and
// requireModerator on the Express route is the boundary. No role check here —
// this handler has no database access to check against, and a second,
// independently-written gate is a place for the two to disagree.
//
// READ ONLY. There is no retract or unretract counterpart and there should not
// be one: retraction is irreversible by decision, and the sender was told so
// before it happened.

import { NextResponse } from "next/server";

// A moderation list must never be served stale.
export const dynamic = "force-dynamic";

// API_URL is the server-side base and already ends in /api in this
// deployment, so the path below is appended to it directly.
const API_BASE =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "";

export async function GET(request) {
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

  // Pass `limit` through; the Express side caps it. Anything else is dropped
  // rather than forwarded blindly.
  const limit = new URL(request.url).searchParams.get("limit");
  const qs = limit ? `?limit=${encodeURIComponent(limit)}` : "";

  try {
    const upstream = await fetch(
      `${API_BASE.replace(/\/$/, "")}/admin/messages/retracted${qs}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: auth,
        },
        cache: "no-store",
      },
    );

    // Forward status and body as-is. Rewriting a 403 into a 500 here would
    // hide the one thing the client needs to distinguish "not staff" from
    // "server broke".
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    console.error("[api/admin/messages/retracted] upstream failed", err);
    return NextResponse.json(
      { error: "Could not reach the API" },
      { status: 502 },
    );
  }
}
