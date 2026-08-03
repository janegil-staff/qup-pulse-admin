// qup-pulse-admin/src/app/api/admin/messages/[id]/restore/route.js
//
// Proxies POST /api/admin/messages/:id/restore to the Express API's
// POST /admin/messages/:id/restore.
//
// The undo half of the remove sibling, and the reason the removed-messages
// page exists at all: adminRestoreMessage shipped before anything could route
// to it, so a moderator who removed the wrong message had no way back. A
// reversible tool that cannot be reached is a permanent one.
//
// Takes no body — restore unsets removedByAdmin entirely, which discards the
// reason and the attribution along with it. There is nothing for the caller to
// supply, and that erasure is why the removed-messages page tells people to
// read the reason before restoring rather than after.
//
// Restoring does NOT un-hide the message for a participant who had also hidden
// it. Hiding is per-user and was never a moderation action; the two are
// independent. Correct, and surprising enough to be worth the comment.
//
// Auth is pass-through; requireModerator on the Express route is the boundary.

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

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing message id" }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `${API_BASE.replace(/\/$/, "")}/admin/messages/${encodeURIComponent(
        id,
      )}/restore`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: auth,
        },
        cache: "no-store",
      },
    );

    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    console.error("[api/admin/messages/:id/restore] upstream failed", err);
    return NextResponse.json(
      { error: "Could not reach the API" },
      { status: 502 },
    );
  }
}
