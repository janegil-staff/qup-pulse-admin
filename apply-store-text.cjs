#!/usr/bin/env node
// qup-pulse-admin/apply-store-text.cjs
//
// Updates the landing page's download section in all 12 locale files, now that
// the app is live on both stores:
//
//   edit src/content/locales/*.json   download.title, download.body,
//                                     download.appStoreSmall, download.playSmall
//
//   node apply-store-text.cjs            run from the project root
//   node apply-store-text.cjs --dry-run  show what would change
//
// Only those four strings are touched; the rest of each file is left byte for
// byte as it was. Every file it changes is backed up to
// .store-text-backup/<timestamp>/ first. Safe to run twice: files that already
// have the new text are skipped.
'use strict';
const fs = require('fs');
const path = require('path');

// title / body: the heading and paragraph above the two store buttons.
// appStoreSmall / playSmall: the small line on each button, shown above
// "App Store" and "Google Play".
const TEXT = {
  en: {
    title: 'Available now on the App Store and Google Play',
    body: 'Qup Pulse is live on both stores. Download the app and start discovering people and posts near you.',
    appStoreSmall: 'Download on the',
    playSmall: 'Get it on',
  },
  no: {
    title: 'Tilgjengelig nå i App Store og på Google Play',
    body: 'Qup Pulse er ute i begge butikkene. Last ned appen og oppdag folk og innlegg i nærheten.',
    appStoreSmall: 'Last ned fra',
    playSmall: 'Tilgjengelig på',
  },
  nl: {
    title: 'Nu beschikbaar in de App Store en op Google Play',
    body: 'Qup Pulse staat in beide stores. Download de app en ontdek mensen en berichten bij jou in de buurt.',
    appStoreSmall: 'Download in de',
    playSmall: 'Ontdek het op',
  },
  fr: {
    title: 'Disponible dès maintenant sur l’App Store et Google Play',
    body: 'Qup Pulse est en ligne sur les deux stores. Téléchargez l’application et découvrez les personnes et les publications près de chez vous.',
    appStoreSmall: 'Télécharger dans l’',
    playSmall: 'Disponible sur',
  },
  de: {
    title: 'Jetzt im App Store und bei Google Play erhältlich',
    body: 'Qup Pulse ist in beiden Stores verfügbar. Lade die App herunter und entdecke Menschen und Beiträge in deiner Nähe.',
    appStoreSmall: 'Laden im',
    playSmall: 'Jetzt bei',
  },
  it: {
    title: 'Ora disponibile su App Store e Google Play',
    body: 'Qup Pulse è disponibile su entrambi gli store. Scarica l’app e scopri persone e post vicino a te.',
    appStoreSmall: 'Scarica su',
    playSmall: 'Disponibile su',
  },
  sv: {
    title: 'Finns nu i App Store och på Google Play',
    body: 'Qup Pulse finns i båda butikerna. Ladda ner appen och upptäck personer och inlägg nära dig.',
    appStoreSmall: 'Hämta i',
    playSmall: 'Ladda ned på',
  },
  da: {
    title: 'Nu tilgængelig i App Store og på Google Play',
    body: 'Qup Pulse er ude i begge butikker. Hent appen, og opdag personer og opslag i nærheden.',
    appStoreSmall: 'Hent i',
    playSmall: 'Nu på',
  },
  fi: {
    title: 'Nyt saatavilla App Storessa ja Google Playssa',
    body: 'Qup Pulse on julkaistu molemmissa kaupoissa. Lataa sovellus ja löydä ihmisiä ja julkaisuja läheltäsi.',
    appStoreSmall: 'Lataa kaupasta',
    playSmall: 'Lataa kaupasta',
  },
  es: {
    title: 'Ya disponible en App Store y Google Play',
    body: 'Qup Pulse ya está en ambas tiendas. Descarga la app y descubre personas y publicaciones cerca de ti.',
    appStoreSmall: 'Descárgala en la',
    playSmall: 'Disponible en',
  },
  pl: {
    title: 'Już dostępne w App Store i Google Play',
    body: 'Qup Pulse jest już w obu sklepach. Pobierz aplikację i odkrywaj ludzi i posty w swojej okolicy.',
    appStoreSmall: 'Pobierz z',
    playSmall: 'Pobierz z',
  },
  pt: {
    title: 'Já disponível na App Store e no Google Play',
    body: 'O Qup Pulse já está nas duas lojas. Descarrega a app e descobre pessoas e publicações perto de ti.',
    appStoreSmall: 'Descarregar na',
    playSmall: 'Disponível no',
  },
};

