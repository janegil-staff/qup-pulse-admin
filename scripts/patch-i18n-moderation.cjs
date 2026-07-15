// qup-pulse-admin/scripts/patch-i18n-moderation.cjs
//
// PATCH_I18N_MODERATION_V1 — add the post report/block UI strings under
// `app.feed` in ALL 12 locales (no en nl fr de it sv da fi es pl pt).
//
// Keys added (all under app.feed):
//   postOptions            — aria-label / tooltip on the `⋯` button
//   reportPost             — menu item + report dialog title
//   blockUser              — menu item
//   reportWhy              — "Why are you reporting this?"
//   reportNotePlaceholder  — optional free-text note
//   reportSubmit           — submit button
//   reportFailed           — error fallback
//   reportThanksTitle      — confirmation title
//   reportThanksBody       — confirmation body
//   blockTitle             — "Block {name}?"  ({name} is substituted in code)
//   blockBody              — what blocking does
//   blockConfirm           — destructive confirm button
//   blockFailed            — error fallback
//   reasons.{spam|harassment|inappropriate|misinformation|other}
//
// The `reasons` KEYS are a server contract (REPORT_REASONS in
// server/src/models/Report.js) — only the labels are translated. Never rename
// a key here; the API 400s on anything outside that list.
//
// Norwegian is authoritative. The other 11 are first-pass translations —
// review them, especially pl/fi, before shipping.
//
// IDEMPOTENT: existing keys are left ALONE (this never overwrites a value you
// have already edited). Re-running only fills genuine gaps.
//
// Usage:
//   node scripts/patch-i18n-moderation.cjs --dry-run   # preview
//   node scripts/patch-i18n-moderation.cjs             # apply
//   node scripts/patch-i18n-moderation.cjs --force     # overwrite existing too
//
// NOTE: set LOCALES_DIR to wherever your locale files actually live. If they're
// .js modules rather than .json, this script won't work as-is — say so and it
// can be reworked as a Babel AST patch instead.

const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────
const LOCALES_DIR = path.resolve(__dirname, '../src/content/locales');
const LOCALES = ['no', 'en', 'nl', 'fr', 'de', 'it', 'sv', 'da', 'fi', 'es', 'pl', 'pt'];
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

