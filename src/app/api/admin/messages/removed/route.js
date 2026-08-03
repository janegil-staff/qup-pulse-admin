// qup-pulse-admin/src/app/api/admin/messages/removed/route.js
//
// Proxies GET /api/admin/messages/removed to the Express API's
// GET /admin/messages/removed.
//
// This is why the page 404'd: adminChatApi.js calls the Next route, not the
// Express one directly, and this handler did not exist. The controller
// (adminListRemovedMessages) has been written for a while — nothing could
// route to it from either direction.
//
// Auth is pass-through: the browser's Authorization header is forwarded
// untouched and the Express side decides. This handler deliberately does NOT
// check roles. Two reasons — it has no database access to check against, and a
// second, independently-written gate is a place for the two to disagree.
// requireModerator on the Express route is the boundary.
//
// Both moderators and admins may read this list: removal is content
// moderation, and a moderator who cannot see what they removed cannot undo it.
// That is enforced by requireModerator in admin.routes.js, not here.
//
// NOTE: if the repo already has a shared proxy helper (other route.js files
// under src/app/api would use it), prefer that over this standalone version —
// it will handle base URL and error shape consistently with everything else.

import { NextResponse } from "next/server";

// Next 15 caches route handlers aggressively. A moderation list must not be
// served stale.
export const dynamic = "force-dynamic";

// The Express API base. Named differently across setups, so both are checked
// before giving up with a message that says which variable to set.
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
      `${API_BASE.replace(/\/$/, "")}/admin/messages/removed${qs}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: auth,
        },
        cache: "no-store",
      },
    );

    // Forward the body and status as-is. Rewriting a 403 into a 500 here would
    // hide the one thing the client needs to distinguish "not staff" from
    // "server broke" — and in this panel a mishandled 403 logs the user out.
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    console.error("[api/admin/messages/removed] upstream failed", err);
    return NextResponse.json(
      { error: "Could not reach the API" },
      { status: 502 },
    );
  }
}
