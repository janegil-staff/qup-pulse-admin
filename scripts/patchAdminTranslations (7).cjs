// qup-pulse-admin/scripts/patchAdminTranslations.cjs
//
// Adds every admin-surface translation key to all 12 locales.
//
//   node scripts/patchAdminTranslations.cjs --dry-run
//   node scripts/patchAdminTranslations.cjs
//   node scripts/patchAdminTranslations.cjs --dir src/content/locales
//
// Idempotent: a key that already exists is left exactly as it is, so re-running
// is safe and will not overwrite a translation you have since reworded. Writes
// no backup files — git is the safety net; run it on a clean tree.
//
// JSON locales only. Existing indentation and trailing newline are preserved,
// so the diff shows the added keys and nothing else.

"use strict";

const fs = require("fs");
const path = require("path");

const LANGUAGES = [
  "no", "en", "nl", "fr", "de", "it",
  "sv", "da", "fi", "es", "pl", "pt",
];

// Directories tried in order when --dir is not given.
const CANDIDATE_DIRS = [
  "src/content/locales",
  "src/i18n/locales",
  "src/i18n",
  "src/locales",
  "src/lib/i18n",
  "src/translations",
  "i18n/locales",
  "i18n",
  "locales",
];

// Every key, as a dotted path into the locale object. Norwegian is
// authoritative; the rest follow it.
const KEYS = {
  // ── Submenu labels ───────────────────────────────────────────────────
  "app.nav.users": {
    no: "Brukere", en: "Users", nl: "Gebruikers", fr: "Utilisateurs",
    de: "Benutzer", it: "Utenti", sv: "Användare", da: "Brugere",
    fi: "Käyttäjät", es: "Usuarios", pl: "Użytkownicy", pt: "Utilizadores",
  },
  "app.nav.seed": {
    no: "Testdata", en: "Seed data", nl: "Testgegevens", fr: "Données de test",
    de: "Testdaten", it: "Dati di test", sv: "Testdata", da: "Testdata",
    fi: "Testidata", es: "Datos de prueba", pl: "Dane testowe", pt: "Dados de teste",
  },

  // ── Admin landing page ───────────────────────────────────────────────
  "app.admin.title": {
    no: "Administrasjon", en: "Administration", nl: "Beheer", fr: "Administration",
    de: "Verwaltung", it: "Amministrazione", sv: "Administration", da: "Administration",
    fi: "Hallinta", es: "Administración", pl: "Administracja", pt: "Administração",
  },
  "app.admin.subtitle": {
    no: "Moderering, brukere og utviklingsverktøy.",
    en: "Moderation, users and development tools.",
    nl: "Moderatie, gebruikers en ontwikkeltools.",
    fr: "Modération, utilisateurs et outils de développement.",
    de: "Moderation, Benutzer und Entwicklungswerkzeuge.",
    it: "Moderazione, utenti e strumenti di sviluppo.",
    sv: "Moderering, användare och utvecklingsverktyg.",
    da: "Moderering, brugere og udviklingsværktøjer.",
    fi: "Moderointi, käyttäjät ja kehitystyökalut.",
    es: "Moderación, usuarios y herramientas de desarrollo.",
    pl: "Moderacja, użytkownicy i narzędzia deweloperskie.",
    pt: "Moderação, utilizadores e ferramentas de desenvolvimento.",
  },
  "app.admin.reportsDescription": {
    no: "Gjennomgå rapporterte brukere og innlegg.",
    en: "Review reported users and posts.",
    nl: "Beoordeel gerapporteerde gebruikers en berichten.",
    fr: "Examiner les utilisateurs et publications signalés.",
    de: "Gemeldete Benutzer und Beiträge prüfen.",
    it: "Esamina utenti e post segnalati.",
    sv: "Granska anmälda användare och inlägg.",
    da: "Gennemgå anmeldte brugere og opslag.",
    fi: "Tarkista ilmoitetut käyttäjät ja julkaisut.",
    es: "Revisa usuarios y publicaciones denunciados.",
    pl: "Przeglądaj zgłoszonych użytkowników i posty.",
    pt: "Rever utilizadores e publicações denunciados.",
  },
  "app.admin.usersDescription": {
    no: "Søk i kontoer, se aktivitet og utesteng brukere.",
    en: "Search accounts, review activity and ban users.",
    nl: "Zoek accounts, bekijk activiteit en verban gebruikers.",
    fr: "Rechercher des comptes, consulter l'activité et bannir des utilisateurs.",
    de: "Konten suchen, Aktivität prüfen und Benutzer sperren.",
    it: "Cerca account, controlla l'attività e blocca utenti.",
    sv: "Sök konton, granska aktivitet och stäng av användare.",
    da: "Søg konti, gennemgå aktivitet og udeluk brugere.",
    fi: "Hae tilejä, tarkastele toimintaa ja estä käyttäjiä.",
    es: "Busca cuentas, revisa la actividad y bloquea usuarios.",
    pl: "Wyszukuj konta, sprawdzaj aktywność i blokuj użytkowników.",
    pt: "Pesquisar contas, rever atividade e banir utilizadores.",
  },
  "app.admin.seedDescription": {
    no: "Opprett og fjern testdata.",
    en: "Create and remove demo data for testing.",
    nl: "Demogegevens aanmaken en verwijderen.",
    fr: "Créer et supprimer des données de démonstration.",
    de: "Demodaten erstellen und entfernen.",
    it: "Crea e rimuovi dati dimostrativi.",
    sv: "Skapa och ta bort demodata.",
    da: "Opret og fjern demodata.",
    fi: "Luo ja poista esittelydataa.",
    es: "Crea y elimina datos de demostración.",
    pl: "Twórz i usuwaj dane demonstracyjne.",
    pt: "Criar e remover dados de demonstração.",
  },

  // ── Users page ───────────────────────────────────────────────────────
  "app.admin.searchPlaceholder": {
    no: "Søk etter brukere…", en: "Search users…", nl: "Gebruikers zoeken…",
    fr: "Rechercher des utilisateurs…", de: "Benutzer suchen…", it: "Cerca utenti…",
    sv: "Sök användare…", da: "Søg brugere…", fi: "Hae käyttäjiä…",
    es: "Buscar usuarios…", pl: "Szukaj użytkowników…", pt: "Pesquisar utilizadores…",
  },
  "app.admin.noResults": {
    no: "Ingenting å vise.", en: "Nothing to show.", nl: "Niets te tonen.",
    fr: "Rien à afficher.", de: "Nichts anzuzeigen.", it: "Nulla da mostrare.",
    sv: "Inget att visa.", da: "Intet at vise.", fi: "Ei näytettävää.",
    es: "Nada que mostrar.", pl: "Brak wyników.", pt: "Nada para mostrar.",
  },
  "app.admin.statusActive": {
    no: "Aktiv", en: "Active", nl: "Actief", fr: "Actif",
    de: "Aktiv", it: "Attivo", sv: "Aktiv", da: "Aktiv",
    fi: "Aktiivinen", es: "Activo", pl: "Aktywny", pt: "Ativo",
  },
  "app.admin.statusBanned": {
    no: "Utestengt", en: "Banned", nl: "Verbannen", fr: "Banni",
    de: "Gesperrt", it: "Bloccato", sv: "Avstängd", da: "Udelukket",
    fi: "Estetty", es: "Bloqueado", pl: "Zablokowany", pt: "Banido",
  },
  "app.admin.ban": {
    no: "Utesteng", en: "Ban", nl: "Verbannen", fr: "Bannir",
    de: "Sperren", it: "Blocca", sv: "Stäng av", da: "Udeluk",
    fi: "Estä", es: "Bloquear", pl: "Zablokuj", pt: "Banir",
  },
  "app.admin.unban": {
    no: "Opphev utestenging", en: "Unban", nl: "Verbanning opheffen", fr: "Débannir",
    de: "Entsperren", it: "Sblocca", sv: "Häv avstängning", da: "Ophæv udelukkelse",
    fi: "Poista esto", es: "Desbloquear", pl: "Odblokuj", pt: "Remover banimento",
  },
  "app.admin.joined": {
    no: "Ble med", en: "Joined", nl: "Lid sinds", fr: "Inscrit le",
    de: "Beigetreten", it: "Iscritto", sv: "Gick med", da: "Tilmeldt",
    fi: "Liittynyt", es: "Se unió", pl: "Dołączył", pt: "Aderiu",
  },

  // ── Reports page ─────────────────────────────────────────────────────
  "app.admin.filterAll": {
    no: "Alle", en: "All", nl: "Alle", fr: "Tous",
    de: "Alle", it: "Tutti", sv: "Alla", da: "Alle",
    fi: "Kaikki", es: "Todos", pl: "Wszystkie", pt: "Todos",
  },
  "app.admin.filterPending": {
    no: "Venter", en: "Pending", nl: "In behandeling", fr: "En attente",
    de: "Ausstehend", it: "In attesa", sv: "Väntar", da: "Afventer",
    fi: "Odottaa", es: "Pendientes", pl: "Oczekujące", pt: "Pendentes",
  },
  "app.admin.filterResolved": {
    no: "Løst", en: "Resolved", nl: "Opgelost", fr: "Résolu",
    de: "Erledigt", it: "Risolto", sv: "Löst", da: "Løst",
    fi: "Ratkaistu", es: "Resueltos", pl: "Rozwiązane", pt: "Resolvidos",
  },
  "app.admin.filterDismissed": {
    no: "Avvist", en: "Dismissed", nl: "Afgewezen", fr: "Rejeté",
    de: "Abgelehnt", it: "Respinto", sv: "Avvisad", da: "Afvist",
    fi: "Hylätty", es: "Descartados", pl: "Odrzucone", pt: "Rejeitados",
  },
  "app.admin.resolve": {
    no: "Løs", en: "Resolve", nl: "Oplossen", fr: "Résoudre",
    de: "Erledigen", it: "Risolvi", sv: "Lös", da: "Løs",
    fi: "Ratkaise", es: "Resolver", pl: "Rozwiąż", pt: "Resolver",
  },
  "app.admin.dismiss": {
    no: "Avvis", en: "Dismiss", nl: "Afwijzen", fr: "Rejeter",
    de: "Ablehnen", it: "Respingi", sv: "Avvisa", da: "Afvis",
    fi: "Hylkää", es: "Descartar", pl: "Odrzuć", pt: "Rejeitar",
  },
  "app.admin.reportedBy": {
    no: "Rapportert av", en: "Reported by", nl: "Gerapporteerd door", fr: "Signalé par",
    de: "Gemeldet von", it: "Segnalato da", sv: "Anmäld av", da: "Anmeldt af",
    fi: "Ilmoittanut", es: "Denunciado por", pl: "Zgłoszone przez", pt: "Denunciado por",
  },

  // ── Profile page ─────────────────────
  "app.profile.followers": {
    no: "Følgere", en: "Followers", nl: "Volgers", fr: "Abonnés",
    de: "Follower", it: "Follower", sv: "Följare", da: "Følgere",
    fi: "Seuraajat", es: "Seguidores", pl: "Obserwujący", pt: "Seguidores",
  },
  "app.profile.following": {
    no: "Følger", en: "Following", nl: "Volgend", fr: "Abonnements",
    de: "Folgt", it: "Seguiti", sv: "Följer", da: "Følger",
    fi: "Seuratut", es: "Siguiendo", pl: "Obserwowani", pt: "A seguir",
  },
  // ── Chat: image gate ───────────────────────────────
  // Text sends freely; photos wait for the conversation to be accepted. Shown
  // inline above the composer, not as a hover tooltip — there is no hover on a
  // phone, so the disabled button would otherwise explain itself to nobody.
  "app.messages.photoPendingNote": {
    no: "Du kan sende bilder når samtalen er godtatt.",
    en: "You can send photos once the conversation is accepted.",
    nl: "Je kunt foto's sturen zodra het gesprek is geaccepteerd.",
    fr: "Vous pourrez envoyer des photos une fois la conversation acceptée.",
    de: "Fotos kannst du senden, sobald die Unterhaltung angenommen wurde.",
    it: "Potrai inviare foto quando la conversazione sarà accettata.",
    sv: "Du kan skicka bilder när konversationen har accepterats.",
    da: "Du kan sende billeder, når samtalen er accepteret.",
    fi: "Voit lähettää kuvia, kun keskustelu on hyväksytty.",
    es: "Podrás enviar fotos cuando se acepte la conversación.",
    pl: "Zdjęcia możesz wysyłać po zaakceptowaniu rozmowy.",
    pt: "Podes enviar fotos assim que a conversa for aceite.",
  },

  // ── Date of birth (settings) ────────────────────────
  // Error keys match the codes returned by server/src/lib/dob.js. If the mobile
  // app already namespaces these somewhere else, reuse that prefix instead.
  "app.settings.dateOfBirth": {
    no: "Fødselsdato", en: "Date of birth", nl: "Geboortedatum",
    fr: "Date de naissance", de: "Geburtsdatum", it: "Data di nascita",
    sv: "Födelsedatum", da: "Fødselsdato", fi: "Syntymäaika",
    es: "Fecha de nacimiento", pl: "Data urodzenia", pt: "Data de nascimento",
  },
  "app.settings.dobChangeHint": {
    no: "Fødselsdato kan bare endres et begrenset antall ganger.",
    en: "Date of birth can only be changed a limited number of times.",
    nl: "De geboortedatum kan slechts een beperkt aantal keren worden gewijzigd.",
    fr: "La date de naissance ne peut être modifiée qu'un nombre limité de fois.",
    de: "Das Geburtsdatum kann nur begrenzt oft geändert werden.",
    it: "La data di nascita può essere modificata solo un numero limitato di volte.",
    sv: "Födelsedatum kan bara ändras ett begränsat antal gånger.",
    da: "Fødselsdato kan kun ændres et begrænset antal gange.",
    fi: "Syntymäaikaa voi muuttaa vain rajoitetun määrän kertoja.",
    es: "La fecha de nacimiento solo puede cambiarse un número limitado de veces.",
    pl: "Datę urodzenia można zmienić tylko ograniczoną liczbę razy.",
    pt: "A data de nascimento só pode ser alterada um número limitado de vezes.",
  },
  "app.settings.dobRequired": {
    no: "Fødselsdato er påkrevd.", en: "Date of birth is required.",
    nl: "Geboortedatum is verplicht.", fr: "La date de naissance est requise.",
    de: "Geburtsdatum ist erforderlich.", it: "La data di nascita è obbligatoria.",
    sv: "Födelsedatum krävs.", da: "Fødselsdato er påkrævet.",
    fi: "Syntymäaika vaaditaan.", es: "La fecha de nacimiento es obligatoria.",
    pl: "Data urodzenia jest wymagana.", pt: "A data de nascimento é obrigatória.",
  },
  "app.settings.dobInvalid": {
    no: "Ugyldig dato.", en: "That date is not valid.", nl: "Die datum is ongeldig.",
    fr: "Cette date n'est pas valide.", de: "Dieses Datum ist ungültig.",
    it: "Data non valida.", sv: "Ogiltigt datum.", da: "Ugyldig dato.",
    fi: "Virheellinen päivämäärä.", es: "Fecha no válida.",
    pl: "Nieprawidłowa data.", pt: "Data inválida.",
  },
  "app.settings.dobInFuture": {
    no: "Fødselsdato kan ikke være i framtiden.",
    en: "Date of birth cannot be in the future.",
    nl: "Geboortedatum kan niet in de toekomst liggen.",
    fr: "La date de naissance ne peut pas être dans le futur.",
    de: "Das Geburtsdatum kann nicht in der Zukunft liegen.",
    it: "La data di nascita non può essere nel futuro.",
    sv: "Födelsedatum kan inte vara i framtiden.",
    da: "Fødselsdato kan ikke være i fremtiden.",
    fi: "Syntymäaika ei voi olla tulevaisuudessa.",
    es: "La fecha de nacimiento no puede estar en el futuro.",
    pl: "Data urodzenia nie może być w przyszłości.",
    pt: "A data de nascimento não pode estar no futuro.",
  },
  "app.settings.dobUnderAge": {
    no: "Du må være minst 18 år for å bruke appen.",
    en: "You must be at least 18 to use this app.",
    nl: "Je moet minstens 18 zijn om deze app te gebruiken.",
    fr: "Vous devez avoir au moins 18 ans pour utiliser cette application.",
    de: "Du musst mindestens 18 Jahre alt sein, um diese App zu nutzen.",
    it: "Devi avere almeno 18 anni per usare questa app.",
    sv: "Du måste vara minst 18 år för att använda appen.",
    da: "Du skal være mindst 18 år for at bruge appen.",
    fi: "Sinun on oltava vähintään 18-vuotias käyttääksesi sovellusta.",
    es: "Debes tener al menos 18 años para usar esta aplicación.",
    pl: "Musisz mieć co najmniej 18 lat, aby korzystać z aplikacji.",
    pt: "Tens de ter pelo menos 18 anos para usar esta aplicação.",
  },
  "app.settings.dobChangeLimit": {
    no: "Fødselsdato er allerede endret. Kontakt support for å endre den igjen.",
    en: "Date of birth has already been changed. Contact support to change it again.",
    nl: "De geboortedatum is al gewijzigd. Neem contact op met support om deze opnieuw te wijzigen.",
    fr: "La date de naissance a déjà été modifiée. Contactez le support pour la modifier à nouveau.",
    de: "Das Geburtsdatum wurde bereits geändert. Wende dich an den Support, um es erneut zu ändern.",
    it: "La data di nascita è già stata modificata. Contatta l'assistenza per cambiarla di nuovo.",
    sv: "Födelsedatum har redan ändrats. Kontakta supporten för att ändra det igen.",
    da: "Fødselsdato er allerede ændret. Kontakt support for at ændre den igen.",
    fi: "Syntymäaika on jo muutettu. Ota yhteyttä tukeen muuttaaksesi sitä uudelleen.",
    es: "La fecha de nacimiento ya se ha cambiado. Contacta con soporte para cambiarla de nuevo.",
    pl: "Data urodzenia została już zmieniona. Skontaktuj się z pomocą, aby zmienić ją ponownie.",
    pt: "A data de nascimento já foi alterada. Contacta o suporte para a alterar novamente.",
  },
  "app.profile.savedPosts": {
    no: "Lagrede innlegg", en: "Saved posts", nl: "Opgeslagen berichten",
    fr: "Publications enregistrées", de: "Gespeicherte Beiträge",
    it: "Post salvati", sv: "Sparade inlägg", da: "Gemte opslag",
    fi: "Tallennetut julkaisut", es: "Publicaciones guardadas",
    pl: "Zapisane posty", pt: "Publicações guardadas",
  },
};