// ─── Strings ─────────────────────────────────────────────────────────────────
const STRINGS = {
  no: {
    postOptions: 'Innleggsvalg',
    reportPost: 'Rapporter innlegg',
    blockUser: 'Blokker bruker',
    reportWhy: 'Hvorfor rapporterer du dette?',
    reportNotePlaceholder: 'Legg til detaljer (valgfritt)',
    reportSubmit: 'Send rapport',
    reportFailed: 'Kunne ikke sende rapporten. Prøv igjen.',
    reportThanksTitle: 'Takk',
    reportThanksBody: 'Rapporten din er sendt. Vi ser på den så snart som mulig.',
    blockTitle: 'Blokkere {name}?',
    blockBody: 'Du vil ikke se innleggene deres, og de kan ikke sende deg meldinger.',
    blockConfirm: 'Blokker',
    blockFailed: 'Kunne ikke blokkere brukeren. Prøv igjen.',
    reasons: {
      spam: 'Spam',
      harassment: 'Trakassering',
      inappropriate: 'Upassende innhold',
      misinformation: 'Feilinformasjon',
      other: 'Annet',
    },
  },
  en: {
    postOptions: 'Post options',
    reportPost: 'Report post',
    blockUser: 'Block user',
    reportWhy: 'Why are you reporting this?',
    reportNotePlaceholder: 'Add details (optional)',
    reportSubmit: 'Submit report',
    reportFailed: "Couldn't send the report. Please try again.",
    reportThanksTitle: 'Thanks',
    reportThanksBody: "Your report has been submitted. We'll review it as soon as we can.",
    blockTitle: 'Block {name}?',
    blockBody: "You won't see their posts, and they can't message you.",
    blockConfirm: 'Block',
    blockFailed: "Couldn't block this user. Please try again.",
    reasons: {
      spam: 'Spam',
      harassment: 'Harassment',
      inappropriate: 'Inappropriate content',
      misinformation: 'Misinformation',
      other: 'Other',
    },
  },
  nl: {
    postOptions: 'Berichtopties',
    reportPost: 'Bericht rapporteren',
    blockUser: 'Gebruiker blokkeren',
    reportWhy: 'Waarom rapporteer je dit?',
    reportNotePlaceholder: 'Details toevoegen (optioneel)',
    reportSubmit: 'Rapport versturen',
    reportFailed: 'Rapport kon niet worden verzonden. Probeer het opnieuw.',
    reportThanksTitle: 'Bedankt',
    reportThanksBody: 'Je rapport is verzonden. We bekijken het zo snel mogelijk.',
    blockTitle: '{name} blokkeren?',
    blockBody: 'Je ziet hun berichten niet meer en ze kunnen je niet berichten.',
    blockConfirm: 'Blokkeren',
    blockFailed: 'Gebruiker kon niet worden geblokkeerd. Probeer het opnieuw.',
    reasons: {
      spam: 'Spam',
      harassment: 'Intimidatie',
      inappropriate: 'Ongepaste inhoud',
      misinformation: 'Misinformatie',
      other: 'Anders',
    },
  },
  fr: {
    postOptions: 'Options de la publication',
    reportPost: 'Signaler la publication',
    blockUser: "Bloquer l'utilisateur",
    reportWhy: 'Pourquoi signalez-vous ceci ?',
    reportNotePlaceholder: 'Ajouter des détails (facultatif)',
    reportSubmit: 'Envoyer le signalement',
    reportFailed: "Impossible d'envoyer le signalement. Veuillez réessayer.",
    reportThanksTitle: 'Merci',
    reportThanksBody: 'Votre signalement a été envoyé. Nous l’examinerons dès que possible.',
    blockTitle: 'Bloquer {name} ?',
    blockBody: 'Vous ne verrez plus ses publications et il ne pourra pas vous écrire.',
    blockConfirm: 'Bloquer',
    blockFailed: "Impossible de bloquer cet utilisateur. Veuillez réessayer.",
    reasons: {
      spam: 'Spam',
      harassment: 'Harcèlement',
      inappropriate: 'Contenu inapproprié',
      misinformation: 'Désinformation',
      other: 'Autre',
    },
  },
  de: {
    postOptions: 'Beitragsoptionen',
    reportPost: 'Beitrag melden',
    blockUser: 'Nutzer blockieren',
    reportWhy: 'Warum meldest du das?',
    reportNotePlaceholder: 'Details hinzufügen (optional)',
    reportSubmit: 'Meldung senden',
    reportFailed: 'Meldung konnte nicht gesendet werden. Bitte erneut versuchen.',
    reportThanksTitle: 'Danke',
    reportThanksBody: 'Deine Meldung wurde gesendet. Wir prüfen sie so schnell wie möglich.',
    blockTitle: '{name} blockieren?',
    blockBody: 'Du siehst ihre Beiträge nicht mehr und sie können dir nicht schreiben.',
    blockConfirm: 'Blockieren',
    blockFailed: 'Nutzer konnte nicht blockiert werden. Bitte erneut versuchen.',
    reasons: {
      spam: 'Spam',
      harassment: 'Belästigung',
      inappropriate: 'Unangemessene Inhalte',
      misinformation: 'Fehlinformation',
      other: 'Sonstiges',
    },
  },
  it: {
    postOptions: 'Opzioni del post',
    reportPost: 'Segnala post',
    blockUser: 'Blocca utente',
    reportWhy: 'Perché lo stai segnalando?',
    reportNotePlaceholder: 'Aggiungi dettagli (facoltativo)',
    reportSubmit: 'Invia segnalazione',
    reportFailed: 'Impossibile inviare la segnalazione. Riprova.',
    reportThanksTitle: 'Grazie',
    reportThanksBody: 'La tua segnalazione è stata inviata. La esamineremo al più presto.',
    blockTitle: 'Bloccare {name}?',
    blockBody: 'Non vedrai i suoi post e non potrà inviarti messaggi.',
    blockConfirm: 'Blocca',
    blockFailed: 'Impossibile bloccare questo utente. Riprova.',
    reasons: {
      spam: 'Spam',
      harassment: 'Molestie',
      inappropriate: 'Contenuto inappropriato',
      misinformation: 'Disinformazione',
      other: 'Altro',
    },
  },
  sv: {
    postOptions: 'Inläggsalternativ',
    reportPost: 'Rapportera inlägg',
    blockUser: 'Blockera användare',
    reportWhy: 'Varför rapporterar du detta?',
    reportNotePlaceholder: 'Lägg till detaljer (valfritt)',
    reportSubmit: 'Skicka rapport',
    reportFailed: 'Kunde inte skicka rapporten. Försök igen.',
    reportThanksTitle: 'Tack',
    reportThanksBody: 'Din rapport har skickats. Vi granskar den så snart vi kan.',
    blockTitle: 'Blockera {name}?',
    blockBody: 'Du kommer inte se deras inlägg och de kan inte skicka meddelanden till dig.',
    blockConfirm: 'Blockera',
    blockFailed: 'Kunde inte blockera användaren. Försök igen.',
    reasons: {
      spam: 'Spam',
      harassment: 'Trakasserier',
      inappropriate: 'Olämpligt innehåll',
      misinformation: 'Desinformation',
      other: 'Annat',
    },
  },
  da: {
    postOptions: 'Indlægsindstillinger',
    reportPost: 'Rapportér indlæg',
    blockUser: 'Blokér bruger',
    reportWhy: 'Hvorfor rapporterer du dette?',
    reportNotePlaceholder: 'Tilføj detaljer (valgfrit)',
    reportSubmit: 'Send rapport',
    reportFailed: 'Rapporten kunne ikke sendes. Prøv igen.',
    reportThanksTitle: 'Tak',
    reportThanksBody: 'Din rapport er sendt. Vi kigger på den hurtigst muligt.',
    blockTitle: 'Blokér {name}?',
    blockBody: 'Du vil ikke se deres indlæg, og de kan ikke sende dig beskeder.',
    blockConfirm: 'Blokér',
    blockFailed: 'Brugeren kunne ikke blokeres. Prøv igen.',
    reasons: {
      spam: 'Spam',
      harassment: 'Chikane',
      inappropriate: 'Upassende indhold',
      misinformation: 'Misinformation',
      other: 'Andet',
    },
  },
  fi: {
    postOptions: 'Julkaisun asetukset',
    reportPost: 'Ilmoita julkaisusta',
    blockUser: 'Estä käyttäjä',
    reportWhy: 'Miksi ilmoitat tästä?',
    reportNotePlaceholder: 'Lisää tietoja (valinnainen)',
    reportSubmit: 'Lähetä ilmoitus',
    reportFailed: 'Ilmoitusta ei voitu lähettää. Yritä uudelleen.',
    reportThanksTitle: 'Kiitos',
    reportThanksBody: 'Ilmoituksesi on lähetetty. Käsittelemme sen mahdollisimman pian.',
    blockTitle: 'Estetäänkö {name}?',
    blockBody: 'Et näe heidän julkaisujaan, eivätkä he voi lähettää sinulle viestejä.',
    blockConfirm: 'Estä',
    blockFailed: 'Käyttäjän estäminen ei onnistunut. Yritä uudelleen.',
    reasons: {
      spam: 'Roskaposti',
      harassment: 'Häirintä',
      inappropriate: 'Sopimaton sisältö',
      misinformation: 'Virheellinen tieto',
      other: 'Muu',
    },
  },
  es: {
    postOptions: 'Opciones de la publicación',
    reportPost: 'Denunciar publicación',
    blockUser: 'Bloquear usuario',
    reportWhy: '¿Por qué denuncias esto?',
    reportNotePlaceholder: 'Añadir detalles (opcional)',
    reportSubmit: 'Enviar denuncia',
    reportFailed: 'No se pudo enviar la denuncia. Inténtalo de nuevo.',
    reportThanksTitle: 'Gracias',
    reportThanksBody: 'Tu denuncia se ha enviado. La revisaremos lo antes posible.',
    blockTitle: '¿Bloquear a {name}?',
    blockBody: 'No verás sus publicaciones y no podrá enviarte mensajes.',
    blockConfirm: 'Bloquear',
    blockFailed: 'No se pudo bloquear a este usuario. Inténtalo de nuevo.',
    reasons: {
      spam: 'Spam',
      harassment: 'Acoso',
      inappropriate: 'Contenido inapropiado',
      misinformation: 'Desinformación',
      other: 'Otro',
    },
  },
  pl: {
    postOptions: 'Opcje posta',
    reportPost: 'Zgłoś post',
    blockUser: 'Zablokuj użytkownika',
    reportWhy: 'Dlaczego to zgłaszasz?',
    reportNotePlaceholder: 'Dodaj szczegóły (opcjonalnie)',
    reportSubmit: 'Wyślij zgłoszenie',
    reportFailed: 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie.',
    reportThanksTitle: 'Dziękujemy',
    reportThanksBody: 'Twoje zgłoszenie zostało wysłane. Sprawdzimy je najszybciej, jak to możliwe.',
    blockTitle: 'Zablokować {name}?',
    blockBody: 'Nie będziesz widzieć ich postów, a oni nie będą mogli wysyłać Ci wiadomości.',
    blockConfirm: 'Zablokuj',
    blockFailed: 'Nie udało się zablokować użytkownika. Spróbuj ponownie.',
    reasons: {
      spam: 'Spam',
      harassment: 'Nękanie',
      inappropriate: 'Nieodpowiednie treści',
      misinformation: 'Dezinformacja',
      other: 'Inne',
    },
  },
  pt: {
    postOptions: 'Opções da publicação',
    reportPost: 'Denunciar publicação',
    blockUser: 'Bloquear utilizador',
    reportWhy: 'Porque está a denunciar isto?',
    reportNotePlaceholder: 'Adicionar detalhes (opcional)',
    reportSubmit: 'Enviar denúncia',
    reportFailed: 'Não foi possível enviar a denúncia. Tente novamente.',
    reportThanksTitle: 'Obrigado',
    reportThanksBody: 'A sua denúncia foi enviada. Vamos analisá-la assim que possível.',
    blockTitle: 'Bloquear {name}?',
    blockBody: 'Não verá as publicações desta pessoa e ela não lhe poderá enviar mensagens.',
    blockConfirm: 'Bloquear',
    blockFailed: 'Não foi possível bloquear este utilizador. Tente novamente.',
    reasons: {
      spam: 'Spam',
      harassment: 'Assédio',
      inappropriate: 'Conteúdo inapropriado',
      misinformation: 'Desinformação',
      other: 'Outro',
    },
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
// Walk to app.feed, creating nothing: if the shape isn't there, this locale
// isn't what we think it is and we bail loudly rather than inventing structure.
function getFeedNode(json) {
  if (!json || typeof json !== 'object') return null;
  if (!json.app || typeof json.app !== 'object') return null;
  if (!json.app.feed || typeof json.app.feed !== 'object') return null;
  return json.app.feed;
}

// Merge `add` into `target`, skipping keys that already exist unless --force.
// Returns the list of dotted key paths actually written.
function mergeMissing(target, add, prefix = '') {
  const written = [];
  for (const [k, v] of Object.entries(add)) {
    const dotted = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (!target[k] || typeof target[k] !== 'object') target[k] = {};
      written.push(...mergeMissing(target[k], v, dotted));
    } else if (FORCE || !(k in target)) {
      target[k] = v;
      written.push(dotted);
    }
  }
  return written;
}

// ─── Run ─────────────────────────────────────────────────────────────────────
let filled = 0;
let skipped = 0;
let failed = 0;

console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Adding app.feed moderation strings`);
console.log(`Locales dir: ${LOCALES_DIR}`);
if (FORCE) console.log('MODE: --force (existing values WILL be overwritten)');
console.log('');

if (!fs.existsSync(LOCALES_DIR)) {
  console.error(`ERROR: locales dir not found: ${LOCALES_DIR}`);
  console.error('Edit LOCALES_DIR at the top of this script to match your project.');
  process.exit(1);
}

for (const loc of LOCALES) {
  const file = path.join(LOCALES_DIR, `${loc}.json`);

  if (!fs.existsSync(file)) {
    console.log(`${loc}: SKIP — file not found (${file})`);
    failed++;
    continue;
  }

  let json;
  try {
    json = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`${loc}: ERROR — invalid JSON: ${e.message}`);
    failed++;
    process.exitCode = 1;
    continue;
  }

  const feed = getFeedNode(json);
  if (!feed) {
    console.error(`${loc}: ERROR — no app.feed object; not patching (check the file shape)`);
    failed++;
    process.exitCode = 1;
    continue;
  }

  const written = mergeMissing(feed, STRINGS[loc]);

  if (written.length === 0) {
    console.log(`${loc}: already complete`);
    skipped++;
    continue;
  }

  console.log(`${loc}: +${written.length} key(s)`);
  for (const k of written) console.log(`    app.feed.${k}`);
  filled += written.length;

  if (!DRY_RUN) {
    fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  }
}

console.log(
  `\n${DRY_RUN ? '[DRY RUN] ' : ''}Done — ${filled} key(s) written, ${skipped} locale(s) already complete, ${failed} skipped/failed.`
);
if (DRY_RUN && filled > 0) console.log('Re-run without --dry-run to apply.');
