// qup-pulse-admin/scripts/add-blocked-i18n.cjs
// Idempotent: adds app.blocked.* to all 12 locales.
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..', 'src', 'content', 'locales');
const LANGS = ['no','en','nl','fr','de','it','sv','da','fi','es','pl','pt'];
const B = {
  "en": {
    "empty": "You haven't blocked anyone.",
    "unblock": "Unblock",
    "unblocking": "Unblocking…",
    "loadFailed": "Could not load blocked users.",
    "unblockFailed": "Could not unblock this user."
  },
  "no": {
    "empty": "Du har ikke blokkert noen.",
    "unblock": "Opphev blokkering",
    "unblocking": "Opphever…",
    "loadFailed": "Kunne ikke laste blokkerte brukere.",
    "unblockFailed": "Kunne ikke oppheve blokkeringen av denne brukeren."
  },
  "nl": {
    "empty": "Je hebt niemand geblokkeerd.",
    "unblock": "Deblokkeren",
    "unblocking": "Deblokkeren…",
    "loadFailed": "Kon geblokkeerde gebruikers niet laden.",
    "unblockFailed": "Kon deze gebruiker niet deblokkeren."
  },
  "fr": {
    "empty": "Vous n'avez bloqué personne.",
    "unblock": "Débloquer",
    "unblocking": "Déblocage…",
    "loadFailed": "Impossible de charger les utilisateurs bloqués.",
    "unblockFailed": "Impossible de débloquer cet utilisateur."
  },
  "de": {
    "empty": "Du hast niemanden blockiert.",
    "unblock": "Blockierung aufheben",
    "unblocking": "Wird aufgehoben…",
    "loadFailed": "Blockierte Nutzer konnten nicht geladen werden.",
    "unblockFailed": "Blockierung konnte nicht aufgehoben werden."
  },
  "it": {
    "empty": "Non hai bloccato nessuno.",
    "unblock": "Sblocca",
    "unblocking": "Sblocco…",
    "loadFailed": "Impossibile caricare gli utenti bloccati.",
    "unblockFailed": "Impossibile sbloccare questo utente."
  },
  "sv": {
    "empty": "Du har inte blockerat någon.",
    "unblock": "Avblockera",
    "unblocking": "Avblockerar…",
    "loadFailed": "Kunde inte ladda blockerade användare.",
    "unblockFailed": "Kunde inte avblockera den här användaren."
  },
  "da": {
    "empty": "Du har ikke blokeret nogen.",
    "unblock": "Ophæv blokering",
    "unblocking": "Ophæver…",
    "loadFailed": "Kunne ikke indlæse blokerede brugere.",
    "unblockFailed": "Kunne ikke ophæve blokeringen af denne bruger."
  },
  "fi": {
    "empty": "Et ole estänyt ketään.",
    "unblock": "Poista esto",
    "unblocking": "Poistetaan estoa…",
    "loadFailed": "Estettyjä käyttäjiä ei voitu ladata.",
    "unblockFailed": "Tämän käyttäjän estoa ei voitu poistaa."
  },
  "es": {
    "empty": "No has bloqueado a nadie.",
    "unblock": "Desbloquear",
    "unblocking": "Desbloqueando…",
    "loadFailed": "No se pudieron cargar los usuarios bloqueados.",
    "unblockFailed": "No se pudo desbloquear a este usuario."
  },
  "pl": {
    "empty": "Nie zablokowałeś nikogo.",
    "unblock": "Odblokuj",
    "unblocking": "Odblokowywanie…",
    "loadFailed": "Nie udało się załadować zablokowanych użytkowników.",
    "unblockFailed": "Nie udało się odblokować tego użytkownika."
  },
  "pt": {
    "empty": "Não bloqueaste ninguém.",
    "unblock": "Desbloquear",
    "unblocking": "A desbloquear…",
    "loadFailed": "Não foi possível carregar os utilizadores bloqueados.",
    "unblockFailed": "Não foi possível desbloquear este utilizador."
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
  if(!j.app.blocked)j.app.blocked={};
  deepFill(j.app.blocked, B[lang]||B.en);
  if(JSON.stringify(j)!==before){fs.writeFileSync(file,JSON.stringify(j,null,2)+'\n','utf8');changed++;console.log('patched: '+lang+'.json');}
  else console.log('ok: '+lang+'.json');
}
console.log('\nDone. '+changed+' changed.');