const DRY_RUN = process.argv.includes("--dry-run");

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index !== -1 ? process.argv[index + 1] : null;
}

// ---------------------------------------------------------------------------
// Locating the locale files
// ---------------------------------------------------------------------------

function findLocaleDir() {
  const explicit = argValue("--dir");

  if (explicit) {
    const resolved = path.resolve(process.cwd(), explicit);
    if (!fs.existsSync(resolved)) throw new Error(`--dir does not exist: ${resolved}`);
    return resolved;
  }

  for (const candidate of CANDIDATE_DIRS) {
    const resolved = path.resolve(process.cwd(), candidate);
    if (!fs.existsSync(resolved)) continue;

    // Qualifies if at least three languages have a file — enough to rule out a
    // coincidental directory match.
    const entries = fs.readdirSync(resolved);
    const hits = LANGUAGES.filter((lang) => entries.includes(`${lang}.json`));
    if (hits.length >= 3) return resolved;
  }

  throw new Error(
    "Could not find the locale directory. Pass it explicitly:\n" +
      "  node scripts/patchAdminTranslations.cjs --dir src/content/locales",
  );
}

// ---------------------------------------------------------------------------
// Patching
// ---------------------------------------------------------------------------

// Match the file's existing indentation. Rewriting 4-space files at 2 spaces
// would bury the real changes under a whole-file whitespace diff.
function detectIndent(source) {
  const match = /\n([ \t]+)"/.exec(source);
  if (!match) return 2;
  return match[1].includes("\t") ? "\t" : match[1].length;
}

