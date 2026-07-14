// qup-pulse-admin/scripts/add-header-footer-i18n.cjs
// Adds nav.language aria-label across 12 locales (idempotent).
// AppNav uses app.nav.* (already added). Footer uses existing footer.*.
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..', 'src', 'content', 'locales');
const LANGS = ['no','en','nl','fr','de','it','sv','da','fi','es','pl','pt'];
const LANGUAGE = { en:'Language', no:'Språk', nl:'Taal', fr:'Langue', de:'Sprache',
  it:'Lingua', sv:'Språk', da:'Sprog', fi:'Kieli', es:'Idioma', pl:'Język', pt:'Idioma' };

let changed = 0;
for (const l of LANGS) {
  const f = path.join(DIR, `${l}.json`);
  if (!fs.existsSync(f)) { console.warn(`skip: ${l}.json`); continue; }
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const before = JSON.stringify(j);
  if (!j.nav) j.nav = {};
  if (!('language' in j.nav)) j.nav.language = LANGUAGE[l] || LANGUAGE.en;
  if (JSON.stringify(j) !== before) { fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n'); changed++; console.log(`patched: ${l}.json`); }
  else console.log(`ok: ${l}.json`);
}
console.log(`\nDone. ${changed} changed.`);