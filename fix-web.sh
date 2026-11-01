#!/usr/bin/env bash
# fix-web.sh
#
# Email verification fix for the website (qup-pulse-admin / quppulse.com):
# adds the /verifyLP page and its text in all 12 languages.
#
# Usage (any of these):
#   bash fix-web.sh /path/to/qup-pulse-admin
#   cd /path/to/qup-pulse-admin && bash ~/Downloads/fix-web.sh
#   bash fix-web.sh --commit /path/to/qup-pulse-admin     # also git add/commit/push
#
# Without a path it uses the current folder if it is qup-pulse-admin, otherwise it
# asks (you can drag the folder in from Finder).
# Nothing is changed if the fix does not apply cleanly.

set -euo pipefail

PROJ="qup-pulse-admin"
COMMIT_MSG="Add /verifyLP email verification page"
MARKER="src/app/verifyLP/page.js"

COMMIT=0
if [[ "${1:-}" == "--commit" ]]; then COMMIT=1; shift; fi
DIR="${1:-}"

green() { printf '\033[32m%s\033[0m\n' "$*"; }
red()   { printf '\033[31m%s\033[0m\n' "$*"; }
bold()  { printf '\033[1m%s\033[0m\n' "$*"; }

if [[ -z "$DIR" ]]; then
  if [[ -f package.json ]] && grep -q "\"name\": *\"qup-pulse-admin\"" package.json; then
    DIR="$PWD"
  else
    read -r -p "Path to $PROJ (drag the folder here): " DIR
    # Finder drag-and-drop adds a trailing space and escapes spaces with "\ "
    DIR="${DIR%"${DIR##*[![:space:]]}"}"
    DIR="${DIR//\\ / }"
    DIR="${DIR/#\~/$HOME}"
  fi
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
PATCH="$TMP/fix.patch"

cat > "$PATCH" <<'__PATCH_END__'
diff --git a/src/app/verifyLP/VerifyClient.js b/src/app/verifyLP/VerifyClient.js
new file mode 100644
index 0000000..d6c2fb2
--- /dev/null
+++ b/src/app/verifyLP/VerifyClient.js
@@ -0,0 +1,81 @@
+// qup-pulse-admin/src/app/verifyLP/VerifyClient.js
+'use client';
+
+// Calls GET /api/auth/verify/:token through the Next rewrite proxy
+// (next.config.mjs), so there's no CORS and the API host never shows up in the
+// browser. Works signed-out: the token itself identifies the user.
+//
+// Only res.ok matters. On success the API returns JSON; on an invalid or
+// expired token it returns 400 (currently with an HTML body). We never parse
+// the body, so either shape works.
+
+import { useEffect, useRef, useState } from 'react';
+import Link from 'next/link';
+import { useLang } from '../../context/LandingLang';
+import LegalHeader from '../../components/LegalHeader';
+import { getToken } from '../../lib/api.js';
+
+const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
+
+export default function VerifyClient({ token }) {
+  const { t } = useLang();
+  const v = t.verify;
+  // 'checking' | 'success' | 'expired' | 'error'
+  const [status, setStatus] = useState(token ? 'checking' : 'expired');
+  const [signedIn, setSignedIn] = useState(false);
+  // StrictMode runs effects twice in dev. The token is single-use, so a second
+  // call would 400 and flip a real success to "expired".
+  const ran = useRef(false);
+
+  useEffect(() => {
+    setSignedIn(Boolean(getToken()));
+    if (!token || ran.current) return;
+    ran.current = true;
+
+    fetch(`${API_URL}/auth/verify/${encodeURIComponent(token)}`, { cache: 'no-store' })
+      .then((res) => {
+        if (res.ok) setStatus('success');
+        else if (res.status === 400 || res.status === 404) setStatus('expired');
+        else setStatus('error');
+      })
+      .catch(() => setStatus('error'));
+  }, [token]);
+
+  const content = {
+    checking: { title: v.checking, body: null, icon: '…', tone: 'text-slate-400' },
+    success: { title: v.successTitle, body: v.successBody, icon: '✓', tone: 'text-emerald-400' },
+    expired: { title: v.expiredTitle, body: v.expiredBody, icon: '!', tone: 'text-amber-400' },
+    error: { title: v.errorTitle, body: v.errorBody, icon: '×', tone: 'text-rose-400' },
+  }[status];
+
+  return (
+    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1016] dark:text-slate-200">
+      <LegalHeader />
+      <div className="mx-auto flex max-w-md flex-col items-center px-6 pb-24 pt-24 text-center">
+        <div
+          className={`mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 text-2xl font-bold dark:border-slate-800 ${content.tone}`}
+          aria-hidden="true"
+        >
+          {content.icon}
+        </div>
+        <h1 className="mb-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white" aria-live="polite">
+          {content.title}
+        </h1>
+        {content.body && (
+          <p className="mb-8 text-base leading-relaxed text-slate-600 dark:text-slate-400">{content.body}</p>
+        )}
+
+        {status !== 'checking' && (
+          <div className="flex flex-wrap justify-center gap-3">
+            <Link
+              href={signedIn ? '/profile' : '/login'}
+              className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white no-underline transition hover:bg-emerald-600"
+            >
+              {signedIn ? v.goProfile : v.openApp}
+            </Link>
+          </div>
+        )}
+      </div>
+    </main>
+  );
+}
diff --git a/src/app/verifyLP/page.js b/src/app/verifyLP/page.js
new file mode 100644
index 0000000..59f8f92
--- /dev/null
+++ b/src/app/verifyLP/page.js
@@ -0,0 +1,17 @@
+// qup-pulse-admin/src/app/verifyLP/page.js
+//
+// Landing page for the link in the verification email:
+//   https://quppulse.com/verifyLP?token=<hex>
+// The API builds that URL from CLIENT_URL (see local-puls-api/src/lib/mail.js).
+// The path stays "verifyLP" so it matches links the API already sends.
+//
+// Server component: reads the token from searchParams (a Promise in this
+// Next version) and hands it to the client component, which calls the API.
+import VerifyClient from './VerifyClient';
+
+export const metadata = { title: 'Confirm email — Qup Pulse' };
+
+export default async function VerifyPage({ searchParams }) {
+  const { token } = await searchParams;
+  return <VerifyClient token={typeof token === 'string' ? token : ''} />;
+}
diff --git a/src/content/locales/da.json b/src/content/locales/da.json
index cba21eb..9e780e5 100644
--- a/src/content/locales/da.json
+++ b/src/content/locales/da.json
@@ -715,5 +715,16 @@
   "retractTitle": "Slet for alle?",
   "retractBothParties": "Beskeden skjules for jer begge — også for den, du sendte den til.",
   "retractUndoNote": "Du kan hente den tilbage i cirka 30 sekunder.",
