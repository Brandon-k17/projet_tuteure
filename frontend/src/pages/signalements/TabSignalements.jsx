// ─── pages/signalements/TabSignalements.jsx ──────────────────────────────────
// Module URGENCE TERRAIN — vue chauffeur v2
// Corrections :
//  • Géolocalisation GPS intégrée (avec fallback manuel)
//  • Contexte véhicule : TRANSPORT SCOLAIRE vs MISSION
//    - Chauffeur scolaire → peut choisir son bus OU une mission (autre véhicule)
//    - Chauffeur polyvalent → missions uniquement
//  • Réinitialisation complète des champs après envoi
//  • Confirmation SOS : modal in-app, zéro window.confirm/alert
//  • Message de succès professionnel animé
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from "react";

const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

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
  if (res.status === 204) return null;
  const json = await res.json();
  if (!res.ok) throw new Error(json?.detail || json?.message || `Erreur ${res.status}`);
  return json?.data ?? json;
}

// ─────────────────────────────────────────────────────────────────────────────
// PALETTE & CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  green:"#1B5E37",  greenLight:"#EAF4EE",  greenXLight:"#F2FAF5",
  red:"#C0182A",    redLight:"#FDF0F1",
  amber:"#D97706",  amberLight:"#FFFBEB",
  blue:"#1D4ED8",   blueLight:"#EFF6FF",
  orange:"#EA580C", orangeLight:"#FFF7ED",
  white:"#FFFFFF",  bg:"#F4F6F5",
  border:"#E2E8E5", text:"#1A2820", textMid:"#4A6358", textLight:"#8EA99A",
};

const CAUSES_IMMOBILISATION = [
  { val:"ACCIDENT_COLLISION", label:"Collision / Accident",          icon:"💥" },
  { val:"PANNE_MOTEUR",       label:"Panne moteur totale",           icon:"🔧" },
  { val:"INCENDIE",           label:"Incendie / Fumée anormale",     icon:"🔥" },
  { val:"PERTE_FREINS",       label:"Perte de freinage",             icon:"⚠️" },
  { val:"CREVAISON_BLOCAGE",  label:"Crevaison bloquante",           icon:"🛞" },
  { val:"AUTRE_IMMOBILISANT", label:"Autre — ne peut plus avancer",  icon:"🚧" },
];

const CAUSES_INCIDENT = [
  { val:"CREVAISON_SIMPLE",  label:"Crevaison (roue de secours dispo.)", icon:"🛞" },
  { val:"RETRO_CASSE",       label:"Rétroviseur endommagé",              icon:"🪞" },
  { val:"VITRE_CASSEE",      label:"Vitre brisée",                       icon:"🪟" },
  { val:"ECLAIRAGE_DEFAUT",  label:"Défaut d'éclairage",                 icon:"💡" },
  { val:"CARROSSERIE",       label:"Dommage carrosserie",                icon:"🚌" },
  { val:"ESSUIE_GLACE",      label:"Essuie-glaces défectueux",           icon:"🌧️" },
  { val:"AUTRE_SIMPLE",      label:"Autre incident mineur",              icon:"🔩" },
];

const STATUT_CFG = {
  SIGNALE:       { label:"En attente",        color:C.amber,  bg:C.amberLight  },
  EN_ATTENTE:    { label:"En attente",        color:C.amber,  bg:C.amberLight  },
  EN_DIAGNOSTIC: { label:"Assistance en route", color:C.blue, bg:C.blueLight  },
  EN_REPARATION: { label:"Rapatriement",      color:C.orange, bg:C.orangeLight },
  REPARE:        { label:"Clôturé ✓",         color:C.green,  bg:C.greenLight  },
  NON_REPARABLE: { label:"Irrécupérable",     color:"#6B7280",bg:"#F3F4F6"     },
};

const fmtDT = d => d ? new Date(d).toLocaleDateString("fr-FR", {
  day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit",
}) : "—";
const fmtShort = d => d ? new Date(d).toLocaleDateString("fr-FR", {
  day:"2-digit", month:"short", year:"numeric",
}) : "—";

