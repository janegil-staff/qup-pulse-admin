// qup-pulse-admin/scripts/patch-combined-unread-badge.cjs
//
// COMBINED_UNREAD_BADGE_V1  (option B)
//
// The Messages badge ignored incoming message requests. chatUnreadCount()
// mirrored listConversations' filter, which deliberately excludes pending
// threads the viewer didn't start — those live in listRequests. Net effect: a
// stranger's request arrived with no badge at all.
//
// Option B: one combined number. The count now includes incoming pending
// threads. This is safe *because* /messages already renders Inbox and Requests
// as two tabs on the same page — tapping the badge lands the user somewhere the
// request is actually reachable, so the count can be cleared. (That is exactly
// the "unread with nowhere to go" trap the old comment warned about; it does
// not apply here.)
//
// Server response keeps `count` as the combined total and adds `requestCount`
// as a breakdown, so a future split badge (option C) needs no endpoint change.
//
// Also fixes, while in these files:
//   • routes/index.js registered /chat/unread-count and
//     /chat/conversations/:id/read THREE times each. Express takes the first
//     match, so it was harmless but dead. Duplicates removed.
//   • chatApi.js had a stray getUnreadCount() calling an undefined apiGet() —
//     a broken duplicate of chatUnreadCount(). It would throw if imported.
//     Removed.
//
// Run from EACH repo root — it patches whichever of the two it finds:
//   node scripts/patch-combined-unread-badge.cjs
//
// Idempotent: every edit is marker-guarded, so re-running is a no-op.

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

const TARGETS = {
  chatController: path.join(ROOT, 'server/src/controllers/chatController.js'),
  routes: path.join(ROOT, 'server/src/routes/index.js'),
  chatApi: path.join(ROOT, 'src/lib/chatApi.js'),
  appNav: path.join(ROOT, 'src/components/AppNav.js'),
};

let changed = 0;
let skipped = 0;
let absent = 0;

function edit(label, file, marker, fn) {
  if (!fs.existsSync(file)) {
    console.log(`  · not in this repo: ${path.relative(ROOT, file)}`);
    absent++;
    return;
  }
  const src = fs.readFileSync(file, 'utf8');
  if (src.includes(marker)) {
    console.log(`  – skip (already applied): ${label}`);
    skipped++;
    return;
  }
  const out = fn(src);
  if (out === src) {
    throw new Error(`Anchor not found for "${label}" in ${path.relative(ROOT, file)}`);
  }
  fs.writeFileSync(file, out, 'utf8');
  console.log(`  ✔ ${label}`);
  changed++;
}

// ─── 1. server/src/controllers/chatController.js ─────────────────────────────
console.log('chatController.js');

edit(
  'chatUnreadCount counts incoming requests',
  TARGETS.chatController,
  'COMBINED_UNREAD_V1',
  (s) => {
    const start = s.indexOf('// Total unread across the threads the viewer can actually open');
    if (start === -1) return s;
    const endAnchor = '// Mark all messages in a conversation as read by the viewer.';
    const end = s.indexOf(endAnchor);
    if (end === -1 || end < start) return s;

    const replacement = `// COMBINED_UNREAD_V1 — the tab badge.
//
// Counts unread messages in every thread the viewer can open from /messages,
// which includes BOTH tabs on that page:
//   • Inbox    — accepted threads, plus pending ones the viewer started.
//   • Requests — pending threads someone else started.
//
// The old filter mirrored listConversations alone, so an incoming request
// produced no badge: the message existed, was unread, and was silently
// uncounted. Including requests is only safe because /messages renders both
// lists — the number always has somewhere to land and can therefore be
// cleared. Do NOT widen this to threads with no UI route; that recreates the
// permanent-unread bug this comment used to warn about.
//
// Blocked threads stay excluded — no UI, no count.
//
// \`count\` is the combined total the badge renders. \`requestCount\` breaks out
// the pending-request share so the client can split the badge later without a
// server change.
export async function chatUnreadCount(req, res) {
  try {
    const blockedIds = await blockedIdsFor(req.userId);

    const visible = {
      participants: { $all: [req.userId], $nin: blockedIds },
      $or: [
        // Inbox tab.
        { status: { $ne: 'pending' } },
        { status: 'pending', initiator: req.userId },
        // Requests tab.
        { status: 'pending', initiator: { $ne: req.userId } },
      ],
    };

    const convos = await Conversation.find(visible).select('_id status initiator');

    const unreadIn = async (ids) => {
      if (!ids.length) return 0;
      return Message.countDocuments({
        conversation: { $in: ids },
        sender: { $ne: req.userId },
        readBy: { $ne: req.userId },
      });
    };

    const requestIds = convos
      .filter(
        (c) => c.status === 'pending' && String(c.initiator) !== String(req.userId)
      )
      .map((c) => c._id);
    const inboxIds = convos
      .filter((c) => !requestIds.some((r) => String(r) === String(c._id)))
      .map((c) => c._id);

    const [inboxCount, requestCount] = await Promise.all([
      unreadIn(inboxIds),
      unreadIn(requestIds),
    ]);

    return res.json({ count: inboxCount + requestCount, requestCount });
  } catch (err) {
    console.error('unreadCount error', err);
    return res.status(500).json({ error: 'Could not load unread count' });
  }
}

`;
    return s.slice(0, start) + replacement + s.slice(end);
  }
);