-  "retractModerationNote": "Beskeden slettes ikke fra serveren — moderatorer beholder en kopi, så anmeldelser kan behandles."
+  "retractModerationNote": "Beskeden slettes ikke fra serveren — moderatorer beholder en kopi, så anmeldelser kan behandles.",
+  "verify": {
+    "checking": "Bekræfter din e-mail…",
+    "successTitle": "E-mail bekræftet",
+    "successBody": "Tak! Din e-mailadresse er bekræftet. Du kan lukke siden eller gå tilbage til appen.",
+    "expiredTitle": "Linket er udløbet",
+    "expiredBody": "Dette bekræftelseslink er ugyldigt eller udløbet. Log ind og send et nyt fra din profil.",
+    "errorTitle": "Noget gik galt",
+    "errorBody": "Vi kunne ikke få forbindelse til serveren. Prøv at åbne linket igen om lidt.",
+    "openApp": "Åbn Qup Pulse",
+    "goProfile": "Gå til profil"
+  }
 }
diff --git a/src/content/locales/de.json b/src/content/locales/de.json
index c32720d..00a2a10 100644
--- a/src/content/locales/de.json
+++ b/src/content/locales/de.json
@@ -715,5 +715,16 @@
   "retractTitle": "Für alle löschen?",
   "retractBothParties": "Die Nachricht wird für euch beide ausgeblendet — auch für die Person, der du sie gesendet hast.",
   "retractUndoNote": "Du kannst sie etwa 30 Sekunden lang zurückholen.",
