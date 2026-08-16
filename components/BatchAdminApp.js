"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import styles from "./BatchAdminApp.module.css";

const DAY_OPTIONS = [
  ["Mon", "Monday"],
  ["Tue", "Tuesday"],
  ["Wed", "Wednesday"],
  ["Thu", "Thursday"],
  ["Fri", "Friday"],
  ["Sat", "Saturday"]
];

const STATUS_OPTIONS = [
  ["available", "Available"],
  ["few_seats", "Few seats left"],
  ["full", "Full"],
  ["waitlist", "Waitlist"],
  ["hidden", "Hidden"]
];

const blank = () => ({
  id: null,
  course: "TEF",
  level: "",
  name: "",
  days: ["Mon", "Wed", "Fri"],
  start_time: "08:00",
  end_time: "09:30",
  start_date: "",
  end_date: "",
  total_seats: 4,
  seats_remaining: 4,
  status: "available"
});

function shortTime(value) {
  const [h, m] = String(value || "").split(":").map(Number);
  if (!Number.isFinite(h)) return "";
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m || 0).padStart(2, "0")} ${suffix}`;
}

function statusLabel(value) {
  return STATUS_OPTIONS.find(([key]) => key === value)?.[1] || value;
}

export default function BatchAdminApp() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [allowed, setAllowed] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [batches, setBatches] = useState([]);
  const [form, setForm] = useState(blank());
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const current = data?.session || null;
      setSession(current);
      if (current) {
        const ok = await verifyAdmin(current.access_token);
        setAllowed(ok);
        if (ok) await loadBatches(current.access_token);
      }
      setReady(true);
    })();
  }, [supabase]);

  async function verifyAdmin(token) {
    const res = await fetch("/api/admin/me", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      await supabase.auth.signOut();
      return false;
    }
    return true;
  }

  async function freshToken() {
    const { data } = await supabase.auth.getSession();
    if (!data?.session?.access_token) throw new Error("Please sign in again.");
    setSession(data.session);
    return data.session.access_token;
  }

  async function loadBatches(token) {
    const res = await fetch("/api/admin/batches", { headers: { Authorization: `Bearer ${token}` } });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Could not load batches.");
    setBatches(body.batches || []);
  }

  async function login(e) {
    e.preventDefault();
    setError("");
    setReady(false);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError || !data?.session) {
      setError("Email or password is incorrect.");
      setReady(true);
      return;
    }
    const ok = await verifyAdmin(data.session.access_token);
    setSession(data.session);
    setAllowed(ok);
    if (!ok) setError("This account is not approved as a TFH admin.");
    else await loadBatches(data.session.access_token);
    setReady(true);
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    setAllowed(false);
    setBatches([]);
  }

  function addNew() {
    setForm(blank());
    setEditing(true);
    setNote("");
  }

  function edit(batch) {
    setForm({
      id: batch.id,
      course: batch.course || "TEF",
      level: batch.level || "",
      name: batch.name || "",
      days: batch.days || [],
      start_time: String(batch.start_time || "08:00").slice(0, 5),
      end_time: String(batch.end_time || "09:30").slice(0, 5),
      start_date: batch.start_date || "",
      end_date: batch.end_date || "",
      total_seats: batch.total_seats ?? 4,
      seats_remaining: batch.seats_remaining ?? 4,
      status: batch.status || "available"
    });
    setEditing(true);
    setNote("");
  }

  function toggleDay(day) {
    setForm(current => ({
      ...current,
      days: current.days.includes(day) ? current.days.filter(item => item !== day) : [...current.days, day]
    }));
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setNote("");
    try {
      const token = await freshToken();
      const url = form.id ? `/api/admin/batches/${form.id}` : "/api/admin/batches";
      const res = await fetch(url, {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not save batch.");
      await loadBatches(token);
      setEditing(false);
      setNote(form.id ? "Batch updated." : "Batch created.");
    } catch (saveError) {
      setNote(saveError.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus(batch, status) {
    try {
      const token = await freshToken();
      const res = await fetch(`/api/admin/batches/${batch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Could not update status.");
      await loadBatches(token);
    } catch (statusError) {
      setNote(statusError.message || "Could not update status.");
    }
  }

  if (!ready) return <main className="admin-shell"><div className="wordmark">the français hub.</div><p className="admin-muted">Loading Batch Manager…</p></main>;

  if (!session || !allowed) return (
    <main className="admin-login-shell">
      <section className="admin-login-card">
        <div className="wordmark">the français hub.</div>
        <div className="eyebrow admin-login-kicker">Private administration</div>
        <h1>Batch Manager.</h1>
        <p>Control which TEF, TCF and DELF batches appear as available.</p>
        <form onSubmit={login} className="admin-login-form">
          <label>Email<input className="field" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
          <label>Password<input className="field" type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
          <button className="primary-btn">Sign in</button>
          {error && <div className="error">{error}</div>}
        </form>
        <a className="back" href="/admin">← Resource Studio</a>
      </section>
    </main>
  );

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <div><div className="wordmark">the français hub.</div><span>Batch Manager</span></div>
        <div className="admin-links"><a href="/admin">Resources</a><a href="/" target="_blank">View store ↗</a><button onClick={logout}>Sign out</button></div>
      </header>

      {editing ? (
        <section className="admin-editor">
          <div className="admin-editor-head">
            <div><div className="eyebrow">{form.id ? "Edit batch" : "New batch"}</div><h1>{form.id ? "Update availability." : "Open a new batch."}</h1></div>
            <button className="admin-link-btn" onClick={() => setEditing(false)}>Cancel</button>
          </div>

          <form onSubmit={save} className="admin-form">
            <div className="admin-form-grid">
              <label className="admin-field">Course<select className="field" value={form.course} onChange={e => setForm({ ...form, course: e.target.value })}><option>TEF</option><option>TCF</option><option>DELF</option></select></label>
              <label className="admin-field">Level<input className="field" value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} placeholder="e.g. B1, B2, CLB 7+" /></label>
              <label className="admin-field span2">Batch name *<input className="field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="TEF September Morning" required /></label>

              <div className="admin-field span2">
                <span>Class days *</span>
                <div className={styles.days}>
                  {DAY_OPTIONS.map(([key, label]) => <button type="button" key={key} className={form.days.includes(key) ? styles.dayActive : styles.day} onClick={() => toggleDay(key)}>{label.slice(0, 3)}</button>)}
                </div>
                <small>Sunday is intentionally unavailable.</small>
              </div>

              <label className="admin-field">Start time *<input className="field" type="time" min="08:00" max="17:59" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} required /></label>
              <label className="admin-field">End time *<input className="field" type="time" min="08:01" max="18:00" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} required /></label>
              <label className="admin-field">Start date<input className="field" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></label>
              <label className="admin-field">End date<input className="field" type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></label>
              <label className="admin-field">Total seats *<input className="field" type="number" min="1" value={form.total_seats} onChange={e => { const total = Number(e.target.value); setForm({ ...form, total_seats: total, seats_remaining: form.id ? Math.min(Number(form.seats_remaining), total) : total }); }} required /></label>
              <label className="admin-field">Seats remaining *<input className="field" type="number" min="0" max={form.total_seats} value={form.seats_remaining} onChange={e => setForm({ ...form, seats_remaining: Number(e.target.value) })} required /></label>
              <label className="admin-field span2">Public status<select className="field" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{STATUS_OPTIONS.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select><small>Hidden batches will not appear on the public website.</small></label>
            </div>

            <button className="primary-btn admin-save" disabled={saving}>{saving ? "Saving…" : form.id ? "Save changes" : "Create batch"}</button>
            {note && <div className="admin-note">{note}</div>}
          </form>
        </section>
      ) : (
        <>
          <section className="admin-heading">
            <div><div className="eyebrow">TFH Classes · IST</div><h1>Your batches.</h1><p>Monday–Saturday · 8:00 AM–6:00 PM · You control what students can see.</p></div>
            <button className="admin-add" onClick={addNew}>+ Add Batch</button>
          </section>
          {note && <div className="admin-note">{note}</div>}

          <section className={styles.list}>
            {batches.map(batch => (
              <article className={styles.row} key={batch.id}>
                <div className={styles.identity}><span className={styles.course}>{batch.course}</span><div><strong>{batch.name}</strong><small>{batch.level || "All applicable levels"}</small></div></div>
                <div className={styles.schedule}><strong>{(batch.days || []).join(" · ")}</strong><small>{shortTime(batch.start_time)}–{shortTime(batch.end_time)} IST</small></div>
                <div className={styles.seats}><strong>{batch.seats_remaining}/{batch.total_seats}</strong><small>seats left</small></div>
                <div className={styles.status}><select value={batch.status} onChange={e => quickStatus(batch, e.target.value)}>{STATUS_OPTIONS.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></div>
                <button className={styles.edit} onClick={() => edit(batch)}>Edit</button>
              </article>
            ))}
            {!batches.length && <div className="admin-empty">No batches yet. Click “+ Add Batch” to create the first one.</div>}
          </section>
        </>
      )}
    </main>
  );
}
