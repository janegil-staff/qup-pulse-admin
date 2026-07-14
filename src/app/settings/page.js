// qup-pulse-admin/src/app/settings/page.js
'use client';

// Settings — merged account + discovery + app settings (was split across
// /settings and /settings/personal; personal is now removed and inlined here).
// LOGGED-IN ONLY (redirects to / without a token). Localized via useLang().
//
// Sections (top to bottom): Account, Discovery, Privacy & security, Legal,
// Delete account. Theme and logout are handled from AppNav.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken } from '../../lib/api';
import { useLang } from '../../context/LandingLang';
import { LANGUAGES, SUPPORTED_LANGS } from '../../content/landingContent';
import AppNav from '../../components/AppNav';
import {
  getMyProfile, updateMyProfile, updatePreferences, changePin, geocode, setLocation,
} from '../../lib/profileSettingsApi';

const GENDER_KEYS = ['male', 'female', 'nonbinary', 'other'];
const SHOW_KEYS = ['female', 'male', 'everyone'];
const SHOW_LABEL_KEY = { female: 'women', male: 'men', everyone: 'everyone' };
const DEFAULT_DISTANCE_KM = 50;

export default function SettingsPage() {
  const router = useRouter();
  const { lang, setLang, t } = useLang();
  const s = t.app.settings;
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  const [show, setShow] = useState('everyone');
  const [ageMin, setAgeMin] = useState('18');
  const [ageMax, setAgeMax] = useState('99');
  const [distance, setDistance] = useState(null);
  const anywhere = distance === null;

  const [modal, setModal] = useState(null);

  const reload = async () => {
    const p = await getMyProfile();
    setProfile(p);
    const pref = p.preferences || {};
    setShow(pref.show || 'everyone');
    setAgeMin(String(pref.ageMin ?? 18));
    setAgeMax(String(pref.ageMax ?? 99));
    setDistance(pref.maxDistanceKm == null ? null : String(pref.maxDistanceKm));
  };

  useEffect(() => {
    if (!getToken()) { router.replace('/'); return; }
    reload().then(() => setReady(true)).catch((e) => { setError(e.message); setReady(true); });
  }, [router]);

  async function savePref(patch) {
    try { await updatePreferences(patch); } catch (e) { setError(e.message); }
  }

  function cycleShow() {
    const idx = SHOW_KEYS.indexOf(show);
    const nextKey = SHOW_KEYS[(idx + 1) % SHOW_KEYS.length];
    setShow(nextKey);
    savePref({ show: nextKey });
  }

  function saveAge(which, raw) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 18 || n > 120) {
      const fb = String(profile?.preferences?.[which] ?? (which === 'ageMin' ? 18 : 99));
      if (which === 'ageMin') setAgeMin(fb); else setAgeMax(fb);
      return;
    }
    savePref({ [which]: n });
  }

  function toggleAnywhere() {
    if (anywhere) {
      setDistance(String(DEFAULT_DISTANCE_KM));
      savePref({ maxDistanceKm: DEFAULT_DISTANCE_KM });
    } else {
      setDistance(null);
      savePref({ maxDistanceKm: null });
    }
  }

  function saveDistance() {
    const n = Number(distance);
    if (!Number.isFinite(n) || n < 1) {
      setDistance(String(profile?.preferences?.maxDistanceKm ?? DEFAULT_DISTANCE_KM));
      return;
    }
    savePref({ maxDistanceKm: n });
  }

  if (!ready) {
    return <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-500 dark:bg-[#0b1016] dark:text-slate-400">{s.loading}</div>;
  }

  const showLabel = t.app.show[SHOW_LABEL_KEY[show] ?? 'everyone'];
  const langLabel = LANGUAGES[lang] || lang?.toUpperCase() || '—';
  const genderLabel = profile?.gender ? (t.app.genders[profile.gender] || profile.gender) : '—';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1016] dark:text-slate-100">
      <AppNav />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{s.settingsTitle}</h1>

        {error ? (
          <p className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">{error}</p>
        ) : null}

        {/* Account */}
        <SectionTitle>{s.account}</SectionTitle>
        <Card>
          <ValueRow label={s.username} value={profile?.username || '—'} onClick={() => setModal('username')} />
          <ValueRow label={s.language} value={langLabel} onClick={() => setModal('language')} />
          <ValueRow label={s.gender} value={genderLabel} onClick={() => setModal('gender')} />
          <ValueRow label={s.email} value={profile?.email || '—'} onClick={() => setModal('email')} />
          <ValueRow label={s.changePin} value="" onClick={() => setModal('pin')} />
          <LocationRow title={s.yourLocation} value={profile?.locationName || s.notSet} onClick={() => setModal('location')} last />
        </Card>

        {/* Discovery */}
        <SectionTitle>{s.discovery}</SectionTitle>
        <Card>
          <ValueRow label={s.showMe} value={showLabel} onClick={cycleShow} />
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <span className="text-[15px]">{s.ageRange}</span>
            <div className="flex items-center gap-2">
              <NumInput value={ageMin} onChange={setAgeMin} onBlur={() => saveAge('ageMin', ageMin)} />
              <span className="text-slate-400">–</span>
              <NumInput value={ageMax} onChange={setAgeMax} onBlur={() => saveAge('ageMax', ageMax)} />
            </div>
          </div>
          <ToggleRow
            label={anywhere ? s.anywhere : s.nearby}
            sublabel={anywhere ? s.anywhereSub : s.nearbySub}
            value={anywhere}
            onChange={toggleAnywhere}
            last={anywhere}
          />
          {!anywhere && (
            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <span className="text-[15px]">{s.maxDistance}</span>
              <NumInput value={distance} onChange={setDistance} onBlur={saveDistance} />
            </div>
          )}
        </Card>

        {/* Privacy & security */}
        <SectionTitle>{s.privacySecurity}</SectionTitle>
        <Card>
          <RowLink href="/settings/blocked" label={s.blockedUsers} last />
        </Card>

        {/* Account actions */}
        <div className="mt-6" />
        <Card>
          <RowLink href="/delete" label={s.deleteAccount} danger last />
        </Card>

        <p className="mt-8 text-center text-sm text-slate-400 dark:text-slate-600">Qup Pulse</p>
      </main>

      {/* Modals */}
      {modal === 'username' && <UsernameModal current={profile?.username || ''} onClose={() => setModal(null)} onSaved={reload} />}
      {modal === 'email' && <EmailModal current={profile?.email || ''} onClose={() => setModal(null)} onSaved={reload} />}
      {modal === 'pin' && <PinModal onClose={() => setModal(null)} />}
      {modal === 'gender' && <GenderModal current={profile?.gender} onClose={() => setModal(null)} onSaved={reload} />}
      {modal === 'language' && <LanguageModal current={lang} setLang={setLang} onClose={() => setModal(null)} />}
      {modal === 'location' && <LocationModal onClose={() => setModal(null)} onSaved={reload} />}
    </div>
  );
}

