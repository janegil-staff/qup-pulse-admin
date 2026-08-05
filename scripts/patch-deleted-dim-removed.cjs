// qup-pulse-admin/scripts/patch-deleted-dim-removed.cjs
//
// Dims rows on /admin/deleted that a moderator has ALREADY removed.
//
// WHY A ROW APPEARS ON BOTH PAGES. Hiding and removal are independent flags on
// the same document: a participant hid it (hiddenFor) and, separately, this
// team took it down (removedByAdmin.at). Removing does not clear the hide, so
// such a message satisfies both queries and appears on Deleted and on Removed.
// That is correct — the two pages answer different questions, "who hid this"
// and "what have we taken down" — but an undimmed row makes it look like the
// list is duplicating itself.
//
// The alternative was excluding removed messages from this query entirely. Not
// taken: a message that was BOTH hidden by a participant and removed by a
// moderator is occasionally worth seeing as such, and a filter would make that
// combination invisible rather than quiet.
//
// WHAT WAS ALREADY RIGHT: the Removed badge, the removal reason, and
// removed={isRemoved} on the controls so the button reads Restore rather than
// offering Remove on something already removed. This patch only adds the
// visual state those were missing.
//
// opacity-60 rather than something heavier: the row must stay readable. A
// moderator scanning this list still needs to read the text of a removed
// message — that is the whole reason the text is never blanked in the
// database.
//
// NO PARSE VALIDATION — JSX. One exact-block replacement.
//
// Idempotent. Aborts without writing if the anchor is missing.
//
//   node scripts/patch-deleted-dim-removed.cjs
//   git diff src/app/admin/deleted/page.js

var fs = require("fs");
var path = require("path");

var FILE = path.join(
  __dirname,
  "..",
  "src",
  "app",
  "admin",
  "deleted",
  "page.js",
);

function fail(message) {
  console.error("ABORTED — " + message);
  console.error("No changes written.");
  process.exit(1);
}

if (!fs.existsSync(FILE)) fail("file not found: " + FILE);

var src = fs.readFileSync(FILE, "utf8");

if (src.indexOf("isRemoved ? \"opacity-60") !== -1) {
  console.log("No changes — removed rows are already dimmed.");
  process.exit(0);
}

// Anchored on the <li> that opens each row. The className is a plain string
// today, so it becomes a concatenation with the removed state appended.
var LI =
  /( *)<li\n( *)key=\{msg\.id\}\n( *)className="rounded-2xl border border-slate-300 bg-white p-5 dark:border-slate-800 dark:bg-\[#131c26\]"\n( *)>/;

if (!LI.test(src)) {
  fail(
    "could not find the row <li> with its className string.\n" +
      "  Add the dimming by hand: append\n" +
      '    (isRemoved ? " opacity-60" : "")\n' +
      "  to that className.",
  );
}

src = src.replace(LI, function (whole, outer, keyInd, clsInd, closeInd) {
  return (
    outer +
    "<li\n" +
    keyInd +
    "key={msg.id}\n" +
    clsInd +
    "// Dimmed when this team has already removed it. Readable, not\n" +
    clsInd +
    "// hidden: the text is the reason a moderator opens this page, and\n" +
    clsInd +
    "// it is never blanked in the database precisely so it stays\n" +
    clsInd +
    "// readable after removal.\n" +
    clsInd +
    "className={\n" +
    clsInd +
    '  "rounded-2xl border border-slate-300 bg-white p-5 dark:border-slate-800 dark:bg-[#131c26] transition " +\n' +
    clsInd +
    '  (isRemoved ? "opacity-60" : "")\n' +
    clsInd +
    "}\n" +
    closeInd +
    ">"
  );
});

fs.writeFileSync(FILE, src, "utf8");

console.log("Patched " + FILE);
console.log("  removed rows dimmed to opacity-60");
console.log("");
console.log("  NOT parse-validated — JSX. Check the diff:");
console.log("    git diff src/app/admin/deleted/page.js");
console.log("");
console.log("  Already present and unchanged: the Removed badge, the removal");
console.log("  reason, and removed={isRemoved} on the controls so the button");
console.log("  reads Restore.");
