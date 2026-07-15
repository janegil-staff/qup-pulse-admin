// qup-pulse-admin/scripts/add-reports-i18n.cjs
// Idempotent: adds app.reports.* to all 12 locales.
//
// reasons.* keys mirror REPORT_REASONS and statuses.*/filters.* mirror
// REPORT_STATUS in server/src/models/Report.js. Only the LABELS are translated
// — the enum values on the wire stay literal.
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..', 'src', 'content', 'locales');
const LANGS = ['no','en','nl','fr','de','it','sv','da','fi','es','pl','pt'];
const R = {
  "en": {
    "title": "Reports",
    "users": "Users",
    "loading": "Loading reports…",
    "emptyOpen": "No open reports — the queue is clear.",
    "emptyOther": "No reports in this view.",
    "reportedUser": "Reported user",
    "reportedPost": "Reported post",
    "targetGone": "Target no longer exists",
    "by": "by",
    "unknown": "unknown",
    "banned": "banned",
    "note": "Note:",
    "markReviewed": "Mark reviewed",
    "dismiss": "Dismiss",
    "banUser": "Ban user",
    "unbanUser": "Unban user",
    "deletePost": "Delete post",
    "confirmBan": "Ban this user? They will be signed out and blocked from the app.",
    "confirmDeletePost": "Delete this post? This cannot be undone.",
    "filters": {
      "open": "Open",
      "reviewed": "Reviewed",
      "dismissed": "Dismissed",
      "all": "All"
    },
    "statuses": {
      "open": "Open",
      "reviewed": "Reviewed",
      "dismissed": "Dismissed"
    },
    "reasons": {
      "spam": "Spam",
      "harassment": "Harassment",
      "inappropriate": "Inappropriate",
      "misinformation": "Misinformation",
      "other": "Other"
    },
    "time": {
      "seconds": "s ago",
      "minutes": "m ago",
      "hours": "h ago",
      "days": "d ago"
    },
    "err": {
      "load": "Could not load reports.",
      "update": "Could not update report.",
      "updateUser": "Could not update user.",
      "deletePost": "Could not delete post."
    }
  },
  "no": {
    "title": "Rapporter",
    "users": "Brukere",
    "loading": "Laster rapporter…",
    "emptyOpen": "Ingen åpne rapporter — køen er tom.",
    "emptyOther": "Ingen rapporter i denne visningen.",
    "reportedUser": "Rapportert bruker",
    "reportedPost": "Rapportert innlegg",
    "targetGone": "Målet finnes ikke lenger",
    "by": "av",
    "unknown": "ukjent",
    "banned": "utestengt",
    "note": "Notat:",
    "markReviewed": "Merk gjennomgått",
    "dismiss": "Avvis",
    "banUser": "Utesteng bruker",
    "unbanUser": "Opphev utestengelse",
    "deletePost": "Slett innlegg",
    "confirmBan": "Utesteng denne brukeren? De blir logget ut og blokkert fra appen.",
    "confirmDeletePost": "Slette dette innlegget? Dette kan ikke angres.",
    "filters": {
      "open": "Åpne",
      "reviewed": "Gjennomgått",
      "dismissed": "Avvist",
      "all": "Alle"
    },
    "statuses": {
      "open": "Åpen",
      "reviewed": "Gjennomgått",
      "dismissed": "Avvist"
    },
    "reasons": {
      "spam": "Søppelpost",
      "harassment": "Trakassering",
      "inappropriate": "Upassende",
      "misinformation": "Feilinformasjon",
      "other": "Annet"
    },
    "time": {
      "seconds": "s siden",
      "minutes": "m siden",
      "hours": "t siden",
      "days": "d siden"
    },
    "err": {
      "load": "Kunne ikke laste rapporter.",
      "update": "Kunne ikke oppdatere rapporten.",
      "updateUser": "Kunne ikke oppdatere brukeren.",
      "deletePost": "Kunne ikke slette innlegget."
    }
  },
  "nl": {
    "title": "Meldingen",
    "users": "Gebruikers",
    "loading": "Meldingen laden…",
    "emptyOpen": "Geen open meldingen — de wachtrij is leeg.",
    "emptyOther": "Geen meldingen in deze weergave.",
    "reportedUser": "Gemelde gebruiker",
    "reportedPost": "Gemeld bericht",
    "targetGone": "Doel bestaat niet meer",
    "by": "door",
    "unknown": "onbekend",
    "banned": "geblokkeerd",
    "note": "Notitie:",
    "markReviewed": "Markeer als beoordeeld",
    "dismiss": "Afwijzen",
    "banUser": "Gebruiker verbannen",
    "unbanUser": "Verbanning opheffen",
    "deletePost": "Bericht verwijderen",
    "confirmBan": "Deze gebruiker verbannen? Ze worden uitgelogd en geblokkeerd.",
    "confirmDeletePost": "Dit bericht verwijderen? Dit kan niet ongedaan worden gemaakt.",
    "filters": {
      "open": "Open",
      "reviewed": "Beoordeeld",
      "dismissed": "Afgewezen",
      "all": "Alle"
    },
    "statuses": {
      "open": "Open",
      "reviewed": "Beoordeeld",
      "dismissed": "Afgewezen"
    },
    "reasons": {
      "spam": "Spam",
      "harassment": "Intimidatie",
      "inappropriate": "Ongepast",
      "misinformation": "Desinformatie",
      "other": "Anders"
    },
    "time": {
      "seconds": "s geleden",
      "minutes": "m geleden",
      "hours": "u geleden",
      "days": "d geleden"
    },
    "err": {
      "load": "Kon meldingen niet laden.",
      "update": "Kon melding niet bijwerken.",
      "updateUser": "Kon gebruiker niet bijwerken.",
      "deletePost": "Kon bericht niet verwijderen."
    }
  },
  "fr": {
    "title": "Signalements",
    "users": "Utilisateurs",
    "loading": "Chargement des signalements…",
    "emptyOpen": "Aucun signalement ouvert — la file est vide.",
    "emptyOther": "Aucun signalement dans cette vue.",
    "reportedUser": "Utilisateur signalé",
    "reportedPost": "Publication signalée",
    "targetGone": "La cible n'existe plus",
    "by": "par",
    "unknown": "inconnu",
    "banned": "banni",
    "note": "Note :",
    "markReviewed": "Marquer comme examiné",
    "dismiss": "Rejeter",
    "banUser": "Bannir l'utilisateur",
    "unbanUser": "Lever le bannissement",
    "deletePost": "Supprimer la publication",
    "confirmBan": "Bannir cet utilisateur ? Il sera déconnecté et bloqué de l'application.",
    "confirmDeletePost": "Supprimer cette publication ? Cette action est irréversible.",
    "filters": {
      "open": "Ouverts",
      "reviewed": "Examinés",
      "dismissed": "Rejetés",
      "all": "Tous"
    },
    "statuses": {
      "open": "Ouvert",
      "reviewed": "Examiné",
      "dismissed": "Rejeté"
    },
    "reasons": {
      "spam": "Spam",
      "harassment": "Harcèlement",
      "inappropriate": "Inapproprié",
      "misinformation": "Désinformation",
      "other": "Autre"
    },
    "time": {
      "seconds": "s",
      "minutes": "min",
      "hours": "h",
      "days": "j"
    },
    "err": {
      "load": "Impossible de charger les signalements.",
      "update": "Impossible de mettre à jour le signalement.",
      "updateUser": "Impossible de mettre à jour l'utilisateur.",
      "deletePost": "Impossible de supprimer la publication."
    }
  },
  "de": {
    "title": "Meldungen",
    "users": "Nutzer",
    "loading": "Meldungen werden geladen…",
    "emptyOpen": "Keine offenen Meldungen — die Warteschlange ist leer.",
    "emptyOther": "Keine Meldungen in dieser Ansicht.",
    "reportedUser": "Gemeldeter Nutzer",
    "reportedPost": "Gemeldeter Beitrag",
    "targetGone": "Ziel existiert nicht mehr",
    "by": "von",
    "unknown": "unbekannt",
    "banned": "gesperrt",
    "note": "Notiz:",
    "markReviewed": "Als geprüft markieren",
    "dismiss": "Verwerfen",
    "banUser": "Nutzer sperren",
    "unbanUser": "Sperre aufheben",
    "deletePost": "Beitrag löschen",
    "confirmBan": "Diesen Nutzer sperren? Er wird abgemeldet und von der App ausgeschlossen.",
    "confirmDeletePost": "Diesen Beitrag löschen? Das kann nicht rückgängig gemacht werden.",
    "filters": {
      "open": "Offen",
      "reviewed": "Geprüft",
      "dismissed": "Verworfen",
      "all": "Alle"
    },
    "statuses": {
      "open": "Offen",
      "reviewed": "Geprüft",
      "dismissed": "Verworfen"
    },
    "reasons": {
      "spam": "Spam",
      "harassment": "Belästigung",
      "inappropriate": "Unangemessen",
      "misinformation": "Falschinformation",
      "other": "Andere"
    },
    "time": {
      "seconds": "s",
      "minutes": "min",
      "hours": "Std.",
      "days": "T"
    },
    "err": {
      "load": "Meldungen konnten nicht geladen werden.",
      "update": "Meldung konnte nicht aktualisiert werden.",
      "updateUser": "Nutzer konnte nicht aktualisiert werden.",
      "deletePost": "Beitrag konnte nicht gelöscht werden."
    }
  },
  "it": {
    "title": "Segnalazioni",
    "users": "Utenti",
    "loading": "Caricamento segnalazioni…",
    "emptyOpen": "Nessuna segnalazione aperta — la coda è vuota.",
    "emptyOther": "Nessuna segnalazione in questa vista.",
    "reportedUser": "Utente segnalato",
    "reportedPost": "Post segnalato",
    "targetGone": "Il bersaglio non esiste più",
    "by": "da",
    "unknown": "sconosciuto",
    "banned": "bandito",
    "note": "Nota:",
    "markReviewed": "Segna come esaminato",
    "dismiss": "Ignora",
    "banUser": "Banna utente",
    "unbanUser": "Rimuovi ban",
    "deletePost": "Elimina post",
    "confirmBan": "Bannare questo utente? Verrà disconnesso e bloccato dall'app.",
    "confirmDeletePost": "Eliminare questo post? Non può essere annullato.",
    "filters": {
      "open": "Aperte",
      "reviewed": "Esaminate",
      "dismissed": "Ignorate",
      "all": "Tutte"
    },
    "statuses": {
      "open": "Aperta",
      "reviewed": "Esaminata",
      "dismissed": "Ignorata"
    },
    "reasons": {
      "spam": "Spam",
      "harassment": "Molestie",
      "inappropriate": "Inappropriato",
      "misinformation": "Disinformazione",
      "other": "Altro"
    },
    "time": {
      "seconds": "s fa",
      "minutes": "m fa",
      "hours": "h fa",
      "days": "g fa"
    },
    "err": {
      "load": "Impossibile caricare le segnalazioni.",
      "update": "Impossibile aggiornare la segnalazione.",
      "updateUser": "Impossibile aggiornare l'utente.",
      "deletePost": "Impossibile eliminare il post."
    }
  },
  "sv": {
    "title": "Rapporter",
    "users": "Användare",
    "loading": "Laddar rapporter…",
    "emptyOpen": "Inga öppna rapporter — kön är tom.",
    "emptyOther": "Inga rapporter i denna vy.",
    "reportedUser": "Rapporterad användare",
    "reportedPost": "Rapporterat inlägg",
    "targetGone": "Målet finns inte längre",
    "by": "av",
    "unknown": "okänd",
    "banned": "avstängd",
    "note": "Anteckning:",
    "markReviewed": "Markera granskad",
    "dismiss": "Avfärda",
    "banUser": "Stäng av användare",
    "unbanUser": "Häv avstängning",
    "deletePost": "Ta bort inlägg",
    "confirmBan": "Stänga av denna användare? De loggas ut och blockeras från appen.",
    "confirmDeletePost": "Ta bort detta inlägg? Detta kan inte ångras.",
    "filters": {
      "open": "Öppna",
      "reviewed": "Granskade",
      "dismissed": "Avfärdade",
      "all": "Alla"
    },
    "statuses": {
      "open": "Öppen",
      "reviewed": "Granskad",
      "dismissed": "Avfärdad"
    },
    "reasons": {
      "spam": "Skräppost",
      "harassment": "Trakasserier",
      "inappropriate": "Olämpligt",
      "misinformation": "Desinformation",
      "other": "Annat"
    },
    "time": {
      "seconds": "s sedan",
      "minutes": "m sedan",
      "hours": "h sedan",
      "days": "d sedan"
    },
    "err": {
      "load": "Kunde inte ladda rapporter.",
      "update": "Kunde inte uppdatera rapporten.",
      "updateUser": "Kunde inte uppdatera användaren.",
      "deletePost": "Kunde inte ta bort inlägget."
    }
  },
  "da": {
    "title": "Anmeldelser",
    "users": "Brugere",
    "loading": "Indlæser anmeldelser…",
    "emptyOpen": "Ingen åbne anmeldelser — køen er tom.",
    "emptyOther": "Ingen anmeldelser i denne visning.",
    "reportedUser": "Anmeldt bruger",
    "reportedPost": "Anmeldt opslag",
    "targetGone": "Målet findes ikke længere",
    "by": "af",
    "unknown": "ukendt",
    "banned": "udelukket",
    "note": "Note:",
    "markReviewed": "Markér som gennemgået",
    "dismiss": "Afvis",
    "banUser": "Udeluk bruger",
    "unbanUser": "Ophæv udelukkelse",
    "deletePost": "Slet opslag",
    "confirmBan": "Udeluk denne bruger? De bliver logget ud og blokeret fra appen.",
    "confirmDeletePost": "Slet dette opslag? Dette kan ikke fortrydes.",
    "filters": {
      "open": "Åbne",
      "reviewed": "Gennemgået",
      "dismissed": "Afvist",
      "all": "Alle"
    },
    "statuses": {
      "open": "Åben",
      "reviewed": "Gennemgået",
      "dismissed": "Afvist"
    },
    "reasons": {
      "spam": "Spam",
      "harassment": "Chikane",
      "inappropriate": "Upassende",
      "misinformation": "Misinformation",
      "other": "Andet"
    },
    "time": {
      "seconds": "s siden",
      "minutes": "m siden",
      "hours": "t siden",
      "days": "d siden"
    },
    "err": {
      "load": "Kunne ikke indlæse anmeldelser.",
      "update": "Kunne ikke opdatere anmeldelsen.",
      "updateUser": "Kunne ikke opdatere brugeren.",
      "deletePost": "Kunne ikke slette opslaget."
    }
  },
  "fi": {
    "title": "Ilmoitukset",
    "users": "Käyttäjät",
    "loading": "Ladataan ilmoituksia…",
    "emptyOpen": "Ei avoimia ilmoituksia — jono on tyhjä.",
    "emptyOther": "Ei ilmoituksia tässä näkymässä.",
    "reportedUser": "Ilmoitettu käyttäjä",
    "reportedPost": "Ilmoitettu julkaisu",
    "targetGone": "Kohdetta ei enää ole",
    "by": "lähettäjä",
    "unknown": "tuntematon",
    "banned": "estetty",
    "note": "Huomautus:",
    "markReviewed": "Merkitse käsitellyksi",
    "dismiss": "Hylkää",
    "banUser": "Estä käyttäjä",
    "unbanUser": "Poista esto",
    "deletePost": "Poista julkaisu",
    "confirmBan": "Estetäänkö tämä käyttäjä? Hänet kirjataan ulos ja estetään sovelluksesta.",
    "confirmDeletePost": "Poistetaanko tämä julkaisu? Tätä ei voi kumota.",
    "filters": {
      "open": "Avoimet",
      "reviewed": "Käsitellyt",
      "dismissed": "Hylätyt",
      "all": "Kaikki"
    },
    "statuses": {
      "open": "Avoin",
      "reviewed": "Käsitelty",
      "dismissed": "Hylätty"
    },
    "reasons": {
      "spam": "Roskaposti",
      "harassment": "Häirintä",
      "inappropriate": "Sopimaton",
      "misinformation": "Virheellinen tieto",
      "other": "Muu"
    },
    "time": {
      "seconds": "s sitten",
      "minutes": "min sitten",
      "hours": "t sitten",
      "days": "pv sitten"
    },
    "err": {
      "load": "Ilmoituksia ei voitu ladata.",
      "update": "Ilmoitusta ei voitu päivittää.",
      "updateUser": "Käyttäjää ei voitu päivittää.",
      "deletePost": "Julkaisua ei voitu poistaa."
    }
  },
  "es": {
    "title": "Reportes",
    "users": "Usuarios",
    "loading": "Cargando reportes…",
    "emptyOpen": "No hay reportes abiertos — la cola está vacía.",
    "emptyOther": "No hay reportes en esta vista.",
    "reportedUser": "Usuario reportado",
    "reportedPost": "Publicación reportada",
    "targetGone": "El objetivo ya no existe",
    "by": "por",
    "unknown": "desconocido",
    "banned": "baneado",
    "note": "Nota:",
    "markReviewed": "Marcar como revisado",
    "dismiss": "Descartar",
    "banUser": "Banear usuario",
    "unbanUser": "Quitar baneo",
    "deletePost": "Eliminar publicación",
    "confirmBan": "¿Banear a este usuario? Se cerrará su sesión y quedará bloqueado.",
    "confirmDeletePost": "¿Eliminar esta publicación? No se puede deshacer.",
    "filters": {
      "open": "Abiertos",
      "reviewed": "Revisados",
      "dismissed": "Descartados",
      "all": "Todos"
    },
    "statuses": {
      "open": "Abierto",
      "reviewed": "Revisado",
      "dismissed": "Descartado"
    },
    "reasons": {
      "spam": "Spam",
      "harassment": "Acoso",
      "inappropriate": "Inapropiado",
      "misinformation": "Desinformación",
      "other": "Otro"
    },
    "time": {
      "seconds": "s",
      "minutes": "m",
      "hours": "h",
      "days": "d"
    },
    "err": {
      "load": "No se pudieron cargar los reportes.",
      "update": "No se pudo actualizar el reporte.",
      "updateUser": "No se pudo actualizar el usuario.",
      "deletePost": "No se pudo eliminar la publicación."
    }
  },
  "pl": {
    "title": "Zgłoszenia",
    "users": "Użytkownicy",
    "loading": "Wczytywanie zgłoszeń…",
    "emptyOpen": "Brak otwartych zgłoszeń — kolejka jest pusta.",
    "emptyOther": "Brak zgłoszeń w tym widoku.",
    "reportedUser": "Zgłoszony użytkownik",
    "reportedPost": "Zgłoszony post",
    "targetGone": "Cel już nie istnieje",
    "by": "przez",
    "unknown": "nieznany",
    "banned": "zbanowany",
    "note": "Notatka:",
    "markReviewed": "Oznacz jako sprawdzone",
    "dismiss": "Odrzuć",
    "banUser": "Zbanuj użytkownika",
    "unbanUser": "Cofnij bana",
    "deletePost": "Usuń post",
    "confirmBan": "Zbanować tego użytkownika? Zostanie wylogowany i zablokowany.",
    "confirmDeletePost": "Usunąć ten post? Tej operacji nie można cofnąć.",
    "filters": {
      "open": "Otwarte",
      "reviewed": "Sprawdzone",
      "dismissed": "Odrzucone",
      "all": "Wszystkie"
    },
    "statuses": {
      "open": "Otwarte",
      "reviewed": "Sprawdzone",
      "dismissed": "Odrzucone"
    },
    "reasons": {
      "spam": "Spam",
      "harassment": "Nękanie",
      "inappropriate": "Nieodpowiednie",
      "misinformation": "Dezinformacja",
      "other": "Inne"
    },
    "time": {
      "seconds": "s temu",
      "minutes": "m temu",
      "hours": "g temu",
      "days": "d temu"
    },
    "err": {
      "load": "Nie udało się wczytać zgłoszeń.",
      "update": "Nie udało się zaktualizować zgłoszenia.",
      "updateUser": "Nie udało się zaktualizować użytkownika.",
      "deletePost": "Nie udało się usunąć posta."
    }
  },
  "pt": {
    "title": "Denúncias",
    "users": "Utilizadores",
    "loading": "A carregar denúncias…",
    "emptyOpen": "Sem denúncias abertas — a fila está vazia.",
    "emptyOther": "Sem denúncias nesta vista.",
    "reportedUser": "Utilizador denunciado",
    "reportedPost": "Publicação denunciada",
    "targetGone": "O alvo já não existe",
    "by": "por",
    "unknown": "desconhecido",
    "banned": "banido",
    "note": "Nota:",
    "markReviewed": "Marcar como analisado",
    "dismiss": "Rejeitar",
    "banUser": "Banir utilizador",
    "unbanUser": "Remover banimento",
    "deletePost": "Eliminar publicação",
    "confirmBan": "Banir este utilizador? Será desconectado e bloqueado da app.",
    "confirmDeletePost": "Eliminar esta publicação? Não pode ser anulado.",
    "filters": {
      "open": "Abertas",
      "reviewed": "Analisadas",
      "dismissed": "Rejeitadas",
      "all": "Todas"
    },
    "statuses": {
      "open": "Aberta",
      "reviewed": "Analisada",
      "dismissed": "Rejeitada"
    },
    "reasons": {
      "spam": "Spam",
      "harassment": "Assédio",
      "inappropriate": "Inapropriado",
      "misinformation": "Desinformação",
      "other": "Outro"
    },
    "time": {
      "seconds": "s",
      "minutes": "m",
      "hours": "h",
      "days": "d"
    },
    "err": {
      "load": "Não foi possível carregar as denúncias.",
      "update": "Não foi possível atualizar a denúncia.",
      "updateUser": "Não foi possível atualizar o utilizador.",
      "deletePost": "Não foi possível eliminar a publicação."
    }
  }
};
function deepFill(t,s){for(const k of Object.keys(s)){if(s[k]&&typeof s[k]==='object'&&!Array.isArray(s[k])){if(!t[k]||typeof t[k]!=='object')t[k]={};deepFill(t[k],s[k]);}else if(!(k in t))t[k]=s[k];}}
let changed=0;
for(const lang of LANGS){
  const file=path.join(DIR,lang+'.json');
  if(!fs.existsSync(file)){console.warn('skip: '+lang+'.json not found');continue;}
  const j=JSON.parse(fs.readFileSync(file,'utf8'));
  const before=JSON.stringify(j);
  if(!j.app)j.app={};
  if(!j.app.reports)j.app.reports={};
  deepFill(j.app.reports, R[lang]||R.en);
  if(JSON.stringify(j)!==before){fs.writeFileSync(file,JSON.stringify(j,null,2)+'\n','utf8');changed++;console.log('patched: '+lang+'.json');}
  else console.log('ok: '+lang+'.json');
}
console.log('\nDone. '+changed+' changed.');
