// scripts/add-locale-strings.cjs
//
// One-off, general-purpose helper to add new i18n strings across ALL 12 locale
// files in a given folder. Idempotent: safe to re-run — it merges keys, never
// duplicates, and (by default) never overwrites an existing value.
//
// Works on any locale folder whose files are named <lang>.json, e.g.
//   src/content/locales/   (landing + register)
//   src/content/legal/     (legal pages)
//
// ── HOW TO USE ─────────────────────────────────────────────────────────
// 1. Put your new strings in ADDITIONS below: an object keyed by lang code,
//    each holding the SAME nested shape you want merged in. English is the
//    reference — every lang must have the same keys as `en` or the script
//    warns. Array values (e.g. list items) are supported.
// 2. Run:
//      node scripts/add-locale-strings.cjs <folder>
//    e.g.
//      node scripts/add-locale-strings.cjs src/content/locales
//    Flags:
//      --dry     show what would change, write nothing
//      --force   overwrite existing values (default: keep existing)
//
// Norwegian is authoritative for product copy; English is authoritative for
// legal copy. This script does not care which — it just merges what you give
// it. Fill ADDITIONS accordingly.

'use strict';

const fs = require('fs');
const path = require('path');

// The 12 supported languages, in the project's canonical order.
const LANGS = ['no', 'en', 'nl', 'fr', 'de', 'it', 'sv', 'da', 'fi', 'es', 'pl', 'pt'];

// ── EDIT THIS: the strings to add, per language ────────────────────────
// Replace the example with your real strings. Keep every language's shape
// identical to `en`. Nested objects and arrays are both fine.
//
// Example (adds a `consent` block — delete/replace for your actual use):
const ADDITIONS = {
  en: {
    consent: {
      termsPre: 'I accept the',
      termsLink: 'Terms and conditions',
      termsPost: 'including the privacy policy.',
      privacyPre: 'I consent to the storage and use of my data in accordance with the',
      privacyLink: 'Privacy Policy',
      privacyPost: '.',
    },
  },
  no: {
    consent: {
      termsPre: 'Jeg godtar',
      termsLink: 'vilkårene og betingelsene',
      termsPost: 'inkludert personvernerklæringen.',
      privacyPre: 'Jeg samtykker til lagring og bruk av mine data i samsvar med',
      privacyLink: 'personvernerklæringen',
      privacyPost: '.',
    },
  },
  nl: {
    consent: {
      termsPre: 'Ik accepteer de',
      termsLink: 'algemene voorwaarden',
      termsPost: 'inclusief het privacybeleid.',
      privacyPre: 'Ik stem in met de opslag en het gebruik van mijn gegevens in overeenstemming met het',
      privacyLink: 'privacybeleid',
      privacyPost: '.',
    },
  },
  fr: {
    consent: {
      termsPre: "J'accepte les",
      termsLink: 'conditions générales',
      termsPost: 'y compris la politique de confidentialité.',
      privacyPre: "Je consens au stockage et à l'utilisation de mes données conformément à la",
      privacyLink: 'politique de confidentialité',
      privacyPost: '.',
    },
  },
  de: {
    consent: {
      termsPre: 'Ich akzeptiere die',
      termsLink: 'Nutzungsbedingungen',
      termsPost: 'einschließlich der Datenschutzerklärung.',
      privacyPre: 'Ich willige in die Speicherung und Nutzung meiner Daten gemäß der',
      privacyLink: 'Datenschutzerklärung',
      privacyPost: 'ein.',
    },
  },
  it: {
    consent: {
      termsPre: 'Accetto i',
      termsLink: 'termini e le condizioni',
      termsPost: "inclusa l\u2019informativa sulla privacy.",
      privacyPre: "Acconsento alla conservazione e all\u2019uso dei miei dati in conformità con l\u2019",
      privacyLink: 'informativa sulla privacy',
      privacyPost: '.',
    },
  },
  sv: {
    consent: {
      termsPre: 'Jag godkänner',
      termsLink: 'villkoren',
      termsPost: 'inklusive integritetspolicyn.',
      privacyPre: 'Jag samtycker till lagring och användning av mina uppgifter i enlighet med',
      privacyLink: 'integritetspolicyn',
      privacyPost: '.',
    },
  },
  da: {
    consent: {
      termsPre: 'Jeg accepterer',
      termsLink: 'vilkårene og betingelserne',
      termsPost: 'herunder privatlivspolitikken.',
      privacyPre: 'Jeg giver samtykke til opbevaring og brug af mine data i overensstemmelse med',
      privacyLink: 'privatlivspolitikken',
      privacyPost: '.',
    },
  },
  fi: {
    consent: {
      termsPre: 'Hyväksyn',
      termsLink: 'käyttöehdot',
      termsPost: 'mukaan lukien tietosuojakäytännön.',
      privacyPre: 'Suostun tietojeni tallentamiseen ja käyttöön',
      privacyLink: 'tietosuojakäytännön',
      privacyPost: 'mukaisesti.',
    },
  },
  es: {
    consent: {
      termsPre: 'Acepto los',
      termsLink: 'términos y condiciones',
      termsPost: 'incluida la política de privacidad.',
      privacyPre: 'Consiento el almacenamiento y uso de mis datos de acuerdo con la',
      privacyLink: 'Política de privacidad',
      privacyPost: '.',
    },
  },
  pl: {
    consent: {
      termsPre: 'Akceptuję',
      termsLink: 'warunki korzystania z usługi',
      termsPost: 'w tym politykę prywatności.',
      privacyPre: 'Wyrażam zgodę na przechowywanie i wykorzystywanie moich danych zgodnie z',
      privacyLink: 'polityką prywatności',
      privacyPost: '.',
    },
  },
  pt: {
    consent: {
      termsPre: 'Aceito os',
      termsLink: 'termos e condições',
      termsPost: 'incluindo a política de privacidade.',
      privacyPre: 'Consinto no armazenamento e na utilização dos meus dados de acordo com a',
      privacyLink: 'Política de Privacidade',
      privacyPost: '.',
    },
  },
};
// ───────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const dry = argv.includes('--dry');
const force = argv.includes('--force');
const folder = argv.find((a) => !a.startsWith('--'));

