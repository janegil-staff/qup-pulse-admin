// qup-pulse-admin/scripts/patch-hero-subhead-i18n.cjs
// Idempotent: rewrites hero.subhead in all 12 locales. Safe to re-run.
//
// The old copy sold local by rejecting global ("skip the endless feed of
// strangers on the other side of the world"), which read as Norway-only. The
// product is local BY DEFAULT but available worldwide — the feed is proximity-
// filtered wherever you are, not proximity-filtered to one country. This copy
// keeps local-first and makes the worldwide part explicit.
//
// hero.badge, titleLead, titleHighlight and features.* are unchanged: they were
// already accurate.
//
// Run from the project root:  node scripts/patch-hero-subhead-i18n.cjs

const fs = require('fs');
const path = require('path');

const STRINGS = {
  no: 'Qup Pulse er nabolagets puls — uansett hvilket nabolag du er i. Del med folk som faktisk er i nærheten, og se hva som skjer akkurat nå, i Bergen, Berlin eller Bangkok.',
  en: 'Qup Pulse is your neighbourhood’s pulse — whichever neighbourhood you’re in. Post to the people actually near you, and see what’s happening right now, in Bergen, Berlin or Bangkok.',
  nl: 'Qup Pulse is de pols van je buurt — in welke buurt je ook bent. Deel met mensen die echt in de buurt zijn en zie wat er nu gebeurt, in Bergen, Berlijn of Bangkok.',
  fr: 'Qup Pulse, c’est le pouls de votre quartier — quel que soit le quartier. Publiez pour les gens vraiment près de vous et voyez ce qui se passe maintenant, à Bergen, Berlin ou Bangkok.',
  de: 'Qup Pulse ist der Puls deiner Nachbarschaft — in welcher Nachbarschaft du auch bist. Teile mit Leuten, die wirklich in der Nähe sind, und sieh, was gerade passiert, in Bergen, Berlin oder Bangkok.',
  it: 'Qup Pulse è il battito del tuo quartiere — qualunque sia il quartiere. Pubblica per le persone davvero vicine e scopri cosa succede adesso, a Bergen, Berlino o Bangkok.',
  sv: 'Qup Pulse är kvarterets puls — vilket kvarter du än befinner dig i. Dela med folk som faktiskt är i närheten och se vad som händer just nu, i Bergen, Berlin eller Bangkok.',
  da: 'Qup Pulse er kvarterets puls — uanset hvilket kvarter du er i. Del med folk, der faktisk er i nærheden, og se hvad der sker lige nu, i Bergen, Berlin eller Bangkok.',
  fi: 'Qup Pulse on naapurustosi syke — olitpa missä naapurustossa tahansa. Jaa niille, jotka ovat oikeasti lähellä, ja näe mitä juuri nyt tapahtuu, Bergenissä, Berliinissä tai Bangkokissa.',
  es: 'Qup Pulse es el pulso de tu barrio, sea cual sea el barrio. Publica para la gente que está realmente cerca y mira qué pasa ahora mismo, en Bergen, Berlín o Bangkok.',
  pl: 'Qup Pulse to puls twojej okolicy — niezależnie od tego, w jakiej okolicy jesteś. Publikuj dla ludzi, którzy są naprawdę blisko, i zobacz, co dzieje się teraz, w Bergen, Berlinie czy Bangkoku.',
  pt: 'O Qup Pulse é o pulso do teu bairro — seja qual for o bairro. Publica para as pessoas que estão mesmo perto e vê o que está a acontecer agora, em Bergen, Berlim ou Banguecoque.',
};

const LOCALES_DIR = path.join(__dirname, '..', 'src', 'content', 'locales');

let missing = 0;

for (const [lang, value] of Object.entries(STRINGS)) {
  const file = path.join(LOCALES_DIR, `${lang}.json`);
  if (!fs.existsSync(file)) {
    console.warn(`SKIP ${lang}: ${file} not found`);
    missing += 1;
    continue;
  }

  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  json.hero = json.hero || {};

  if (json.hero.subhead === value) {
    console.log(`ok   ${lang}: already present`);
    continue;
  }

  json.hero.subhead = value;
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log(`done ${lang}`);
}

if (missing) {
  console.error(`\n${missing} locale file(s) not found — check LOCALES_DIR: ${LOCALES_DIR}`);
  process.exit(1);
}