// quppulse/src/content/landingContent.js
//
// Loads landing-page copy from one JSON file per locale (./locales/<lang>.json).
// Public API is unchanged: getTranslations, SUPPORTED_LANGS, DEFAULT_LANG,
// LANGUAGES.
//
// Locale order: no, en, nl, fr, de, it, sv, da, fi, es, pl, pt.
// English is the display default; Norwegian is the authoritative source and is
// fully translated. Every locale JSON should carry the complete key set — but
// getTranslations DEEP-merges against English, so a missing key falls back to
// English rather than rendering blank.
//
// The merge MUST be deep. A shallow `{ ...base, ...selected }` replaces whole
// nested objects: a locale whose `app` block lacks `app.settings` would drop
// English's `app.settings` entirely and `t.app.settings.title` would throw
// "Cannot read properties of undefined". With a dozen nested blocks (app.nav,
// app.settings, app.profile, app.feed, auth, ...) that failure is a matter of
// when, not if.

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

// Recursively merge `override` over `base`. Arrays and primitives are replaced
// wholesale; plain objects are merged key by key so a partial translation only
// overrides what it actually defines. Keys present only in `override` are kept,
// so a locale can carry extra strings English doesn't have.
function deepMerge(base, override) {
  if (Array.isArray(base) || typeof base !== 'object' || base === null) {
    return override === undefined ? base : override;
  }
  const out = { ...base };
  for (const key of Object.keys(base)) {
    const o = override ? override[key] : undefined;
    out[key] = (o && typeof o === 'object' && !Array.isArray(o))
      ? deepMerge(base[key], o)
      : (o === undefined ? base[key] : o);
  }
  if (override) {
    for (const key of Object.keys(override)) {
      if (!(key in out)) out[key] = override[key];
    }
  }
  return out;
}

export function getTranslations(lang) {
  const base = landingContent[DEFAULT_LANG];
  const selected = landingContent[lang] || base;
  return deepMerge(base, selected);
}