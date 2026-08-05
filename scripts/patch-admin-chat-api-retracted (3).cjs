// qup-pulse-admin/scripts/patch-admin-chat-api-retracted.cjs
//
// Appends adminListRetractedMessages to src/lib/adminChatApi.js.
//
// Mirrors adminListRemovedMessages exactly — same API_URL base, same headers()
// and parse() helpers already in that module. It is appended rather than
// inserted so it cannot disturb the existing functions; re-running aborts on
// the duplicate rather than making the module unparseable, which is the
// failure this file has produced before.
//
// Validates the output as an ES module before writing.
//
//   node scripts/patch-admin-chat-api-retracted.cjs

var fs = require("fs");
var path = require("path");
var execFileSync = require("child_process").execFileSync;

var FILE = path.join(__dirname, "..", "src", "lib", "adminChatApi.js");

function fail(message) {
  console.error("ABORTED — " + message);
  console.error("No changes written.");
  process.exit(1);
}

if (!fs.existsSync(FILE)) fail("file not found: " + FILE);

var src = fs.readFileSync(FILE, "utf8");

if (src.indexOf("adminListRetractedMessages") !== -1) {
  console.log("No changes — adminListRetractedMessages is already present.");
  process.exit(0);
}

// The module's own conventions, confirmed against adminGetConversation:
// API_URL directly, headers() for auth, parse() for the response.
var missing = ["API_URL", "function headers", "function parse"].filter(
  function (needle) {
    return src.indexOf(needle) === -1;
  },
);
if (missing.length > 0) {
  fail(
    "adminChatApi.js does not define: " +
      missing.join(", ") +
      "\n  This module's helpers differ from what the addition expects —\n" +
      "  add the function by hand following adminListRemovedMessages.",
  );
}

var ADDITION =
  "\n" +
  "// Every message a sender has retracted, newest first. Capped server-side.\n" +
  "//\n" +
  "//   adminListRetractedMessages  GET /admin/messages/retracted\n" +
  "//     -> { messages: [toAdmin() + sender, conversationId, retractedAt,\n" +
  "//                     hiddenCount, isReported] }\n" +
  "//\n" +
  "// There is no retract/unretract counterpart here on purpose. Retraction is\n" +
  "// irreversible by decision, so this surface is READ ONLY — adding a write\n" +
  "// would contradict copy the sender was already shown.\n" +
  "//\n" +
  "// isReported means a Report exists for a message that was ALREADY retracted.\n" +
  "// retractMessage refuses once a report exists, so that ordering can only mean\n" +
  "// the report came second: the recipient is complaining about something they\n" +
  "// can no longer show anyone. Those rows matter most.\n" +
  "export async function adminListRetractedMessages({ limit } = {}) {\n" +
  "  const qs = limit ? `?limit=${encodeURIComponent(limit)}` : \"\";\n" +
  "  const res = await fetch(`${API_URL}/admin/messages/retracted${qs}`, {\n" +
  "    headers: headers(),\n" +
  '    cache: "no-store",\n' +
  "  });\n" +
  "  const data = await parse(res);\n" +
  "\n" +
  "  return { messages: data.messages || [] };\n" +
  "}\n";

var next = src.replace(/\s*$/, "\n") + ADDITION;

try {
  execFileSync("node", ["--input-type=module", "--check"], {
    input: next,
    stdio: ["pipe", "pipe", "pipe"],
  });
} catch (err) {
  fail(
    "the patched output does not parse as an ES module, so it was NOT\n" +
      "  written. Your file is untouched. Parser said:\n\n" +
      String(err.stderr || err.message)
        .split("\n")
        .slice(0, 8)
        .map(function (row) {
          return "    " + row;
        })
        .join("\n"),
  );
}

fs.writeFileSync(FILE, next, "utf8");

console.log("Patched " + FILE);
console.log("  added adminListRetractedMessages");
console.log("  Output was parsed as ESM before writing.");
