// qup-pulse-admin/src/app/register/page.js
'use client';

// Qup Pulse web sign-up — 4 steps, mirroring the app's onboarding.
// Fully localized via useLang() (t.auth.* / t.consent.*).

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLang } from '../../context/LandingLang';
import {
  registerAccount, patchProfile, geocode, setLocation, uploadImage,
} from '../../lib/registerApi';

const GENDER_KEYS = ['female', 'male', 'nonbinary', 'other'];

function ageFromDob(dob) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLang();
  const a = t.auth;
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);

  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [place, setPlace] = useState(null);
  const [searching, setSearching] = useState(false);

  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [bio, setBio] = useState('');
  const fileRef = useRef(null);

  function next() { setError(''); setStep((s) => s + 1); }
  function back() { setError(''); setStep((s) => Math.max(1, s - 1)); }

  async function submitStep1(e) {
    e.preventDefault();
    setError('');
    if (username.trim().length < 3 || username.trim().length > 24) return setError(a.err.usernameLen);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError(a.err.validEmail);
    if (!/^\d{4}$/.test(pin)) return setError(a.err.pin4);
    if (pin !== pin2) return setError(a.err.pinMismatch);
    if (!acceptTerms) return setError(a.err.acceptTerms);
    if (!consentPrivacy) return setError(a.err.consentPrivacy);

    setBusy(true);
    try {
      await registerAccount({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        pin,
        language: 'en',
      });
      next();
    } catch (err) {
      setError(err.message || a.err.createAccount);
    } finally {
      setBusy(false);
    }
  }

  async function submitStep2(e) {
    e.preventDefault();
    setError('');
    if (!gender) return setError(a.err.selectGender);
    if (!dob) return setError(a.err.enterDob);
    const age = ageFromDob(dob);
    if (age === null || Number.isNaN(age)) return setError(a.err.validDob);
    if (age < 18) return setError(a.err.under18);

    setBusy(true);
    try {
      await patchProfile({ gender, dob });
      next();
    } catch (err) {
      setError(err.message || a.err.saveDetails);
    } finally {
      setBusy(false);
    }
  }

  async function runSearch() {
    const q = query.trim();
    if (q.length < 2) return;
    setSearching(true);
    setError('');
    setSearched(false);
    try {
      const r = await geocode(q);
      setResults(r);
      setSearched(true);
    } catch (err) {
      setError(err.message || a.err.searchUnavail);
    } finally {
      setSearching(false);
    }
  }

  function useCurrentLocation() {
    setError('');
    if (!('geolocation' in navigator)) return setError(a.err.noGeo);
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const r = await setLocation({ lat: latitude, lng: longitude, mode: 'gps' });
          setPlace({ name: r.locationName || a.useCurrentLoc, lat: latitude, lng: longitude });
        } catch (err) {
          setError(err.message || a.err.setLoc);
        } finally {
          setBusy(false);
        }
      },
      () => { setBusy(false); setError(a.err.getLoc); },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  async function submitStep3(e) {
    e.preventDefault();
    setError('');
    if (!place) return setError(a.err.chooseCity);
    setBusy(true);
    try {
      await setLocation({ lat: place.lat, lng: place.lng, name: place.name, mode: 'manual' });
      next();
    } catch (err) {
      setError(err.message || a.err.saveLoc);
    } finally {
      setBusy(false);
    }
  }

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setPhotoPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const uploaded = await uploadImage(file);
      setPhoto(uploaded);
    } catch (err) {
      setError(err.message || a.err.uploadFailed);
      setPhoto(null);
    } finally {
      setBusy(false);
    }
  }

  async function submitStep4(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const fields = {};
      if (bio.trim()) fields.bio = bio.trim().slice(0, 300);
      if (photo) fields.photos = [photo];
      if (Object.keys(fields).length) await patchProfile(fields);
      router.replace('/discover');
    } catch (err) {
      setError(err.message || a.err.finishProfile);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1016] dark:text-slate-100">
      <nav className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight no-underline text-slate-900 dark:text-white">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Qup Pulse
          </Link>
          <span className="text-sm text-slate-500 dark:text-slate-400">{a.stepOf.replace('{n}', step)}</span>
        </div>
      </nav>

      <main className="mx-auto max-w-xl px-6 py-10">
        <Progress step={step} />

        {error ? (
          <p className="mb-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {step === 1 && (
          <Card title={a.s1Title} subtitle={a.s1Sub}>
            <form onSubmit={submitStep1} noValidate>
              <Label>{a.username}</Label>
              <Input value={username} onChange={setUsername} placeholder={a.usernamePh} autoCapitalize="none" />
              <Label>{a.email}</Label>
              <Input value={email} onChange={setEmail} type="email" placeholder={a.emailPh} autoCapitalize="none" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{a.pin4}</Label>
                  <Pin value={pin} onChange={setPin} />
                </div>
                <div>
                  <Label>{a.confirmPin}</Label>
                  <Pin value={pin2} onChange={setPin2} />
                </div>
              </div>
              <Check checked={acceptTerms} onChange={setAcceptTerms}>
                {t.consent.termsPre} <A href="/terms">{t.consent.termsLink}</A> {t.consent.termsPost}
              </Check>
              <Check checked={consentPrivacy} onChange={setConsentPrivacy}>
                {t.consent.privacyPre} <A href="/privacy">{t.consent.privacyLink}</A>{t.consent.privacyPost === '.' ? '.' : ` ${t.consent.privacyPost}`}
              </Check>
              <Primary busy={busy} busyLabel={a.pleaseWait}>{a.next}</Primary>
            </form>
          </Card>
        )}

        {step === 2 && (
          <Card title={a.s2Title} subtitle={a.s2Sub}>
            <form onSubmit={submitStep2} noValidate>
              <Label>{a.gender}</Label>
              <div className="mb-4 grid grid-cols-2 gap-2">
                {GENDER_KEYS.map((g) => (
                  <button
                    type="button"
                    key={g}
                    onClick={() => setGender(g)}
                    className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                      gender === g
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-600'
                    }`}
                  >
                    {a.genders[g]}
                  </button>
                ))}
              </div>
              <Label>{a.dob}</Label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="mb-5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#131c26]"
              />
              <Row onBack={back} busy={busy} cta={a.continue} backLabel={a.back} busyLabel={a.pleaseWait} />
            </form>
          </Card>
        )}

        {step === 3 && (
          <Card title={a.s3Title} subtitle={a.s3Sub}>
            <form onSubmit={submitStep3} noValidate>
              <Label>{a.searchCityArea}</Label>
              <div className="mb-2 flex gap-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } }}
                  placeholder={a.searchPh}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#131c26]"
                />
                <button
                  type="button"
                  onClick={runSearch}
                  disabled={searching || query.trim().length < 2}
                  className="whitespace-nowrap rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-emerald-950 transition hover:brightness-105 disabled:opacity-50"
                >
                  {searching ? '…' : a.search}
                </button>
              </div>

              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={busy}
                className="mb-4 text-sm font-medium text-emerald-600 hover:underline disabled:opacity-50 dark:text-emerald-400"
              >
                {a.useCurrentLoc}
              </button>

              {results.length > 0 && (
                <ul className="mb-4 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  {results.map((r, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => { setPlace({ name: r.name, lat: r.lat, lng: r.lng }); setResults([]); setQuery(r.name); }}
                        className="block w-full px-4 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <span className="font-medium">{r.name}</span>
                        {r.fullName && r.fullName !== r.name ? (
                          <span className="block text-xs text-slate-500 dark:text-slate-400">{r.fullName}</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {searched && results.length === 0 && !searching ? (
                <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                  {a.noPlaces}
                </p>
              ) : null}

              {place && (
                <p className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm">
                  {a.selected} <span className="font-semibold">{place.name}</span>
                </p>
              )}

              <Row onBack={back} busy={busy} cta={a.continue} disabled={!place} backLabel={a.back} busyLabel={a.pleaseWait} />
            </form>
          </Card>
        )}

        {step === 4 && (
          <Card title={a.s4Title} subtitle={a.s4Sub}>
            <form onSubmit={submitStep4} noValidate>
              <Label>{a.profilePhoto}</Label>
              <div className="mb-4 flex items-center gap-4">
                <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800">
                  {photoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoPreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs">{a.noPhoto}</span>
                  )}
                </div>
                <div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={busy}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    {photo ? a.changePhoto : a.uploadPhoto}
                  </button>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{a.optional}</p>
                </div>
              </div>

              <Label>{a.bio}</Label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 300))}
                rows={4}
                placeholder={a.bioPh}
                className="mb-1 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#131c26]"
              />
              <p className="mb-5 text-right text-xs text-slate-400">{bio.length}/300</p>

              <Row onBack={back} busy={busy} cta={a.finish} backLabel={a.back} busyLabel={a.pleaseWait} />
            </form>
          </Card>
        )}

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {a.alreadyHave} <A href="/">{a.signIn}</A>
        </p>
      </main>
    </div>
  );
}

/* ---------- small presentational helpers ---------- */

function Progress({ step }) {
  return (
    <div className="mb-6 flex gap-2">
      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          className={`h-1.5 flex-1 rounded-full transition ${
            n <= step ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
          }`}
        />
      ))}
    </div>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#131c26]">
      <h1 className="mb-1 text-xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
      {subtitle ? <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      {children}
    </div>
  );
}

function Label({ children }) {
  return <label className="mb-1.5 mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{children}</label>;
}

function Input({ value, onChange, type = 'text', placeholder, autoCapitalize }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoCapitalize={autoCapitalize}
      className="mb-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-[#131c26]"
    />
  );
}

function Pin({ value, onChange }) {
  return (
    <input
      type="password"
      inputMode="numeric"
      maxLength={4}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
      placeholder="••••"
      className="mb-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] tracking-[0.4em] outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-[#131c26]"
    />
  );
}

function Check({ checked, onChange, children }) {
  return (
    <label className="mb-3 flex cursor-pointer items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500"
      />
      <span>{children}</span>
    </label>
  );
}

function A({ href, children }) {
  return <Link href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-600 no-underline hover:underline dark:text-emerald-400">{children}</Link>;
}

function Primary({ busy, busyLabel, children }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="mt-4 w-full rounded-xl bg-emerald-500 px-5 py-3 text-[15px] font-semibold text-emerald-950 transition hover:brightness-105 disabled:opacity-50"
    >
      {busy ? busyLabel : children}
    </button>
  );
}

function Row({ onBack, busy, cta, disabled, backLabel, busyLabel }) {
  return (
    <div className="mt-2 flex gap-3">
      <button
        type="button"
        onClick={onBack}
        disabled={busy}
        className="rounded-xl border border-slate-300 px-5 py-3 text-[15px] font-medium transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        {backLabel}
      </button>
      <button
        type="submit"
        disabled={busy || disabled}
        className="flex-1 rounded-xl bg-emerald-500 px-5 py-3 text-[15px] font-semibold text-emerald-950 transition hover:brightness-105 disabled:opacity-50"
      >
        {busy ? busyLabel : cta}
      </button>
    </div>
  );
}