-  "retractModerationNote": "Die Nachricht wird nicht vom Server gelöscht — Moderatoren behalten eine Kopie, damit Meldungen bearbeitet werden können."
+  "retractModerationNote": "Die Nachricht wird nicht vom Server gelöscht — Moderatoren behalten eine Kopie, damit Meldungen bearbeitet werden können.",
+  "verify": {
+    "checking": "E-Mail wird bestätigt…",
+    "successTitle": "E-Mail bestätigt",
+    "successBody": "Danke! Deine E-Mail-Adresse ist bestätigt. Du kannst diese Seite schließen oder zur App zurückkehren.",
+    "expiredTitle": "Link abgelaufen",
+    "expiredBody": "Dieser Bestätigungslink ist ungültig oder abgelaufen. Melde dich an und sende einen neuen über dein Profil.",
+    "errorTitle": "Etwas ist schiefgelaufen",
+    "errorBody": "Der Server war nicht erreichbar. Öffne den Link gleich noch einmal.",
+    "openApp": "Qup Pulse öffnen",
+    "goProfile": "Zum Profil"
+  }
 }
diff --git a/src/content/locales/en.json b/src/content/locales/en.json
index 6907d36..3f18627 100644
--- a/src/content/locales/en.json
+++ b/src/content/locales/en.json
@@ -715,5 +715,16 @@
   "retractTitle": "Delete for everyone?",
   "retractBothParties": "The message is hidden for both of you — including the person you sent it to.",
   "retractUndoNote": "You can bring it back for about 30 seconds.",
-  "retractModerationNote": "The message isn't erased from the server — moderators keep a copy so reports can be handled."
+  "retractModerationNote": "The message isn't erased from the server — moderators keep a copy so reports can be handled.",
+  "verify": {
+    "checking": "Confirming your email…",
+    "successTitle": "Email confirmed",
+    "successBody": "Thanks! Your email address is confirmed. You can close this page or go back to the app.",
+    "expiredTitle": "Link expired",
+    "expiredBody": "This confirmation link is invalid or has expired. Sign in and send a new one from your profile.",
+    "errorTitle": "Something went wrong",
+    "errorBody": "We couldn't reach the server. Try opening the link again in a moment.",
+    "openApp": "Open Qup Pulse",
+    "goProfile": "Go to profile"
+  }
 }
diff --git a/src/content/locales/es.json b/src/content/locales/es.json
index 5b1151c..0d47994 100644
--- a/src/content/locales/es.json
+++ b/src/content/locales/es.json
@@ -715,5 +715,16 @@
   "retractTitle": "¿Eliminar para todos?",
   "retractBothParties": "El mensaje se oculta para los dos — también para la persona a la que se lo enviaste.",
   "retractUndoNote": "Puedes recuperarlo durante unos 30 segundos.",
-  "retractModerationNote": "El mensaje no se borra del servidor — los moderadores conservan una copia para poder gestionar los reportes."
+  "retractModerationNote": "El mensaje no se borra del servidor — los moderadores conservan una copia para poder gestionar los reportes.",
+  "verify": {
+    "checking": "Confirmando tu correo…",
+    "successTitle": "Correo confirmado",
+    "successBody": "¡Gracias! Tu dirección de correo está confirmada. Puedes cerrar esta página o volver a la app.",
+    "expiredTitle": "Enlace caducado",
+    "expiredBody": "Este enlace de confirmación no es válido o ha caducado. Inicia sesión y envía uno nuevo desde tu perfil.",
+    "errorTitle": "Algo salió mal",
+    "errorBody": "No pudimos contactar con el servidor. Intenta abrir el enlace de nuevo en un momento.",
+    "openApp": "Abrir Qup Pulse",
+    "goProfile": "Ir al perfil"
+  }
 }
diff --git a/src/content/locales/fi.json b/src/content/locales/fi.json
index c5896a1..1037f85 100644
--- a/src/content/locales/fi.json
+++ b/src/content/locales/fi.json
@@ -715,5 +715,16 @@
   "retractTitle": "Poistetaanko kaikilta?",
   "retractBothParties": "Viesti piilotetaan teiltä molemmilta — myös henkilöltä, jolle lähetit sen.",
   "retractUndoNote": "Voit palauttaa sen noin 30 sekunnin ajan.",
-  "retractModerationNote": "Viestiä ei poisteta palvelimelta — moderaattoreilla säilyy kopio, jotta ilmoitukset voidaan käsitellä."
+  "retractModerationNote": "Viestiä ei poisteta palvelimelta — moderaattoreilla säilyy kopio, jotta ilmoitukset voidaan käsitellä.",
+  "verify": {
+    "checking": "Vahvistetaan sähköpostia…",
+    "successTitle": "Sähköposti vahvistettu",
+    "successBody": "Kiitos! Sähköpostiosoitteesi on vahvistettu. Voit sulkea sivun tai palata sovellukseen.",
+    "expiredTitle": "Linkki on vanhentunut",
+    "expiredBody": "Tämä vahvistuslinkki on virheellinen tai vanhentunut. Kirjaudu sisään ja lähetä uusi profiilistasi.",
+    "errorTitle": "Jokin meni pieleen",
+    "errorBody": "Palvelimeen ei saatu yhteyttä. Yritä avata linkki uudelleen hetken kuluttua.",
+    "openApp": "Avaa Qup Pulse",
+    "goProfile": "Siirry profiiliin"
+  }
 }