// ─── 2. server/src/routes/index.js ───────────────────────────────────────────
console.log('routes/index.js');

edit(
  'remove duplicate chat route registrations',
  TARGETS.routes,
  'CHAT_ROUTES_DEDUPED_V1',
  (s) => {
    let out = s;

    // Second copy: the accidental repeat directly under the chat block.
    out = out.replace(
      `router.get('/chat/unread-count', requireAuth, chatUnreadCount);
router.post('/chat/conversations/:id/read', requireAuth, markRead);
router.get('/chat/unread-count', requireAuth, chatUnreadCount);
router.post('/chat/conversations/:id/read', requireAuth, markRead);`,
      `// CHAT_ROUTES_DEDUPED_V1 — these two were registered three times over
// (once here, twice more further down under an "add these routes" note).
// Express matches the first, so the extras were dead weight, not a bug.
router.get('/chat/unread-count', requireAuth, chatUnreadCount);
router.post('/chat/conversations/:id/read', requireAuth, markRead);`
    );

    // Third copy: the stray block near the bottom.
    out = out.replace(
      `// add these routes with the other /chat routes:
router.get('/chat/unread-count', requireAuth, chatUnreadCount);
router.post('/chat/conversations/:id/read', requireAuth, markRead);

`,
      ''
    );

    return out;
  }
);

// ─── 3. src/lib/chatApi.js ───────────────────────────────────────────────────
console.log('chatApi.js');

edit(
  'chatUnreadCount returns { count, requestCount }',
  TARGETS.chatApi,
  'COMBINED_UNREAD_CLIENT_V1',
  (s) => {
    let out = s;

    out = out.replace(
      `//   chatUnreadCount     GET  /chat/unread-count            -> { count }`,
      `//   chatUnreadCount     GET  /chat/unread-count            -> { count, requestCount }`
    );

    out = out.replace(
      `export async function chatUnreadCount() {
  const res = await fetch(\`\${API_URL}/chat/unread-count\`, { headers: headers(), cache: 'no-store' });
  const data = await parse(res);
  return data.count || 0;
}`,
      `// COMBINED_UNREAD_CLIENT_V1 — \`count\` is the combined total (inbox unreads +
// incoming requests) the badge shows; \`requestCount\` is the request share of
// it, available for a split badge without another round-trip. Returns an object
// now, not a number — callers must read \`.count\`.
export async function chatUnreadCount() {
  const res = await fetch(\`\${API_URL}/chat/unread-count\`, { headers: headers(), cache: 'no-store' });
  const data = await parse(res);
  return { count: data.count || 0, requestCount: data.requestCount || 0 };
}`
    );

    // Drop the broken stray at the bottom: apiGet is not defined in this module.
    out = out.replace(
      `
// qup-pulse-admin/src/lib/chatApi.js
export async function getUnreadCount() {
const { count } = await apiGet('/chat/unread-count');
return count || 0;
}`,
      ''
    );

    return out;
  }
);

// ─── 4. src/components/AppNav.js ─────────────────────────────────────────────
console.log('AppNav.js');

edit(
  'AppNav reads the new count shape',
  TARGETS.appNav,
  'COMBINED_UNREAD_NAV_V1',
  (s) => {
    let out = s;

    out = out.replace(
      `    // Unread badge on the Messages tab. Fed by chat:notify, which deliver()`,
      `    // COMBINED_UNREAD_NAV_V1 — the badge counts inbox unreads AND incoming
    // message requests as one number. /messages shows Inbox and Requests as
    // sibling tabs, so a single count resolves either way; splitting them into
    // two indicators would need requestCount, which chatUnreadCount() already
    // returns.
    //
    // Unread badge on the Messages tab. Fed by chat:notify, which deliver()`
    );

    out = out.replace(
      `        const refresh = () => {
            chatUnreadCount()
                .then((count) => { if (!cancelled) setUnread(count); })
                .catch((e) => console.error('unread badge', e));
        };`,
      `        const refresh = () => {
            chatUnreadCount()
                .then(({ count }) => { if (!cancelled) setUnread(count); })
                .catch((e) => console.error('unread badge', e));
        };`
    );

    out = out.replace(
      `        chatUnreadCount()
            .then(setUnread)
            .catch((e) => console.error('unread badge', e));
    }, [pathname]);`,
      `        chatUnreadCount()
            .then(({ count }) => setUnread(count))
            .catch((e) => console.error('unread badge', e));
    }, [pathname]);`
    );

    return out;
  }
);

console.log(
  `\nDone. ${changed} edit(s) applied, ${skipped} already present, ${absent} file(s) not in this repo.`
);
