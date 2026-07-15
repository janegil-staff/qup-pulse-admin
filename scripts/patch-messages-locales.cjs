// qup-pulse-admin/scripts/patch-pending-strings.cjs
// Idempotent: adds app.messages.{photoPending,textPending,textPendingPlaceholder}
// to every locale. Safe to re-run.

const fs = require('fs');
const path = require('path');

const STRINGS = {
  no: {
    photoPending: 'Du kan sende bilder når forespørselen er godkjent.',
    textPending: 'Du kan sende én melding. Resten venter til forespørselen er godkjent.',
    textPendingPlaceholder: 'Venter på godkjenning …',
  },
  en: {
    photoPending: 'You can send photos once the request is accepted.',
    textPending: 'You can send one message. The rest waits until your request is accepted.',
    textPendingPlaceholder: 'Waiting for acceptance …',
  },
  nl: {
    photoPending: 'Je kunt foto’s sturen zodra het verzoek is geaccepteerd.',
    textPending: 'Je kunt één bericht sturen. De rest wacht tot je verzoek is geaccepteerd.',
    textPendingPlaceholder: 'Wachten op acceptatie …',
  },
  fr: {
    photoPending: 'Vous pourrez envoyer des photos une fois la demande acceptée.',
    textPending: 'Vous pouvez envoyer un message. La suite attend l’acceptation de votre demande.',
    textPendingPlaceholder: 'En attente d’acceptation …',
  },
  de: {
    photoPending: 'Fotos kannst du senden, sobald die Anfrage angenommen wurde.',
    textPending: 'Du kannst eine Nachricht senden. Alles Weitere wartet auf die Annahme deiner Anfrage.',
    textPendingPlaceholder: 'Warten auf Annahme …',
  },
  it: {
    photoPending: 'Potrai inviare foto una volta accettata la richiesta.',
    textPending: 'Puoi inviare un messaggio. Il resto attende l’accettazione della richiesta.',
    textPendingPlaceholder: 'In attesa di accettazione …',
  },
  sv: {
    photoPending: 'Du kan skicka bilder när förfrågan har godkänts.',
    textPending: 'Du kan skicka ett meddelande. Resten väntar tills din förfrågan har godkänts.',
    textPendingPlaceholder: 'Väntar på godkännande …',
  },
  da: {
    photoPending: 'Du kan sende billeder, når anmodningen er accepteret.',
    textPending: 'Du kan sende én besked. Resten venter, til din anmodning er accepteret.',
    textPendingPlaceholder: 'Venter på accept …',
  },
  fi: {
    photoPending: 'Voit lähettää kuvia, kun pyyntö on hyväksytty.',
    textPending: 'Voit lähettää yhden viestin. Loput odottavat pyyntösi hyväksymistä.',
    textPendingPlaceholder: 'Odottaa hyväksyntää …',
  },
  es: {
    photoPending: 'Podrás enviar fotos cuando se acepte la solicitud.',
    textPending: 'Puedes enviar un mensaje. El resto espera a que se acepte tu solicitud.',
    textPendingPlaceholder: 'Esperando aceptación …',
  },
  pl: {
    photoPending: 'Zdjęcia możesz wysyłać po zaakceptowaniu prośby.',
    textPending: 'Możesz wysłać jedną wiadomość. Reszta czeka na zaakceptowanie prośby.',
    textPendingPlaceholder: 'Oczekiwanie na akceptację …',
  },
  pt: {
    photoPending: 'Podes enviar fotos assim que o pedido for aceite.',
    textPending: 'Podes enviar uma mensagem. O resto aguarda a aceitação do teu pedido.',
    textPendingPlaceholder: 'A aguardar aceitação …',
  },
};

const LOCALES_DIR = path.join(__dirname, '..', 'src', "content", 'locales');

for (const [lang, keys] of Object.entries(STRINGS)) {
  const file = path.join(LOCALES_DIR, `${lang}.json`);
  if (!fs.existsSync(file)) {
    console.warn(`skip ${lang}: ${file} not found`);
    continue;
  }
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  json.app = json.app || {};
  json.app.messages = json.app.messages || {};

  let changed = false;
  for (const [k, v] of Object.entries(keys)) {
    if (json.app.messages[k] === v) continue;
    json.app.messages[k] = v;
    changed = true;
  }

  if (!changed) {
    console.log(`ok   ${lang}: already present`);
    continue;
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log(`done ${lang}`);
}