diff --git a/src/content/locales/fr.json b/src/content/locales/fr.json
index 5aaea67..4b1ca3b 100644
--- a/src/content/locales/fr.json
+++ b/src/content/locales/fr.json
@@ -715,5 +715,16 @@
   "retractTitle": "Supprimer pour tout le monde ?",
   "retractBothParties": "Le message sera masqué pour vous deux — y compris pour la personne à qui vous l'avez envoyé.",
   "retractUndoNote": "Vous pouvez le récupérer pendant environ 30 secondes.",
-  "retractModerationNote": "Le message n'est pas effacé du serveur — les modérateurs en conservent une copie afin de pouvoir traiter les signalements."
+  "retractModerationNote": "Le message n'est pas effacé du serveur — les modérateurs en conservent une copie afin de pouvoir traiter les signalements.",
+  "verify": {
+    "checking": "Confirmation de votre e-mail…",
+    "successTitle": "E-mail confirmé",
+    "successBody": "Merci ! Votre adresse e-mail est confirmée. Vous pouvez fermer cette page ou revenir à l’application.",
+    "expiredTitle": "Lien expiré",
+    "expiredBody": "Ce lien de confirmation est invalide ou a expiré. Connectez-vous et renvoyez-en un depuis votre profil.",
+    "errorTitle": "Un problème est survenu",
+    "errorBody": "Impossible de joindre le serveur. Réessayez d’ouvrir le lien dans un instant.",
+    "openApp": "Ouvrir Qup Pulse",
+    "goProfile": "Aller au profil"
+  }
 }
diff --git a/src/content/locales/it.json b/src/content/locales/it.json
index dba3e99..c2a15ea 100644
--- a/src/content/locales/it.json
+++ b/src/content/locales/it.json
@@ -715,5 +715,16 @@
   "retractTitle": "Eliminare per tutti?",
   "retractBothParties": "Il messaggio viene nascosto a entrambi — anche alla persona a cui l'hai inviato.",
   "retractUndoNote": "Puoi recuperarlo per circa 30 secondi.",
-  "retractModerationNote": "Il messaggio non viene cancellato dal server — i moderatori ne conservano una copia per poter gestire le segnalazioni."
+  "retractModerationNote": "Il messaggio non viene cancellato dal server — i moderatori ne conservano una copia per poter gestire le segnalazioni.",
+  "verify": {
+    "checking": "Conferma dell’e-mail in corso…",
+    "successTitle": "E-mail confermata",
+    "successBody": "Grazie! Il tuo indirizzo e-mail è confermato. Puoi chiudere questa pagina o tornare all’app.",
+    "expiredTitle": "Link scaduto",
+    "expiredBody": "Questo link di conferma non è valido o è scaduto. Accedi e inviane uno nuovo dal tuo profilo.",
+    "errorTitle": "Qualcosa è andato storto",
+    "errorBody": "Impossibile raggiungere il server. Riprova ad aprire il link tra poco.",
+    "openApp": "Apri Qup Pulse",
+    "goProfile": "Vai al profilo"
+  }
 }
diff --git a/src/content/locales/nl.json b/src/content/locales/nl.json
index 6eb9ff0..24b53d6 100644
--- a/src/content/locales/nl.json
+++ b/src/content/locales/nl.json
@@ -715,5 +715,16 @@
   "retractTitle": "Voor iedereen verwijderen?",
   "retractBothParties": "Het bericht wordt voor jullie beiden verborgen — ook voor de persoon aan wie je het hebt gestuurd.",
   "retractUndoNote": "Je kunt het ongeveer 30 seconden lang terughalen.",