/* ---------- rows / layout ---------- */

function Card({ children }) {
  return <div className="mb-4 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm dark:border-slate-800 dark:bg-[#131c26] dark:shadow-none">{children}</div>;
}
function SectionTitle({ children }) {
  return <p className="mb-2 mt-6 px-1 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{children}</p>;
}
function ValueRow({ label, value, onClick }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 text-left text-[15px] transition last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
      <span className="text-slate-900 dark:text-slate-100">{label}</span>
      <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        {value ? <span>{value}</span> : null}<span className="text-slate-400">›</span>
      </span>
    </button>
  );
}
function LocationRow({ title, value, onClick, last }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-[15px] transition hover:bg-slate-50 dark:hover:bg-slate-800/50 ${last ? '' : 'border-b border-slate-200 dark:border-slate-800'}`}>
      <span className="text-slate-900 dark:text-slate-100">{title}</span>
      <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <span className="max-w-[180px] truncate">{value}</span><span className="text-slate-400">›</span>
      </span>
    </button>
  );
}
function RowLink({ href, label, external, danger, last }) {
  const rowBase = 'flex items-center justify-between gap-3 px-5 py-4 text-[15px] border-b border-slate-200 last:border-0 dark:border-slate-800';
  const cls = `${rowBase} ${last ? 'border-0' : ''} transition hover:bg-slate-50 dark:hover:bg-slate-800/50`;
  const text = danger ? 'font-semibold text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100';
  const inner = (<><span className={text}>{label}</span><span className="text-slate-400">›</span></>);
  if (external) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>;
  return <Link href={href} className={cls}>{inner}</Link>;
}
function NumInput({ value, onChange, onBlur }) {
  return (
    <input value={value ?? ''} onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))} onBlur={onBlur} inputMode="numeric"
      className="w-16 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-center text-[15px] outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800" />
  );
}
function ToggleRow({ label, sublabel, value, onChange, last }) {
  return (
    <div className={`flex items-center justify-between gap-3 px-5 py-4 ${last ? '' : 'border-b border-slate-200 dark:border-slate-800'}`}>
      <div>
        <span className="text-[15px] text-slate-900 dark:text-slate-100">{label}</span>
        {sublabel ? <p className="text-xs text-slate-500 dark:text-slate-400">{sublabel}</p> : null}
      </div>
      <button type="button" role="switch" aria-checked={value} onClick={onChange}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${value ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${value ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

/* ---------- modals ---------- */

function ModalShell({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-slate-300 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#131c26] dark:shadow-none" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
        {children}
      </div>
    </div>
  );
}
function ModalButtons({ onClose, onSave, saving, saveLabel, disabled }) {
  const { t } = useLang();
  const c = t.app.common;
  return (
    <div className="mt-5 flex justify-end gap-3">
      <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300">{c.cancel}</button>
      <button onClick={onSave} disabled={saving || disabled} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:brightness-105 disabled:opacity-50">
        {saving ? c.saving : (saveLabel || c.save)}
      </button>
    </div>
  );
}
const input = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#0b1016]';

function UsernameModal({ current, onClose, onSaved }) {
  const { t } = useLang();
  const s = t.app.settings;
  const [v, setV] = useState(current);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  async function save() {
    const u = v.trim();
    if (u.length < 3 || u.length > 24) return setErr(s.err.usernameLength);
    if (u === current) return onClose();
    setSaving(true);
    try { await updateMyProfile({ username: u }); await onSaved(); onClose(); }
    catch (e) { setErr(e.message); } finally { setSaving(false); }
  }
  return (
    <ModalShell title={s.changeUsername} onClose={onClose}>
      <input className={input} value={v} onChange={(e) => setV(e.target.value)} autoCapitalize="none" autoFocus />
      {err ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{err}</p> : null}
      <ModalButtons onClose={onClose} onSave={save} saving={saving} disabled={v.trim().length < 3} />
    </ModalShell>
  );
}

function EmailModal({ current, onClose, onSaved }) {
  const { t } = useLang();
  const s = t.app.settings;
  const [email, setEmail] = useState(current);
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  async function save() {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return setErr(s.err.validEmail);
    if (!/^\d{4}$/.test(pin)) return setErr(s.err.confirmPin);
    if (e === current) return onClose();
    setSaving(true);
    try { await updateMyProfile({ email: e, pin }); await onSaved(); onClose(); }
    catch (er) { setErr(er.message); } finally { setSaving(false); }
  }
  return (
    <ModalShell title={s.changeEmail} onClose={onClose}>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{s.newEmail}</label>
      <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoCapitalize="none" autoFocus />
      <label className="mb-1 mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{s.confirmWithPin}</label>
      <input className={`${input} tracking-[0.4em]`} type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" />
      {err ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{err}</p> : null}
      <ModalButtons onClose={onClose} onSave={save} saving={saving} />
    </ModalShell>
  );
}

function PinModal({ onClose }) {
  const { t } = useLang();
  const s = t.app.settings;
  const c = t.app.common;
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  async function save() {
    if (!/^\d{4}$/.test(cur) || !/^\d{4}$/.test(next)) return setErr(s.err.bothPins4);
    if (cur === next) return setErr(s.err.pinDifferent);
    setSaving(true);
    try { await changePin(cur, next); setDone(true); }
    catch (e) { setErr(e.message); } finally { setSaving(false); }
  }
  return (
    <ModalShell title={s.changePin} onClose={onClose}>
      {done ? (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-300">{s.pinChanged}</p>
          <div className="mt-5 flex justify-end"><button onClick={onClose} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950">{c.done}</button></div>
        </>
      ) : (
        <>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{s.currentPin}</label>
          <input className={`${input} tracking-[0.4em]`} type="password" inputMode="numeric" maxLength={4} value={cur} onChange={(e) => setCur(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" autoFocus />
          <label className="mb-1 mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{s.newPin}</label>
          <input className={`${input} tracking-[0.4em]`} type="password" inputMode="numeric" maxLength={4} value={next} onChange={(e) => setNext(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" />
          {err ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{err}</p> : null}
          <ModalButtons onClose={onClose} onSave={save} saving={saving} saveLabel={s.changePin} />
        </>
      )}
    </ModalShell>
  );
}

function GenderModal({ current, onClose, onSaved }) {
  const { t } = useLang();
  const s = t.app.settings;
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  async function pick(g) {
    setSaving(true);
    try { await updateMyProfile({ gender: g }); await onSaved(); onClose(); }
    catch (e) { setErr(e.message); setSaving(false); }
  }
  return (
    <ModalShell title={s.gender} onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        {GENDER_KEYS.map((g) => (
          <button key={g} onClick={() => pick(g)} disabled={saving}
            className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${current === g ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-slate-300 hover:border-slate-400 dark:border-slate-700'}`}>
            {t.app.genders[g]}
          </button>
        ))}
      </div>
      {err ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{err}</p> : null}
    </ModalShell>
  );
}

