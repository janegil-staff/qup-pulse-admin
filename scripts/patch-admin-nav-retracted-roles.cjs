// qup-pulse-admin/scripts/patch-admin-nav-retracted-roles.cjs
//
// Two changes to the /admin sidebar.
//
// 1. ADDS THE RETRACTED ENTRY. /admin/retracted has existed since the page,
//    controller, route and proxy were installed, but nothing linked to it — so
//    it was only reachable by typing the URL, and the server log shows the
//    endpoint was never once requested. A moderation surface nobody can
//    navigate to is the same as one that does not exist.
//
//    Placed directly under Removed, continuing the grouping the file already
//    argues for: the three message surfaces sit together with different labels
//    and different icons, because the difference between them is exactly what
//    gets confused.
//
// 2. HIDES USERS AND SEED FROM MODERATORS. Both are admin-only on the server —
//    requireAdmin on /admin/users, and seed.routes.js mounts requireAdmin
//    across its whole router with a second role check inside the controller.
//    A moderator following either link gets a 403. The layout admits all staff
//    (isStaff) because moderators need Reports, Deleted, Removed and now
//    Retracted; the menu should reflect what each role can actually open.
//
//    isAdmin() is read in the SAME effect as the staff check, not during
//    render: it reads localStorage, which does not exist during prerender.
//
// This is a menu, not a boundary. Both gates are enforced server-side and the
// seed page self-gates as well. Hiding the links stops a moderator being
// invited to do something they cannot do — it does not stop anything.
//
// NO PARSE VALIDATION — JSX. Whole-block replacements.
//
// Idempotent. Aborts without writing if an anchor is missing.
//
//   node scripts/patch-admin-nav-retracted-roles.cjs
//   git diff src/app/admin/layout.js

var fs = require("fs");
var path = require("path");

var FILE = path.join(__dirname, "..", "src", "app", "admin", "layout.js");

function fail(message) {
  console.error("ABORTED — " + message);
  console.error("No changes written.");
  process.exit(1);
}

if (!fs.existsSync(FILE)) fail("file not found: " + FILE);

var src = fs.readFileSync(FILE, "utf8");
var applied = [];

if (src.indexOf("/admin/retracted") !== -1) {
  console.log("No changes — the Retracted entry is already in the menu.");
  process.exit(0);
}

// ── Edit 1: admin state ──────────────────────────────────

var ALLOWED_STATE = /^([ \t]*)const \[allowed, setAllowed\] = useState\(null\);$/m;

if (!ALLOWED_STATE.test(src)) {
  fail("could not find the `allowed` state declaration.");
}

src = src.replace(ALLOWED_STATE, function (whole, indent) {
  return (
    whole +
    "\n\n" +
    indent +
    "// Admins see Users and Seed; moderators do not. Read in the effect\n" +
    indent +
    "// below rather than during render — isAdmin() reads localStorage,\n" +
    indent +
    "// which does not exist during prerender.\n" +
    indent +
    "const [admin, setAdmin] = useState(false);"
  );
});
applied.push("admin state");

// ── Edit 2: set it alongside the staff check ─────────────

var SET_ALLOWED = /^([ \t]*)setAllowed\(true\);$/m;

if (!SET_ALLOWED.test(src)) {
  fail("could not find `setAllowed(true);` in the auth effect.");
}

src = src.replace(SET_ALLOWED, function (whole, indent) {
  return indent + "setAdmin(isAdmin());\n" + indent + "setAllowed(true);";
});
applied.push("isAdmin read in the effect");

// ── Edit 3: the menu itself ──────────────────────────────
//
// The tail of the array is replaced wholesale: Retracted goes in after
// Removed, and the two admin-only entries gain a flag the filter below reads.

var TAIL =
  /( *)\{\n( *)href: "\/admin\/removed",\n[\s\S]*?\n( *)\{ href: "\/admin\/seed", label: t\.app\.nav\.seed, icon: "🌱" \},\n( *)\];/;

if (!TAIL.test(src)) {
  fail(
    "could not find the tail of the items array (removed -> users -> seed).\n" +
      "  Add the Retracted entry and the adminOnly flags by hand.",
  );
}

src = src.replace(TAIL, function (whole, outer) {
  var i = outer.replace(/^\n+/, "");
  return (
    i +
    "{\n" +
    i +
    '  href: "/admin/removed",\n' +
    i +
    '  label: t.app.admin?.removedMessages || "Removed by moderators",\n' +
    i +
    '  icon: "🛡️",\n' +
    i +
    "},\n" +
    i +
    "// The third message surface, and the one the MODERATED PARTY controls:\n" +
    i +
    "// a sender withdrew this. Grouped with the other two because the three\n" +
    i +
    "// are constantly confused, and separated by label and icon for the\n" +
    i +
    "// same reason. Read-only — retraction cannot be undone.\n" +
    i +
    "{\n" +
    i +
    '  href: "/admin/retracted",\n' +
    i +
    '  label: t.app.admin?.retractedMessages || "Retracted",\n' +
    i +
    '  icon: "↩️",\n' +
    i +
    "},\n" +
    i +
    "// adminOnly: the server returns 403 on both for a moderator, so\n" +
    i +
    "// showing them would be an invitation to a dead end rather than a\n" +
    i +
    "// capability. Not a security boundary — requireAdmin is.\n" +
    i +
    "{\n" +
    i +
    '  href: "/admin/users",\n' +
    i +
    "  label: t.app.nav.users,\n" +
    i +
    '  icon: "👥",\n' +
    i +
    "  adminOnly: true,\n" +
    i +
    "},\n" +
    i +
    "{\n" +
    i +
    '  href: "/admin/seed",\n' +
    i +
    "  label: t.app.nav.seed,\n" +
    i +
    '  icon: "🌱",\n' +
    i +
    "  adminOnly: true,\n" +
    i +
    "},\n" +
    i.slice(0, -2) +
    "].filter((item) => admin || !item.adminOnly);"
  );
});
applied.push("Retracted entry + adminOnly filter");

fs.writeFileSync(FILE, src, "utf8");

console.log("Patched " + FILE);
applied.forEach(function (row) {
  console.log("  " + row);
});
console.log("");
console.log("  NOT parse-validated — JSX. Check the diff:");
console.log("    git diff src/app/admin/layout.js");
console.log("");
console.log("  An admin sees five entries, a moderator three.");
console.log("  Role comes from localStorage, so an account promoted during");
console.log("  its current session sees the old menu until it logs out.");
