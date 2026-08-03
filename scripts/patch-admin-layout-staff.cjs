// qup-pulse-admin/scripts/patch-admin-layout-staff.cjs
//
// Fixes: a moderator clicking the Admin panel link in their profile is
// immediately logged out.
//
// THE CAUSE
// src/app/admin/layout.js gates the whole shell on isAdmin():
//
//     if (!getToken() || !isAdmin()) { ... redirect ... }
//
// A moderator has a perfectly valid token and isAdmin() returns false, so the
// layout bounces them before a single request is made. This is why patching
// the 403 handler in lib/api.js did not help — nothing was reaching a 403.
// The gate was written when "admin" was the only staff role and has simply
// never been revisited.
//
// THE FIX
// lib/api.js already exports the right predicate:
//
//     export function isStaff() { return isAdmin() || isModerator(); }
//
// Gate the SHELL on isStaff — may this person open the admin area at all —
// and gate individual PAGES on isAdmin where the endpoints behind them are
// admin-only. Those are two different questions and the layout was answering
// the second one for both.
//
// WHAT THIS DOES NOT DO
// The sidebar still lists Users and Seed data to moderators. After this patch
// they can open the panel and those two links land on pages that 403 rather
// than logging them out — an improvement, but not the finished state. Hiding
// them needs the nav array in this file, which is the next step.
//
// Idempotent. Aborts without writing if the gate is not found in its expected
// form.
//
//   node scripts/patch-admin-layout-staff.cjs

var fs = require("fs");
var path = require("path");

var FILE = path.join(__dirname, "..", "src", "app", "admin", "layout.js");

// Matched by pattern rather than exact text: the surrounding whitespace and
// the order of the two conditions are not worth being brittle about.
var GATE = /(!\s*getToken\s*\(\s*\)\s*\|\|\s*)!\s*isAdmin\s*\(\s*\)/;

var IMPORT = /import\s*\{([^}]*)\}\s*from\s*(["'])(\.\.\/\.\.\/lib\/api[^"']*)\2/;

function fail(message) {
  console.error("ABORTED — " + message);
  console.error("No changes written to " + FILE);
  process.exit(1);
}

if (!fs.existsSync(FILE)) {
  fail("file not found: " + FILE);
}

var src = fs.readFileSync(FILE, "utf8");
var applied = [];

if (/!\s*isStaff\s*\(\s*\)/.test(src)) {
  console.log("No changes — the shell is already gated on isStaff().");
  process.exit(0);
}

// ── Edit 1: import isStaff ───────────────────────────────
//
// isAdmin is deliberately KEPT in the import even though the gate stops using
// it: the nav filtering that comes next needs it to decide which links a
// moderator should not see.

var importMatch = src.match(IMPORT);
if (!importMatch) {
  fail(
    "could not find the lib/api import in this file. Expected something like:\n" +
      '    import { getToken, isAdmin } from "../../lib/api";',
  );
}

var names = importMatch[1]
  .split(",")
  .map(function (name) {
    return name.trim();
  })
  .filter(Boolean);

if (names.indexOf("isStaff") === -1) {
  names.push("isStaff");
  var rebuilt =
    "import { " +
    names.join(", ") +
    " } from " +
    importMatch[2] +
    importMatch[3] +
    importMatch[2];
  src = src.replace(importMatch[0], rebuilt);
  applied.push("import");
}

// ── Edit 2: the gate itself ──────────────────────────────

if (!GATE.test(src)) {
  fail(
    "gate not found. Expected a condition of the form:\n" +
      "    if (!getToken() || !isAdmin()) {\n" +
      "  Change isAdmin() to isStaff() by hand — that is the whole fix.",
  );
}

src = src.replace(GATE, "$1!isStaff()");
applied.push("gate");

// ── Edit 3: correct the comment that describes the gate ──
//
// The header explains the redirect in terms of isAdmin. Leaving it saying that
// after changing the check is how the next person re-introduces the bug.

var STALE_COMMENT = /isAdmin\(\) reads a flag the client already has/;
if (STALE_COMMENT.test(src)) {
  src = src.replace(
    STALE_COMMENT,
    "isStaff() reads a flag the client already has",
  );
  applied.push("comment");
}

fs.writeFileSync(FILE, src, "utf8");

console.log("Patched " + FILE);
console.log("  applied: " + applied.join(", "));
console.log("");
console.log("  Shell now admits admins AND moderators.");
console.log("  isAdmin is still imported — the nav filtering needs it.");
console.log("");
console.log("  A moderator's role is read from localStorage, so an account");
console.log("  promoted during its current session still reads 'user' until");
console.log("  it logs out and back in.");
