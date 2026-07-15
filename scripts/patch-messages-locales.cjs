// qup-pulse-admin/scripts/patch-discover-i18n.cjs
// Idempotent: adds app.discover.* to every locale. Safe to re-run.

const fs = require('fs');
const path = require('path');

const STRINGS = {
  no: {
    peopleNearby: 'Folk i nærheten',
    refresh: 'Oppdater',
    refreshing: 'Oppdaterer …',
    loading: 'Laster …',
    browseNearMeAgain: 'Bla i nærheten av meg igjen',
    someone: 'Noen',
    emailConfirmed: 'E-post bekreftet',
    empty: 'Ingen i nærheten ennå. Oppdater, eller øk avstanden i innstillingene i appen.',
    loadFailed: 'Kunne ikke laste folk i nærheten',
  },
  en: {
    peopleNearby: 'People nearby',
    refresh: 'Refresh',
    refreshing: 'Refreshing …',
    loading: 'Loading …',
    browseNearMeAgain: 'Browse near me again',
    someone: 'Someone',
    emailConfirmed: 'Email confirmed',
    empty: 'No one nearby yet. Refresh, or widen your distance in the app settings.',
    loadFailed: 'Could not load people nearby',
  },
  nl: {
    peopleNearby: 'Mensen in de buurt',
    refresh: 'Vernieuwen',
    refreshing: 'Vernieuwen …',
    loading: 'Laden …',
    browseNearMeAgain: 'Weer in mijn buurt zoeken',
    someone: 'Iemand',
    emailConfirmed: 'E-mail bevestigd',
    empty: 'Nog niemand in de buurt. Vernieuw, of vergroot je afstand in de app-instellingen.',
    loadFailed: 'Kon mensen in de buurt niet laden',
  },
  fr: {
    peopleNearby: 'Personnes à proximité',
    refresh: 'Actualiser',
    refreshing: 'Actualisation …',
    loading: 'Chargement …',
    browseNearMeAgain: 'Rechercher près de moi à nouveau',
    someone: 'Quelqu’un',
    emailConfirmed: 'E-mail confirmé',
    empty: 'Personne à proximité pour le moment. Actualisez, ou augmentez la distance dans les réglages de l’application.',
    loadFailed: 'Impossible de charger les personnes à proximité',
  },
  de: {
    peopleNearby: 'Leute in der Nähe',
    refresh: 'Aktualisieren',
    refreshing: 'Wird aktualisiert …',
    loading: 'Wird geladen …',
    browseNearMeAgain: 'Wieder in meiner Nähe suchen',
    someone: 'Jemand',
    emailConfirmed: 'E-Mail bestätigt',
    empty: 'Noch niemand in der Nähe. Aktualisiere, oder erhöhe die Entfernung in den App-Einstellungen.',
    loadFailed: 'Leute in der Nähe konnten nicht geladen werden',
  },
  it: {
    peopleNearby: 'Persone nelle vicinanze',
    refresh: 'Aggiorna',
    refreshing: 'Aggiornamento …',
    loading: 'Caricamento …',
    browseNearMeAgain: 'Cerca di nuovo vicino a me',
    someone: 'Qualcuno',
    emailConfirmed: 'E-mail confermata',
    empty: 'Ancora nessuno nelle vicinanze. Aggiorna, o aumenta la distanza nelle impostazioni dell’app.',
    loadFailed: 'Impossibile caricare le persone nelle vicinanze',
  },
  sv: {
    peopleNearby: 'Personer i närheten',
    refresh: 'Uppdatera',
    refreshing: 'Uppdaterar …',
    loading: 'Laddar …',
    browseNearMeAgain: 'Bläddra nära mig igen',
    someone: 'Någon',
    emailConfirmed: 'E-post bekräftad',
    empty: 'Ingen i närheten ännu. Uppdatera, eller öka avståndet i appens inställningar.',
    loadFailed: 'Kunde inte ladda personer i närheten',
  },
  da: {
    peopleNearby: 'Folk i nærheden',
    refresh: 'Opdater',
    refreshing: 'Opdaterer …',
    loading: 'Indlæser …',
    browseNearMeAgain: 'Søg i nærheden af mig igen',
    someone: 'Nogen',
    emailConfirmed: 'E-mail bekræftet',
    empty: 'Ingen i nærheden endnu. Opdater, eller øg afstanden i appens indstillinger.',
    loadFailed: 'Kunne ikke indlæse folk i nærheden',
  },
  fi: {
    peopleNearby: 'Ihmisiä lähellä',
    refresh: 'Päivitä',
    refreshing: 'Päivitetään …',
    loading: 'Ladataan …',
    browseNearMeAgain: 'Selaa taas lähelläni',
    someone: 'Joku',
    emailConfirmed: 'Sähköposti vahvistettu',
    empty: 'Ketään ei ole vielä lähellä. Päivitä, tai kasvata etäisyyttä sovelluksen asetuksissa.',
    loadFailed: 'Lähellä olevia ihmisiä ei voitu ladata',
  },
  es: {
    peopleNearby: 'Personas cerca',
    refresh: 'Actualizar',
    refreshing: 'Actualizando …',
    loading: 'Cargando …',
    browseNearMeAgain: 'Buscar cerca de mí otra vez',
    someone: 'Alguien',
    emailConfirmed: 'Correo confirmado',
    empty: 'Todavía no hay nadie cerca. Actualiza, o amplía la distancia en los ajustes de la aplicación.',
    loadFailed: 'No se pudieron cargar las personas cercanas',
  },
  pl: {
    peopleNearby: 'Osoby w pobliżu',
    refresh: 'Odśwież',
    refreshing: 'Odświeżanie …',
    loading: 'Ładowanie …',
    browseNearMeAgain: 'Przeglądaj ponownie w pobliżu',
    someone: 'Ktoś',
    emailConfirmed: 'E-mail potwierdzony',
    empty: 'Nikogo jeszcze nie ma w pobliżu. Odśwież lub zwiększ odległość w ustawieniach aplikacji.',
    loadFailed: 'Nie udało się załadować osób w pobliżu',
  },
  pt: {
    peopleNearby: 'Pessoas por perto',
    refresh: 'Atualizar',
    refreshing: 'A atualizar …',
    loading: 'A carregar …',
    browseNearMeAgain: 'Procurar perto de mim novamente',
    someone: 'Alguém',
    emailConfirmed: 'E-mail confirmado',
    empty: 'Ainda não há ninguém por perto. Atualiza, ou aumenta a distância nas definições da aplicação.',
    loadFailed: 'Não foi possível carregar pessoas por perto',
  },
};

const LOCALES_DIR = path.join(__dirname, '..', 'src', 'content', 'locales');

for (const [lang, keys] of Object.entries(STRINGS)) {
  const file = path.join(LOCALES_DIR, `${lang}.json`);
  if (!fs.existsSync(file)) {
    console.warn(`skip ${lang}: ${file} not found`);
    continue;
  }
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  json.app = json.app || {};
  json.app.discover = json.app.discover || {};

  let changed = false;
  for (const [k, v] of Object.entries(keys)) {
    if (json.app.discover[k] === v) continue;
    json.app.discover[k] = v;
    changed = true;
  }

  if (!changed) {
    console.log(`ok   ${lang}: already present`);
    continue;
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log(`done ${lang}`);
}