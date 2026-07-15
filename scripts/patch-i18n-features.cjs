// quppulse/scripts/patch-i18n-features.cjs
//
// Rewrites features.local / features.now / features.safety across all 12 locales.
// Idempotent — safe to re-run.
//
// Usage:
//   node scripts/patch-i18n-features.cjs --dry
//   node scripts/patch-i18n-features.cjs

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'src', 'content', 'locales');

const LOCALES = ['no', 'en', 'nl', 'fr', 'de', 'it', 'sv', 'da', 'fi', 'es', 'pl', 'pt'];

const COPY = {
  no: {
    local: { title: 'Lokalt eller globalt — du velger', body: 'Se hele verden, eller skru feeden ned til kvartalet rundt deg. Rekkevidden er din å bestemme, når som helst.' },
    now: { title: 'Akkurat nå', body: 'Innlegg handler om øyeblikket. Se det skje mens det skjer, fra folk som deler stedet ditt.' },
    safety: { title: 'Bygget for trygghet', body: 'Rapporter og blokker med ett trykk, med ekte moderering bak. Profilen viser området ditt, aldri den nøyaktige posisjonen.' },
  },
  en: {
    local: { title: 'Local or global — your call', body: 'See the whole world, or dial your feed down to the blocks around you. The range is yours to set, whenever you like.' },
    now: { title: 'Right now', body: 'Posts are about the present moment. See what happens as it happens, from the people sharing your space.' },
    safety: { title: 'Built for safety', body: 'Report and block in a tap, with real moderation behind it. Your profile shows your area — never your exact position.' },
  },
  nl: {
    local: { title: 'Lokaal of globaal — jij kiest', body: 'Bekijk de hele wereld, of stel je feed in op de straten om je heen. Jij bepaalt het bereik, wanneer je maar wilt.' },
    now: { title: 'Nu meteen', body: 'Posts gaan over het moment zelf. Zie het gebeuren terwijl het gebeurt, van mensen om je heen.' },
    safety: { title: 'Gebouwd op veiligheid', body: 'Rapporteren en blokkeren met één tik, met echte moderatie erachter. Je profiel toont je gebied, nooit je exacte positie.' },
  },
  fr: {
    local: { title: 'Local ou mondial — à vous de choisir', body: "Voyez le monde entier, ou réduisez votre fil au quartier autour de vous. La portée, c'est vous qui la fixez, quand vous voulez." },
    now: { title: 'En ce moment', body: "Les publications parlent de l'instant présent. Voyez les choses se produire, par ceux qui partagent votre lieu." },
    safety: { title: 'Conçu pour la sécurité', body: "Signalez et bloquez d'un geste, avec une vraie modération derrière. Votre profil montre votre zone, jamais votre position exacte." },
  },
  de: {
    local: { title: 'Lokal oder global — du entscheidest', body: 'Sieh die ganze Welt, oder stell deinen Feed auf die Straßen um dich herum ein. Die Reichweite bestimmst du, jederzeit.' },
    now: { title: 'Genau jetzt', body: 'Beiträge handeln vom Augenblick. Sieh zu, während es passiert — von Leuten in deiner Nähe.' },
    safety: { title: 'Auf Sicherheit gebaut', body: 'Melden und blockieren mit einem Tipp, mit echter Moderation dahinter. Dein Profil zeigt deine Gegend, nie deinen genauen Standort.' },
  },
  it: {
    local: { title: 'Locale o globale — decidi tu', body: 'Guarda il mondo intero, o riduci il feed alle strade intorno a te. La portata la scegli tu, quando vuoi.' },
    now: { title: 'Proprio ora', body: 'I post parlano del momento presente. Guarda ciò che accade mentre accade, da chi condivide il tuo spazio.' },
    safety: { title: 'Costruito per la sicurezza', body: 'Segnala e blocca con un tocco, con una moderazione reale dietro. Il profilo mostra la tua zona, mai la posizione esatta.' },
  },
  sv: {
    local: { title: 'Lokalt eller globalt — du väljer', body: 'Se hela världen, eller dra ner flödet till kvarteren omkring dig. Räckvidden bestämmer du, när du vill.' },
    now: { title: 'Just nu', body: 'Inlägg handlar om ögonblicket. Se det hända medan det händer, från människor som delar din plats.' },
    safety: { title: 'Byggt för trygghet', body: 'Rapportera och blockera med ett tryck, med riktig moderering bakom. Profilen visar ditt område, aldrig din exakta position.' },
  },
  da: {
    local: { title: 'Lokalt eller globalt — du vælger', body: 'Se hele verden, eller skru dit feed ned til kvarteret omkring dig. Rækkevidden bestemmer du, når du vil.' },
    now: { title: 'Lige nu', body: 'Opslag handler om øjeblikket. Se det ske, mens det sker, fra folk der deler dit sted.' },
    safety: { title: 'Bygget til tryghed', body: 'Rapportér og blokér med ét tryk, med rigtig moderering bag. Profilen viser dit område, aldrig din nøjagtige position.' },
  },
  fi: {
    local: { title: 'Paikallisesti tai globaalisti — sinä valitset', body: 'Katso koko maailmaa, tai rajaa syötteesi ympärilläsi oleviin kortteleihin. Sinä päätät kantaman, milloin haluat.' },
    now: { title: 'Juuri nyt', body: 'Julkaisut kertovat tästä hetkestä. Näe se tapahtuessaan, ihmisiltä jotka jakavat tilasi.' },
    safety: { title: 'Rakennettu turvalliseksi', body: 'Ilmoita ja estä yhdellä napautuksella, takana oikea moderointi. Profiilisi näyttää alueesi, ei koskaan tarkkaa sijaintiasi.' },
  },
  es: {
    local: { title: 'Local o global — tú decides', body: 'Mira el mundo entero, o reduce tu feed a las calles que te rodean. El alcance lo eliges tú, cuando quieras.' },
    now: { title: 'Ahora mismo', body: 'Las publicaciones tratan del momento presente. Ve lo que pasa mientras pasa, de quienes comparten tu espacio.' },
    safety: { title: 'Creado para la seguridad', body: 'Reporta y bloquea con un toque, con moderación real detrás. Tu perfil muestra tu zona, nunca tu posición exacta.' },
  },
  pl: {
    local: { title: 'Lokalnie lub globalnie — ty decydujesz', body: 'Zobacz cały świat albo zawęź strumień do najbliższych ulic. Zasięg ustawiasz ty, kiedy tylko chcesz.' },
    now: { title: 'Właśnie teraz', body: 'Posty dotyczą chwili obecnej. Zobacz, jak to się dzieje, od ludzi dzielących twoją przestrzeń.' },
    safety: { title: 'Stworzone z myślą o bezpieczeństwie', body: 'Zgłaszaj i blokuj jednym dotknięciem, z prawdziwą moderacją w tle. Profil pokazuje twoją okolicę, nigdy dokładną pozycję.' },
  },
  pt: {
    local: { title: 'Local ou global — tu decides', body: 'Vê o mundo inteiro, ou reduz o teu feed às ruas à tua volta. O alcance é teu para definir, quando quiseres.' },
    now: { title: 'Agora mesmo', body: 'As publicações são sobre o momento presente. Vê o que acontece enquanto acontece, de quem partilha o teu espaço.' },
    safety: { title: 'Feito para a segurança', body: 'Denuncia e bloqueia com um toque, com moderação real por trás. O teu perfil mostra a tua área, nunca a tua posição exata.' },
  },
};

