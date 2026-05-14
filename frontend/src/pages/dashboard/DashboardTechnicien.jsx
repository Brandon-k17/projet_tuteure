// ─── src/dashboard/DashboardTechnicien.jsx ────────────────────────────────────
import { useState, useEffect, useCallback } from "react";

const API_BASE = "http://localhost:8000/api/v1";

async function apiFetch(path, opts = {}) {
  const tok = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
  const isFormData = opts.body instanceof FormData;
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${tok}`,
      ...(!isFormData && { "Content-Type": "application/json" }),
      ...opts.headers,
    },
  });
  if (res.status === 401) { window.location.href = "/login"; return null; }
  if (res.status === 204) return null;

  // Lire le corps même en cas d'erreur pour extraire le message
  let json = null;
  try { json = await res.json(); } catch { /* réponse non-JSON */ }

  if (!res.ok) {
    // Construire un message d'erreur lisible depuis la réponse Django
    const detail =
      json?.detail ||
      json?.message ||
      json?.error ||
      (json && typeof json === "object"
        ? Object.entries(json)
            .map(([k, v]) => `${k} : ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" | ")
        : null) ||
      `Erreur ${res.status}`;
    throw new Error(detail);
  }
  return json?.data ?? json;
}

// ── CONSTANTES ────────────────────────────────────────────────────────────────
const C = {
  green:"#1B5E37", greenMid:"#2D7A4F", greenLight:"#EAF4EE",
  red:"#C0182A",   redLight:"#FDF0F1",
  white:"#FFFFFF", bg:"#F4F6F5",
  sidebar:"#1a3a2a", sideHover:"#243d2e", sideActive:"#2D7A4F",
  border:"#E2E8E5", text:"#1A2820", textMid:"#4A6358", textLight:"#8EA99A",
  amber:"#D97706", amberLight:"#FFFBEB",
  blue:"#1D4ED8",  blueLight:"#EFF6FF",
  orange:"#EA580C",orangeLight:"#FFF7ED",
  purple:"#7C3AED",purpleLight:"#F5F3FF",
};

const fmtDate = d => d
  ? new Date(d).toLocaleDateString("fr-FR", {day:"2-digit",month:"short",year:"numeric"})
  : "—";
const fmtDateTime = d => d
  ? new Date(d).toLocaleDateString("fr-FR", {day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})
  : "—";

const SEVERITY_CFG = {
  CRITIQUE: {label:"Critique", color:C.red,    bg:C.redLight,    icon:"🔴"},
  HAUTE:    {label:"Haute",    color:C.orange, bg:C.orangeLight, icon:"🟠"},
  MOYENNE:  {label:"Moyenne",  color:C.amber,  bg:C.amberLight,  icon:"🟡"},
  BASSE:    {label:"Faible",   color:C.green,  bg:C.greenLight,  icon:"🟢"},
};
const STATUS_CFG = {
  SIGNALE:       {label:"Signalé",       color:C.textLight, bg:C.bg        },
  EN_DIAGNOSTIC: {label:"Assigné",       color:C.blue,      bg:C.blueLight },
  EN_REPARATION: {label:"En cours",      color:C.amber,     bg:C.amberLight},
  REPARE:        {label:"Résolu ✓",      color:C.green,     bg:C.greenLight},
  NON_REPARABLE: {label:"Non réparable", color:C.red,       bg:C.redLight  },
};
const MAINT_STATUS_CFG = {
  PLANIFIE: {label:"Planifié",   color:C.blue,  bg:C.blueLight },
  EN_COURS: {label:"En cours",   color:C.amber, bg:C.amberLight},
  TERMINE:  {label:"Terminé ✓", color:C.green, bg:C.greenLight},
  ANNULE:   {label:"Annulé",     color:C.red,   bg:C.redLight  },
};
const NAV = [
  {id:"dashboard",    label:"Tableau de bord",  icon:"📊"},
  {id:"tickets",      label:"Tickets Assignés",  icon:"🔧"},
  {id:"maintenance",  label:"Mes Interventions", icon:"📅"},
  {id:"notifications",label:"Notifications",     icon:"🔔"},
];

const CSS = `
  @keyframes spin   { to { transform:rotate(360deg); } }
  @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
  .nav-btn:hover    { background:${C.sideHover} !important; color:#fff !important; }
  .logout-btn:hover { background:rgba(192,24,42,0.4) !important; }
  .card-hover       { transition:box-shadow .18s,transform .18s; }
  .card-hover:hover { box-shadow:0 6px 20px rgba(0,0,0,.10) !important; transform:translateY(-2px); }
  * { box-sizing:border-box; margin:0; padding:0; }
  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-thumb { background:#D4DDD9; border-radius:99px; }
  input[type=date],input[type=number],input[type=text],textarea,select {
    color:${C.text} !important; background:#fff !important;
  }
  input[type=date]::-webkit-calendar-picker-indicator {
    filter:invert(25%) sepia(40%) saturate(400%) hue-rotate(120deg); cursor:pointer;
  }
`;

