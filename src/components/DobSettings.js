// qup-pulse-admin/src/components/DobSettings.jsx
"use client";

// Date-of-birth section for the settings page. Self-contained: owns its own
// state, save call and error handling, so it drops into an existing settings
// page without restructuring the form around it.
//
//   <DobSettings profile={profile} onSaved={reload} />
//
// The 18+ floor is enforced server-side. The `max` on the input and the check
// in save() are convenience — they stop the obvious mistake before a round
// trip, and neither is the gate.

import { useState } from "react";
import { useLang } from "../context/LandingLang";
import { updateMyProfile } from "../lib/profileSettingsApi";

const MIN_AGE = 18;

// <input type="date"> requires exactly YYYY-MM-DD. A full ISO timestamp renders
// the field blank, which reads as "no birthday set" on an account that has one.
function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

// Calendar arithmetic, not millisecond division — the same reason
// server/src/lib/dob.js computes it this way. Dividing by 365.25 days drifts
// enough to read as 18 shortly before the eighteenth birthday.
function exactAge(value) {
  if (!value) return null;
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return null;

  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();

  const monthDiff = now.getUTCMonth() - birth.getUTCMonth();
  const dayDiff = now.getUTCDate() - birth.getUTCDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;

  return age;
}

// Latest date that is still 18 years ago today.
function maxDobValue() {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear() - MIN_AGE,
      now.getUTCMonth(),
      now.getUTCDate(),
    ),
  )
    .toISOString()
    .slice(0, 10);
}

export default function DobSettings({ profile, onSaved }) {
  const { t } = useLang();
  const s = t.app.settings || {};
  const c = t.app.common || {};

  const initial = toDateInputValue(profile?.dob);
  const [dob, setDob] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);

  const age = exactAge(dob);
  const dirty = dob !== initial;
  const underage = age !== null && age < MIN_AGE;

  async function save() {
    setErr("");
    setSaved(false);

    if (!dob) {
      setErr(s.dobRequired || "Date of birth is required.");
      return;
    }
    if (age === null) {
      setErr(s.dobInvalid || "That date is not valid.");
      return;
    }
    if (new Date(dob).getTime() > Date.now()) {
      setErr(s.dobInFuture || "Date of birth cannot be in the future.");
      return;
    }
    if (underage) {
      setErr(s.dobUnderAge || "You must be at least 18 to use this app.");
      return;
    }

    setSaving(true);
    try {
      await updateMyProfile({ dob });
      setSaved(true);
      if (onSaved) await onSaved();
    } catch (e) {
      // The API currently returns a plain sentence from ApiError.badRequest.
      // Once updateProfile switches to lib/dob.js it will return a key instead,
      // so try the lookup first and fall back to the raw message.
      const message = e?.message || "";
      setErr(s[message] || message || c.saveFailed || "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#131c26] dark:shadow-none">
      <label
        htmlFor="dob"
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
      >
        {s.dateOfBirth || "Date of birth"}
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <input
          id="dob"
          type="date"
          value={dob}
          max={maxDobValue()}
          onChange={(e) => {
            setDob(e.target.value);
            setErr("");
            setSaved(false);
          }}
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#0b1016] dark:[color-scheme:dark]"
        />

        {age !== null ? (
          <span
            className={
              "text-sm " +
              (underage
                ? "font-semibold text-red-600 dark:text-red-400"
                : "text-slate-500 dark:text-slate-400")
            }
          >
            {age} {t.app.profile?.age || "years"}
          </span>
        ) : null}

        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty || underage}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:brightness-105 disabled:opacity-50"
        >
          {saving ? c.saving || "Saving…" : c.save || "Save"}
        </button>
      </div>

      <p className="mt-2 text-xs text-slate-400 dark:text-slate-600">
        {s.dobChangeHint ||
          "Date of birth can only be changed a limited number of times."}
      </p>

      {err ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{err}</p>
      ) : null}
      {saved && !err ? (
        <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
          {c.saved || "Saved."}
        </p>
      ) : null}
    </div>
  );
}