const SLOTS = ['local', 'now', 'safety'];
const FIELDS = ['title', 'body'];

const DRY = process.argv.includes('--dry');

function detectIndent(raw) {
  const m = raw.match(/^[ \t]+/m);
  if (!m) return 2;
  return m[0].includes('\t') ? '\t' : m[0].length;
}

let updated = 0;
let skipped = 0;
let failed = 0;

if (!fs.existsSync(LOCALES_DIR)) {
  console.error(`✗ locales dir not found: ${LOCALES_DIR}`);
  process.exit(1);
}

for (const locale of LOCALES) {
  const file = path.join(LOCALES_DIR, `${locale}.json`);

  if (!fs.existsSync(file)) {
    console.error(`✗ ${locale}.json — missing`);
    failed++;
    continue;
  }

  let raw, json;
  try {
    raw = fs.readFileSync(file, 'utf8');
    json = JSON.parse(raw);
  } catch (err) {
    console.error(`✗ ${locale}.json — invalid JSON: ${err.message}`);
    failed++;
    continue;
  }

  // Guard: `features` must already exist. If it doesn't we're pointed at the
  // wrong tree, and silently creating it would hide that.
  if (json.features == null || typeof json.features !== 'object') {
    console.error(`✗ ${locale}.json — no "features" block, skipping`);
    failed++;
    continue;
  }

  const want = COPY[locale];
  let dirty = false;

  for (const slot of SLOTS) {
    if (json.features[slot] == null || typeof json.features[slot] !== 'object') {
      json.features[slot] = {};
      dirty = true;
    }
    for (const field of FIELDS) {
      const next = want[slot][field];
      if (json.features[slot][field] !== next) {
        json.features[slot][field] = next;
        dirty = true;
      }
    }
  }

  if (!dirty) {
    console.log(`· ${locale}.json — already up to date`);
    skipped++;
    continue;
  }

  const out = JSON.stringify(json, null, detectIndent(raw)) + (raw.endsWith('\n') ? '\n' : '');

  if (DRY) {
    console.log(`→ ${locale}.json — would rewrite features.{local,now,safety}`);
  } else {
    fs.writeFileSync(file, out, 'utf8');
    console.log(`✓ ${locale}.json — features.{local,now,safety}`);
  }
  updated++;
}

console.log('');
console.log(DRY ? 'Dry run — no files written.' : 'Done.');
console.log(`  updated: ${updated}   unchanged: ${skipped}   failed: ${failed}`);
if (failed > 0) process.exitCode = 1;