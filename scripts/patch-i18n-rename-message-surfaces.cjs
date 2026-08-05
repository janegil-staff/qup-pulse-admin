// qup-pulse-admin/scripts/patch-i18n-rename-message-surfaces.cjs
//
// Renames the three message surfaces so they read as a set:
//
//   Hidden messages          (was: Deleted messages / Slettede meldinger)
//   Retracted messages       (was: Retracted / Trukket tilbake)
//   Removed by moderator     (unchanged in meaning, aligned in form)
//
// WHY. "Deleted" collided with three different mechanisms once moderator
// removal and sender retraction landed, and the layout file has been carrying
// a comment saying so. A moderator reading "Deleted messages" has no way to
// know it means "a participant hid these from their own view" — which is the
// single most-confused thing in this panel.
//
// Naming them in parallel makes the sidebar do the explaining: three entries,
// same shape, differing only in the word that matters. Hidden / Retracted /
// Removed, each by a different party — a participant, the sender, this team.
//
// THIS SCRIPT OVERWRITES, unlike every other i18n script in this repo. Those
// are additive because an existing value is somebody's decision; this one
// exists precisely to replace decisions that turned out to be wrong. It prints
// the old value beside the new for every language so nothing changes silently.
//
// deletedMessages is used as BOTH the sidebar label and the page heading, so
// the two cannot drift. The inline fallbacks in those components still say
// "Hidden by users" — worth aligning to "Hidden messages" by hand, though they
// only render if the key is missing.
//
// The descriptions and notices are NOT touched. They already explain each
// mechanism correctly and at length; only the short labels were wrong.
//
//   node scripts/patch-i18n-rename-message-surfaces.cjs

var fs = require("fs");
var path = require("path");

var LOCALES_DIR = path.join(__dirname, "..", "src", "content", "locales");

var LANGS = [
  "no", "en", "nl", "fr", "de", "it", "sv", "da", "fi", "es", "pl", "pt",
];

var TRANSLATIONS = {
  "no": {
    "deletedMessages": "Skjulte meldinger",
    "retractedMessages": "Tilbaketrukne meldinger",
    "removedMessages": "Fjernet av moderator"
  },
  "en": {
    "deletedMessages": "Hidden messages",
    "retractedMessages": "Retracted messages",
    "removedMessages": "Removed by moderator"
  },
  "nl": {
    "deletedMessages": "Verborgen berichten",
    "retractedMessages": "Ingetrokken berichten",
    "removedMessages": "Verwijderd door moderator"
  },
  "fr": {
    "deletedMessages": "Messages masqués",
    "retractedMessages": "Messages retirés",
    "removedMessages": "Retirés par un modérateur"
  },
  "de": {
    "deletedMessages": "Ausgeblendete Nachrichten",
    "retractedMessages": "Zurückgezogene Nachrichten",
    "removedMessages": "Von einem Moderator entfernt"
  },
  "it": {
    "deletedMessages": "Messaggi nascosti",
    "retractedMessages": "Messaggi ritirati",
    "removedMessages": "Rimossi da un moderatore"
  },
  "sv": {
    "deletedMessages": "Dolda meddelanden",
    "retractedMessages": "Tillbakadragna meddelanden",
    "removedMessages": "Borttagna av moderator"
  },
  "da": {
    "deletedMessages": "Skjulte beskeder",
    "retractedMessages": "Tilbagetrukne beskeder",
    "removedMessages": "Fjernet af moderator"
  },
  "fi": {
    "deletedMessages": "Piilotetut viestit",
    "retractedMessages": "Perutut viestit",
    "removedMessages": "Moderaattorin poistamat"
  },
  "es": {
    "deletedMessages": "Mensajes ocultos",
    "retractedMessages": "Mensajes retirados",
    "removedMessages": "Eliminados por un moderador"
  },
  "pl": {
    "deletedMessages": "Ukryte wiadomości",
    "retractedMessages": "Wycofane wiadomości",
    "removedMessages": "Usunięte przez moderatora"
  },
  "pt": {
    "deletedMessages": "Mensagens ocultadas",
    "retractedMessages": "Mensagens retiradas",
    "removedMessages": "Removidas por um moderador"
  }
};

function fail(message) {
  console.error("ABORTED — " + message);
  console.error("No changes written.");
  process.exit(1);
}

if (!fs.existsSync(LOCALES_DIR)) fail("directory not found: " + LOCALES_DIR);

var loaded = {};
LANGS.forEach(function (lang) {
  var file = path.join(LOCALES_DIR, lang + ".json");
  if (!fs.existsSync(file)) fail("missing locale file: " + file);
  try {
    loaded[lang] = {
      file: file,
      data: JSON.parse(fs.readFileSync(file, "utf8")),
    };
  } catch (err) {
    fail(lang + ".json is not valid JSON: " + err.message);
  }
  if (!TRANSLATIONS[lang]) fail("no translations defined for " + lang);
});

var reference = Object.keys(TRANSLATIONS.en).sort();
LANGS.forEach(function (lang) {
  var keys = Object.keys(TRANSLATIONS[lang]).sort();
  if (keys.join("|") !== reference.join("|")) {
    fail("the " + lang + " table does not match en.");
  }
});

var changes = 0;

LANGS.forEach(function (lang) {
  var entry = loaded[lang];
  var data = entry.data;

  if (!data.app || typeof data.app !== "object") data.app = {};
  if (!data.app.admin || typeof data.app.admin !== "object") data.app.admin = {};

  var target = data.app.admin;
  var strings = TRANSLATIONS[lang];
  var lines = [];

  Object.keys(strings).forEach(function (key) {
    var before = target[key];
    if (before === strings[key]) return;
    target[key] = strings[key];
    changes++;
    lines.push(
      "    " + key + ": " +
        (before == null ? "(unset)" : JSON.stringify(before)) +
        "  ->  " + JSON.stringify(strings[key]),
    );
  });

  if (lines.length === 0) return;

  fs.writeFileSync(
    entry.file,
    JSON.stringify(data, null, 2) + "\n",
    "utf8",
  );
  console.log("  " + lang);
  lines.forEach(function (row) {
    console.log(row);
  });
});

if (changes === 0) {
  console.log("No changes — the labels already read as intended.");
} else {
  console.log("");
  console.log("  " + changes + " value(s) replaced across 12 locales.");
  console.log("");
  console.log("  rm -rf .next && npm run dev");
}