-  "retractModerationNote": "Het bericht wordt niet van de server gewist — moderators bewaren een kopie zodat meldingen behandeld kunnen worden."
+  "retractModerationNote": "Het bericht wordt niet van de server gewist — moderators bewaren een kopie zodat meldingen behandeld kunnen worden.",
+  "verify": {
+    "checking": "E-mail bevestigen…",
+    "successTitle": "E-mail bevestigd",
+    "successBody": "Bedankt! Je e-mailadres is bevestigd. Je kunt deze pagina sluiten of teruggaan naar de app.",
+    "expiredTitle": "Link verlopen",
+    "expiredBody": "Deze bevestigingslink is ongeldig of verlopen. Log in en stuur een nieuwe vanuit je profiel.",
+    "errorTitle": "Er ging iets mis",
+    "errorBody": "We konden de server niet bereiken. Probeer de link zo opnieuw te openen.",
+    "openApp": "Open Qup Pulse",
+    "goProfile": "Naar profiel"
+  }
 }
diff --git a/src/content/locales/no.json b/src/content/locales/no.json
index ac33e75..dcfce59 100644
--- a/src/content/locales/no.json
+++ b/src/content/locales/no.json
@@ -715,5 +715,16 @@
   "retractTitle": "Slette for alle?",
   "retractBothParties": "Meldingen skjules for begge – også for den du sendte den til.",
   "retractUndoNote": "Du kan hente den tilbake i omtrent 30 sekunder.",
-  "retractModerationNote": "Meldingen slettes ikke fra serveren – moderatorer beholder en kopi slik at rapporter kan behandles."
+  "retractModerationNote": "Meldingen slettes ikke fra serveren – moderatorer beholder en kopi slik at rapporter kan behandles.",
+  "verify": {
+    "checking": "Bekrefter e-postadressen…",
+    "successTitle": "E-post bekreftet",
+    "successBody": "Takk! E-postadressen din er bekreftet. Du kan lukke denne siden eller gå tilbake til appen.",
+    "expiredTitle": "Lenken har utløpt",
+    "expiredBody": "Denne bekreftelseslenken er ugyldig eller har utløpt. Logg inn og send en ny fra profilen din.",
+    "errorTitle": "Noe gikk galt",
+    "errorBody": "Vi fikk ikke kontakt med serveren. Prøv å åpne lenken igjen om litt.",
+    "openApp": "Åpne Qup Pulse",
+    "goProfile": "Gå til profil"
+  }
 }
diff --git a/src/content/locales/pl.json b/src/content/locales/pl.json
index e23b2df..9e33e86 100644
--- a/src/content/locales/pl.json
+++ b/src/content/locales/pl.json
@@ -715,5 +715,16 @@
   "retractTitle": "Usunąć dla wszystkich?",
   "retractBothParties": "Wiadomość zostanie ukryta u obu stron — także u osoby, do której ją wysłałeś.",
   "retractUndoNote": "Możesz ją przywrócić przez około 30 sekund.",
-  "retractModerationNote": "Wiadomość nie jest usuwana z serwera — moderatorzy zachowują kopię, aby móc rozpatrywać zgłoszenia."
+  "retractModerationNote": "Wiadomość nie jest usuwana z serwera — moderatorzy zachowują kopię, aby móc rozpatrywać zgłoszenia.",
+  "verify": {
+    "checking": "Potwierdzanie adresu e-mail…",
+    "successTitle": "E-mail potwierdzony",
+    "successBody": "Dziękujemy! Twój adres e-mail został potwierdzony. Możesz zamknąć tę stronę lub wrócić do aplikacji.",
+    "expiredTitle": "Link wygasł",
+    "expiredBody": "Ten link potwierdzający jest nieprawidłowy lub wygasł. Zaloguj się i wyślij nowy ze swojego profilu.",
+    "errorTitle": "Coś poszło nie tak",
+    "errorBody": "Nie udało się połączyć z serwerem. Spróbuj ponownie otworzyć link za chwilę.",
+    "openApp": "Otwórz Qup Pulse",
+    "goProfile": "Przejdź do profilu"
+  }
 }
diff --git a/src/content/locales/pt.json b/src/content/locales/pt.json
index 8f0f093..52b6b0e 100644
--- a/src/content/locales/pt.json
+++ b/src/content/locales/pt.json
@@ -715,5 +715,16 @@
   "retractTitle": "Eliminar para todos?",
   "retractBothParties": "A mensagem fica oculta para ambos — incluindo para a pessoa a quem a enviaste.",
   "retractUndoNote": "Podes recuperá-la durante cerca de 30 segundos.",