function patchLocale(source, lang) {
  const data = JSON.parse(source);
  const indent = detectIndent(source);
  const endsWithNewline = source.endsWith("\n");

  const added = [];
  const skipped = [];

  for (const [dottedPath, translations] of Object.entries(KEYS)) {
    const value = translations[lang];
    if (value === undefined) {
      throw new Error(`No ${lang} translation defined for ${dottedPath}`);
    }

    const segments = dottedPath.split(".");
    const leaf = segments.pop();

    let node = data;
    for (const segment of segments) {
      if (typeof node[segment] !== "object" || node[segment] === null) {
        node[segment] = {};
      }
      node = node[segment];
    }

    if (Object.prototype.hasOwnProperty.call(node, leaf)) {
      skipped.push(dottedPath);
      continue;
    }

    node[leaf] = value;
    added.push(dottedPath);
  }

  const output = JSON.stringify(data, null, indent) + (endsWithNewline ? "\n" : "");
  return { output, added, skipped };
}

// ---------------------------------------------------------------------------

function main() {
  const dir = findLocaleDir();
  const totalKeys = Object.keys(KEYS).length;

  console.log(`Locale directory: ${dir}`);
  console.log(`Keys defined:     ${totalKeys}`);
  if (DRY_RUN) console.log("DRY RUN — nothing will be written.");
  console.log("");

  let filesChanged = 0;
  let keysAdded = 0;
  const missing = [];

  for (const lang of LANGUAGES) {
    const filePath = path.join(dir, `${lang}.json`);

    if (!fs.existsSync(filePath)) {
      missing.push(lang);
      console.log(`  ${lang.padEnd(3)} MISSING — no ${lang}.json`);
      continue;
    }

    const source = fs.readFileSync(filePath, "utf8");

    let result;
    try {
      result = patchLocale(source, lang);
    } catch (error) {
      console.log(`  ${lang.padEnd(3)} ERROR — ${error.message}`);
      process.exitCode = 1;
      continue;
    }

    if (result.added.length === 0) {
      console.log(
        `  ${lang.padEnd(3)} up to date (${result.skipped.length}/${totalKeys} present)`,
      );
      continue;
    }

    if (!DRY_RUN) fs.writeFileSync(filePath, result.output, "utf8");

    filesChanged += 1;
    keysAdded += result.added.length;
    console.log(`  ${lang.padEnd(3)} +${result.added.length} key(s)`);
  }

  console.log("");
  console.log(`Files ${DRY_RUN ? "that would change" : "changed"}: ${filesChanged}`);
  console.log(`Keys ${DRY_RUN ? "that would be added" : "added"}:   ${keysAdded}`);

  if (missing.length > 0) {
    console.log("");
    console.log(
      `WARNING: no file for ${missing.join(", ")} — those languages did NOT receive the keys.`,
    );
    process.exitCode = 1;
  }

  if (!DRY_RUN && filesChanged > 0) console.log("\nReview with: git diff");
}

try {
  main();
} catch (error) {
  console.error(`Translation patch failed: ${error.message}`);
  process.exitCode = 1;
}