if (!folder) {
  console.error('Usage: node scripts/add-locale-strings.cjs <folder> [--dry] [--force]');
  process.exit(1);
}
if (!fs.existsSync(folder)) {
  console.error(`Folder not found: ${folder}`);
  process.exit(1);
}

// Deep-merge `add` into `target`. Objects recurse; arrays and scalars are set.
// Existing scalar/array values are kept unless `force` is on. Returns the
// number of leaf values actually written (added or overwritten).
function merge(target, add, forceOverwrite) {
  let writes = 0;
  for (const key of Object.keys(add)) {
    const val = add[key];
    const isPlainObject =
      val && typeof val === 'object' && !Array.isArray(val);

    if (isPlainObject) {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
        target[key] = {};
      }
      writes += merge(target[key], val, forceOverwrite);
    } else {
      // leaf (string, number, boolean, or array)
      const exists = Object.prototype.hasOwnProperty.call(target, key);
      if (!exists || forceOverwrite) {
        target[key] = val;
        writes += 1;
      }
    }
  }
  return writes;
}

// Flatten leaf key paths for structural comparison against `en`.
function leafPaths(obj, prefix = '') {
  const out = [];
  for (const k of Object.keys(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    const v = obj[k];
    if (Array.isArray(v)) v.forEach((_, i) => out.push(`${key}[${i}]`));
    else if (v && typeof v === 'object') out.push(...leafPaths(v, key));
    else out.push(key);
  }
  return out.sort();
}

// ── Preflight: ADDITIONS must cover all 12 langs with matching shape ───
const missingLangs = LANGS.filter((l) => !ADDITIONS[l]);
if (missingLangs.length) {
  console.error(`ADDITIONS is missing languages: ${missingLangs.join(', ')}`);
  console.error('Every one of the 12 languages must be present. Aborting.');
  process.exit(1);
}
const enPaths = leafPaths(ADDITIONS.en);
let shapeOk = true;
for (const l of LANGS) {
  const p = leafPaths(ADDITIONS[l]);
  const miss = enPaths.filter((x) => !p.includes(x));
  const extra = p.filter((x) => !enPaths.includes(x));
  if (miss.length || extra.length) {
    shapeOk = false;
    console.error(`ADDITIONS.${l} shape mismatch vs en — missing: ${miss.join(', ') || 'none'} | extra: ${extra.join(', ') || 'none'}`);
  }
}
if (!shapeOk) {
  console.error('Fix ADDITIONS so every language has the same keys as en. Aborting.');
  process.exit(1);
}

// ── Apply to each locale file ──────────────────────────────────────────
console.log(`${dry ? '[dry run] ' : ''}Adding strings to ${folder}  (${force ? 'force overwrite' : 'keep existing'})`);
let filesTouched = 0;
for (const lang of LANGS) {
  const file = path.join(folder, `${lang}.json`);
  if (!fs.existsSync(file)) {
    console.warn(`  ! ${lang}.json not found — skipped`);
    continue;
  }
  let json;
  try {
    json = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`  ! ${lang}.json is not valid JSON — skipped (${e.message})`);
    continue;
  }
  const writes = merge(json, ADDITIONS[lang], force);
  if (writes > 0 && !dry) {
    fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
  }
  if (writes > 0) filesTouched += 1;
  console.log(`  ${writes > 0 ? '✓' : '·'} ${lang}.json — ${writes} value(s) ${dry ? 'would be ' : ''}written`);
}

// ── Post-check: confirm all 12 now share the same key structure ────────
if (!dry) {
  const ref = leafPaths(JSON.parse(fs.readFileSync(path.join(folder, 'en.json'), 'utf8')));
  let consistent = true;
  for (const lang of LANGS) {
    const f = path.join(folder, `${lang}.json`);
    if (!fs.existsSync(f)) continue;
    const p = leafPaths(JSON.parse(fs.readFileSync(f, 'utf8')));
    const miss = ref.filter((x) => !p.includes(x));
    if (miss.length) {
      consistent = false;
      console.warn(`  ! ${lang}.json still missing vs en: ${miss.slice(0, 6).join(', ')}${miss.length > 6 ? '…' : ''}`);
    }
  }
  console.log(consistent ? 'All 12 locales share the same key structure ✓' : 'Some locales differ from en — see warnings above.');
}

console.log(`${dry ? '[dry run] ' : ''}Done. ${filesTouched} file(s) ${dry ? 'would be ' : ''}changed.`);