-  "retractModerationNote": "A mensagem não é apagada do servidor — os moderadores mantêm uma cópia para que as denúncias possam ser tratadas."
+  "retractModerationNote": "A mensagem não é apagada do servidor — os moderadores mantêm uma cópia para que as denúncias possam ser tratadas.",
+  "verify": {
+    "checking": "A confirmar o teu e-mail…",
+    "successTitle": "E-mail confirmado",
+    "successBody": "Obrigado! O teu endereço de e-mail está confirmado. Podes fechar esta página ou voltar à app.",
+    "expiredTitle": "Ligação expirada",
+    "expiredBody": "Esta ligação de confirmação é inválida ou expirou. Inicia sessão e envia uma nova a partir do teu perfil.",
+    "errorTitle": "Algo correu mal",
+    "errorBody": "Não foi possível contactar o servidor. Tenta abrir a ligação novamente daqui a pouco.",
+    "openApp": "Abrir Qup Pulse",
+    "goProfile": "Ir para o perfil"
+  }
 }
diff --git a/src/content/locales/sv.json b/src/content/locales/sv.json
index cc98dd8..d2b982d 100644
--- a/src/content/locales/sv.json
+++ b/src/content/locales/sv.json
@@ -715,5 +715,16 @@
   "retractTitle": "Radera för alla?",
   "retractBothParties": "Meddelandet döljs för er båda — även för personen du skickade det till.",
   "retractUndoNote": "Du kan hämta tillbaka det i ungefär 30 sekunder.",
-  "retractModerationNote": "Meddelandet raderas inte från servern — moderatorer behåller en kopia så att anmälningar kan hanteras."
+  "retractModerationNote": "Meddelandet raderas inte från servern — moderatorer behåller en kopia så att anmälningar kan hanteras.",
+  "verify": {
+    "checking": "Bekräftar din e-post…",
+    "successTitle": "E-post bekräftad",
+    "successBody": "Tack! Din e-postadress är bekräftad. Du kan stänga sidan eller gå tillbaka till appen.",
+    "expiredTitle": "Länken har gått ut",
+    "expiredBody": "Den här bekräftelselänken är ogiltig eller har gått ut. Logga in och skicka en ny från din profil.",
+    "errorTitle": "Något gick fel",
+    "errorBody": "Vi kunde inte nå servern. Försök öppna länken igen om en stund.",
+    "openApp": "Öppna Qup Pulse",
+    "goProfile": "Gå till profil"
+  }
 }
__PATCH_END__

bold "== $PROJ: $DIR"
[[ -d "$DIR" ]] || { red "Folder not found: $DIR"; exit 1; }
git -C "$DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1 || { red "Not a git repository: $DIR"; exit 1; }
[[ -f "$DIR/package.json" ]] || { red "No package.json in $DIR. Is this the right folder?"; exit 1; }
grep -q "\"name\": *\"qup-pulse-admin\"" "$DIR/package.json" || {
  red "package.json in $DIR is not qup-pulse-admin. Wrong folder?"; exit 1; }

if git -C "$DIR" apply --reverse --check "$PATCH" >/dev/null 2>&1; then
  green "Already applied, nothing to do."
elif git -C "$DIR" apply --check "$PATCH" 2>"$TMP/err"; then
  git -C "$DIR" apply "$PATCH"
  green "Applied."
else
  red "The fix does not apply cleanly. Nothing was changed."
  sed 's/^/   /' "$TMP/err"
  echo "   Usually this means the files changed since the zip you sent, or an"
  echo "   older version of the fix is applied. Check with: git -C \"$DIR\" diff"
  exit 1
fi

[[ -z "$MARKER" || -e "$DIR/$MARKER" ]] || { red "Expected $MARKER after applying"; exit 1; }
git -C "$DIR" status --short

if [[ $COMMIT -eq 1 ]]; then
  git -C "$DIR" add -A
  if git -C "$DIR" diff --cached --quiet; then
    echo "Nothing to commit."
  else
    git -C "$DIR" commit -m "$COMMIT_MSG"
    git -C "$DIR" push
    green "Committed and pushed."
  fi
fi

echo
bold "Done. Next steps:"
[[ $COMMIT -eq 0 ]] && echo "  - git add -A && git commit -m \"$COMMIT_MSG\" && git push  (or rerun with --commit)"
echo "  - After the deploy, check that https://quppulse.com/verifyLP opens"
echo "  - Then run fix-api.sh for the API"
