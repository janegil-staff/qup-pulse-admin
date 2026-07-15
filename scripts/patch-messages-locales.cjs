// qup-pulse-admin/scripts/patch-verify-email-i18n.cjs
// Idempotent: adds app.profile.verifyEmail* to all 12 locales. Safe to re-run.
//
// Run from the project root:  node scripts/patch-verify-email-i18n.cjs

const fs = require('fs');
const path = require('path');

const STRINGS = {
  no: {
    verifyEmailTitle: 'Bekreft e-postadressen din',
    verifyEmailBody: 'Vi sendte deg en lenke da du registrerte deg. Bekreft for å få merket «E-post bekreftet» og for å kunne tilbakestille PIN-koden.',
    verifyEmailAction: 'Send på nytt',
    verifyEmailSent: 'Vi har sendt en ny lenke. Sjekk innboksen — og søppelposten.',
    verifyEmailFailed: 'Kunne ikke sende lenken på nytt',
  },
  en: {
    verifyEmailTitle: 'Confirm your email address',
    verifyEmailBody: 'We sent you a link when you signed up. Confirm to get the “Email confirmed” badge and to be able to reset your PIN.',
    verifyEmailAction: 'Send again',
    verifyEmailSent: 'We’ve sent a new link. Check your inbox — and your spam folder.',
    verifyEmailFailed: 'Could not resend the link',
  },
  nl: {
    verifyEmailTitle: 'Bevestig je e-mailadres',
    verifyEmailBody: 'We hebben je bij het aanmelden een link gestuurd. Bevestig om het label “E-mail bevestigd” te krijgen en je pincode te kunnen resetten.',
    verifyEmailAction: 'Opnieuw sturen',
    verifyEmailSent: 'We hebben een nieuwe link gestuurd. Kijk in je inbox — en in je spammap.',
    verifyEmailFailed: 'Kon de link niet opnieuw versturen',
  },
  fr: {
    verifyEmailTitle: 'Confirmez votre adresse e-mail',
    verifyEmailBody: 'Nous vous avons envoyé un lien à l’inscription. Confirmez pour obtenir le badge « E-mail confirmé » et pouvoir réinitialiser votre code PIN.',
    verifyEmailAction: 'Renvoyer',
    verifyEmailSent: 'Nous avons envoyé un nouveau lien. Vérifiez votre boîte de réception — et vos spams.',
    verifyEmailFailed: 'Impossible de renvoyer le lien',
  },
  de: {
    verifyEmailTitle: 'Bestätige deine E-Mail-Adresse',
    verifyEmailBody: 'Wir haben dir bei der Anmeldung einen Link geschickt. Bestätige, um das Abzeichen „E-Mail bestätigt“ zu erhalten und deine PIN zurücksetzen zu können.',
    verifyEmailAction: 'Erneut senden',
    verifyEmailSent: 'Wir haben einen neuen Link geschickt. Sieh in deinem Posteingang nach — und im Spam-Ordner.',
    verifyEmailFailed: 'Der Link konnte nicht erneut gesendet werden',
  },
  it: {
    verifyEmailTitle: 'Conferma il tuo indirizzo e-mail',
    verifyEmailBody: 'Ti abbiamo inviato un link al momento della registrazione. Conferma per ottenere il badge “E-mail confermata” e per poter reimpostare il PIN.',
    verifyEmailAction: 'Invia di nuovo',
    verifyEmailSent: 'Abbiamo inviato un nuovo link. Controlla la posta in arrivo — e lo spam.',
    verifyEmailFailed: 'Impossibile inviare di nuovo il link',
  },
  sv: {
    verifyEmailTitle: 'Bekräfta din e-postadress',
    verifyEmailBody: 'Vi skickade dig en länk när du registrerade dig. Bekräfta för att få märket ”E-post bekräftad” och för att kunna återställa din PIN-kod.',
    verifyEmailAction: 'Skicka igen',
    verifyEmailSent: 'Vi har skickat en ny länk. Kolla inkorgen — och skräpposten.',
    verifyEmailFailed: 'Kunde inte skicka länken igen',
  },
  da: {
    verifyEmailTitle: 'Bekræft din e-mailadresse',
    verifyEmailBody: 'Vi sendte dig et link, da du oprettede dig. Bekræft for at få mærket “E-mail bekræftet” og for at kunne nulstille din PIN-kode.',
    verifyEmailAction: 'Send igen',
    verifyEmailSent: 'Vi har sendt et nyt link. Tjek din indbakke — og din spammappe.',
    verifyEmailFailed: 'Kunne ikke sende linket igen',
  },
  fi: {
    verifyEmailTitle: 'Vahvista sähköpostiosoitteesi',
    verifyEmailBody: 'Lähetimme sinulle linkin rekisteröityessäsi. Vahvista saadaksesi ”Sähköposti vahvistettu” -merkin ja voidaksesi nollata PIN-koodisi.',
    verifyEmailAction: 'Lähetä uudelleen',
    verifyEmailSent: 'Lähetimme uuden linkin. Tarkista postilaatikkosi — ja roskapostikansio.',
    verifyEmailFailed: 'Linkin lähettäminen uudelleen epäonnistui',
  },
  es: {
    verifyEmailTitle: 'Confirma tu dirección de correo',
    verifyEmailBody: 'Te enviamos un enlace al registrarte. Confirma para obtener la insignia “Correo confirmado” y poder restablecer tu PIN.',
    verifyEmailAction: 'Enviar de nuevo',
    verifyEmailSent: 'Hemos enviado un nuevo enlace. Revisa tu bandeja de entrada — y el spam.',
    verifyEmailFailed: 'No se pudo reenviar el enlace',
  },
  pl: {
    verifyEmailTitle: 'Potwierdź swój adres e-mail',
    verifyEmailBody: 'Wysłaliśmy Ci link przy rejestracji. Potwierdź, aby otrzymać odznakę „E-mail potwierdzony” i móc zresetować PIN.',
    verifyEmailAction: 'Wyślij ponownie',
    verifyEmailSent: 'Wysłaliśmy nowy link. Sprawdź skrzynkę odbiorczą — i folder spam.',
    verifyEmailFailed: 'Nie udało się wysłać linku ponownie',
  },
  pt: {
    verifyEmailTitle: 'Confirma o teu endereço de e-mail',
    verifyEmailBody: 'Enviámos-te uma ligação quando te registaste. Confirma para obteres o distintivo “E-mail confirmado” e poderes repor o teu PIN.',
    verifyEmailAction: 'Enviar novamente',
    verifyEmailSent: 'Enviámos uma nova ligação. Verifica a tua caixa de entrada — e o spam.',
    verifyEmailFailed: 'Não foi possível reenviar a ligação',
  },
};

const LOCALES_DIR = path.join(__dirname, '..', 'src', 'content', 'locales');

let missing = 0;

for (const [lang, keys] of Object.entries(STRINGS)) {
  const file = path.join(LOCALES_DIR, `${lang}.json`);
  if (!fs.existsSync(file)) {
    console.warn(`SKIP ${lang}: ${file} not found`);
    missing += 1;
    continue;
  }

  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  json.app = json.app || {};
  json.app.profile = json.app.profile || {};

  let changed = false;
  for (const [k, v] of Object.entries(keys)) {
    if (json.app.profile[k] === v) continue;
    json.app.profile[k] = v;
    changed = true;
  }

  if (!changed) {
    console.log(`ok   ${lang}: already present`);
    continue;
  }

  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log(`done ${lang}`);
}

if (missing) {
  console.error(`\n${missing} locale file(s) not found — check LOCALES_DIR: ${LOCALES_DIR}`);
  process.exit(1);
}