// ── TOAST ─────────────────────────────────────────────────────────────────────
function Toast({msg, type, onDone}) {
  useEffect(() => { if (msg) { const t=setTimeout(onDone,4000); return ()=>clearTimeout(t); } }, [msg]);
  if (!msg) return null;
  return (
    <div style={{
      position:"fixed",bottom:24,right:24,zIndex:9999,
      background:type==="error"?C.red:C.green,
      color:"#fff",borderRadius:10,padding:"12px 18px",
      fontSize:13,fontWeight:600,display:"flex",alignItems:"flex-start",gap:10,
      boxShadow:"0 4px 20px rgba(0,0,0,.25)",maxWidth:460,lineHeight:1.4,
    }}>
      <span style={{flexShrink:0,marginTop:1}}>{type==="error"?"✕":"✓"}</span>
      <span>{msg}</span>
    </div>
  );
}

// ── MODAL CHAMPS ──────────────────────────────────────────────────────────────
const INP = {
  padding:"9px 12px",border:`1.5px solid #E2E8E5`,borderRadius:8,
  fontSize:13,fontFamily:"inherit",color:"#1A2820",background:"#fff",
  width:"100%",outline:"none",transition:"border-color .15s",
};
const LBL = {
  fontSize:10,fontWeight:700,color:"#4A6358",textTransform:"uppercase",
  letterSpacing:"1px",marginBottom:5,display:"block",
};

