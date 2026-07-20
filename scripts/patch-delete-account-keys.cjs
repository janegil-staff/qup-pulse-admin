// qup-pulse-admin/scripts/patch-delete-account-keys.cjs
//
// Adds the account-deletion confirmation strings to all 12 web locale files
// under src/content/locales/. Keys are nested under app.settings (and
// app.settings.err), matching how the settings page reads them:
//   t.app.settings.deleteAccountTitle
//   t.app.settings.deleteAccountBody
//   t.app.settings.deleteAccountConfirm
//   t.app.settings.deletingAccount
//   t.app.settings.err.deleteAccount
//
// SAFE: it only creates app / settings / err objects if missing and sets the
// five keys; it never overwrites or removes anything else. Idempotent — keys
// already present are left as-is (so hand-edits survive re-runs).
//
// Run from the qup-pulse-admin root:
//   node scripts/patch-delete-account-keys.cjs
// Optional: pass the locales dir as an argument.

const fs = require('fs');
const path = require('path');

const DIR = process.argv[2] || path.join(__dirname, '..', 'src', 'content', 'locales');
const LANGS = ['no', 'en', 'nl', 'fr', 'de', 'it', 'sv', 'da', 'fi', 'es', 'pl', 'pt'];

// Translations. Norwegian is authoritative; the rest are proper translations.
const STRINGS = {
  deleteAccountTitle: {
    no: 'Slette konto?',
    en: 'Delete account?',
    nl: 'Account verwijderen?',
    fr: 'Supprimer le compte ?',
    de: 'Konto löschen?',
    it: 'Eliminare l’account?',
    sv: 'Radera konto?',
    da: 'Slet konto?',
    fi: 'Poistetaanko tili?',
    es: '¿Eliminar cuenta?',
    pl: 'Usunąć konto?',
    pt: 'Eliminar conta?',
  },
  deleteAccountBody: {
    no: 'Dette sletter kontoen din og alle dataene dine permanent. Dette kan ikke angres.',
    en: 'This permanently deletes your account and all your data. This cannot be undone.',
    nl: 'Hiermee worden je account en al je gegevens permanent verwijderd. Dit kan niet ongedaan worden gemaakt.',
    fr: 'Cela supprime définitivement votre compte et toutes vos données. Cette action est irréversible.',
    de: 'Dadurch werden dein Konto und alle deine Daten dauerhaft gelöscht. Dies kann nicht rückgängig gemacht werden.',
    it: 'Questa operazione elimina definitivamente il tuo account e tutti i tuoi dati. Non può essere annullata.',
    sv: 'Detta raderar ditt konto och all din data permanent. Detta kan inte ångras.',
    da: 'Dette sletter din konto og alle dine data permanent. Dette kan ikke fortrydes.',
    fi: 'Tämä poistaa tilisi ja kaikki tietosi pysyvästi. Tätä ei voi kumota.',
    es: 'Esto elimina permanentemente tu cuenta y todos tus datos. No se puede deshacer.',
    pl: 'Spowoduje to trwałe usunięcie konta i wszystkich danych. Tej operacji nie można cofnąć.',
    pt: 'Isto elimina permanentemente a tua conta e todos os teus dados. Não pode ser anulado.',
  },
  deleteAccountConfirm: {
    no: 'Slett konto',
    en: 'Delete account',
    nl: 'Account verwijderen',
    fr: 'Supprimer le compte',
    de: 'Konto löschen',
    it: 'Elimina account',
    sv: 'Radera konto',
    da: 'Slet konto',
    fi: 'Poista tili',
    es: 'Eliminar cuenta',
    pl: 'Usuń konto',
    pt: 'Eliminar conta',
  },
  deletingAccount: {
    no: 'Sletter …',
    en: 'Deleting…',
    nl: 'Verwijderen…',
    fr: 'Suppression…',
    de: 'Wird gelöscht…',
    it: 'Eliminazione…',
    sv: 'Raderar …',
    da: 'Sletter …',
    fi: 'Poistetaan…',
    es: 'Eliminando…',
    pl: 'Usuwanie…',
    pt: 'A eliminar…',
  },
};

// Error string lives under app.settings.err.deleteAccount.
const ERR = {
  no: 'Kunne ikke slette kontoen.',
  en: 'Could not delete account.',
  nl: 'Kon account niet verwijderen.',
  fr: 'Impossible de supprimer le compte.',
  de: 'Konto konnte nicht gelöscht werden.',
  it: 'Impossibile eliminare l’account.',
  sv: 'Det gick inte att radera kontot.',
  da: 'Kunne ikke slette kontoen.',
  fi: 'Tilin poistaminen epäonnistui.',
  es: 'No se pudo eliminar la cuenta.',
  pl: 'Nie udało się usunąć konta.',
  pt: 'Não foi possível eliminar a conta.',
};

let filesChanged = 0;

for (const lang of LANGS) {
  const file = path.join(DIR, `${lang}.json`);
  if (!fs.existsSync(file)) { console.warn(`! ${lang}.json not found — skipped`); continue; }

  const obj = JSON.parse(fs.readFileSync(file, 'utf8'));

  // Walk to app.settings, creating containers only if absent. This is the safe
  // part: we never replace an existing object, only ensure the path exists.
  if (!obj.app || typeof obj.app !== 'object') obj.app = {};
  if (!obj.app.settings || typeof obj.app.settings !== 'object') obj.app.settings = {};
  const settings = obj.app.settings;
  if (!settings.err || typeof settings.err !== 'object') settings.err = {};

  let touched = false;

  // Set the four top-level settings keys (only if missing — idempotent).
  for (const [key, byLang] of Object.entries(STRINGS)) {
    if (settings[key] === undefined) {
      settings[key] = byLang[lang];
      touched = true;
    }
  }
  // Set the nested error key.
  if (settings.err.deleteAccount === undefined) {
    settings.err.deleteAccount = ERR[lang];
    touched = true;
  }

  if (!touched) { console.log(`· ${lang}: already has all delete-account keys`); continue; }

  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  console.log(`✓ ${lang}: added delete-account keys`);
  filesChanged += 1;
}

console.log(`\ndone — updated ${filesChanged} file(s).`);