const DRY = process.argv.slice(2).includes('--dry-run');
const root = process.cwd();
const LOCALES_DIR = path.join('src', 'content', 'locales');

function die(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

// ── Sanity: are we in the Qup Pulse project? ────────────────────────────────
let pkg;
try {
  pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
} catch {
  die('No package.json here. Run this from the root of qup-pulse-admin.');
}
if (pkg.name !== 'qup-pulse-admin') {
  die(`package.json name is "${pkg.name}", expected "qup-pulse-admin".`);
}
if (!fs.existsSync(path.join(root, LOCALES_DIR))) {
  die(`${LOCALES_DIR} not found.`);
}

// Replaces the value of one string key inside the "download" object, leaving
// the surrounding text untouched. Returns null if the key isn't there.
function setInDownload(source, key, value) {
  const start = source.indexOf('"download"');
  if (start === -1) return null;
  const end = source.indexOf('}', start); // download holds only strings
  if (end === -1) return null;
  const block = source.slice(start, end);
  const re = new RegExp(`("${key}"\\s*:\\s*)"(?:[^"\\\\]|\\\\.)*"`);
  if (!re.test(block)) return null;
  // A function replacement, so "$" in a value is never read as a pattern.
  const next = block.replace(re, (_, prefix) => prefix + JSON.stringify(value));
  return source.slice(0, start) + next + source.slice(end);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(root, '.store-text-backup', stamp);

let changed = 0;
let skipped = 0;
let failed = 0;

for (const [lang, strings] of Object.entries(TEXT)) {
  const rel = path.join(LOCALES_DIR, `${lang}.json`);
  const file = path.join(root, rel);

  if (!fs.existsSync(file)) {
    console.log(`✖ ${rel}  not found`);
    failed += 1;
    continue;
  }

  const original = fs.readFileSync(file, 'utf8');
  let current;
  try {
    current = JSON.parse(original).download || {};
  } catch (e) {
    console.log(`✖ ${rel}  is not valid JSON (${e.message})`);
    failed += 1;
    continue;
  }

  const todo = Object.keys(strings).filter((k) => current[k] !== strings[k]);
  if (todo.length === 0) {
    console.log(`– ${rel}  already up to date`);
    skipped += 1;
    continue;
  }

  let updated = original;
  let missing = null;
  for (const key of todo) {
    const next = setInDownload(updated, key, strings[key]);
    if (next === null) {
      missing = key;
      break;
    }
    updated = next;
  }
  if (missing) {
    console.log(`✖ ${rel}  has no download.${missing} to update, left unchanged`);
    failed += 1;
    continue;
  }

  // Never write a file that no longer parses or didn't take the new values.
  let check;
  try {
    check = JSON.parse(updated).download;
  } catch {
    check = null;
  }
  if (!check || Object.keys(strings).some((k) => check[k] !== strings[k])) {
    console.log(`✖ ${rel}  update did not verify, left unchanged`);
    failed += 1;
    continue;
  }

  console.log(`${DRY ? '~' : '✔'} ${rel}  ${todo.join(', ')}`);
  for (const key of todo) {
    console.log(`    ${key}: ${JSON.stringify(current[key])}`);
    console.log(`    ${' '.repeat(key.length)}→ ${JSON.stringify(strings[key])}`);
  }

  if (!DRY) {
    fs.mkdirSync(path.join(backupDir, LOCALES_DIR), { recursive: true });
    fs.copyFileSync(file, path.join(backupDir, rel));
    fs.writeFileSync(file, updated, 'utf8');
  }
  changed += 1;
}

console.log(
  `\n${DRY ? 'Dry run: would update' : 'Updated'} ${changed} file(s), ` +
    `${skipped} already up to date, ${failed} failed.`,
);
if (!DRY && changed > 0) {
  console.log(`Backups: ${path.relative(root, backupDir)}`);
}
if (failed > 0) process.exit(1);
