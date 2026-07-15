// qup-pulse-admin/scripts/add-users-i18n.cjs
// Idempotent: adds app.users.* to all 12 locales.
// confirmBan carries a {name} placeholder replaced at render.
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..', 'src', 'content', 'locales');
const LANGS = ['no','en','nl','fr','de','it','sv','da','fi','es','pl','pt'];
const U = {
  "en": {
    "title": "Users",
    "reports": "Reports",
    "search": "Search",
    "searchPlaceholder": "Search username or email",
    "loading": "Loading users…",
    "empty": "No users found.",
    "banned": "banned",
    "ban": "Ban",
    "unban": "Unban",
    "confirmBan": "Ban @{name}? They will be signed out and blocked from the app.",
    "err": {
      "load": "Could not load users.",
      "update": "Could not update user."
    }
  },
  "no": {
    "title": "Brukere",
    "reports": "Rapporter",
    "search": "Søk",
    "searchPlaceholder": "Søk brukernavn eller e-post",
    "loading": "Laster brukere…",
    "empty": "Fant ingen brukere.",
    "banned": "utestengt",
    "ban": "Utesteng",
    "unban": "Opphev",
    "confirmBan": "Utesteng @{name}? De blir logget ut og blokkert fra appen.",
    "err": {
      "load": "Kunne ikke laste brukere.",
      "update": "Kunne ikke oppdatere brukeren."
    }
  },
  "nl": {
    "title": "Gebruikers",
    "reports": "Meldingen",
    "search": "Zoeken",
    "searchPlaceholder": "Zoek gebruikersnaam of e-mail",
    "loading": "Gebruikers laden…",
    "empty": "Geen gebruikers gevonden.",
    "banned": "geblokkeerd",
    "ban": "Verbannen",
    "unban": "Deblokkeren",
    "confirmBan": "@{name} verbannen? Ze worden uitgelogd en geblokkeerd.",
    "err": {
      "load": "Kon gebruikers niet laden.",
      "update": "Kon gebruiker niet bijwerken."
    }
  },
  "fr": {
    "title": "Utilisateurs",
    "reports": "Signalements",
    "search": "Rechercher",
    "searchPlaceholder": "Rechercher un nom d'utilisateur ou un e-mail",
    "loading": "Chargement des utilisateurs…",
    "empty": "Aucun utilisateur trouvé.",
    "banned": "banni",
    "ban": "Bannir",
    "unban": "Débannir",
    "confirmBan": "Bannir @{name} ? Il sera déconnecté et bloqué de l'application.",
    "err": {
      "load": "Impossible de charger les utilisateurs.",
      "update": "Impossible de mettre à jour l'utilisateur."
    }
  },
  "de": {
    "title": "Nutzer",
    "reports": "Meldungen",
    "search": "Suchen",
    "searchPlaceholder": "Benutzername oder E-Mail suchen",
    "loading": "Nutzer werden geladen…",
    "empty": "Keine Nutzer gefunden.",
    "banned": "gesperrt",
    "ban": "Sperren",
    "unban": "Entsperren",
    "confirmBan": "@{name} sperren? Er wird abgemeldet und von der App ausgeschlossen.",
    "err": {
      "load": "Nutzer konnten nicht geladen werden.",
      "update": "Nutzer konnte nicht aktualisiert werden."
    }
  },
  "it": {
    "title": "Utenti",
    "reports": "Segnalazioni",
    "search": "Cerca",
    "searchPlaceholder": "Cerca nome utente o e-mail",
    "loading": "Caricamento utenti…",
    "empty": "Nessun utente trovato.",
    "banned": "bandito",
    "ban": "Banna",
    "unban": "Rimuovi ban",
    "confirmBan": "Bannare @{name}? Verrà disconnesso e bloccato dall'app.",
    "err": {
      "load": "Impossibile caricare gli utenti.",
      "update": "Impossibile aggiornare l'utente."
    }
  },
  "sv": {
    "title": "Användare",
    "reports": "Rapporter",
    "search": "Sök",
    "searchPlaceholder": "Sök användarnamn eller e-post",
    "loading": "Laddar användare…",
    "empty": "Inga användare hittades.",
    "banned": "avstängd",
    "ban": "Stäng av",
    "unban": "Häv avstängning",
    "confirmBan": "Stänga av @{name}? De loggas ut och blockeras från appen.",
    "err": {
      "load": "Kunde inte ladda användare.",
      "update": "Kunde inte uppdatera användaren."
    }
  },
  "da": {
    "title": "Brugere",
    "reports": "Anmeldelser",
    "search": "Søg",
    "searchPlaceholder": "Søg brugernavn eller e-mail",
    "loading": "Indlæser brugere…",
    "empty": "Ingen brugere fundet.",
    "banned": "udelukket",
    "ban": "Udeluk",
    "unban": "Ophæv",
    "confirmBan": "Udeluk @{name}? De bliver logget ud og blokeret fra appen.",
    "err": {
      "load": "Kunne ikke indlæse brugere.",
      "update": "Kunne ikke opdatere brugeren."
    }
  },
  "fi": {
    "title": "Käyttäjät",
    "reports": "Ilmoitukset",
    "search": "Hae",
    "searchPlaceholder": "Hae käyttäjänimeä tai sähköpostia",
    "loading": "Ladataan käyttäjiä…",
    "empty": "Käyttäjiä ei löytynyt.",
    "banned": "estetty",
    "ban": "Estä",
    "unban": "Poista esto",
    "confirmBan": "Estetäänkö @{name}? Hänet kirjataan ulos ja estetään sovelluksesta.",
    "err": {
      "load": "Käyttäjiä ei voitu ladata.",
      "update": "Käyttäjää ei voitu päivittää."
    }
  },
  "es": {
    "title": "Usuarios",
    "reports": "Reportes",
    "search": "Buscar",
    "searchPlaceholder": "Buscar nombre de usuario o correo",
    "loading": "Cargando usuarios…",
    "empty": "No se encontraron usuarios.",
    "banned": "baneado",
    "ban": "Banear",
    "unban": "Quitar baneo",
    "confirmBan": "¿Banear a @{name}? Se cerrará su sesión y quedará bloqueado.",
    "err": {
      "load": "No se pudieron cargar los usuarios.",
      "update": "No se pudo actualizar el usuario."
    }
  },
  "pl": {
    "title": "Użytkownicy",
    "reports": "Zgłoszenia",
    "search": "Szukaj",
    "searchPlaceholder": "Szukaj nazwy użytkownika lub e-maila",
    "loading": "Wczytywanie użytkowników…",
    "empty": "Nie znaleziono użytkowników.",
    "banned": "zbanowany",
    "ban": "Zbanuj",
    "unban": "Cofnij bana",
    "confirmBan": "Zbanować @{name}? Zostanie wylogowany i zablokowany.",
    "err": {
      "load": "Nie udało się wczytać użytkowników.",
      "update": "Nie udało się zaktualizować użytkownika."
    }
  },
  "pt": {
    "title": "Utilizadores",
    "reports": "Denúncias",
    "search": "Pesquisar",
    "searchPlaceholder": "Pesquisar nome de utilizador ou e-mail",
    "loading": "A carregar utilizadores…",
    "empty": "Nenhum utilizador encontrado.",
    "banned": "banido",
    "ban": "Banir",
    "unban": "Remover banimento",
    "confirmBan": "Banir @{name}? Será desconectado e bloqueado da app.",
    "err": {
      "load": "Não foi possível carregar os utilizadores.",
      "update": "Não foi possível atualizar o utilizador."
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
  if(!j.app.users)j.app.users={};
  deepFill(j.app.users, U[lang]||U.en);
  if(JSON.stringify(j)!==before){fs.writeFileSync(file,JSON.stringify(j,null,2)+'\n','utf8');changed++;console.log('patched: '+lang+'.json');}
  else console.log('ok: '+lang+'.json');
}
console.log('\nDone. '+changed+' changed.');