// ── MODAL CLÔTURE TICKET ──────────────────────────────────────────────────────
function ModalClotureTicket({ticket, onClose, onSuccess, showToast}) {
  const [form,setForm]   = useState({repair_actions:"",parts_used:"",repair_cost:"",diagnosis:""});
  const [saving,setSaving]= useState(false);
  const [apiErr,setApiErr]= useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleClose = async () => {
    if (!form.repair_actions.trim()) { showToast("Décrivez les actions effectuées","error"); return; }
    setSaving(true);
    setApiErr("");
    try {
      // Tentative sur l'endpoint principal
      await apiFetch(`/maintenance/breakdowns/${ticket.id}/intervenir/`, {
        method:"POST",
        body:JSON.stringify({action:"CLOSE", ...form}),
      });
      showToast("Intervention clôturée ✓");
      onSuccess();
    } catch(e) {
      // Tentative fallback avec PATCH direct sur le statut
      try {
        await apiFetch(`/maintenance/breakdowns/${ticket.id}/`, {
          method:"PATCH",
          body:JSON.stringify({
            status:"REPARE",
            repair_actions:form.repair_actions,
            parts_used:form.parts_used||null,
            repair_cost:form.repair_cost||null,
            diagnosis:form.diagnosis||null,
          }),
        });
        showToast("Intervention clôturée ✓");
        onSuccess();
      } catch(e2) {
        const msg = e2.message.includes("500")
          ? "Erreur serveur (500) lors de la clôture. Vérifiez que tous les champs requis côté backend sont bien renseignés. Détail : "+e2.message
          : e2.message;
        setApiErr(msg);
        showToast(msg,"error");
      }
    } finally { setSaving(false); }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
      <div style={{background:C.white,borderRadius:16,padding:28,width:560,maxWidth:"95vw",maxHeight:"92vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:C.text}}>Clôturer l'intervention</div>
            <div style={{fontSize:12,color:C.textLight,marginTop:2}}>{ticket.title} — {ticket.vehicle_name}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:C.textLight}}>✕</button>
        </div>

        {/* Erreur API visible */}
        {apiErr && (
          <div style={{background:C.redLight,border:`1px solid ${C.red}30`,borderRadius:9,padding:"12px 14px",marginBottom:16,fontSize:12,color:C.red,lineHeight:1.6}}>
            <b>⚠️ Erreur :</b> {apiErr}
            <div style={{marginTop:6,fontSize:11,color:C.textMid}}>
              💡 Si le problème persiste, vérifiez côté backend que l'endpoint <code>/maintenance/breakdowns/{"{id}"}/intervenir/</code> accepte la clôture et que tous les champs obligatoires sont présents.
            </div>
          </div>
        )}

        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <label style={LBL}>Diagnostic final</label>
            <textarea style={{...INP,height:70,resize:"vertical"}} value={form.diagnosis}
              onChange={e=>set("diagnosis",e.target.value)} placeholder="Cause racine identifiée…"/>
          </div>
          <div>
            <label style={LBL}>Actions effectuées <span style={{color:C.red}}>*</span></label>
            <textarea style={{...INP,height:90,resize:"vertical"}} value={form.repair_actions}
              onChange={e=>set("repair_actions",e.target.value)} placeholder="Décrivez les réparations effectuées en détail…"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <label style={LBL}>Pièces utilisées</label>
              <input style={INP} value={form.parts_used} onChange={e=>set("parts_used",e.target.value)} placeholder="Courroie, filtre huile…"/>
            </div>
            <div>
              <label style={LBL}>Coût de réparation (FCFA)</label>
              <input style={INP} type="number" value={form.repair_cost} onChange={e=>set("repair_cost",e.target.value)} placeholder="0"/>
            </div>
          </div>
        </div>

        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:24,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
          <button onClick={onClose} style={{padding:"10px 20px",background:"transparent",color:C.textMid,border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Annuler</button>
          <button onClick={handleClose} disabled={saving}
            style={{padding:"10px 24px",background:C.green,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:saving?.7:1,display:"flex",alignItems:"center",gap:6}}>
            {saving?<><span style={{animation:"spin .8s linear infinite",display:"inline-block"}}>⟳</span>Clôture en cours…</>:"✓ Clôturer l'intervention"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MODAL CLÔTURE MAINTENANCE ─────────────────────────────────────────────────
function ModalClotureMaint({ maint, onClose, onSuccess, showToast }) {
  const [form, setForm] = useState({
    work_performed: "",
    parts_replaced: "",
    labor_cost:     "",
    parts_cost:     "",
    notes:          "",
    done_date:      new Date().toISOString().split("T")[0],
    done_km:        maint.vehicle_km ? String(maint.vehicle_km) : "",
  });
  const [saving,  setSaving]  = useState(false);
  const [apiErr,  setApiErr]  = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
 
  // Calcul en temps réel du coût total
  const labor = Number(form.labor_cost || 0);
  const parts = Number(form.parts_cost || 0);
  const total = labor + parts;
 
  const handleClose = async () => {
    if (!form.work_performed.trim()) {
      showToast("Décrivez les travaux effectués", "error"); return;
    }
    setSaving(true);
    setApiErr("");
 
    const body = {
      work_performed: form.work_performed,
      parts_replaced: form.parts_replaced || null,
      labor_cost:     form.labor_cost      || 0,
      parts_cost:     form.parts_cost      || 0,
      notes:          form.notes           || null,
      done_date:      form.done_date       || null,   // backend mappe → end_date
      done_km:        form.done_km         || null,   // backend mappe → mileage_at_maintenance
    };
 
    // Essaie /complete/ d'abord, puis fallbacks
    const endpoints = [
      { url:`/maintenance/maintenance/${maint.id}/complete/`, method:"POST",  body },
      { url:`/maintenance/maintenance/${maint.id}/done/`,     method:"POST",  body },
      { url:`/maintenance/maintenance/${maint.id}/`,          method:"PATCH",
        body:{ status:"TERMINE", ...body,
               end_date: body.done_date,
               mileage_at_maintenance: body.done_km } },
    ];
 
    let lastErr = null;
    for (const ep of endpoints) {
      try {
        await apiFetch(ep.url, { method: ep.method, body: JSON.stringify(ep.body) });
        showToast("Maintenance clôturée ✓");
        onSuccess();
        setSaving(false);
        return;
      } catch (e) {
        lastErr = e;
        if (!e.message.includes("500") && !e.message.includes("404")) break;
      }
    }
    const msg = lastErr?.message || "Erreur inconnue";
    setApiErr(msg);
    showToast("Échec de la clôture", "error");
    setSaving(false);
  };
 
  const INP_S = { padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:8,
    fontSize:13, fontFamily:"inherit", color:C.text, background:"#fff",
    width:"100%", outline:"none", boxSizing:"border-box" };
 
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", backdropFilter:"blur(4px)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:C.white, borderRadius:16, padding:28, width:600,
        maxWidth:"95vw", maxHeight:"92vh", overflowY:"auto",
        boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
 
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:C.text }}>Clôturer la maintenance</div>
            <div style={{ fontSize:12, color:C.textLight, marginTop:2 }}>
              {maint.vehicle_name} · {maint.vehicle_registration || ""}
              {maint.scheduled_date && ` · Prévu le ${fmtDate(maint.scheduled_date)}`}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer",
            fontSize:20, color:C.textLight }}>✕</button>
        </div>
 
        {/* Erreur API */}
        {apiErr && (
          <div style={{ background:C.redLight, border:`1px solid ${C.red}30`, borderRadius:9,
            padding:"12px 14px", marginBottom:16, fontSize:12, color:C.red, lineHeight:1.6 }}>
            <b>⚠️ Erreur :</b> {apiErr}
          </div>
        )}
 
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
 
          {/* Date et km */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={LBL}>Date d'intervention</label>
              <input style={INP_S} type="date" value={form.done_date}
                onChange={e => set("done_date", e.target.value)}/>
            </div>
            <div>
              <label style={LBL}>Kilométrage (km)</label>
              <input style={INP_S} type="number" value={form.done_km}
                onChange={e => set("done_km", e.target.value)}
                placeholder={maint.vehicle_km
                  ? `Actuel : ${Number(maint.vehicle_km).toLocaleString("fr-FR")} km`
                  : "Relevé compteur"}/>
            </div>
          </div>
 
          {/* Travaux */}
          <div>
            <label style={LBL}>Travaux effectués <span style={{ color:C.red }}>*</span></label>
            <textarea style={{ ...INP_S, height:90, resize:"vertical" }}
              value={form.work_performed}
              onChange={e => set("work_performed", e.target.value)}
              placeholder="Détaillez les opérations de maintenance réalisées…"/>
          </div>
 
          {/* Pièces */}
          <div>
            <label style={LBL}>Pièces remplacées</label>
            <input style={INP_S} value={form.parts_replaced}
              onChange={e => set("parts_replaced", e.target.value)}
              placeholder="Ex : Filtres, courroie, liquide frein…"/>
          </div>
 
          {/* Coûts avec total en temps réel */}
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:C.textMid, textTransform:"uppercase",
              letterSpacing:"1px", marginBottom:8 }}>💰 Coûts de l'intervention</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div>
                <label style={LBL}>Main d'œuvre (FCFA)</label>
                <input style={INP_S} type="number" value={form.labor_cost}
                  onChange={e => set("labor_cost", e.target.value)} placeholder="0"/>
              </div>
              <div>
                <label style={LBL}>Pièces détachées (FCFA)</label>
                <input style={INP_S} type="number" value={form.parts_cost}
                  onChange={e => set("parts_cost", e.target.value)} placeholder="0"/>
              </div>
            </div>
 
            {/* Total temps réel */}
            <div style={{ marginTop:10, padding:"12px 16px",
              background: total > 0 ? C.greenLight : C.bg,
              borderRadius:9,
              border:`1.5px solid ${total > 0 ? C.green+"30" : C.border}`,
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700,
                  color: total > 0 ? C.green : C.textLight }}>
                  Total main d'œuvre + pièces
                </div>
                {total > 0 && (
                  <div style={{ fontSize:10, color:C.textLight, marginTop:2 }}>
                    🔧 {labor > 0 ? `${labor.toLocaleString("fr-FR")} FCFA` : "—"}
                    {" + "}
                    🔩 {parts > 0 ? `${parts.toLocaleString("fr-FR")} FCFA` : "—"}
                  </div>
                )}
              </div>
              <div style={{ fontSize:20, fontWeight:800,
                color: total > 0 ? C.green : C.textLight }}>
                {total > 0 ? `${total.toLocaleString("fr-FR")} FCFA` : "—"}
              </div>
            </div>
          </div>
 
          {/* Notes */}
          <div>
            <label style={LBL}>Notes / Observations</label>
            <textarea style={{ ...INP_S, height:70, resize:"vertical" }}
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              placeholder="Anomalies détectées, recommandations, observations…"/>
          </div>
        </div>
 
        {/* Info clôture */}
        <div style={{ background:C.greenLight, borderRadius:9, padding:"10px 14px",
          marginTop:14, fontSize:11, color:C.green, display:"flex", gap:8 }}>
          <span>ℹ️</span>
          <span>
            Après clôture : le véhicule sera remis <b>Disponible</b>
            {form.done_km && <> · km mis à jour à <b>{Number(form.done_km).toLocaleString("fr-FR")} km</b></>}
            {total > 0 && <> · coût total enregistré : <b>{total.toLocaleString("fr-FR")} FCFA</b></>}
          </span>
        </div>
 
        {/* Actions */}
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end",
          marginTop:20, paddingTop:16, borderTop:`1px solid ${C.border}` }}>
          <button onClick={onClose} style={{ padding:"10px 20px", background:"transparent",
            color:C.textMid, border:`1px solid ${C.border}`, borderRadius:8, fontSize:13,
            fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            Annuler
          </button>
          <button onClick={handleClose} disabled={saving}
            style={{ padding:"10px 24px", background:C.green, color:"#fff", border:"none",
              borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
              opacity: saving ? .7 : 1, display:"flex", alignItems:"center", gap:6 }}>
            {saving
              ? <><span style={{ animation:"spin .8s linear infinite", display:"inline-block" }}>⟳</span> Clôture…</>
              : "✓ Clôturer la maintenance"
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CARTE TICKET ──────────────────────────────────────────────────────────────
function TicketCard({ticket:t, onStart, onClose, detailed=false}) {
  const sev = SEVERITY_CFG[t.severity] || SEVERITY_CFG.MOYENNE;
  const st  = STATUS_CFG[t.status]     || STATUS_CFG.SIGNALE;
  const isAssigne  = t.status === "EN_DIAGNOSTIC";
  const isEnCours  = t.status === "EN_REPARATION";

  return (
    <div className="card-hover" style={{
      background:C.white,borderRadius:12,padding:"16px 18px",
      boxShadow:"0 1px 4px rgba(0,0,0,.06)",border:`1px solid ${C.border}`,
      borderLeft:`4px solid ${sev.color}`,animation:"fadeIn .2s ease",
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap"}}>
            <span style={{padding:"2px 9px",borderRadius:99,fontSize:10,fontWeight:800,background:sev.bg,color:sev.color}}>{sev.icon} {sev.label}</span>
            <span style={{padding:"2px 9px",borderRadius:99,fontSize:10,fontWeight:700,background:st.bg,color:st.color}}>{st.label}</span>
          </div>
          <div style={{fontSize:14,fontWeight:700,color:C.text}}>{t.title}</div>
          <div style={{fontSize:11,color:C.textLight,marginTop:3}}>
            🚗 {t.vehicle_name} · 👤 {t.reported_by_name}
            {t.location&&` · 📍 ${t.location}`}
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0,marginLeft:12}}>
          <div style={{fontSize:10,color:C.textLight}}>{fmtDateTime(t.reported_date)}</div>
          {t.mileage_at_breakdown&&<div style={{fontSize:11,color:C.textMid,marginTop:2}}>📍 {Number(t.mileage_at_breakdown).toLocaleString("fr-FR")} km</div>}
        </div>
      </div>
      {detailed&&t.description&&(
        <div style={{fontSize:12,color:C.textMid,background:C.bg,borderRadius:8,padding:"8px 12px",marginBottom:10,lineHeight:1.5}}>
          💬 {t.description}
        </div>
      )}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {isAssigne&&<button onClick={onStart} style={{padding:"7px 18px",background:C.green,color:"#fff",border:"none",borderRadius:7,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>🔧 Commencer intervention</button>}
        {isEnCours&&<button onClick={onClose} style={{padding:"7px 18px",background:C.green,color:"#fff",border:"none",borderRadius:7,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✓ Clôturer l'intervention</button>}
        {t.photo_url&&<a href={t.photo_url} target="_blank" rel="noreferrer" style={{padding:"7px 14px",background:C.blueLight,color:C.blue,border:`1px solid ${C.blue}20`,borderRadius:7,fontSize:12,fontWeight:600,textDecoration:"none"}}>📷 Voir photos</a>}
      </div>
    </div>
  );
}

// ── CARTE MAINTENANCE ─────────────────────────────────────────────────────────
function MaintenanceCard({maint:m, onStart, onClose, detailed=false}) {
  const st = MAINT_STATUS_CFG[m.status] || MAINT_STATUS_CFG.PLANIFIE;
  const isOverdue = m.is_overdue || (m.scheduled_date && new Date(m.scheduled_date) < new Date() && m.status !== "TERMINE");

  return (
    <div className="card-hover" style={{
      padding:"12px 0",borderBottom:`1px solid ${C.border}`,
    }}>
      <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
        <div style={{width:44,height:44,borderRadius:10,background:C.amberLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
          {m.maintenance_type==="PREVENTIVE"?"🔧":"⚙️"}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>{m.maintenance_type} — {m.vehicle_name}</div>
              <div style={{fontSize:11,color:C.textLight,marginTop:2}}>
                Prévu le {fmtDate(m.scheduled_date)}
                {isOverdue&&<span style={{color:C.red,fontWeight:700}}> — En retard !</span>}
              </div>
              {m.description&&detailed&&<div style={{fontSize:11,color:C.textMid,marginTop:4}}>{m.description}</div>}
            </div>
            <span style={{padding:"2px 9px",borderRadius:99,fontSize:10,fontWeight:700,background:st.bg,color:st.color,flexShrink:0}}>{st.label}</span>
          </div>
          <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
            {m.status==="PLANIFIE"&&onStart&&(
              <button onClick={onStart} style={{padding:"6px 16px",background:C.green,color:"#fff",border:"none",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>▶ Démarrer</button>
            )}
            {m.status==="EN_COURS"&&onClose&&(
              <button onClick={onClose} style={{padding:"6px 16px",background:C.green,color:"#fff",border:"none",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✓ Clôturer</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardTechnicien({onLogout}) {
  const [tab,          setTab]          = useState("dashboard");
  const [user,         setUser]         = useState(null);
  const [tickets,      setTickets]      = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [notifications,setNotifications]= useState([]);
  const [loading,      setLoading]      = useState(true);
  const [toast,        setToast]        = useState({msg:"",type:"success"});
  const [modalTicket,  setModalTicket]  = useState(null);
  const [modalMaint,   setModalMaint]   = useState(null);

  const showToast = (msg,type="success") => setToast({msg,type});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u,t,m,n] = await Promise.all([
        apiFetch("/auth/profile/").catch(()=>null),
        apiFetch("/maintenance/breakdowns/").catch(()=>[]),
        apiFetch("/maintenance/maintenance/").catch(()=>[]),
        apiFetch("/notifications/").catch(()=>[]),
      ]);
      setUser(u);
      setTickets(Array.isArray(t)?t:t?.results??[]);
      setMaintenances(Array.isArray(m)?m:m?.results??[]);
      setNotifications(Array.isArray(n)?n:n?.results??[]);
    } finally { setLoading(false); }
  }, []);

  useEffect(()=>{load();},[load]);

  const handleLogout = () => { localStorage.clear(); sessionStorage.clear(); onLogout?.(); };

  const handleStartTicket = async ticket => {
    try {
      await apiFetch(`/maintenance/breakdowns/${ticket.id}/intervenir/`,{method:"POST",body:JSON.stringify({action:"START"})});
      showToast("Intervention démarrée ✓");
      load();
    } catch(e) { showToast(parseErr(e.message,"démarrage"),"error"); }
  };

  const handleStartMaint = async maint => {
    try {
      // Essaie /start/ puis PATCH
      try {
        await apiFetch(`/maintenance/maintenance/${maint.id}/start/`,{method:"POST"});
      } catch {
        await apiFetch(`/maintenance/maintenance/${maint.id}/`,{method:"PATCH",body:JSON.stringify({status:"EN_COURS"})});
      }
      showToast("Maintenance démarrée ✓");
      load();
    } catch(e) { showToast(parseErr(e.message,"démarrage"),"error"); }
  };

  const markNotifRead = async id => {
    try {
      await apiFetch(`/notifications/${id}/mark-read/`,{method:"POST"}).catch(()=>{});
      setNotifications(prev=>prev.map(n=>n.id===id?{...n,status:"LU"}:n));
    } catch {}
  };

  // Convertir les messages d'erreur techniques en messages lisibles
  const parseErr = (msg,ctx="") => {
    if (!msg) return `Erreur lors de ${ctx||"l'opération"}`;
    if (msg.includes("500")||msg.includes("Internal Server Error"))
      return `Erreur serveur (500) lors de ${ctx||"l'opération"}. Consultez les logs Django.`;
    if (msg.includes("404")) return `Endpoint introuvable (404). Vérifiez la configuration backend.`;
    if (msg.includes("403")||msg.includes("permission")) return "Vous n'avez pas les droits pour cette action.";
    if (msg.includes("network")||msg.includes("fetch")) return "Impossible de joindre le serveur. Vérifiez la connexion.";
    return msg;
  };

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg,flexDirection:"column",gap:14}}>
      <div style={{width:32,height:32,border:`3px solid ${C.green}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
      <div style={{fontSize:11,color:C.textLight,letterSpacing:"2px",textTransform:"uppercase"}}>Chargement</div>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );

  const ticketsCritiques = tickets.filter(t=>t.severity==="CRITIQUE"&&t.status!=="REPARE");
  const ticketsActifs    = tickets.filter(t=>t.status!=="REPARE");
  const ticketsResolus   = tickets.filter(t=>t.status==="REPARE");
  const unreadNotifs     = notifications.filter(n=>n.status==="NON_LU").length;
  const maintsEnCours    = maintenances.filter(m=>m.status==="EN_COURS");
  const maintsPlanifies  = maintenances.filter(m=>m.status==="PLANIFIE");
  const maintsTermines   = maintenances.filter(m=>m.status==="TERMINE");

  return (
    <div style={{display:"flex",height:"100vh",width:"100vw",fontFamily:"'Inter',-apple-system,sans-serif",background:C.bg,overflow:"hidden"}}>
      <style>{CSS}</style>
      <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast({msg:""})}/>

      {/* ── SIDEBAR ── */}
      <aside style={{width:224,background:C.sidebar,display:"flex",flexDirection:"column",flexShrink:0,height:"100vh"}}>
        <div style={{display:"flex",alignItems:"center",gap:11,padding:"18px 16px 12px"}}>
          <div style={{width:44,height:44,borderRadius:10,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <span style={{fontSize:22}}>🔧</span>
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:"#fff",letterSpacing:"2px"}}>DRIVEPARC</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,.35)",marginTop:2}}>Institut Universitaire de la Côte</div>
          </div>
        </div>
        <div style={{height:1,background:"rgba(255,255,255,.07)",margin:"0 14px"}}/>
        <div style={{padding:"10px 14px 6px"}}>
          <div style={{fontSize:9,color:"rgba(255,255,255,.4)",textTransform:"uppercase",letterSpacing:"1.5px",fontWeight:700}}>Technicien</div>
          {ticketsCritiques.length>0&&(
            <div style={{marginTop:4,fontSize:10,background:"rgba(192,24,42,0.3)",borderRadius:6,padding:"4px 8px",color:"#fca5a5",fontWeight:700}}>
              🚨 {ticketsCritiques.length} ticket{ticketsCritiques.length>1?"s":""} critique{ticketsCritiques.length>1?"s":""}
            </div>
          )}
        </div>
        <nav style={{flex:1,padding:"6px 10px",overflowY:"auto"}}>
          {NAV.map(n=>{
            const active=tab===n.id;
            const badge=n.id==="notifications"?unreadNotifs:n.id==="tickets"?ticketsActifs.length:0;
            return(
              <button key={n.id} onClick={()=>setTab(n.id)}
                style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"8px 10px",borderRadius:7,border:"none",cursor:"pointer",color:active?"#fff":"rgba(255,255,255,.6)",marginBottom:2,textAlign:"left",background:active?C.sideActive:"transparent",fontFamily:"inherit",position:"relative",transition:"all .12s"}}
                className={active?"":"nav-btn"}>
                <span style={{fontSize:15,opacity:active?1:0.65}}>{n.icon}</span>
                <span style={{fontSize:12,flex:1,fontWeight:active?700:400}}>{n.label}</span>
                {badge>0&&<span style={{background:C.red,color:"#fff",borderRadius:99,fontSize:9,fontWeight:800,minWidth:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px"}}>{badge}</span>}
                {active&&<span style={{position:"absolute",right:0,top:"50%",transform:"translateY(-50%)",width:3,height:16,background:"#fff",borderRadius:99}}/>}
              </button>
            );
          })}
        </nav>
        <div style={{padding:"6px 10px 12px"}}>
          <div style={{height:1,background:"rgba(255,255,255,.07)",margin:"0 4px 10px"}}/>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 4px 8px"}}>
            <div style={{width:30,height:30,borderRadius:"50%",background:C.greenMid,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:11,flexShrink:0}}>
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:11,fontWeight:700,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                {user?.full_name||`${user?.first_name} ${user?.last_name}`}
              </div>
              <div style={{fontSize:9,color:"rgba(255,255,255,.4)"}}>Technicien</div>
            </div>
          </div>
          <button onClick={handleLogout}
            style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 10px",borderRadius:7,border:"none",cursor:"pointer",background:"rgba(192,24,42,0.22)",color:"rgba(255,255,255,.7)",fontSize:12,fontFamily:"inherit",marginTop:4}}
            className="logout-btn">
            <span style={{fontSize:13}}>🚪</span><span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
        <header style={{background:C.white,borderBottom:`1px solid ${C.border}`,padding:"12px 22px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <h1 style={{fontSize:20,fontWeight:760,color:C.text,letterSpacing:"-.4px",margin:0}}>
              {NAV.find(n=>n.id===tab)?.label??"Tableau de bord"}
            </h1>
            <p style={{fontSize:11,color:C.textLight,marginTop:2}}>
              {new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
            </p>
          </div>
          {ticketsCritiques.length>0&&(
            <div style={{display:"flex",alignItems:"center",gap:8,background:C.redLight,border:`1px solid ${C.red}30`,borderRadius:8,padding:"8px 14px"}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:C.red,animation:"pulse 1.5s ease-in-out infinite",display:"inline-block"}}/>
              <span style={{fontSize:12,fontWeight:700,color:C.red}}>
                {ticketsCritiques.length} intervention{ticketsCritiques.length>1?"s":""} critique{ticketsCritiques.length>1?"s":""} en attente
              </span>
            </div>
          )}
        </header>

        <div style={{flex:1,overflowY:"auto",padding:"18px 22px"}}>

          {/* ════ DASHBOARD ════ */}
          {tab==="dashboard"&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {/* KPIs */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
                {[
                  {icon:"🚨",label:"Critiques",     val:ticketsCritiques.length,                     color:C.red,   desc:"Action immédiate"},
                  {icon:"🔧",label:"Tickets actifs", val:ticketsActifs.length,                        color:C.amber, desc:"En attente d'intervention"},
                  {icon:"📅",label:"Maintenances",   val:maintsEnCours.length+maintsPlanifies.length, color:C.blue,  desc:"En cours + planifiées"},
                  {icon:"✅",label:"Terminés",       val:ticketsResolus.length+maintsTermines.length,  color:C.green, desc:"Ce cycle"},
                ].map((k,i)=>(
                  <div key={i} style={{background:C.white,borderRadius:12,padding:"16px 18px",borderTop:`3px solid ${k.color}`,boxShadow:"0 1px 3px rgba(0,0,0,.05)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div style={{fontSize:10,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:"1px"}}>{k.label}</div>
                      <span style={{fontSize:18}}>{k.icon}</span>
                    </div>
                    <div style={{fontSize:26,fontWeight:800,color:k.color}}>{k.val}</div>
                    <div style={{fontSize:11,color:C.textLight,marginTop:4}}>{k.desc}</div>
                  </div>
                ))}
              </div>

              {/* Critiques */}
              {ticketsCritiques.length>0&&(
                <div style={{background:C.redLight,border:`1.5px solid ${C.red}30`,borderRadius:12,padding:"16px 20px"}}>
                  <div style={{fontSize:13,fontWeight:800,color:C.red,marginBottom:12}}>🚨 Interventions critiques — Action immédiate requise</div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {ticketsCritiques.slice(0,3).map((t,i)=>(
                      <TicketCard key={i} ticket={t} onStart={()=>handleStartTicket(t)} onClose={()=>setModalTicket(t)}/>
                    ))}
                  </div>
                </div>
              )}

              {/* Maintenances en cours */}
              {maintsEnCours.length>0&&(
                <div style={{background:C.white,borderRadius:12,padding:"16px 20px",boxShadow:"0 1px 3px rgba(0,0,0,.05)"}}>
                  <div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:12}}>🔧 Maintenances en cours</div>
                  {maintsEnCours.map((m,i)=>(
                    <MaintenanceCard key={i} maint={m} onClose={()=>setModalMaint(m)}/>
                  ))}
                </div>
              )}

              {/* Maintenances planifiées */}
              {maintsPlanifies.length>0&&(
                <div style={{background:C.white,borderRadius:12,padding:"16px 20px",boxShadow:"0 1px 3px rgba(0,0,0,.05)"}}>
                  <div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:12}}>📅 Prochaines maintenances planifiées</div>
                  {maintsPlanifies.slice(0,5).map((m,i)=>(
                    <MaintenanceCard key={i} maint={m} onStart={()=>handleStartMaint(m)}/>
                  ))}
                </div>
              )}

              {ticketsActifs.length===0&&maintenances.filter(m=>m.status!=="TERMINE").length===0&&(
                <div style={{background:C.white,borderRadius:12,padding:"60px 20px",textAlign:"center",boxShadow:"0 1px 3px rgba(0,0,0,.05)"}}>
                  <div style={{fontSize:48,marginBottom:12}}>✅</div>
                  <div style={{fontSize:16,fontWeight:700,color:C.text}}>Aucune intervention en cours</div>
                  <div style={{fontSize:13,color:C.textLight,marginTop:6}}>Tous les tickets sont traités. Bon travail !</div>
                </div>
              )}
            </div>
          )}

          {/* ════ TICKETS ════ */}
          {tab==="tickets"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{fontSize:13,color:C.textLight}}>{ticketsActifs.length} ticket{ticketsActifs.length>1?"s":""} actif{ticketsActifs.length>1?"s":""}</div>
              {["CRITIQUE","HAUTE","MOYENNE","BASSE"].map(sev=>{
                const group=tickets.filter(t=>t.severity===sev&&t.status!=="REPARE");
                if(group.length===0)return null;
                const cfg=SEVERITY_CFG[sev];
                return(
                  <div key={sev}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <span>{cfg.icon}</span>
                      <span style={{fontSize:11,fontWeight:700,color:cfg.color,textTransform:"uppercase",letterSpacing:"1px"}}>{cfg.label} — {group.length} ticket{group.length>1?"s":""}</span>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      {group.map((t,i)=>(
                        <TicketCard key={i} ticket={t} onStart={()=>handleStartTicket(t)} onClose={()=>setModalTicket(t)} detailed/>
                      ))}
                    </div>
                  </div>
                );
              })}
              {ticketsResolus.length>0&&(
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>✅ Résolus récemment — {ticketsResolus.length}</div>
                  {ticketsResolus.slice(0,5).map((t,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:C.white,borderRadius:10,marginBottom:8,opacity:.7,boxShadow:"0 1px 3px rgba(0,0,0,.05)"}}>
                      <span style={{fontSize:18}}>✅</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:600,color:C.text}}>{t.title}</div>
                        <div style={{fontSize:11,color:C.textLight}}>{t.vehicle_name} · Résolu le {fmtDate(t.resolved_date)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {tickets.length===0&&(
                <div style={{background:C.white,borderRadius:12,padding:"60px 20px",textAlign:"center",boxShadow:"0 1px 3px rgba(0,0,0,.05)"}}>
                  <div style={{fontSize:48,marginBottom:12}}>🎉</div>
                  <div style={{fontSize:15,fontWeight:700,color:C.text}}>Aucun ticket assigné</div>
                </div>
              )}
            </div>
          )}

          {/* ════ MAINTENANCES ════ */}
          {tab==="maintenance"&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                {[
                  {label:"En cours",   val:maintsEnCours.length,   color:C.amber},
                  {label:"Planifiées", val:maintsPlanifies.length,  color:C.blue },
                  {label:"Terminées",  val:maintsTermines.length,   color:C.green},
                ].map((k,i)=>(
                  <div key={i} style={{background:C.white,borderRadius:10,padding:"14px 16px",textAlign:"center",boxShadow:"0 1px 3px rgba(0,0,0,.05)",borderTop:`3px solid ${k.color}`}}>
                    <div style={{fontSize:22,fontWeight:800,color:k.color}}>{k.val}</div>
                    <div style={{fontSize:10,color:C.textLight,textTransform:"uppercase",letterSpacing:"1px",marginTop:4}}>{k.label}</div>
                  </div>
                ))}
              </div>
              {maintenances.length===0?(
                <div style={{background:C.white,borderRadius:12,padding:"60px 20px",textAlign:"center",boxShadow:"0 1px 3px rgba(0,0,0,.05)"}}>
                  <div style={{fontSize:48,marginBottom:12}}>📅</div>
                  <div style={{fontSize:15,fontWeight:700,color:C.text}}>Aucune maintenance planifiée</div>
                </div>
              ):(
                <div style={{background:C.white,borderRadius:12,padding:"16px 20px",boxShadow:"0 1px 3px rgba(0,0,0,.05)"}}>
                  <div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:14}}>Toutes mes interventions</div>
                  {maintenances.map((m,i)=>(
                    <MaintenanceCard key={i} maint={m} onStart={()=>handleStartMaint(m)} onClose={()=>setModalMaint(m)} detailed/>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════ NOTIFICATIONS ════ */}
          {tab==="notifications"&&(
            <div style={{background:C.white,borderRadius:12,padding:"16px 20px",boxShadow:"0 1px 3px rgba(0,0,0,.05)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:C.text}}>Notifications</div>
                  <div style={{fontSize:11,color:C.textLight,marginTop:2}}>{unreadNotifs} non lue{unreadNotifs>1?"s":""}</div>
                </div>
                {unreadNotifs>0&&(
                  <button onClick={()=>setNotifications(prev=>prev.map(n=>({...n,status:"LU"})))}
                    style={{fontSize:11,color:C.green,fontWeight:600,background:"none",border:"none",cursor:"pointer",textDecoration:"underline",fontFamily:"inherit"}}>
                    Tout marquer lu
                  </button>
                )}
              </div>
              {notifications.length===0?(
                <div style={{textAlign:"center",padding:"40px 0",color:C.textLight}}>
                  <div style={{fontSize:32,marginBottom:8}}>🔔</div>
                  <div style={{fontSize:13}}>Aucune notification</div>
                </div>
              ):notifications.map((n,i)=>(
                <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",marginBottom:4,borderRadius:8,background:n.status==="NON_LU"?C.greenLight:"transparent"}}>
                  <span style={{width:8,height:8,borderRadius:"50%",flexShrink:0,marginTop:5,background:n.type==="SUCCESS"?C.green:n.type==="WARNING"?C.amber:n.type==="ERROR"?C.red:C.blue}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:n.status==="NON_LU"?700:500,color:C.text}}>{n.title}</div>
                    <div style={{fontSize:11,color:C.textMid,marginTop:2}}>{n.message}</div>
                    <div style={{fontSize:10,color:C.textLight,marginTop:4}}>{fmtDateTime(n.created_at)}</div>
                  </div>
                  {n.status==="NON_LU"&&(
                    <button onClick={()=>markNotifRead(n.id)}
                      style={{fontSize:11,color:C.green,fontWeight:600,background:"none",border:"none",cursor:"pointer",textDecoration:"underline",fontFamily:"inherit",whiteSpace:"nowrap"}}>
                      Marquer lu
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modalTicket&&(
        <ModalClotureTicket ticket={modalTicket} onClose={()=>setModalTicket(null)}
          onSuccess={()=>{setModalTicket(null);load();}} showToast={showToast}/>
      )}
      {modalMaint&&(
        <ModalClotureMaint maint={modalMaint} onClose={()=>setModalMaint(null)}
          onSuccess={()=>{setModalMaint(null);load();}} showToast={showToast}/>
      )}
    </div>
  );
}