function LanguageModal({ current, setLang, onClose }) {
  const { t } = useLang();
  return (
    <ModalShell title={t.app.settings.language} onClose={onClose}>
      <div className="max-h-[60vh] overflow-y-auto">
        {SUPPORTED_LANGS.map((code) => (
          <button key={code} onClick={() => { setLang(code); onClose(); }}
            className="flex w-full items-center justify-between border-b border-slate-200 px-1 py-3 text-left text-[15px] last:border-0 dark:border-slate-800">
            <span className={code === current ? 'font-semibold text-emerald-600 dark:text-emerald-400' : ''}>{LANGUAGES[code]}</span>
            {code === current ? <span className="text-emerald-500">✓</span> : null}
          </button>
        ))}
      </div>
    </ModalShell>
  );
}

function LocationModal({ onClose, onSaved }) {
  const { t } = useLang();
  const s = t.app.settings;
  const c = t.app.common;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function runSearch() {
    const q = query.trim();
    if (q.length < 2) return;
    setSearching(true); setErr(''); setSearched(false);
    try { setResults(await geocode(q)); setSearched(true); }
    catch (e) { setErr(e.message || s.err.searchFailed); }
    finally { setSearching(false); }
  }

  async function pick(place) {
    setBusy(true); setErr('');
    try {
      await setLocation({ lat: place.lat, lng: place.lng, name: place.name, mode: 'manual' });
      await onSaved(); onClose();
    } catch (e) { setErr(e.message || s.err.saveLocation); setBusy(false); }
  }

  function useCurrent() {
    setErr('');
    if (!('geolocation' in navigator)) return setErr(s.err.noGeolocation);
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, mode: 'gps' });
          await onSaved(); onClose();
        } catch (e) { setErr(e.message || s.err.setLocation); setBusy(false); }
      },
      () => { setBusy(false); setErr(s.err.getLocation); },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  return (
    <ModalShell title={s.yourLocation} onClose={onClose}>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{s.searchCityArea}</label>
      <div className="mb-2 flex gap-2">
        <input className={input} value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } }} placeholder={s.searchPlaceholder} autoFocus />
        <button type="button" onClick={runSearch} disabled={searching || query.trim().length < 2}
          className="shrink-0 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-emerald-950 transition hover:brightness-105 disabled:opacity-50">
          {searching ? '…' : c.search}
        </button>
      </div>

      <button type="button" onClick={useCurrent} disabled={busy}
        className="mb-3 text-sm font-medium text-emerald-600 hover:underline disabled:opacity-50 dark:text-emerald-400">
        {s.useCurrentLoc}
      </button>

      {results.length > 0 && (
        <ul className="mb-2 max-h-56 divide-y divide-slate-200 overflow-y-auto rounded-xl border border-slate-300 dark:divide-slate-800 dark:border-slate-800">
          {results.map((r, i) => (
            <li key={i}>
              <button type="button" onClick={() => pick(r)} disabled={busy}
                className="block w-full px-4 py-3 text-left text-sm hover:bg-slate-50 disabled:opacity-50 dark:hover:bg-slate-800/50">
                <span className="font-medium">{r.name}</span>
                {r.fullName && r.fullName !== r.name ? <span className="block text-xs text-slate-500 dark:text-slate-400">{r.fullName}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      {searched && results.length === 0 && !searching ? (
        <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">{s.noPlacesFound}</p>
      ) : null}

      {err ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{err}</p> : null}

      <div className="mt-4 flex justify-end">
        <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300">{c.close}</button>
      </div>
    </ModalShell>
  );
}