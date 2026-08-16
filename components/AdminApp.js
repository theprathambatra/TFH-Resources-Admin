"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

const categories = ["TEF", "TCF", "DELF", "Vocabulary", "Grammar", "General"];
const blank = () => ({ id:null, title:"", price:"", category:"TEF", skill:"", level:"", short_description:"", description:"", includes:"", active:true, current_cover:"" });
const money = p => new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:0 }).format((p || 0) / 100);

export default function AdminApp() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [ready,setReady] = useState(false);
  const [session,setSession] = useState(null);
  const [allowed,setAllowed] = useState(false);
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [error,setError] = useState("");
  const [products,setProducts] = useState([]);
  const [form,setForm] = useState(blank());
  const [editing,setEditing] = useState(false);
  const [cover,setCover] = useState(null);
  const [pdfs,setPdfs] = useState([]);
  const [saving,setSaving] = useState(false);
  const [note,setNote] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const s = data?.session || null;
      setSession(s);
      if (s) {
        const ok = await verifyAdmin(s.access_token);
        setAllowed(ok);
        if (ok) await loadProducts(s.access_token);
      }
      setReady(true);
    })();
  }, [supabase]);

  async function verifyAdmin(token) {
    const res = await fetch("/api/admin/me", { headers:{ Authorization:`Bearer ${token}` } });
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

  async function loadProducts(token) {
    const res = await fetch("/api/admin/products", { headers:{ Authorization:`Bearer ${token}` } });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Could not load resources.");
    setProducts(body.products || []);
  }

  async function login(e) {
    e.preventDefault(); setError(""); setReady(false);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email:email.trim(), password });
    if (authError || !data?.session) { setError("Email or password is incorrect."); setReady(true); return; }
    const ok = await verifyAdmin(data.session.access_token);
    setSession(data.session); setAllowed(ok);
    if (!ok) setError("This account is not approved as a TFH admin.");
    else await loadProducts(data.session.access_token);
    setReady(true);
  }

  async function logout() {
    await supabase.auth.signOut(); setSession(null); setAllowed(false); setProducts([]);
  }

  async function upload(file, kind, token) {
    const res = await fetch("/api/admin/upload-url", {
      method:"POST",
      headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
      body:JSON.stringify({ kind, fileName:file.name, contentType:file.type })
    });
    const prep = await res.json();
    if (!res.ok) throw new Error(prep.error || "Could not prepare upload.");
    const { error: uploadError } = await supabase.storage.from(prep.bucket).uploadToSignedUrl(prep.path, prep.token, file, { contentType:file.type || "application/octet-stream" });
    if (uploadError) throw uploadError;
    return { storage_path:prep.path, file_name:file.name, display_name:file.name };
  }

  function addNew() { setForm(blank()); setCover(null); setPdfs([]); setEditing(true); setNote(""); }
  function edit(p) {
    setForm({ id:p.id, title:p.title||"", price:String((p.price_paise||0)/100), category:p.category||"TEF", skill:p.skill||"", level:p.level||"", short_description:p.short_description||"", description:p.description||"", includes:Array.isArray(p.includes)?p.includes.join(", "):"", active:!!p.active, current_cover:p.cover_path||"" });
    setCover(null); setPdfs([]); setEditing(true); setNote("");
  }

  async function save(e) {
    e.preventDefault(); setSaving(true); setNote("");
    try {
      const price = Number(form.price);
      if (!form.title.trim() || !Number.isFinite(price) || price <= 0) throw new Error("Add a title and valid price.");
      if (!form.id && !cover) throw new Error("Add a cover image.");
      if (!form.id && pdfs.length === 0) throw new Error("Add at least one PDF.");
      const token = await freshToken();
      const coverUpload = cover ? await upload(cover, "cover", token) : null;
      const files = [];
      for (const file of Array.from(pdfs)) files.push(await upload(file, "pdf", token));
      const payload = {
        title:form.title.trim(), price_paise:Math.round(price*100), category:form.category, skill:form.skill.trim(), level:form.level.trim(), short_description:form.short_description.trim(), description:form.description.trim(), includes:form.includes.split(",").map(x=>x.trim()).filter(Boolean), active:form.active, cover_upload:coverUpload, files
      };
      const url = form.id ? `/api/admin/products/${form.id}` : "/api/admin/products";
      const res = await fetch(url, { method:form.id?"PATCH":"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` }, body:JSON.stringify(payload) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not save resource.");
      await loadProducts(token); setEditing(false); setNote(form.id ? "Resource updated." : "Resource published.");
    } catch (e2) { setNote(e2.message || "Something went wrong."); }
    finally { setSaving(false); }
  }

  async function toggle(p) {
    const token = await freshToken();
    const res = await fetch(`/api/admin/products/${p.id}`, { method:"PATCH", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` }, body:JSON.stringify({ active:!p.active }) });
    if (res.ok) await loadProducts(token);
  }

  if (!ready) return <main className="admin-shell"><div className="wordmark">the français hub.</div><p className="admin-muted">Loading Resource Studio…</p></main>;

  if (!session || !allowed) return (
    <main className="admin-login-shell">
      <section className="admin-login-card">
        <div className="wordmark">the français hub.</div>
        <div className="eyebrow admin-login-kicker">Private administration</div>
        <h1>Resource Studio.</h1>
        <p>Add, price and publish TFH resources without touching GitHub or Supabase.</p>
        <form onSubmit={login} className="admin-login-form">
          <label>Email<input className="field" type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
          <label>Password<input className="field" type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></label>
          <button className="primary-btn">Sign in</button>
          {error && <div className="error">{error}</div>}
        </form>
        <a className="back" href="/">← Back to Resources</a>
      </section>
    </main>
  );

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <div><div className="wordmark">the français hub.</div><span>Resource Studio</span></div>
        <div className="admin-links"><a href="/admin/batches">Manage Batches</a><a href="/" target="_blank">View store ↗</a><button onClick={logout}>Sign out</button></div>
      </header>

      {editing ? (
        <section className="admin-editor">
          <div className="admin-editor-head"><div><div className="eyebrow">{form.id?"Edit resource":"New resource"}</div><h1>{form.id?"Make a change.":"Publish something new."}</h1></div><button className="admin-link-btn" onClick={()=>setEditing(false)}>Cancel</button></div>
          <form onSubmit={save} className="admin-form">
            <div className="admin-form-grid">
              <label className="admin-field span2">Title *<input className="field" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="TEF Writing Framework" /></label>
              <label className="admin-field">Price in ₹ *<input className="field" type="number" min="1" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} placeholder="499" /></label>
              <label className="admin-field">Category<select className="field" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
              <label className="admin-field">Skill<input className="field" value={form.skill} onChange={e=>setForm({...form,skill:e.target.value})} placeholder="Writing" /></label>
              <label className="admin-field">Level<input className="field" value={form.level} onChange={e=>setForm({...form,level:e.target.value})} placeholder="B2+" /></label>
              <label className="admin-field span2">Short description<input className="field" value={form.short_description} onChange={e=>setForm({...form,short_description:e.target.value})} /></label>
              <label className="admin-field span2">Full description<textarea className="field admin-textarea" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} /></label>
              <label className="admin-field span2">What’s inside<input className="field" value={form.includes} onChange={e=>setForm({...form,includes:e.target.value})} placeholder="42-page PDF, Frameworks, Practice prompts" /><small>Separate items with commas.</small></label>
              <label className="admin-field">Cover image {form.id?"(optional replacement)":"*"}<input className="field" type="file" accept="image/*" onChange={e=>setCover(e.target.files?.[0]||null)} /></label>
              <label className="admin-field">PDF {form.id?"(optional addition)":"*"}<input className="field" type="file" accept="application/pdf,.pdf" multiple onChange={e=>setPdfs(e.target.files||[])} /><small>You can select several PDFs for a bundle.</small></label>
            </div>
            <label className="admin-check"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})} /> Publish on the public Resources website</label>
            <button className="primary-btn admin-save" disabled={saving}>{saving?"Saving…":form.id?"Save changes":"Publish resource"}</button>
            {note && <div className="admin-note">{note}</div>}
          </form>
        </section>
      ) : (
        <>
          <section className="admin-heading"><div><div className="eyebrow">TFH Resources</div><h1>Your catalogue.</h1><p>Add a PDF, choose the price and publish it yourself.</p></div><button className="admin-add" onClick={addNew}>+ Add Resource</button></section>
          {note && <div className="admin-note">{note}</div>}
          <section className="admin-products">
            {products.map(p=><div className="admin-row" key={p.id}><div className="admin-main">{p.cover_path?<img src={p.cover_path} alt=""/>:<span className="admin-thumb"/>}<div><strong>{p.title}</strong><small>{[p.category,p.skill,p.level].filter(Boolean).join(" · ")}</small></div></div><div>{money(p.price_paise)}</div><div className={p.active?"live":"draft"}>{p.active?"Live":"Unpublished"}</div><div className="admin-actions"><button onClick={()=>edit(p)}>Edit</button><button onClick={()=>toggle(p)}>{p.active?"Unpublish":"Publish"}</button></div></div>)}
            {!products.length && <div className="admin-empty">No resources yet.</div>}
          </section>
        </>
      )}
    </main>
  );
}
