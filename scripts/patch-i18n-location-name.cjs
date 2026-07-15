// qup-pulse-admin/scripts/patch-i18n-location-name.cjs
//
// Adds app.profile.locationName to all 12 locale files.
// Idempotent — safe to re-run.
//
// Usage:
//   node scripts/patch-i18n-location-name.cjs --dry
//   node scripts/patch-i18n-location-name.cjs

const fs = require('fs');
const path = require('path');

const LOCALES = ['no', 'en', 'nl', 'fr', 'de', 'it', 'sv', 'da', 'fi', 'es', 'pl', 'pt'];

const KEY_PATH = ['app', 'profile', 'locationName'];

const TRANSLATIONS = {
    no: 'Sted',
    en: 'Location',
    nl: 'Locatie',
    fr: 'Lieu',
    de: 'Ort',
    it: 'Località',
    sv: 'Plats',
    da: 'Sted',
    fi: 'Sijainti',
    es: 'Ubicación',
    pl: 'Lokalizacja',
    pt: 'Localização',
};

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const dirFlagIndex = args.indexOf('--dir');
const EXPLICIT_DIR = dirFlagIndex !== -1 ? args[dirFlagIndex + 1] : null;

const ROOT = process.cwd();
const IGNORE = new Set(['node_modules', '.git', '.next', '.expo', 'ios', 'android', 'build', 'dist']);

function findLocaleDirs(startDir) {
    const found = [];

    function walk(dir, depth) {
        if (depth > 6) return;

        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }

        const fileNames = entries.filter((e) => e.isFile()).map((e) => e.name);
        const hitCount = LOCALES.filter((l) => fileNames.includes(`${l}.json`)).length;

        if (hitCount >= 8) found.push({ dir, hitCount });

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            if (IGNORE.has(entry.name) || entry.name.startsWith('.')) continue;
            walk(path.join(dir, entry.name), depth + 1);
        }
    }

    walk(startDir, 0);
    return found;
}

let targetDirs;

if (EXPLICIT_DIR) {
    const resolved = path.resolve(ROOT, EXPLICIT_DIR);
    if (!fs.existsSync(resolved)) {
        console.error(`✗ --dir does not exist: ${resolved}`);
        process.exit(1);
    }
    targetDirs = [resolved];
} else {
    const candidates = findLocaleDirs(ROOT);
    if (candidates.length === 0) {
        console.error('✗ No locale directory found under:', ROOT);
        console.error('  Pass one explicitly:  --dir path/to/locales');
        process.exit(1);
    }
    targetDirs = candidates.map((c) => c.dir);
    if (candidates.length > 1) {
        console.log('Found multiple locale directories — patching all:');
        for (const c of candidates) {
            console.log(`  · ${path.relative(ROOT, c.dir)}  (${c.hitCount}/${LOCALES.length})`);
        }
        console.log('');
    }
}

function getIn(obj, keys) {
    return keys.reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}

function setIn(obj, keys, value) {
    let node = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (node[k] == null || typeof node[k] !== 'object') node[k] = {};
        node = node[k];
    }
    node[keys[keys.length - 1]] = value;
}

function detectIndent(raw) {
    const match = raw.match(/^[ \t]+/m);
    if (!match) return 2;
    const ws = match[0];
    return ws.includes('\t') ? '\t' : ws.length;
}

let updated = 0;
let skipped = 0;
let failed = 0;

for (const dir of targetDirs) {
    console.log(`→ ${path.relative(ROOT, dir) || '.'}`);

    for (const locale of LOCALES) {
        const file = path.join(dir, `${locale}.json`);
        const value = TRANSLATIONS[locale];

        if (!fs.existsSync(file)) {
            console.error(`  ✗ ${locale}.json — missing`);
            failed++;
            continue;
        }

        let raw, json;
        try {
            raw = fs.readFileSync(file, 'utf8');
            json = JSON.parse(raw);
        } catch (err) {
            console.error(`  ✗ ${locale}.json — invalid JSON: ${err.message}`);
            failed++;
            continue;
        }

        // Guard: the parent namespace must already exist, otherwise we're
        // writing into the wrong tree and would silently create app.profile.
        if (getIn(json, ['app', 'profile']) == null) {
            console.error(`  ✗ ${locale}.json — no "app.profile" namespace, skipping`);
            failed++;
            continue;
        }

        const current = getIn(json, KEY_PATH);

        if (current === value) {
            console.log(`  · ${locale}.json — already set`);
            skipped++;
            continue;
        }
        if (current != null) {
            console.log(`  ~ ${locale}.json — overwriting "${current}" → "${value}"`);
        }

        setIn(json, KEY_PATH, value);

        const out = JSON.stringify(json, null, detectIndent(raw)) + (raw.endsWith('\n') ? '\n' : '');

        if (DRY) {
            console.log(`  → ${locale}.json — would set ${KEY_PATH.join('.')} = "${value}"`);
        } else {
            fs.writeFileSync(file, out, 'utf8');
            console.log(`  ✓ ${locale}.json — ${KEY_PATH.join('.')} = "${value}"`);
        }
        updated++;
    }
}

console.log('');
console.log(DRY ? 'Dry run — no files written.' : 'Done.');
console.log(`  updated: ${updated}   unchanged: ${skipped}   failed: ${failed}`);
if (failed > 0) process.exitCode = 1;