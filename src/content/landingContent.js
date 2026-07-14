// quppulse/src/content/landingContent.js
//
// Loads landing-page copy from one JSON file per locale (./locales/<lang>.json).
// Public API is unchanged from the previous single-file version, so page.js and
// LandingLang.js need no edits: getTranslations, SUPPORTED_LANGS, DEFAULT_LANG,
// LANGUAGES.
//
// Locale order: no, en, nl, fr, de, it, sv, da, fi, es, pl, pt.
// English is the display default; Norwegian is the authoritative source and is
// fully translated. Every locale JSON carries the complete key set — keep them
// in sync when adding strings (add to ALL 12).

import no from './locales/no.json';
import en from './locales/en.json';
import nl from './locales/nl.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import it from './locales/it.json';
import sv from './locales/sv.json';
import da from './locales/da.json';
import fi from './locales/fi.json';
import es from './locales/es.json';
import pl from './locales/pl.json';
import pt from './locales/pt.json';

export const SUPPORTED_LANGS = ['no', 'en', 'nl', 'fr', 'de', 'it', 'sv', 'da', 'fi', 'es', 'pl', 'pt'];
export const DEFAULT_LANG = 'en';

export const LANGUAGES = {
  no: 'Norsk',
  en: 'English',
  nl: 'Nederlands',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  sv: 'Svenska',
  da: 'Dansk',
  fi: 'Suomi',
  es: 'Español',
  pl: 'Polski',
  pt: 'Português',
};

const landingContent = { no, en, nl, fr, de, it, sv, da, fi, es, pl, pt };

export function getTranslations(lang) {
  const base = landingContent[DEFAULT_LANG];
  const selected = landingContent[lang] || base;
  return { ...base, ...selected };
}