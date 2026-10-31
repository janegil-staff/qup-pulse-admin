// qup-pulse-admin/src/components/AiBadge.js
'use client';
// Small "AI" pill shown next to the name of any user with isBot: true —
// discovery cards, profile, message list and chat header.
//
// The badge is the only thing telling people they are not talking to a
// person, so render it wherever a bot's name appears. Labels live here rather
// than in landingContent so the badge works the same on every page.
import { useLang } from '../context/LandingLang';

const LABEL = {
  en: 'AI', no: 'KI', da: 'AI', sv: 'AI', fi: 'AI', de: 'KI',
  nl: 'AI', fr: 'IA', es: 'IA', it: 'IA', pt: 'IA', pl: 'AI',
};

const TITLE = {
  en: 'AI bot – replies are written by AI, not a person',
  no: 'KI-bot – svarene skrives av KI, ikke et menneske',
  da: 'AI-bot – svarene skrives af AI, ikke et menneske',
  sv: 'AI-bot – svaren skrivs av AI, inte en människa',
  fi: 'Tekoälybotti – vastaukset kirjoittaa tekoäly, ei ihminen',
  de: 'KI-Bot – Antworten schreibt eine KI, kein Mensch',
  nl: 'AI-bot – antwoorden worden door AI geschreven, niet door een mens',
  fr: "Bot IA – les réponses sont écrites par une IA, pas par une personne",
  es: 'Bot de IA – las respuestas las escribe una IA, no una persona',
  it: "Bot IA – le risposte sono scritte da un'IA, non da una persona",
  pt: 'Bot de IA – as respostas são escritas por IA, não por uma pessoa',
  pl: 'Bot AI – odpowiedzi pisze AI, nie człowiek',
};

// size: 'sm' for cards and lists, 'md' for the profile heading.
export default function AiBadge({ size = 'sm', className = '' }) {
  const { lang } = useLang();
  const label = LABEL[lang] || LABEL.en;
  const title = TITLE[lang] || TITLE.en;
  const sizing =
    size === 'md' ? 'px-2 py-0.5 text-xs' : 'px-1.5 py-px text-[10px]';

  return (
    <span
      title={title}
      aria-label={title}
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full bg-violet-500 font-bold uppercase leading-none tracking-wide text-white align-middle ${sizing} ${className}`}
    >
      <span aria-hidden="true">🤖</span>
      {label}
    </span>
  );
}