// ─────────────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@700&display=swap');

  @keyframes sig-spin   { to { transform: rotate(360deg); } }
  @keyframes sig-fade   { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes sig-slide  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes sig-sos    { 0%,100%{background:#C0182A;box-shadow:0 4px 24px #C0182A60} 50%{background:#E53E3E;box-shadow:0 4px 32px #E53E3E80} }
  @keyframes sig-pop    { 0%{opacity:0;transform:scale(.88)} 60%{transform:scale(1.03)} 100%{opacity:1;transform:scale(1)} }
  @keyframes sig-check  { 0%{stroke-dashoffset:50} 100%{stroke-dashoffset:0} }
  @keyframes sig-ring   { 0%{transform:scale(1);opacity:1} 100%{transform:scale(1.6);opacity:0} }
  @keyframes sig-geo    { 0%,100%{opacity:1} 50%{opacity:.4} }
  @keyframes sig-shake  { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }

  .sig-fade   { animation: sig-fade  .22s ease both; }
  .sig-slide  { animation: sig-slide .28s ease both; }
  .sig-pop    { animation: sig-pop   .35s cubic-bezier(.22,.68,0,1.2) both; }

  .sig-sos-btn {
    animation: sig-sos 1.6s ease-in-out infinite;
    transition: transform .1s;
  }
  .sig-sos-btn:hover { transform: scale(1.02); }
  .sig-sos-btn:active { transform: scale(.97); }

  .sig-card {
    background:#fff;
    border-radius:14px;
    box-shadow:0 1px 3px rgba(0,0,0,.06);
    transition:box-shadow .15s;
  }

  .sig-type-btn {
    border-radius:12px; cursor:pointer; font-family:'DM Sans',sans-serif;
    transition:all .15s; border:2px solid #E2E8E5; background:#F4F6F5;
    text-align:left; padding:18px 16px;
  }
  .sig-type-btn:hover { border-color:#8EA99A; background:#fff; }
  .sig-type-btn.sel-red   { border-color:#C0182A!important; background:#FDF0F1!important; box-shadow:0 0 0 3px #C0182A18; }
  .sig-type-btn.sel-amber { border-color:#D97706!important; background:#FFFBEB!important; box-shadow:0 0 0 3px #D9770618; }

  .sig-cause-btn {
    padding:11px 13px; border-radius:9px; cursor:pointer;
    font-family:'DM Sans',sans-serif;
    border:1.5px solid #E2E8E5; background:#F4F6F5;
    display:flex; align-items:center; gap:10;
    transition:all .12s; text-align:left;
  }
  .sig-cause-btn:hover { border-color:#4A6358; background:#fff; }
  .sig-cause-btn.sel-red   { border-color:#C0182A!important; background:#FDF0F1!important; }
  .sig-cause-btn.sel-amber { border-color:#D97706!important; background:#FFFBEB!important; }

  .sig-ctx-btn {
    flex:1; padding:14px 16px; border-radius:10px; cursor:pointer;
    font-family:'DM Sans',sans-serif; border:2px solid #E2E8E5;
    background:#F4F6F5; text-align:left; transition:all .15s;
  }
  .sig-ctx-btn:hover { border-color:#1B5E37; background:#EAF4EE; }
  .sig-ctx-btn.sel { border-color:#1B5E37!important; background:#EAF4EE!important; box-shadow:0 0 0 3px #1B5E3718; }

  .sig-step { position:relative; padding-left:32px; padding-bottom:16px; }
  .sig-step::before { content:''; position:absolute; left:10px; top:24px;
    bottom:0; width:1px; background:#E2E8E5; }
  .sig-step:last-child::before { display:none; }
  .sig-step-dot { position:absolute; left:0; top:3px; width:22px; height:22px;
    border-radius:50%; display:flex; align-items:center; justify-content:center;
    font-size:9px; font-weight:800; }

  .sig-geo-pulse { animation: sig-geo 1.2s ease-in-out infinite; }
  .sig-ring {
    position:absolute; inset:-6px; border-radius:50%;
    border:2px solid #1B5E37; animation:sig-ring 1.4s ease-out infinite;
  }

  .sig-inp {
    padding:10px 13px; border:1.5px solid #E2E8E5; border-radius:9px;
    font-size:13px; font-family:'DM Sans',sans-serif; color:#1A2820;
    background:#fff; width:100%; outline:none; transition:border-color .15s;
    box-sizing:border-box;
  }
  .sig-inp:focus { border-color:#1B5E37; }
  .sig-inp-err   { border-color:#C0182A!important; background:#FDF0F1!important; }

  .sig-lbl {
    font-size:10px; font-weight:700; color:#4A6358; text-transform:uppercase;
    letter-spacing:1.2px; margin-bottom:6px; display:block;
  }

  .sig-toast {
    position:fixed; bottom:24px; right:24px; z-index:9999;
    border-radius:13px; padding:14px 20px; font-size:13px; font-weight:600;
    display:flex; align-items:center; gap:10;
    box-shadow:0 8px 32px rgba(0,0,0,.22); max-width:420px;
    animation:sig-slide .3s ease;
    font-family:'DM Sans',sans-serif;
  }

  /* Overlay modal */
  .sig-overlay {
    position:fixed; inset:0; background:rgba(0,0,0,.55);
    display:flex; align-items:center; justify-content:center;
    z-index:1200; animation:sig-fade .2s ease;
  }

  @media (max-width:768px) {
    .sig-grid-2 { grid-template-columns:1fr!important; }
    .sig-sidebar { display:none; }
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(() => {
    if (msg) { const t = setTimeout(onDone, 5000); return () => clearTimeout(t); }
  }, [msg, onDone]);
  if (!msg) return null;
  const bg = { error:C.red, urgence:C.orange, success:C.green }[type] || C.green;
  const icon = { error:"✕", urgence:"🚨", success:"✓" }[type] || "✓";
  return (
    <div className="sig-toast" style={{ background:bg, color:"#fff" }}>
      <span style={{ fontSize:18 }}>{icon}</span>
      <span style={{ flex:1 }}>{msg}</span>
      <button onClick={onDone} style={{ background:"none", border:"none", color:"rgba(255,255,255,.7)", cursor:"pointer", fontSize:18, padding:0 }}>✕</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL CONFIRMATION SOS (remplace window.confirm)
// ─────────────────────────────────────────────────────────────────────────────
function ModalConfirmSOS({ causeLabel, onConfirm, onCancel, submitting }) {
  return (
    <div className="sig-overlay">
      <div className="sig-pop" style={{
        background:"#fff", borderRadius:18, padding:"36px 32px",
        width:480, maxWidth:"94vw", textAlign:"center",
        boxShadow:"0 24px 80px rgba(192,24,42,.3)",
        fontFamily:"'DM Sans',sans-serif",
      }}>
        {/* Icône animée */}
        <div style={{ position:"relative", width:72, height:72, margin:"0 auto 20px" }}>
          <div className="sig-ring" />
          <div style={{
            width:72, height:72, borderRadius:"50%", background:C.redLight,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:34,
          }}>🚨</div>
        </div>

        <div style={{ fontSize:20, fontWeight:800, color:C.red, marginBottom:8 }}>
          Confirmer l'envoi du SOS
        </div>
        <div style={{ fontSize:13, color:C.textMid, lineHeight:1.7, marginBottom:6 }}>
          Vous êtes sur le point d'envoyer une <strong>alerte d'urgence critique</strong>.
        </div>
        <div style={{ fontSize:12, background:C.redLight, border:`1px solid ${C.red}25`, borderRadius:9, padding:"10px 14px", marginBottom:20, color:C.red, lineHeight:1.6 }}>
          <strong>Cause :</strong> {causeLabel}<br/>
          Le gestionnaire du parc recevra une notification immédiate et déclenchera l'assistance.
        </div>

        <div style={{ background:"#FFFBEB", border:`1px solid ${C.amber}30`, borderRadius:9, padding:"10px 14px", marginBottom:24, fontSize:12, color:C.amber, lineHeight:1.6 }}>
          ⚠️ Si des personnes sont blessées, appelez le <strong>15 (SAMU)</strong> ou le <strong>17 (Police)</strong> en priorité.
        </div>

        <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
          <button onClick={onCancel} disabled={submitting}
            style={{ padding:"11px 24px", background:"transparent", color:C.textMid, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            Annuler
          </button>
          <button onClick={onConfirm} disabled={submitting}
            style={{ padding:"11px 28px", background:C.red, color:"#fff", border:"none", borderRadius:9, fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"inherit",
              display:"flex", alignItems:"center", gap:8, opacity:submitting?0.7:1,
              boxShadow:`0 4px 20px ${C.red}50` }}>
            {submitting
              ? <><span style={{ width:16, height:16, border:"2px solid rgba(255,255,255,.4)", borderTopColor:"#fff", borderRadius:"50%", animation:"sig-spin .8s linear infinite", display:"inline-block" }}/> Envoi…</>
              : "🚨 Envoyer le SOS maintenant"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉCRAN DE SUCCÈS PROFESSIONNEL (remplace l'écran basique)
// ─────────────────────────────────────────────────────────────────────────────
function EcranSucces({ mode, ticketRef, vehicleLabel, onNewReport, onHistory }) {
  const isUrgent = mode === "IMMOBILISATION";
  return (
    <div className="sig-pop" style={{
      borderRadius:18, overflow:"hidden",
      boxShadow: isUrgent ? `0 8px 40px ${C.red}30` : `0 8px 40px ${C.green}25`,
      fontFamily:"'DM Sans',sans-serif",
    }}>
      {/* Bande colorée haut */}
      <div style={{
        background: isUrgent
          ? `linear-gradient(135deg, #7F1D1D 0%, ${C.red} 100%)`
          : `linear-gradient(135deg, #064E3B 0%, ${C.green} 100%)`,
        padding:"32px 28px 28px", textAlign:"center", color:"#fff",
      }}>
        {/* Icône check animé */}
        <div style={{ position:"relative", width:70, height:70, margin:"0 auto 16px" }}>
          <svg viewBox="0 0 70 70" style={{ position:"absolute", inset:0, width:70, height:70 }}>
            <circle cx="35" cy="35" r="30" fill="rgba(255,255,255,.15)"/>
            <circle cx="35" cy="35" r="30" fill="none" stroke="rgba(255,255,255,.6)"
              strokeWidth="2.5" strokeDasharray="188" strokeDashoffset="0"/>
            {isUrgent
              ? <text x="35" y="43" textAnchor="middle" fontSize="24">🚨</text>
              : <polyline points="20,35 30,47 50,23" fill="none" stroke="#fff"
                  strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray="50" strokeDashoffset="0"
                  style={{ animation:"sig-check .6s .3s ease both" }}/>
            }
          </svg>
        </div>

        <div style={{ fontSize:22, fontWeight:800, marginBottom:8 }}>
          {isUrgent ? "SOS envoyé avec succès" : "Signalement transmis"}
        </div>
        <div style={{ fontSize:13, opacity:.85, lineHeight:1.6 }}>
          {isUrgent
            ? "Votre alerte d'urgence a été reçue par le gestionnaire du parc. L'assistance est déclenchée."
            : "Votre incident a été enregistré. Le gestionnaire va prendre en charge votre demande."}
        </div>
      </div>

      {/* Corps blanc */}
      <div style={{ background:"#fff", padding:"24px 28px" }}>

        {/* Référence du ticket */}
        {ticketRef && (
          <div style={{ background:C.bg, borderRadius:10, padding:"12px 16px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:11, color:C.textLight, fontWeight:600 }}>N° de signalement</span>
            <span style={{ fontSize:14, fontWeight:800, color:isUrgent?C.red:C.green, fontFamily:"'JetBrains Mono',monospace" }}>
              #{ticketRef}
            </span>
          </div>
        )}

        {vehicleLabel && (
          <div style={{ background:C.bg, borderRadius:10, padding:"12px 16px", marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:11, color:C.textLight, fontWeight:600 }}>Véhicule concerné</span>
            <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{vehicleLabel}</span>
          </div>
        )}

        {/* Étapes suivantes */}
        <div style={{ marginBottom:22 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px", marginBottom:12 }}>
            Prochaines étapes
          </div>
          {(isUrgent ? [
            { icon:"📞", text:"Le gestionnaire vous rappelle dans les 5 minutes" },
            { icon:"🚑", text:"Assistance routière dépêchée sur votre position" },
            { icon:"🔒", text:"Restez dans ou près du véhicule, feux de détresse allumés" },
          ] : [
            { icon:"👀", text:"Le gestionnaire examine votre signalement" },
            { icon:"📅", text:"Une intervention sera planifiée sous 24h" },
            { icon:"📲", text:"Vous recevrez une notification de suivi" },
          ]).map((step, i) => (
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:10 }}>
              <span style={{ fontSize:18, flexShrink:0, marginTop:1 }}>{step.icon}</span>
              <span style={{ fontSize:12, color:C.textMid, lineHeight:1.6 }}>{step.text}</span>
            </div>
          ))}
        </div>

        {/* Numéros urgence si critique */}
        {isUrgent && (
          <div style={{ background:C.redLight, border:`1px solid ${C.red}20`, borderRadius:10, padding:"12px 16px", marginBottom:20, display:"flex", gap:16, justifyContent:"center" }}>
            {[["15","SAMU"],["17","Police"],["18","Pompiers"]].map(([n,l]) => (
              <div key={n} style={{ textAlign:"center" }}>
                <div style={{ fontSize:18, fontWeight:900, color:C.red, fontFamily:"'JetBrains Mono',monospace" }}>{n}</div>
                <div style={{ fontSize:10, color:C.textLight, fontWeight:600 }}>{l}</div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onHistory}
            style={{ flex:1, padding:"11px", background:isUrgent?C.red:C.green, color:"#fff", border:"none", borderRadius:9, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            Suivre mon signalement →
          </button>
          <button onClick={onNewReport}
            style={{ padding:"11px 16px", background:C.bg, color:C.textMid, border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            Nouveau
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GÉOLOCALISATION
// ─────────────────────────────────────────────────────────────────────────────
function GeoButton({ onLocate, geoState }) {
  const stateMap = {
    idle:     { label:"📍 Obtenir ma position GPS", color:C.blue,  bg:C.blueLight  },
    loading:  { label:"📡 Localisation en cours…",  color:C.blue,  bg:C.blueLight  },
    success:  { label:"✅ Position obtenue",         color:C.green, bg:C.greenLight },
    error:    { label:"❌ Position indisponible",    color:C.red,   bg:C.redLight   },
  };
  const s = stateMap[geoState] || stateMap.idle;
  return (
    <button type="button" onClick={onLocate} disabled={geoState==="loading"}
      style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 14px", borderRadius:8, fontSize:12, fontWeight:700, cursor:geoState==="loading"?"default":"pointer", fontFamily:"'DM Sans',sans-serif",
        background:s.bg, color:s.color, border:`1.5px solid ${s.color}30`, transition:"all .15s" }}>
      {geoState==="loading" && (
        <span className="sig-geo-pulse" style={{ width:12, height:12, borderRadius:"50%", background:C.blue, display:"inline-block" }}/>
      )}
      {s.label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE SUIVI
// ─────────────────────────────────────────────────────────────────────────────
function TimelineSuivi({ ticket }) {
  const steps = [
    { label:"Signalement envoyé",  icon:"📱", done:true, time:ticket.reported_date||ticket.created_at },
    { label:"Gestionnaire alerté", icon:"📞", done:["EN_DIAGNOSTIC","EN_REPARATION","REPARE"].includes(ticket.status), time:ticket.assigned_date },
    { label:"Assistance en route", icon:"🚑", done:["EN_REPARATION","REPARE"].includes(ticket.status), time:ticket.pickup_date },
    { label:"Incident clôturé",    icon:"✅", done:ticket.status==="REPARE", time:ticket.resolved_date },
  ];
  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif" }}>
      {steps.map((s, i) => (
        <div key={i} className="sig-step">
          <div className="sig-step-dot"
            style={{ background:s.done?C.green:"#E2E8E5", color:s.done?"#fff":C.textLight }}>
            {s.done ? "✓" : i+1}
          </div>
          <div style={{ fontSize:12, fontWeight:s.done?700:400, color:s.done?C.text:C.textLight }}>
            {s.icon} {s.label}
          </div>
          {s.time && s.done && (
            <div style={{ fontSize:10, color:C.textLight, marginTop:2 }}>{fmtDT(s.time)}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CARTE SIGNALEMENT HISTORIQUE
// ─────────────────────────────────────────────────────────────────────────────
function CarteSignalement({ s, expanded, onToggle }) {
  const st = STATUT_CFG[s.status] || STATUT_CFG.SIGNALE;
  const isUrgent = s.severity==="CRITIQUE";
  return (
    <div className="sig-card sig-fade"
      style={{ border:`1px solid ${C.border}`, borderLeft:`4px solid ${isUrgent?C.red:C.amber}` }}>
      <div style={{ padding:"14px 16px", cursor:"pointer", display:"flex", alignItems:"flex-start", gap:12 }} onClick={onToggle}>
        <div style={{ width:42, height:42, borderRadius:10, flexShrink:0, background:isUrgent?C.redLight:C.amberLight, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
          {isUrgent?"🚨":"🔧"}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, flexWrap:"wrap" }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{s.title||"Incident signalé"}</div>
            <span style={{ padding:"2px 9px", borderRadius:99, fontSize:10, fontWeight:700, background:st.bg, color:st.color, whiteSpace:"nowrap" }}>
              {st.label}
            </span>
          </div>
          <div style={{ fontSize:11, color:C.textLight, marginTop:2 }}>
            {fmtDT(s.reported_date||s.created_at)}
            {s.location && ` · 📍 ${s.location}`}
          </div>
          {!["REPARE","NON_REPARABLE"].includes(s.status) && (
            <div style={{ marginTop:5, fontSize:11, color:C.green, fontWeight:600 }}>🔄 Suivre l'intervention →</div>
          )}
        </div>
        <span style={{ fontSize:14, color:C.textLight }}>{expanded?"▲":"▼"}</span>
      </div>

      {expanded && (
        <div className="sig-slide" style={{ padding:"0 16px 16px", borderTop:`1px solid ${C.border}` }}>
          {s.description && (
            <div style={{ marginTop:12, fontSize:12, color:C.textMid, lineHeight:1.6, background:C.bg, borderRadius:8, padding:"8px 12px" }}>
              {s.description}
            </div>
          )}
          <div style={{ marginTop:14 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px", marginBottom:10 }}>📍 Suivi de l'intervention</div>
            <TimelineSuivi ticket={s}/>
          </div>
          {s.notes && s.status==="REPARE" && (
            <div style={{ marginTop:10, background:C.greenLight, borderRadius:8, padding:"8px 12px", fontSize:11, color:C.green }}>
              <b>✓ Clôture :</b> {s.notes}
            </div>
          )}
          {s.photo_url && (
            <div style={{ marginTop:10, position:"relative", cursor:"pointer", overflow:"hidden", borderRadius:9 }}>
              <img src={s.photo_url} alt="Photo" style={{ width:"100%", maxHeight:160, objectFit:"cover" }}/>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export function TabSignalements({ vehicule, driverType = "SCOLAIRE" }) {
  // driverType : "SCOLAIRE" (bus attitré + missions) | "POLYVALENT" (missions seulement)

  const [missions,     setMissions]     = useState([]);
  const [signalements, setSignalements] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeView,   setActiveView]   = useState("nouveau");
  const [toast,        setToast]        = useState({ msg:"", type:"success" });
  const [submitting,   setSubmitting]   = useState(false);
  const [submitted,    setSubmitted]    = useState(null); // null | { mode, ticketRef, vehicleLabel }
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [expandedId,   setExpandedId]   = useState(null);
  const fileRef = useRef();

  // ── Formulaire ──
  const [mode,      setMode]      = useState(null);       // "IMMOBILISATION" | "INCIDENT"
  const [cause,     setCause]     = useState("");
  // Contexte véhicule : "TRANSPORT" = bus attitré, "MISSION" = véhicule de mission
  const [contexte,  setContexte]  = useState(null);
  const [missionId, setMissionId] = useState("");
  const [form, setForm] = useState({
    description:"", passagers:"", blesses:false, actions_terrain:"",
  });
  const [localisation, setLocalisation] = useState("");
  const [geoState, setGeoState]     = useState("idle"); // idle|loading|success|error
  const [geoCoords, setGeoCoords]   = useState(null);   // { lat, lng }
  const [photo, setPhoto]           = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [errors, setErrors]         = useState({});

  const set = (k, v) => { setForm(f => ({ ...f, [k]:v })); setErrors(e => ({ ...e, [k]:"" })); };
  const showToast = useCallback((msg, type="success") => setToast({ msg, type }), []);

  // ── Chargement ──
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, sig] = await Promise.all([
        apiFetch("/reservations/?driver=me&status=APPROUVEE").catch(() => []),
        apiFetch("/maintenance/breakdowns/?driver=me").catch(() => []),
      ]);
      const m = Array.isArray(res) ? res : res?.results ?? [];
      m.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
      setMissions(m);
      setSignalements(Array.isArray(sig) ? sig : sig?.results ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Géolocalisation ──
  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      showToast("Géolocalisation non supportée sur cet appareil", "error");
      setGeoState("error");
      return;
    }
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setGeoCoords({ lat, lng });
        setGeoState("success");
        // Reverse geocoding via Nominatim (OpenStreetMap, gratuit)
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`,
            { headers: { "User-Agent": "DRIVEPARC-IUC/1.0" } }
          );
          const data = await r.json();
          const addr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setLocalisation(addr);
          setErrors(e => ({ ...e, localisation:"" }));
        } catch {
          setLocalisation(`GPS : ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      },
      (err) => {
        setGeoState("error");
        const msg = err.code === 1
          ? "Accès à la position refusé — saisissez manuellement."
          : "Impossible d'obtenir la position GPS.";
        showToast(msg, "error");
      },
      { timeout:12000, maximumAge:60000 }
    );
  };

  // ── Photo ──
  const handlePhoto = file => {
    if (!file) return;
    if (file.size > 10*1024*1024) { showToast("Photo trop volumineuse (max 10 Mo)", "error"); return; }
    setPhoto(file);
    const r = new FileReader();
    r.onload = e => setPhotoPreview(e.target.result);
    r.readAsDataURL(file);
  };

  // ── Réinitialisation complète ──
  const resetForm = useCallback(() => {
    setMode(null);
    setCause("");
    setContexte(null);
    setMissionId("");
    setForm({ description:"", passagers:"", blesses:false, actions_terrain:"" });
    setLocalisation("");
    setGeoState("idle");
    setGeoCoords(null);
    setPhoto(null);
    setPhotoPreview(null);
    setErrors({});
    setSubmitted(null);
    setShowSOSModal(false);
  }, []);

  // ── Validation ──
  const validate = () => {
    const e = {};
    if (!cause)                    e.cause        = "Sélectionnez la cause.";
    if (!form.description.trim())  e.description  = "Décrivez l'incident.";
    if (!localisation.trim())      e.localisation = "Indiquez votre position.";
    // Contexte requis uniquement pour le chauffeur scolaire
    if (driverType === "SCOLAIRE" && !contexte)
                                   e.contexte     = "Précisez le contexte (transport ou mission).";
    if (contexte === "MISSION" && !missionId)
                                   e.missionId    = "Sélectionnez la mission en cours.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Déclenche la soumission (après confirmation pour SOS) ──
  const handleSubmitTrigger = () => {
    if (!validate()) return;
    if (mode === "IMMOBILISATION") {
      setShowSOSModal(true);
    } else {
      doSubmit();
    }
  };

  // ── Soumission réelle ──
  const doSubmit = async () => {
    setShowSOSModal(false);
    setSubmitting(true);
    try {
      const allCauses = [...CAUSES_IMMOBILISATION, ...CAUSES_INCIDENT];
      const causeLabel = allCauses.find(c => c.val === cause)?.label || cause;

      // Détermine le véhicule et les infos liées
      let vehicleId   = vehicule?.id || "";
      let vehicleLabel = vehicule
        ? `${vehicule.make||""} ${vehicule.model||""} ${vehicule.registration_number||vehicule.license_plate||""}`.trim()
        : "";

      if (contexte === "MISSION" && missionId) {
        const m = missions.find(x => String(x.id) === String(missionId));
        if (m?.vehicle_id)   vehicleId    = m.vehicle_id;
        if (m?.vehicle_name && m.vehicle_name !== "Non assigné") vehicleLabel = m.vehicle_name;
      }

      const notesLines = [
        `Passagers à bord : ${form.passagers || 0}`,
        form.blesses ? "⚠️ BLESSÉS SIGNALÉS" : "Conducteur indemne",
        form.actions_terrain ? `Actions terrain : ${form.actions_terrain}` : null,
        geoCoords ? `Coordonnées GPS : ${geoCoords.lat.toFixed(6)}, ${geoCoords.lng.toFixed(6)}` : null,
        contexte ? `Contexte : ${contexte === "TRANSPORT" ? "Transport scolaire habituel" : "Mission assignée"}` : null,
      ].filter(Boolean).join("\n");

      const fd = new FormData();
      fd.append("title",       causeLabel);
      fd.append("vehicle",     vehicleId);
      fd.append("description", form.description);
      fd.append("location",    localisation);
      fd.append("severity",    mode==="IMMOBILISATION" ? "CRITIQUE" : "MOYENNE");
      fd.append("category",    mode);
      fd.append("notes",       notesLines);
      if (missionId) fd.append("reservation", missionId);
      if (photo)     fd.append("photo",       photo);

      const result = await apiFetch("/maintenance/breakdowns/", { method:"POST", body:fd });

      setSubmitted({
        mode,
        ticketRef:    result?.id || result?.reference || null,
        vehicleLabel: vehicleLabel || "—",
      });
      showToast(
        mode==="IMMOBILISATION" ? "🚨 SOS envoyé — le gestionnaire est alerté !" : "✓ Incident signalé avec succès",
        mode==="IMMOBILISATION" ? "urgence" : "success"
      );
      load();
    } catch (e) {
      showToast("Erreur : " + e.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Mission sélectionnée ──
  const selectedMission = missions.find(m => String(m.id) === String(missionId));

  const pendingCount = signalements.filter(s => !["REPARE","NON_REPARABLE"].includes(s.status)).length;

  const allCauses = [...CAUSES_IMMOBILISATION, ...CAUSES_INCIDENT];
  const causeLabel = allCauses.find(c => c.val === cause)?.label || "";

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"80px 0", gap:12, fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ width:26, height:26, border:`3px solid ${C.green}`, borderTopColor:"transparent", borderRadius:"50%", animation:"sig-spin .8s linear infinite" }}/>
      <span style={{ fontSize:13, color:C.textLight }}>Chargement…</span>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, fontFamily:"'DM Sans',sans-serif" }}>
      <style>{CSS}</style>
      <Toast msg={toast.msg} type={toast.type} onDone={() => setToast({ msg:"" })}/>

      {/* Modal confirmation SOS */}
      {showSOSModal && (
        <ModalConfirmSOS
          causeLabel={causeLabel}
          onConfirm={doSubmit}
          onCancel={() => setShowSOSModal(false)}
          submitting={submitting}
        />
      )}

      {/* ── EN-TÊTE ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:800, color:C.text, margin:0 }}>Signalement d'Urgence</h2>
          <p style={{ fontSize:12, color:C.textLight, margin:"4px 0 0" }}>Panne, accident, incident sur la route</p>
        </div>
        {vehicule && (
          <div style={{ background:C.greenLight, border:`1px solid ${C.green}20`, borderRadius:9, padding:"8px 16px", display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:16 }}>🚗</span>
            <div>
              <div style={{ fontSize:10, color:C.textMid, fontWeight:700 }}>Mon véhicule</div>
              <div style={{ fontSize:12, fontWeight:800, color:C.green, fontFamily:"'JetBrains Mono',monospace" }}>
                {vehicule.registration_number || vehicule.license_plate}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── ONGLETS ── */}
      <div style={{ display:"flex", gap:8 }}>
        {[
          { id:"nouveau",    label:"Signaler un incident", icon:"🚨" },
          { id:"historique", label:"Mes signalements",     icon:"📋", badge:pendingCount },
        ].map(t => (
          <button key={t.id} onClick={() => { setActiveView(t.id); setSubmitted(null); }}
            style={{ padding:"9px 20px", borderRadius:9, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", border:"none", display:"flex", alignItems:"center", gap:6,
              background:activeView===t.id ? C.green : "#fff",
              color:      activeView===t.id ? "#fff"  : C.textMid,
              boxShadow:  activeView===t.id ? `0 4px 14px ${C.green}40` : "0 1px 3px rgba(0,0,0,.06)" }}>
            {t.icon} {t.label}
            {t.badge > 0 && (
              <span style={{ background:C.red, color:"#fff", borderRadius:99, fontSize:9, fontWeight:800, minWidth:16, height:16, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px" }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════ NOUVEAU SIGNALEMENT ════════ */}
      {activeView === "nouveau" && (
        <>
          {/* Écran de succès professionnel */}
          {submitted && (
            <EcranSucces
              mode={submitted.mode}
              ticketRef={submitted.ticketRef}
              vehicleLabel={submitted.vehicleLabel}
              onNewReport={resetForm}
              onHistory={() => { setActiveView("historique"); setSubmitted(null); }}
            />
          )}

          {!submitted && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:16, alignItems:"start" }} className="sig-grid-2">

              {/* ── Colonne formulaire ── */}
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

                {/* STEP 1 — Type incident */}
                <div className="sig-card" style={{ padding:"20px" }}>
                  <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:4 }}>1. Que se passe-t-il ?</div>
                  <div style={{ fontSize:11, color:C.textLight, marginBottom:16 }}>Choisissez la situation qui correspond à votre cas</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>

                    <button className={`sig-type-btn${mode==="IMMOBILISATION"?" sel-red":""}`}
                      onClick={() => { setMode("IMMOBILISATION"); setCause(""); setErrors(e=>({...e,cause:""})); }}>
                      <div style={{ fontSize:32, marginBottom:8 }}>🚨</div>
                      <div style={{ fontSize:14, fontWeight:800, color:mode==="IMMOBILISATION"?C.red:C.text, marginBottom:6 }}>
                        Immobilisation
                      </div>
                      <div style={{ fontSize:11, color:C.textMid, lineHeight:1.5, marginBottom:8 }}>
                        Le véhicule <b>ne peut plus rouler</b>. Accident, panne totale, incendie.
                      </div>
                      <div style={{ fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:99, display:"inline-block",
                        background:mode==="IMMOBILISATION"?"#fff":C.red, color:mode==="IMMOBILISATION"?C.red:"#fff" }}>
                        {mode==="IMMOBILISATION" ? "✓ Sélectionné" : "→ Urgence SOS"}
                      </div>
                    </button>

                    <button className={`sig-type-btn${mode==="INCIDENT"?" sel-amber":""}`}
                      onClick={() => { setMode("INCIDENT"); setCause(""); setErrors(e=>({...e,cause:""})); }}>
                      <div style={{ fontSize:32, marginBottom:8 }}>🔧</div>
                      <div style={{ fontSize:14, fontWeight:800, color:mode==="INCIDENT"?C.amber:C.text, marginBottom:6 }}>
                        Incident mineur
                      </div>
                      <div style={{ fontSize:11, color:C.textMid, lineHeight:1.5, marginBottom:8 }}>
                        Le véhicule <b>peut continuer</b>. Rétro cassé, vitre brisée, crevaison avec roue de secours.
                      </div>
                      <div style={{ fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:99, display:"inline-block",
                        background:mode==="INCIDENT"?"#fff":C.amber, color:mode==="INCIDENT"?C.amber:"#fff" }}>
                        {mode==="INCIDENT" ? "✓ Sélectionné" : "→ Signalement"}
                      </div>
                    </button>
                  </div>
                  {errors.cause && <div style={{ fontSize:11, color:C.red, marginTop:8 }}>⚠ {errors.cause}</div>}
                </div>

                {/* STEP 2 — Cause précise */}
                {mode && (
                  <div className="sig-card sig-slide" style={{ padding:"20px" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:4 }}>2. Cause précise</div>
                    {mode==="IMMOBILISATION" && (
                      <div style={{ background:C.redLight, border:`1px solid ${C.red}25`, borderRadius:9, padding:"10px 14px", marginBottom:12, display:"flex", alignItems:"flex-start", gap:8 }}>
                        <span style={{ fontSize:16 }}>🔴</span>
                        <div style={{ fontSize:12, color:C.red, lineHeight:1.5 }}>
                          <b>Sécurité d'abord :</b> si des personnes sont blessées, appelez le <b>15</b> (SAMU) ou le <b>17</b> (Police) immédiatement.
                        </div>
                      </div>
                    )}
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                      {(mode==="IMMOBILISATION" ? CAUSES_IMMOBILISATION : CAUSES_INCIDENT).map(c => (
                        <button key={c.val} type="button" onClick={() => { setCause(c.val); setErrors(e=>({...e,cause:""})); }}
                          className={`sig-cause-btn${cause===c.val?(mode==="IMMOBILISATION"?" sel-red":" sel-amber"):""}`}>
                          <span style={{ fontSize:18, flexShrink:0 }}>{c.icon}</span>
                          <span style={{ fontSize:12, fontWeight:600, lineHeight:1.4, color:cause===c.val?(mode==="IMMOBILISATION"?C.red:C.amber):C.text }}>
                            {c.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 3 — Contexte véhicule (SCOLAIRE uniquement) */}
                {mode && cause && driverType === "SCOLAIRE" && (
                  <div className="sig-card sig-slide" style={{ padding:"20px" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:4 }}>
                      3. Quel véhicule est concerné ?
                    </div>
                    <div style={{ fontSize:11, color:C.textLight, marginBottom:14 }}>
                      L'incident concerne-t-il votre bus de transport habituel ou un véhicule de mission ?
                    </div>
                    <div style={{ display:"flex", gap:10 }}>
                      {/* Transport scolaire habituel */}
                      <button className={`sig-ctx-btn${contexte==="TRANSPORT"?" sel":""}`}
                        onClick={() => { setContexte("TRANSPORT"); setMissionId(""); setErrors(e=>({...e,contexte:"",missionId:""})); }}>
                        <div style={{ fontSize:24, marginBottom:6 }}>🚌</div>
                        <div style={{ fontSize:13, fontWeight:700, color:contexte==="TRANSPORT"?C.green:C.text }}>
                          Mon bus scolaire
                        </div>
                        <div style={{ fontSize:11, color:C.textLight, marginTop:3, lineHeight:1.5 }}>
                          Transport d'élèves habituel
                        </div>
                        {vehicule && (
                          <div style={{ marginTop:8, fontSize:11, fontWeight:700, color:C.green, fontFamily:"'JetBrains Mono',monospace", background:C.greenLight, padding:"3px 8px", borderRadius:6, display:"inline-block" }}>
                            {vehicule.registration_number || vehicule.license_plate}
                          </div>
                        )}
                      </button>

                      {/* Mission assignée */}
                      <button className={`sig-ctx-btn${contexte==="MISSION"?" sel":""}`}
                        onClick={() => { setContexte("MISSION"); setErrors(e=>({...e,contexte:""})); }}>
                        <div style={{ fontSize:24, marginBottom:6 }}>🗺️</div>
                        <div style={{ fontSize:13, fontWeight:700, color:contexte==="MISSION"?C.green:C.text }}>
                          Véhicule de mission
                        </div>
                        <div style={{ fontSize:11, color:C.textLight, marginTop:3, lineHeight:1.5 }}>
                          Autre véhicule assigné pour une mission spécifique
                        </div>
                        {missions.length > 0 && (
                          <div style={{ marginTop:8, fontSize:10, color:C.textLight }}>
                            {missions.length} mission{missions.length>1?"s":""} disponible{missions.length>1?"s":""}
                          </div>
                        )}
                      </button>
                    </div>
                    {errors.contexte && <div style={{ fontSize:11, color:C.red, marginTop:8 }}>⚠ {errors.contexte}</div>}
                  </div>
                )}

                {/* STEP 3b — Mission pour POLYVALENT ou SCOLAIRE avec contexte MISSION */}
                {mode && cause && (driverType === "POLYVALENT" || contexte === "MISSION") && (
                  <div className="sig-card sig-slide" style={{ padding:"20px" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:4 }}>
                      {driverType==="SCOLAIRE" ? "4." : "3."} Mission en cours *
                    </div>
                    <div style={{ fontSize:11, color:C.textLight, marginBottom:12 }}>
                      Sélectionnez la mission lors de laquelle l'incident s'est produit
                    </div>

                    {missions.length === 0 ? (
                      <div style={{ background:C.amberLight, borderRadius:9, padding:"12px 14px", fontSize:12, color:C.amber }}>
                        ⚠️ Aucune mission approuvée en cours. Contactez le gestionnaire.
                      </div>
                    ) : (
                      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                        {missions.slice(0, 8).map(m => {
                          const sel = String(missionId) === String(m.id);
                          return (
                            <div key={m.id} onClick={() => { setMissionId(String(m.id)); setErrors(e=>({...e,missionId:""})); }}
                              style={{ padding:"12px 14px", borderRadius:9, cursor:"pointer", transition:"all .12s",
                                border:`1.5px solid ${sel ? C.green : C.border}`,
                                background: sel ? C.greenLight : C.bg }}>
                              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                                <div>
                                  <div style={{ fontSize:12, fontWeight:700, color:sel?C.green:C.text }}>
                                    {m.requester_name || "Mission"} → {m.destination || "—"}
                                  </div>
                                  <div style={{ fontSize:11, color:C.textLight, marginTop:2 }}>
                                    {fmtShort(m.start_date)}
                                    {m.vehicle_name && m.vehicle_name !== "Non assigné" && (
                                      <span style={{ marginLeft:8, fontWeight:700, color:C.green, fontFamily:"'JetBrains Mono',monospace", fontSize:10 }}>
                                        🚗 {m.vehicle_name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {sel && (
                                  <span style={{ fontSize:12, color:C.green, fontWeight:800 }}>✓</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {errors.missionId && <div style={{ fontSize:11, color:C.red, marginTop:8 }}>⚠ {errors.missionId}</div>}

                    {/* Infos véhicule de mission si sélectionné */}
                    {selectedMission?.vehicle_name && selectedMission.vehicle_name !== "Non assigné" && (
                      <div style={{ marginTop:12, background:C.greenLight, border:`1px solid ${C.green}25`, borderRadius:9, padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ fontSize:18 }}>🚗</span>
                        <div>
                          <div style={{ fontSize:10, color:C.textMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"1px" }}>Véhicule de la mission</div>
                          <div style={{ fontSize:13, fontWeight:800, color:C.green, fontFamily:"'JetBrains Mono',monospace" }}>
                            {selectedMission.vehicle_name}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 4 — Détails */}
                {mode && cause && (driverType === "POLYVALENT" || contexte !== null) && (
                  <div className="sig-card sig-slide" style={{ padding:"20px" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:16 }}>
                      {driverType==="SCOLAIRE"
                        ? (contexte==="MISSION" ? "5." : "4.")
                        : "4."} Détails de l'incident
                    </div>

                    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

                      {/* Description */}
                      <div>
                        <label className="sig-lbl">Ce qui s'est passé *</label>
                        <textarea value={form.description} onChange={e => set("description", e.target.value)}
                          rows={4} placeholder="Décrivez précisément l'incident : circonstances, symptômes, bruits anormaux, dommages visibles…"
                          className={`sig-inp${errors.description?" sig-inp-err":""}`}
                          style={{ resize:"vertical", minHeight:100 }}/>
                        {errors.description && <div style={{ fontSize:11, color:C.red, marginTop:3 }}>⚠ {errors.description}</div>}
                      </div>

                      {/* Localisation + GPS */}
                      <div>
                        <label className="sig-lbl">
                          Localisation exacte *
                          <span style={{ fontSize:9, color:C.textLight, fontWeight:400, textTransform:"none", letterSpacing:0, marginLeft:6 }}>
                            (pour que l'assistance puisse vous trouver)
                          </span>
                        </label>
                        <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                          <GeoButton onLocate={handleGeolocate} geoState={geoState}/>
                        </div>
                        <textarea value={localisation} onChange={e => { setLocalisation(e.target.value); setErrors(er=>({...er,localisation:""})); }}
                          rows={2} placeholder="Ex : Carrefour Ndokoti, km 12 Autoroute Douala-Yaoundé, Parking IUC Logbessou…"
                          className={`sig-inp${errors.localisation?" sig-inp-err":""}`}
                          style={{ resize:"vertical" }}/>
                        {geoCoords && (
                          <div style={{ fontSize:10, color:C.green, fontWeight:600, marginTop:3, fontFamily:"'JetBrains Mono',monospace" }}>
                            📡 {geoCoords.lat.toFixed(5)}, {geoCoords.lng.toFixed(5)}
                          </div>
                        )}
                        {errors.localisation && <div style={{ fontSize:11, color:C.red, marginTop:3 }}>⚠ {errors.localisation}</div>}
                      </div>

                      {/* Passagers + Blessés */}
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                        <div>
                          <label className="sig-lbl">Passagers à bord</label>
                          <input type="number" min="0" className="sig-inp" value={form.passagers}
                            onChange={e => set("passagers", e.target.value)} placeholder="0"/>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
                          <div onClick={() => set("blesses", !form.blesses)}
                            style={{ padding:"10px 14px", borderRadius:9, cursor:"pointer",
                              border:`1.5px solid ${form.blesses?C.red:C.border}`,
                              background:form.blesses?C.redLight:C.bg,
                              display:"flex", alignItems:"center", gap:10, transition:"all .12s" }}>
                            <div style={{ width:20, height:20, borderRadius:5, flexShrink:0, border:`2px solid ${form.blesses?C.red:C.border}`, background:form.blesses?C.red:"#fff", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .12s" }}>
                              {form.blesses && <span style={{ fontSize:11, color:"#fff", fontWeight:800 }}>✓</span>}
                            </div>
                            <div>
                              <div style={{ fontSize:12, fontWeight:700, color:form.blesses?C.red:C.text }}>Des blessés</div>
                              <div style={{ fontSize:10, color:C.textLight }}>Appel secours requis</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {form.blesses && (
                        <div className="sig-fade" style={{ background:C.redLight, border:`1.5px solid ${C.red}30`, borderRadius:9, padding:"10px 14px", display:"flex", gap:10 }}>
                          <span style={{ fontSize:18, flexShrink:0 }}>🚑</span>
                          <div style={{ fontSize:12, color:C.red, lineHeight:1.6 }}>
                            <b>Appelez le 15 (SAMU) ou le 17 (Police) immédiatement</b> pour les blessés. Ce signalement alertera aussi le gestionnaire.
                          </div>
                        </div>
                      )}

                      {/* Actions terrain */}
                      <div>
                        <label className="sig-lbl">
                          Actions déjà prises
                          <span style={{ fontSize:9, color:C.textLight, fontWeight:400, textTransform:"none", letterSpacing:0, marginLeft:4 }}>(optionnel)</span>
                        </label>
                        <input className="sig-inp" value={form.actions_terrain}
                          onChange={e => set("actions_terrain", e.target.value)}
                          placeholder="Ex : Triangle posé, gyrophare allumé, roue de secours montée…"/>
                      </div>

                      {/* Photo */}
                      <div>
                        <label className="sig-lbl">Photo des dommages (recommandé)</label>
                        <div onClick={() => fileRef.current?.click()}
                          style={{ border:`2px dashed ${photo?C.green:C.border}`, borderRadius:10, padding:16, cursor:"pointer", background:photo?C.greenLight:C.bg, transition:"all .12s", display:"flex", alignItems:"center", gap:14 }}>
                          <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
                            onChange={e => handlePhoto(e.target.files?.[0])}/>
                          {photoPreview ? (
                            <>
                              <img src={photoPreview} alt="aperçu" style={{ width:64, height:64, objectFit:"cover", borderRadius:8, flexShrink:0 }}/>
                              <div>
                                <div style={{ fontSize:12, fontWeight:700, color:C.green }}>{photo.name}</div>
                                <div style={{ fontSize:11, color:C.textLight }}>{(photo.size/1024).toFixed(0)} Ko</div>
                                <button onClick={e => { e.stopPropagation(); setPhoto(null); setPhotoPreview(null); }}
                                  style={{ marginTop:4, fontSize:11, color:C.red, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", padding:0 }}>
                                  ✕ Supprimer
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={{ fontSize:28 }}>📷</div>
                              <div>
                                <div style={{ fontSize:12, color:C.textMid, fontWeight:600 }}>Prenez une photo des dommages</div>
                                <div style={{ fontSize:11, color:C.textLight, marginTop:2 }}>JPG, PNG — max 10 Mo</div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* BOUTON ENVOI */}
                {mode && cause && (driverType==="POLYVALENT" || contexte!==null) && (
                  <button onClick={handleSubmitTrigger} disabled={submitting}
                    className={mode==="IMMOBILISATION" ? "sig-sos-btn" : ""}
                    style={{ padding:"16px 24px", borderRadius:10, border:"none",
                      background:mode==="IMMOBILISATION"?C.red:C.green, color:"#fff",
                      fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"inherit",
                      display:"flex", alignItems:"center", gap:10, justifyContent:"center",
                      opacity:submitting?0.7:1,
                      boxShadow:mode==="IMMOBILISATION"?`0 4px 24px ${C.red}60`:`0 4px 20px ${C.green}50`,
                      transition:"transform .1s, opacity .1s",
                    }}>
                    {submitting ? (
                      <>
                        <span style={{ width:18, height:18, border:"2px solid rgba(255,255,255,.4)", borderTopColor:"#fff", borderRadius:"50%", animation:"sig-spin .8s linear infinite", display:"inline-block" }}/>
                        Envoi en cours…
                      </>
                    ) : mode==="IMMOBILISATION" ? "🚨 Envoyer le SOS — Urgence immédiate"
                                               : "📋 Envoyer le signalement"}
                  </button>
                )}

                {/* Résumé erreurs */}
                {Object.keys(errors).length > 0 && (
                  <div className="sig-fade" style={{ background:C.redLight, border:`1px solid ${C.red}25`, borderRadius:10, padding:"12px 14px" }}>
                    <div style={{ fontSize:12, color:C.red, fontWeight:700, marginBottom:4 }}>⚠ Corrigez les erreurs suivantes :</div>
                    {Object.values(errors).filter(Boolean).map((e, i) => (
                      <div key={i} style={{ fontSize:11, color:C.red, marginTop:2 }}>• {e}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Sidebar ── */}
              <div className="sig-sidebar" style={{ display:"flex", flexDirection:"column", gap:12 }}>

                {/* Numéros urgence */}
                <div style={{ background:C.redLight, border:`1.5px solid ${C.red}25`, borderRadius:12, padding:"16px 18px" }}>
                  <div style={{ fontSize:13, fontWeight:800, color:C.red, marginBottom:12 }}>🆘 Numéros d'urgence</div>
                  {[
                    { num:"15",  label:"SAMU",     desc:"Urgences médicales" },
                    { num:"17",  label:"Police",   desc:"Accidents de la route" },
                    { num:"18",  label:"Pompiers", desc:"Incendie / Danger" },
                  ].map(n => (
                    <div key={n.num} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom:`1px solid ${C.red}12` }}>
                      <div style={{ fontSize:18, fontWeight:900, color:C.red, minWidth:28, fontFamily:"'JetBrains Mono',monospace" }}>{n.num}</div>
                      <div>
                        <div style={{ fontSize:12, fontWeight:700, color:C.text }}>{n.label}</div>
                        <div style={{ fontSize:10, color:C.textLight }}>{n.desc}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop:12, fontSize:11, color:C.red, lineHeight:1.6 }}>
                    ⚠️ En cas de blessés, appelez les secours <b>avant</b> de remplir ce formulaire.
                  </div>
                </div>

                {/* Guide rapide */}
                <div className="sig-card" style={{ padding:"16px 18px" }}>
                  <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:12 }}>💡 Que faire en attendant ?</div>
                  {[
                    { n:1, text:"Mettez le triangle de signalisation (50 m en amont)" },
                    { n:2, text:"Allumez les feux de détresse" },
                    { n:3, text:"Faites descendre les passagers si danger immédiat" },
                    { n:4, text:"Restez visible mais en sécurité hors de la chaussée" },
                    { n:5, text:"Attendez les instructions du gestionnaire" },
                  ].map(s => (
                    <div key={s.n} style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:9 }}>
                      <div style={{ width:20, height:20, borderRadius:"50%", background:C.green, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, flexShrink:0, marginTop:1 }}>
                        {s.n}
                      </div>
                      <span style={{ fontSize:12, color:C.textMid, lineHeight:1.5 }}>{s.text}</span>
                    </div>
                  ))}
                </div>

                {/* Signalements en cours */}
                {pendingCount > 0 && (
                  <div className="sig-card" style={{ padding:"16px 18px" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:10 }}>⏳ En cours ({pendingCount})</div>
                    {signalements.filter(s => !["REPARE","NON_REPARABLE"].includes(s.status)).slice(0,3).map((s, i) => {
                      const st = STATUT_CFG[s.status] || STATUT_CFG.SIGNALE;
                      return (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:i<2?`1px solid ${C.border}`:"none" }}>
                          <div style={{ width:8, height:8, borderRadius:"50%", background:st.color, flexShrink:0 }}/>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:600, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.title||"Incident"}</div>
                            <div style={{ fontSize:10, color:C.textLight }}>{fmtShort(s.reported_date||s.created_at)}</div>
                          </div>
                          <span style={{ fontSize:9, fontWeight:700, color:st.color, background:st.bg, padding:"2px 8px", borderRadius:99, whiteSpace:"nowrap" }}>{st.label}</span>
                        </div>
                      );
                    })}
                    <button onClick={() => setActiveView("historique")}
                      style={{ marginTop:8, width:"100%", padding:7, border:`1px solid ${C.border}`, borderRadius:7, background:C.bg, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", color:C.textMid }}>
                      Voir tout →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════ HISTORIQUE ════════ */}
      {activeView === "historique" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
            {[
              { label:"Total",      val:signalements.length,                                                               color:C.blue   },
              { label:"En attente", val:signalements.filter(s=>["SIGNALE","EN_ATTENTE"].includes(s.status)).length,        color:C.amber  },
              { label:"En cours",   val:signalements.filter(s=>["EN_DIAGNOSTIC","EN_REPARATION"].includes(s.status)).length, color:C.orange },
              { label:"Clôturés",   val:signalements.filter(s=>s.status==="REPARE").length,                                color:C.green  },
            ].map((k, i) => (
              <div key={i} className="sig-card" style={{ padding:"14px 16px", textAlign:"center", borderTop:`3px solid ${k.color}` }}>
                <div style={{ fontSize:22, fontWeight:800, color:k.color }}>{k.val}</div>
                <div style={{ fontSize:10, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px", marginTop:4 }}>{k.label}</div>
              </div>
            ))}
          </div>

          <div style={{ background:C.blueLight, border:`1px solid #BFDBFE`, borderRadius:9, padding:"10px 14px", fontSize:12, color:C.blue, display:"flex", gap:8 }}>
            <span>ℹ️</span>
            <div>Une fois votre véhicule rapatrié, le gestionnaire clôturera l'incident et créera une <b>fiche de maintenance</b> pour la réparation.</div>
          </div>

          {signalements.length === 0 ? (
            <div className="sig-card" style={{ padding:"60px 20px", textAlign:"center" }}>
              <div style={{ fontSize:40, marginBottom:10 }}>📋</div>
              <div style={{ fontSize:13, fontWeight:700, color:C.text }}>Aucun signalement enregistré</div>
              <div style={{ fontSize:12, color:C.textLight, marginTop:6 }}>Vos incidents signalés apparaîtront ici.</div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {signalements.map(s => (
                <CarteSignalement key={s.id} s={s}
                  expanded={expandedId===s.id}
                  onToggle={() => setExpandedId(expandedId===s.id?null:s.id)}/>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}