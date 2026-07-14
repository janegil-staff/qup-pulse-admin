// qup-pulse-admin/src/content/legalContent.js
//
// Loads the 12-language legal translations and exposes a getter.
// English is the authoritative version (it governs legally); the others are
// courtesy translations. Every locale mirrors en.json's key structure exactly
// (verified: 108 keys each).

import no from './legal/no.json';
import en from './legal/en.json';
import nl from './legal/nl.json';
import fr from './legal/fr.json';
import de from './legal/de.json';
import it from './legal/it.json';
import sv from './legal/sv.json';
import da from './legal/da.json';
import fi from './legal/fi.json';
import es from './legal/es.json';
import pl from './legal/pl.json';
import pt from './legal/pt.json';

const LEGAL = { no, en, nl, fr, de, it, sv, da, fi, es, pl, pt };

// Falls back to English for any unknown lang code.
export function getLegal(lang) {
  return LEGAL[lang] || LEGAL.en;
}

// Renders a string that may contain {b}...{/b} bold markers into an array of
// React-friendly parts. Used by the delete page's numbered steps.
// Returns an array of strings and { bold: string } objects.
export function parseBold(str) {
  const parts = [];
  const re = /\{b\}(.*?)\{\/b\}/g;
  let last = 0;
  let m;
  while ((m = re.exec(str)) !== null) {
    if (m.index > last) parts.push(str.slice(last, m.index));
    parts.push({ bold: m[1] });
    last = m.index + m[0].length;
  }
  if (last < str.length) parts.push(str.slice(last));
  return parts;
}
