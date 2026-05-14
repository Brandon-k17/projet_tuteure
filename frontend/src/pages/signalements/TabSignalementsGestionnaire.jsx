// ─── pages/signalements/TabSignalementsGestionnaire.jsx ──────────────────────
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { apiFetch } from "../../utils/api";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES MÉTIER
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_CFG = {
  CRITIQUE: { label: "Critique", color: "#C0182A", bg: "#FDF0F1", icon: "🔴", sla: 1  },
  HAUTE:    { label: "Urgente",  color: "#EA580C", bg: "#FFF7ED", icon: "🟠", sla: 4  },
  MOYENNE:  { label: "Normale",  color: "#D97706", bg: "#FFFBEB", icon: "🟡", sla: 24 },
  BASSE:    { label: "Faible",   color: "#1B5E37", bg: "#EAF4EE", icon: "🟢", sla: 72 },
};

const STATUS_CFG = {
  SIGNALE:       { label: "Nouveau",            color: "#C0182A", bg: "#FDF0F1" },
  EN_DIAGNOSTIC: { label: "Assistance envoyée", color: "#1D4ED8", bg: "#EFF6FF" },
  EN_REPARATION: { label: "Rapatriement",       color: "#D97706", bg: "#FFFBEB" },
  REPARE:        { label: "Clôturé",            color: "#1B5E37", bg: "#EAF4EE" },
  NON_REPARABLE: { label: "Irrécupérable",      color: "#6B7280", bg: "#F3F4F6" },
};

const PANNE_TO_MAINTENANCE = {
  PANNE_MOTEUR:       "REVISION_MAJOR",
  ACCIDENT_COLLISION: "CARROSSERIE",
  PERTE_FREINS:       "FREINS",
  CREVAISON:          "PNEUS",
  RETRO_CASSE:        "CARROSSERIE",
  VITRE_CASSEE:       "CARROSSERIE",
  ECLAIRAGE_DEFAUT:   "ELECTRICITE",
  CARROSSERIE:        "CARROSSERIE",
  CLIMATISATION:      "CLIMATISATION",
  BATTERIE:           "BATTERIE",
  AUTRE:              "AUTRE",
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtDT = d => d
  ? new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })
  : "—";

// Durée écoulée depuis le signalement (pas le SLA restant)
const fmtElapsed = d => {
  if (!d) return null;
  const diffMin = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (diffMin < 1)  return { label: "À l'instant", level: "ok"      };
  if (diffMin < 60) return { label: `${diffMin} min`, level: "ok"    };
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  if (h < 24)       return { label: `${h}h${m > 0 ? m + "min" : ""}`, level: h >= 4 ? "warn" : "ok" };
  const j = Math.floor(h / 24);
  return { label: `${j}j ${h % 24}h`, level: "critical" };
};

// SLA : temps restant basé sur le SLA du niveau de sévérité
const getSLAStatus = ticket => {
  if (!ticket.reported_date) return null;
  const slaH  = SEVERITY_CFG[ticket.severity]?.sla ?? 24;
  const ageH  = (Date.now() - new Date(ticket.reported_date).getTime()) / 3_600_000;
  const pct   = Math.min(100, Math.round((ageH / slaH) * 100));
  const remH  = slaH - ageH;
  const exceeded = ageH > slaH;
  let label;
  if (exceeded) {
    const over = Math.abs(remH);
    label = over < 1
      ? `SLA dépassé de ${Math.round(over * 60)} min`
      : `SLA dépassé de ${Math.round(over)}h`;
  } else {
    label = remH < 1
      ? `${Math.round(remH * 60)} min restantes`
      : `${Math.round(remH)}h restantes`;
  }
  return { pct, exceeded, label };
};

// Extraire l'immatriculation depuis vehicle_registration ou depuis vehicle_name
const extractImmat = ticket => {
  if (ticket.vehicle_registration && ticket.vehicle_registration !== "—") {
    return ticket.vehicle_registration;
  }
  // Tentative : le vehicle_name peut contenir "Marque Modèle — LT 009 CM"
  const name = ticket.vehicle_name || "";
  const dashParts = name.split("—");
  if (dashParts.length >= 2) return dashParts[dashParts.length - 1].trim();
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  @keyframes sig-spin  { to { transform: rotate(360deg); } }
  @keyframes sig-fade  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes sig-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  @keyframes sig-slide { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
  @keyframes bar-grow  { from{height:0} to{height:var(--bh)} }

  .sig-card { animation: sig-fade .2s ease both; transition: box-shadow .15s; }
  .sig-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,.1) !important; }
  .sig-pulse { animation: sig-pulse 2s infinite; }
  .sig-toast { position:fixed; bottom:24px; right:24px; z-index:9999; border-radius:12px;
    padding:14px 20px; font-size:13px; font-weight:600; display:flex; align-items:center;
    gap:10px; box-shadow:0 8px 32px rgba(0,0,0,.2); max-width:420px;
    animation: sig-slide .3s cubic-bezier(.34,1.56,.64,1); }
  .sig-step { position:relative; padding-left:32px; padding-bottom:16px; }
  .sig-step::before { content:''; position:absolute; left:10px; top:24px; bottom:0;
    width:1px; background:#E2E8E5; }
  .sig-step:last-child::before { display:none; }
  .sig-step-dot { position:absolute; left:0; top:4px; width:22px; height:22px;
    border-radius:50%; display:flex; align-items:center; justify-content:center;
    font-size:10px; font-weight:800; }
  .sig-sla-bar { height:5px; border-radius:99px; overflow:hidden; background:#F0F4F2; }
  .sig-sla-fill { height:100%; border-radius:99px; transition:width .6s ease; }
  .sig-tech { border-radius:8px; padding:10px 12px; cursor:pointer; transition:all .12s;
    display:flex; align-items:center; gap:10px; border:1.5px solid #E2E8E5; }
  .sig-tech:hover { border-color:#1B5E37; background:#EAF4EE; }
  .sig-tech.sel   { border-color:#1B5E37; background:#EAF4EE; }
  .bar-col { transition: height .6s ease; }
  input[type=date] { color:#1A2820!important; background:#fff!important; color-scheme:light; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────────

function useToast() {
  const [t, setT] = useState({ msg: "", type: "success" });
  const show = useCallback((msg, type = "success") => {
    setT({ msg, type });
    setTimeout(() => setT({ msg: "" }), 4500);
  }, []);
  return { toast: t, show };
}

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className="sig-toast" style={{ background: type === "error" ? "#C0182A" : "#1B5E37", color: "#fff" }}>
      <span>{type === "error" ? "✕" : "✓"}</span> {msg}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL PHOTO (interne, pas de nouvelle fenêtre)
// ─────────────────────────────────────────────────────────────────────────────

function ModalPhoto({ url, onClose }) {
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.88)", zIndex:2000,
        display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
    >
      <div style={{ position:"relative" }} onClick={e => e.stopPropagation()}>
        <img src={url} alt="Photo de l'incident"
          style={{ maxWidth:"88vw", maxHeight:"82vh", borderRadius:12, objectFit:"contain",
            display:"block", boxShadow:"0 24px 80px rgba(0,0,0,.6)" }} />
        <button onClick={onClose}
          style={{ position:"absolute", top:-14, right:-14, width:34, height:34,
            borderRadius:"50%", background:"#C0182A", color:"#fff", border:"none",
            fontSize:16, cursor:"pointer", fontWeight:800, display:"flex",
            alignItems:"center", justifyContent:"center" }}>✕</button>
        <div style={{ position:"absolute", bottom:-36, left:"50%", transform:"translateX(-50%)",
          fontSize:11, color:"rgba(255,255,255,.5)" }}>
          Cliquez en dehors ou appuyez sur Échap pour fermer
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL BASE
// ─────────────────────────────────────────────────────────────────────────────

function Modal({ title, subtitle, onClose, children, footer, width = 580 }) {
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", backdropFilter:"blur(4px)",
        display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:width,
        maxHeight:"92vh", display:"flex", flexDirection:"column",
        boxShadow:"0 24px 60px rgba(0,0,0,.25)", animation:"sig-fade .2s ease" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"20px 24px", borderBottom:"1px solid #E2E8E5", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:"#1A2820" }}>{title}</div>
            {subtitle && <div style={{ fontSize:12, color:"#8EA99A", marginTop:2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose}
            style={{ background:"none", border:"none", cursor:"pointer", fontSize:20,
              color:"#8EA99A", width:32, height:32, borderRadius:8,
              display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>
        <div style={{ overflowY:"auto", padding:"20px 24px", flex:1 }}>{children}</div>
        {footer && (
          <div style={{ padding:"16px 24px", borderTop:"1px solid #E2E8E5", flexShrink:0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE
// ─────────────────────────────────────────────────────────────────────────────

function Timeline({ ticket }) {
  const steps = [
    { label: "Signalement reçu",      done: true,
      time: ticket.reported_date },
    { label: "Assistance envoyée",    done: ["EN_DIAGNOSTIC","EN_REPARATION","REPARE"].includes(ticket.status),
      time: ticket.assigned_date },
    { label: "Rapatriement en cours", done: ["EN_REPARATION","REPARE"].includes(ticket.status),
      time: ticket.pickup_date },
    { label: "Véhicule rapatrié",     done: ticket.status === "REPARE",
      time: ticket.resolved_date },
  ];
  return (
    <div>
      {steps.map((s, i) => (
        <div key={i} className="sig-step">
          <div className="sig-step-dot"
            style={{ background: s.done ? "#1B5E37" : "#E2E8E5", color: s.done ? "#fff" : "#8EA99A" }}>
            {s.done ? "✓" : i + 1}
          </div>
          <div style={{ fontSize:13, fontWeight: s.done ? 700 : 500, color: s.done ? "#1A2820" : "#8EA99A" }}>
            {s.label}
          </div>
          {s.time && <div style={{ fontSize:11, color:"#8EA99A", marginTop:2 }}>{fmtDT(s.time)}</div>}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL DÉTAIL
// ─────────────────────────────────────────────────────────────────────────────

function ModalDetail({ ticket, techniciens, onClose, onAction, showToast }) {
  const sev    = SEVERITY_CFG[ticket.severity] || SEVERITY_CFG.MOYENNE;
  const st     = STATUS_CFG[ticket.status]     || STATUS_CFG.SIGNALE;
  const sla    = getSLAStatus(ticket);
  const elapsed = fmtElapsed(ticket.reported_date);
  const immat  = extractImmat(ticket);
  const isOpen = !["REPARE","NON_REPARABLE"].includes(ticket.status);

  const [actionType,    setActionType]    = useState(null);
  const [saving,        setSaving]        = useState(false);
  const [assistNotes,   setAssistNotes]   = useState("");
  const [techId,        setTechId]        = useState("");
  const [clotureNotes,  setClotureNotes]  = useState("");
  const [createMaint,   setCreateMaint]   = useState(true);
  const [photoModal,    setPhotoModal]    = useState(false);

  const handleSendAssist = async () => {
    setSaving(true);
    try {
      await apiFetch(`/maintenance/breakdowns/${ticket.id}/assigner/`, {
        method: "POST",
        body: JSON.stringify({ technicien_id: techId || null, notes: assistNotes }),
      });
      showToast("Assistance envoyée");
      onAction();
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handlePickup = async () => {
    setSaving(true);
    try {
      await apiFetch(`/maintenance/breakdowns/${ticket.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: "EN_REPARATION", pickup_date: new Date().toISOString() }),
      });
      showToast("Rapatriement confirmé");
      onAction();
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleClose = async () => {
    setSaving(true);
    try {
      await apiFetch(`/maintenance/breakdowns/${ticket.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "REPARE",
          resolved_date: new Date().toISOString(),
          notes: clotureNotes,
        }),
      });
      if (createMaint && ticket.vehicle) {
        const maintType = PANNE_TO_MAINTENANCE[ticket.category] || "AUTRE";
        try {
          await apiFetch("/maintenance/maintenance/", {
            method: "POST",
            body: JSON.stringify({
              vehicle:          ticket.vehicle,
              maintenance_type: "CORRECTIVE",
              type:             maintType,
              priorite:         ticket.severity === "CRITIQUE" ? "CRITIQUE" : "HAUTE",
              status:           "PLANIFIE",
              scheduled_date:   new Date().toISOString().split("T")[0],
              description:      `[Signalement #${ticket.id}] ${ticket.title}. ${ticket.description || ""}`.trim() +
                                (clotureNotes ? `\n\nNotes de rapatriement : ${clotureNotes}` : ""),
            }),
          });
        } catch (e) { console.warn("Maintenance non créée :", e.message); }
      }
      showToast(createMaint ? "Clôturé — fiche maintenance créée" : "Clôturé");
      onAction();
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const INP = { padding:"9px 12px", border:"1.5px solid #E2E8E5", borderRadius:8,
    fontSize:13, fontFamily:"inherit", color:"#1A2820", background:"#fff",
    width:"100%", outline:"none", boxSizing:"border-box" };
  const LBL = { fontSize:10, fontWeight:700, color:"#4A6358", textTransform:"uppercase",
    letterSpacing:"1px", marginBottom:5, display:"block" };
  const BTN_G = { padding:"9px 20px", background:"#1B5E37", color:"#fff", border:"none",
    borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
    display:"flex", alignItems:"center", gap:6 };
  const BTN_W = { padding:"9px 16px", background:"transparent", border:"1px solid #E2E8E5",
    borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", color:"#4A6358" };

  return (
    <>
      {photoModal && ticket.photo_url && (
        <ModalPhoto url={ticket.photo_url} onClose={() => setPhotoModal(false)} />
      )}

      <Modal
        title={`Signalement #${ticket.id}`}
        subtitle={ticket.vehicle_name}
        onClose={onClose}
        width={640}
        footer={
          isOpen && !actionType ? (
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {ticket.status === "SIGNALE" && (
                <button onClick={() => setActionType("assist")} style={BTN_G}>
                  Envoyer l'assistance
                </button>
              )}
              {ticket.status === "EN_DIAGNOSTIC" && (
                <button onClick={() => setActionType("pickup")}
                  style={{ ...BTN_G, background:"#D97706" }}>
                  Confirmer le rapatriement
                </button>
              )}
              {ticket.status === "EN_REPARATION" && (
                <button onClick={() => setActionType("close")} style={BTN_G}>
                  Clôturer et créer maintenance
                </button>
              )}
              <button onClick={onClose} style={BTN_W}>Fermer</button>
            </div>
          ) : !actionType ? (
            <button onClick={onClose} style={BTN_W}>Fermer</button>
          ) : null
        }
      >
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Badges */}
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ padding:"4px 12px", borderRadius:99, fontSize:11, fontWeight:700,
              background:sev.bg, color:sev.color }}>
              {sev.label}
            </span>
            <span style={{ padding:"4px 12px", borderRadius:99, fontSize:11, fontWeight:700,
              background:st.bg, color:st.color }}>
              {st.label}
            </span>
            {elapsed && (
              <span style={{ fontSize:11, fontWeight:600,
                color: elapsed.level === "critical" ? "#C0182A" : elapsed.level === "warn" ? "#D97706" : "#8EA99A" }}>
                Signalé il y a {elapsed.label}
              </span>
            )}
            {sla && isOpen && (
              <span style={{ fontSize:11, fontWeight:700,
                color: sla.exceeded ? "#C0182A" : "#D97706" }}>
                {sla.exceeded ? "SLA dépassé" : sla.label}
              </span>
            )}
          </div>

          {/* Barre SLA */}
          {sla && isOpen && (
            <div>
              <div className="sig-sla-bar">
                <div className="sig-sla-fill"
                  style={{ width:`${sla.pct}%`,
                    background: sla.pct >= 100 ? "#C0182A" : sla.pct >= 70 ? "#D97706" : "#1B5E37" }} />
              </div>
              <div style={{ fontSize:10, color:"#8EA99A", marginTop:3 }}>
                SLA : {SEVERITY_CFG[ticket.severity]?.sla}h · {sla.pct}% écoulé · {sla.label}
              </div>
            </div>
          )}

          {/* Détails incident */}
          <div style={{ background:"#F4F6F5", borderRadius:10, padding:"14px 16px" }}>
            <div style={{ fontSize:10, fontWeight:800, color:"#1B5E37", textTransform:"uppercase",
              letterSpacing:"1.2px", marginBottom:12 }}>
              Détails de l'incident
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[
                ["Signalé par",    ticket.reported_by_name || "—"],
                ["Date / heure",   fmtDT(ticket.reported_date)],
                ["Véhicule",       (ticket.vehicle_name || "—").split("—")[0].trim()],
                ["Immatriculation", immat || "—"],
                ["Localisation",   ticket.location || "Non précisée"],
                ["Type de panne",  ticket.category || "—"],
              ].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize:9, color:"#8EA99A", fontWeight:700,
                    textTransform:"uppercase", letterSpacing:".8px", marginBottom:3 }}>{l}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#1A2820" }}>{v}</div>
                </div>
              ))}
            </div>

            {/* État conducteur */}
            {ticket.driver_condition && (
              <div style={{ marginTop:12, padding:"9px 12px", borderRadius:8,
                background: ticket.driver_condition === "BLESSE_GRAVE" ? "#FDF0F1"
                  : ticket.driver_condition === "BLESSE_LEGER" ? "#FFFBEB" : "#EAF4EE",
                fontSize:12, fontWeight:700,
                color: ticket.driver_condition === "BLESSE_GRAVE" ? "#C0182A"
                  : ticket.driver_condition === "BLESSE_LEGER" ? "#D97706" : "#1B5E37" }}>
                {ticket.driver_condition === "BLESSE_GRAVE" ? "Conducteur blessé grave — urgences médicales requises"
                  : ticket.driver_condition === "BLESSE_LEGER" ? "Conducteur blessé léger"
                  : "Conducteur indemne"}
              </div>
            )}

            {ticket.description && (
              <div style={{ marginTop:10, fontSize:12, color:"#4A6358", lineHeight:1.6 }}>
                {ticket.description}
              </div>
            )}

            {ticket.immediate_actions && (
              <div style={{ marginTop:8, fontSize:11, color:"#4A6358" }}>
                <b>Actions terrain :</b> {ticket.immediate_actions}
              </div>
            )}
          </div>

          {/* Photo — modal interne */}
          {ticket.photo_url && (
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:"#8EA99A",
                textTransform:"uppercase", letterSpacing:"1px", marginBottom:6 }}>
                Photo de l'incident
              </div>
              <div style={{ position:"relative", cursor:"zoom-in" }}
                onClick={() => setPhotoModal(true)}>
                <img src={ticket.photo_url} alt="Incident"
                  style={{ width:"100%", maxHeight:200, objectFit:"cover", borderRadius:10,
                    border:"1px solid #E2E8E5", display:"block" }} />
                <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0)",
                  borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center",
                  opacity:0, transition:"opacity .15s", fontSize:28 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                  <span style={{ background:"rgba(0,0,0,.5)", color:"#fff",
                    borderRadius:"50%", width:48, height:48, display:"flex",
                    alignItems:"center", justifyContent:"center" }}>🔍</span>
                </div>
              </div>
              <div style={{ fontSize:11, color:"#8EA99A", marginTop:4, textAlign:"center" }}>
                Cliquez pour agrandir
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:"#8EA99A",
              textTransform:"uppercase", letterSpacing:"1px", marginBottom:10 }}>
              Suivi de l'intervention
            </div>
            <Timeline ticket={ticket} />
          </div>

          {/* Technicien assigné */}
          {ticket.technician_name && (
            <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:9,
              padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:"#1D4ED8",
                color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
                fontWeight:800, fontSize:12, flexShrink:0 }}>
                {ticket.technician_name[0]}
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:"#1D4ED8" }}>{ticket.technician_name}</div>
                <div style={{ fontSize:11, color:"#4A6358" }}>Assistance assignée</div>
              </div>
            </div>
          )}

          {ticket.notes && (
            <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A",
              borderRadius:9, padding:"10px 14px", fontSize:12, color:"#4A6358" }}>
              <b style={{ color:"#D97706" }}>Notes :</b> {ticket.notes}
            </div>
          )}

          {/* ── PANNEAUX D'ACTION ── */}

          {actionType === "assist" && (
            <div style={{ background:"#F0FDF4", border:"1.5px solid #BBF7D0", borderRadius:10, padding:16 }}>
              <div style={{ fontSize:13, fontWeight:800, color:"#1B5E37", marginBottom:14 }}>
                Envoyer l'assistance
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={LBL}>Personne envoyée (optionnel)</label>
                {techniciens.length > 0 ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:180, overflowY:"auto" }}>
                    {techniciens.map(t => (
                      <div key={t.id}
                        className={`sig-tech${String(techId) === String(t.id) ? " sel" : ""}`}
                        onClick={() => setTechId(String(techId) === String(t.id) ? "" : t.id)}>
                        <div style={{ width:30, height:30, borderRadius:"50%", background:"#1B5E37",
                          color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
                          fontWeight:800, fontSize:11, flexShrink:0 }}>
                          {t.first_name?.[0]}{t.last_name?.[0]}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:"#1A2820" }}>
                            {t.full_name || `${t.first_name} ${t.last_name}`}
                          </div>
                          <div style={{ fontSize:10, color:"#8EA99A" }}>{t.specialite || "Technicien"}</div>
                        </div>
                        {String(techId) === String(t.id) && <span style={{ color:"#1B5E37", fontWeight:800 }}>✓</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize:12, color:"#8EA99A", fontStyle:"italic" }}>
                    Aucun technicien enregistré — assistance manuelle possible.
                  </div>
                )}
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={LBL}>Instructions</label>
                <textarea value={assistNotes} onChange={e => setAssistNotes(e.target.value)} rows={3}
                  placeholder="Ex : Prendre le triangle de signalisation, contacter le chauffeur…"
                  style={{ ...INP, resize:"vertical" }} />
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => setActionType(null)} style={BTN_W}>Annuler</button>
                <button onClick={handleSendAssist} disabled={saving} style={{ ...BTN_G, opacity:saving?.7:1 }}>
                  {saving ? <><span style={{ animation:"sig-spin .8s linear infinite",display:"inline-block" }}>⟳</span> Envoi…</> : "Confirmer l'envoi"}
                </button>
              </div>
            </div>
          )}

          {actionType === "pickup" && (
            <div style={{ background:"#FFFBEB", border:"1.5px solid #FDE68A", borderRadius:10, padding:16 }}>
              <div style={{ fontSize:13, fontWeight:800, color:"#D97706", marginBottom:10 }}>
                Confirmer le rapatriement
              </div>
              <div style={{ fontSize:12, color:"#4A6358", marginBottom:14, lineHeight:1.6 }}>
                Le véhicule est en route vers le garage. Le statut passera à "Rapatriement en cours".
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => setActionType(null)} style={BTN_W}>Annuler</button>
                <button onClick={handlePickup} disabled={saving}
                  style={{ ...BTN_G, background:"#D97706", opacity:saving?.7:1 }}>
                  {saving ? "Confirmation…" : "Confirmer"}
                </button>
              </div>
            </div>
          )}

          {actionType === "close" && (
            <div style={{ background:"#F0FDF4", border:"1.5px solid #BBF7D0", borderRadius:10, padding:16 }}>
              <div style={{ fontSize:13, fontWeight:800, color:"#1B5E37", marginBottom:14 }}>
                Clôturer le signalement
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={LBL}>Notes de clôture (optionnel)</label>
                <textarea value={clotureNotes} onChange={e => setClotureNotes(e.target.value)} rows={2}
                  placeholder="État du véhicule au retour, points à inspecter…"
                  style={{ ...INP, resize:"vertical" }} />
              </div>
              <div onClick={() => setCreateMaint(v => !v)}
                style={{ padding:"12px 14px", borderRadius:9, cursor:"pointer", marginBottom:14,
                  border:`1.5px solid ${createMaint ? "#1B5E37" : "#E2E8E5"}`,
                  background: createMaint ? "#EAF4EE" : "#F4F6F5",
                  display:"flex", alignItems:"flex-start", gap:12 }}>
                <div style={{ width:20, height:20, borderRadius:6, flexShrink:0, marginTop:1,
                  border:`2px solid ${createMaint ? "#1B5E37" : "#E2E8E5"}`,
                  background: createMaint ? "#1B5E37" : "#fff",
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {createMaint && <span style={{ fontSize:12, color:"#fff", fontWeight:800 }}>✓</span>}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color: createMaint ? "#1B5E37" : "#1A2820" }}>
                    Créer automatiquement un ticket de maintenance
                  </div>
                  <div style={{ fontSize:11, color:"#8EA99A", marginTop:3, lineHeight:1.5 }}>
                    Une fiche corrective sera ouverte dans le module Maintenance avec les détails de cet incident.
                  </div>
                </div>
              </div>
              {createMaint && (
                <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:8,
                  padding:"9px 12px", fontSize:11, color:"#1D4ED8", marginBottom:14 }}>
                  Type créé : <b>{PANNE_TO_MAINTENANCE[ticket.category] || "AUTRE"}</b> · Priorité : <b>{ticket.severity === "CRITIQUE" ? "Critique" : "Haute"}</b>
                </div>
              )}
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => setActionType(null)} style={BTN_W}>Annuler</button>
                <button onClick={handleClose} disabled={saving} style={{ ...BTN_G, opacity:saving?.7:1 }}>
                  {saving ? <><span style={{ animation:"sig-spin .8s linear infinite",display:"inline-block" }}>⟳</span> Clôture…</> : "Clôturer"}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL REJET
// ─────────────────────────────────────────────────────────────────────────────

function ModalRejet({ ticket, onClose, onSuccess, showToast }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    if (!reason.trim()) { showToast("Indiquez le motif du rejet", "error"); return; }
    setSaving(true);
    try {
      await apiFetch(`/maintenance/breakdowns/${ticket.id}/rejeter/`, {
        method: "POST", body: JSON.stringify({ reason }),
      });
      showToast("Signalement rejeté");
      onSuccess();
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Rejeter le signalement"
      subtitle={`${ticket.title} — ${ticket.vehicle_name}`}
      onClose={onClose} width={460}>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ background:"#FDF0F1", border:"1px solid #FECDD3", borderRadius:9,
          padding:"10px 14px", fontSize:12, color:"#C0182A" }}>
          Le déclarant sera notifié du rejet avec le motif indiqué.
        </div>
        <div>
          <label style={{ fontSize:10, fontWeight:700, color:"#4A6358", textTransform:"uppercase",
            letterSpacing:"1px", marginBottom:5, display:"block" }}>
            Motif du rejet *
          </label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4}
            placeholder="Ex : Doublon, fausse alerte, problème déjà en cours…"
            style={{ padding:"9px 12px", border:"1.5px solid #E2E8E5", borderRadius:8, fontSize:13,
              fontFamily:"inherit", color:"#1A2820", background:"#fff", width:"100%",
              outline:"none", resize:"vertical", boxSizing:"border-box" }} />
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose}
            style={{ padding:"10px 18px", background:"transparent", color:"#4A6358",
              border:"1px solid #E2E8E5", borderRadius:8, fontSize:12, fontWeight:600,
              cursor:"pointer", fontFamily:"inherit" }}>
            Annuler
          </button>
          <button onClick={handle} disabled={saving || !reason.trim()}
            style={{ padding:"10px 20px", background:"#C0182A", color:"#fff", border:"none",
              borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
              opacity: saving || !reason.trim() ? 0.6 : 1 }}>
            {saving ? "Rejet…" : "Confirmer le rejet"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CARTE TICKET
// ─────────────────────────────────────────────────────────────────────────────

function TicketCard({ ticket, onDetail, onReject }) {
  const sev    = SEVERITY_CFG[ticket.severity] || SEVERITY_CFG.MOYENNE;
  const st     = STATUS_CFG[ticket.status]     || STATUS_CFG.SIGNALE;
  const sla    = getSLAStatus(ticket);
  const elapsed = fmtElapsed(ticket.reported_date);
  const isNew  = ticket.status === "SIGNALE";
  const isOpen = !["REPARE","NON_REPARABLE"].includes(ticket.status);

  return (
    <div className="sig-card"
      style={{ background:"#fff", borderRadius:12, padding:"16px 20px",
        boxShadow:"0 1px 3px rgba(0,0,0,.06)",
        border:`1px solid ${isNew && ticket.severity === "CRITIQUE" ? "#FECDD3" : "#E2E8E5"}`,
        borderLeft:`4px solid ${sev.color}` }}>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
        <div style={{ flex:1, minWidth:0 }}>

          {/* Badges */}
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:6, flexWrap:"wrap" }}>
            <span className={isNew && ticket.severity === "CRITIQUE" ? "sig-pulse" : ""}
              style={{ padding:"2px 9px", borderRadius:99, fontSize:10, fontWeight:800,
                background:sev.bg, color:sev.color }}>
              {sev.label}
            </span>
            <span style={{ padding:"2px 9px", borderRadius:99, fontSize:10, fontWeight:700,
              background:st.bg, color:st.color }}>
              {st.label}
            </span>
            {ticket.driver_condition && ticket.driver_condition !== "INDEMNE" && (
              <span style={{ padding:"2px 9px", borderRadius:99, fontSize:9, fontWeight:800,
                background:"#FDF0F1", color:"#C0182A" }}>
                {ticket.driver_condition === "BLESSE_GRAVE" ? "Blessé grave" : "Blessé léger"}
              </span>
            )}
          </div>

          {/* Titre */}
          <div style={{ fontSize:14, fontWeight:800, color:"#1A2820", marginBottom:4,
            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {ticket.vehicle_name} — {ticket.title}
          </div>

          {/* Infos ligne */}
          <div style={{ fontSize:12, color:"#4A6358", display:"flex", gap:14,
            flexWrap:"wrap", marginBottom: sla && isOpen ? 8 : 0 }}>
            <span>{ticket.reported_by_name}</span>
            {ticket.location && <span>📍 {ticket.location}</span>}
            {elapsed && (
              <span style={{ color: elapsed.level === "critical" ? "#C0182A"
                : elapsed.level === "warn" ? "#D97706" : "#8EA99A",
                fontWeight: elapsed.level !== "ok" ? 700 : 400 }}>
                Il y a {elapsed.label}
              </span>
            )}
          </div>

          {/* Barre SLA */}
          {sla && isOpen && (
            <div style={{ marginTop:4 }}>
              <div className="sig-sla-bar">
                <div className="sig-sla-fill"
                  style={{ width:`${sla.pct}%`,
                    background: sla.pct >= 100 ? "#C0182A" : sla.pct >= 70 ? "#D97706" : "#1B5E37" }} />
              </div>
              <div style={{ fontSize:10, marginTop:3,
                color: sla.exceeded ? "#C0182A" : "#8EA99A",
                fontWeight: sla.exceeded ? 700 : 400 }}>
                {sla.label}
              </div>
            </div>
          )}

          {ticket.description && (
            <div style={{ fontSize:12, color:"#4A6358", marginTop:8,
              background:"#F4F6F5", borderRadius:7, padding:"6px 10px", lineHeight:1.5,
              overflow:"hidden", display:"-webkit-box",
              WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
              {ticket.description}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
          <button onClick={() => onDetail(ticket)}
            style={{ padding:"7px 14px", background:"#EAF4EE", color:"#1B5E37",
              border:"none", borderRadius:7, fontSize:12, fontWeight:700,
              cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
            Gérer
          </button>
          {isNew && (
            <button onClick={() => onReject(ticket)}
              style={{ padding:"6px 12px", background:"#fff", color:"#C0182A",
                border:"1.5px solid #FECDD3", borderRadius:7, fontSize:11,
                fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              Rejeter
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ONGLET STATISTIQUES — bar charts SVG
// ─────────────────────────────────────────────────────────────────────────────

function TabStats({ tickets }) {
  // Incidents par mois (12 derniers mois)
  const byMonth = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,"0")}`;
      const label = d.toLocaleDateString("fr-FR", { month:"short" });
      const count = tickets.filter(t => (t.reported_date || "").startsWith(key)).length;
      const closed = tickets.filter(t =>
        (t.reported_date || "").startsWith(key) && t.status === "REPARE"
      ).length;
      return { label, count, closed };
    });
  }, [tickets]);

  // Par sévérité
  const bySev = useMemo(() => Object.entries(SEVERITY_CFG).map(([k, v]) => ({
    key:k, label:v.label, color:v.color, bg:v.bg,
    count: tickets.filter(t => t.severity === k).length,
    open:  tickets.filter(t => t.severity === k && !["REPARE","NON_REPARABLE"].includes(t.status)).length,
  })), [tickets]);

  // Taux de clôture
  const total    = tickets.length;
  const clotures = tickets.filter(t => t.status === "REPARE").length;
  const txCloture = total > 0 ? Math.round((clotures / total) * 100) : 0;

  // SLA dépassés
  const slaOk  = tickets.filter(t => { const s = getSLAStatus(t); return !s || !s.exceeded; }).length;
  const slaNok = tickets.filter(t => { const s = getSLAStatus(t); return s?.exceeded; }).length;
  const txSla  = total > 0 ? Math.round((slaOk / total) * 100) : 100;

  // Temps moyen de résolution (heures)
  const resolved = tickets.filter(t => t.status === "REPARE" && t.reported_date && t.resolved_date);
  const avgH = resolved.length > 0
    ? Math.round(resolved.reduce((s, t) => s + (new Date(t.resolved_date) - new Date(t.reported_date)) / 3_600_000, 0) / resolved.length)
    : null;

  // Bar chart horizontal helper
  const maxMonth = Math.max(...byMonth.map(m => m.count), 1);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

      {/* KPIs résumé */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {[
          { label:"Total signalements", val:total,         color:"#1B5E37" },
          { label:"Taux de clôture",    val:`${txCloture}%`, color:"#1D4ED8" },
          { label:"Respect du SLA",     val:`${txSla}%`,     color: txSla >= 80 ? "#1B5E37" : "#C0182A" },
          { label:"Temps moy. résol.",  val: avgH !== null ? `${avgH}h` : "—", color:"#D97706" },
        ].map((k, i) => (
          <div key={i} style={{ background:"#fff", borderRadius:12, padding:"16px",
            borderTop:`3px solid ${k.color}`, boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
            <div style={{ fontSize:9, fontWeight:700, color:"#8EA99A",
              textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:28, fontWeight:800, color:k.color, lineHeight:1 }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Bar chart par mois */}
      <div style={{ background:"#fff", borderRadius:12, padding:"20px 24px",
        boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
        <div style={{ fontSize:13, fontWeight:800, color:"#1A2820", marginBottom:4 }}>
          Incidents par mois — 6 derniers mois
        </div>
        <div style={{ fontSize:11, color:"#8EA99A", marginBottom:20 }}>
          Barres vertes = clôturés · Grises = total
        </div>
        <div style={{ display:"flex", gap:16, alignItems:"flex-end", height:160 }}>
          {byMonth.map((m, i) => (
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column",
              alignItems:"center", gap:6 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#4A6358" }}>
                {m.count > 0 ? m.count : ""}
              </div>
              <div style={{ width:"100%", height:120, display:"flex",
                alignItems:"flex-end", gap:3, justifyContent:"center" }}>
                {/* Barre totale */}
                <div style={{ flex:1, borderRadius:"4px 4px 0 0",
                  background:"#E2E8E5",
                  height:`${Math.max(4, (m.count / maxMonth) * 120)}px`,
                  transition:"height .6s ease" }} />
                {/* Barre clôturée */}
                <div style={{ flex:1, borderRadius:"4px 4px 0 0",
                  background:"#1B5E37",
                  height:`${Math.max(m.closed > 0 ? 4 : 0, (m.closed / maxMonth) * 120)}px`,
                  transition:"height .6s ease" }} />
              </div>
              <div style={{ fontSize:10, color:"#8EA99A", fontWeight:600 }}>{m.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:16, marginTop:12 }}>
          {[
            { color:"#E2E8E5", label:"Total signalements" },
            { color:"#1B5E37", label:"Clôturés" },
          ].map(l => (
            <div key={l.label} style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:12, height:12, borderRadius:3, background:l.color }} />
              <span style={{ fontSize:11, color:"#8EA99A" }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Répartition par sévérité */}
      <div style={{ background:"#fff", borderRadius:12, padding:"20px 24px",
        boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
        <div style={{ fontSize:13, fontWeight:800, color:"#1A2820", marginBottom:20 }}>
          Répartition par niveau de priorité
        </div>
        {bySev.map(s => {
          const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
          return (
            <div key={s.key} style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", marginBottom:6 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ padding:"2px 8px", borderRadius:99, fontSize:10,
                    fontWeight:700, background:s.bg, color:s.color }}>
                    {s.label}
                  </span>
                  {s.open > 0 && (
                    <span style={{ fontSize:10, color:s.color, fontWeight:700 }}>
                      {s.open} en cours
                    </span>
                  )}
                </div>
                <div style={{ fontSize:12, fontWeight:700, color:"#4A6358" }}>
                  {s.count} ({pct}%)
                </div>
              </div>
              <div style={{ height:8, background:"#F0F4F2", borderRadius:99, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, borderRadius:99,
                  background:s.color, transition:"width .6s ease" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* SLA */}
      <div style={{ background:"#fff", borderRadius:12, padding:"20px 24px",
        boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
        <div style={{ fontSize:13, fontWeight:800, color:"#1A2820", marginBottom:20 }}>
          Respect des délais d'intervention (SLA)
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {[
            { label:"Dans les délais", val:slaOk,  color:"#1B5E37", bg:"#EAF4EE" },
            { label:"Hors délais",     val:slaNok, color:"#C0182A", bg:"#FDF0F1" },
          ].map((s, i) => {
            const pct = total > 0 ? Math.round((s.val / total) * 100) : 0;
            return (
              <div key={i} style={{ background:s.bg, borderRadius:10, padding:"16px",
                border:`1px solid ${s.color}20` }}>
                <div style={{ fontSize:28, fontWeight:800, color:s.color }}>{s.val}</div>
                <div style={{ fontSize:12, fontWeight:600, color:s.color, marginTop:4 }}>{s.label}</div>
                <div style={{ height:6, background:"rgba(255,255,255,.6)", borderRadius:99,
                  overflow:"hidden", marginTop:10 }}>
                  <div style={{ height:"100%", width:`${pct}%`, borderRadius:99,
                    background:s.color, transition:"width .6s ease" }} />
                </div>
                <div style={{ fontSize:10, color:s.color, marginTop:4, opacity:.8 }}>{pct}% des incidents</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop:14, fontSize:11, color:"#8EA99A", lineHeight:1.6 }}>
          SLA définis : Critique 1h · Urgente 4h · Normale 24h · Faible 72h
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export function TabSignalementsGestionnaire() {
  const [tickets,      setTickets]      = useState([]);
  const [techniciens,  setTechniciens]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState("liste");  // "liste" | "stats"
  const [filterStatus, setFilterStatus] = useState("SIGNALE");
  const [filterSev,    setFilterSev]    = useState("");
  const [search,       setSearch]       = useState("");
  const [detailTicket, setDetailTicket] = useState(null);
  const [rejectTicket, setRejectTicket] = useState(null);
  const { toast, show: showToast } = useToast();
  const pollingRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [t, u] = await Promise.all([
        apiFetch("/maintenance/breakdowns/").catch(() => []),
        apiFetch("/auth/users/?role=TECHNICIEN").catch(() => []),
      ]);
      setTickets(Array.isArray(t) ? t : t?.results ?? []);
      setTechniciens(Array.isArray(u) ? u : u?.results ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    pollingRef.current = setInterval(load, 30000);
    return () => clearInterval(pollingRef.current);
  }, [load]);

  const filtered = tickets
    .filter(t => !filterStatus || t.status === filterStatus)
    .filter(t => !filterSev    || t.severity === filterSev)
    .filter(t => !search || [t.title, t.vehicle_name, t.reported_by_name, t.location]
      .some(v => v?.toLowerCase().includes(search.toLowerCase())));

  const counts = {
    total:   tickets.length,
    nouveau: tickets.filter(t => t.status === "SIGNALE").length,
    cloture: tickets.filter(t => t.status === "REPARE").length,
    critique: tickets.filter(t =>
      t.severity === "CRITIQUE" && !["REPARE","NON_REPARABLE"].includes(t.status)
    ).length,
    slaDepasse: tickets.filter(t => {
      if (["REPARE","NON_REPARABLE"].includes(t.status)) return false;
      return getSLAStatus(t)?.exceeded;
    }).length,
  };

  const FILTERS = [
    { val:"SIGNALE",       label:"Nouveaux",     count:counts.nouveau },
    { val:"EN_DIAGNOSTIC", label:"Assistance",   count:tickets.filter(t=>t.status==="EN_DIAGNOSTIC").length },
    { val:"EN_REPARATION", label:"Rapatriement", count:tickets.filter(t=>t.status==="EN_REPARATION").length },
    { val:"REPARE",        label:"Clôturés",     count:counts.cloture },
    { val:"",              label:"Tous",          count:counts.total  },
  ];

  const INP_S = { padding:"8px 12px", border:"1.5px solid #E2E8E5", borderRadius:8,
    fontSize:12, fontFamily:"inherit", color:"#1A2820", background:"#fff", outline:"none" };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      padding:"80px 0", gap:12 }}>
      <div style={{ width:24, height:24, border:"3px solid #1B5E37",
        borderTopColor:"transparent", borderRadius:"50%", animation:"sig-spin .8s linear infinite" }}/>
      <span style={{ fontSize:13, color:"#8EA99A" }}>Chargement…</span>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16,
      fontFamily:"'Inter',-apple-system,sans-serif" }}>
      <style>{CSS}</style>
      <Toast msg={toast.msg} type={toast.type} />

      {detailTicket && (
        <ModalDetail ticket={detailTicket} techniciens={techniciens}
          onClose={() => setDetailTicket(null)}
          onAction={() => { setDetailTicket(null); load(); }}
          showToast={showToast} />
      )}
      {rejectTicket && (
        <ModalRejet ticket={rejectTicket}
          onClose={() => setRejectTicket(null)}
          onSuccess={() => { setRejectTicket(null); load(); }}
          showToast={showToast} />
      )}

      {/* Bannière urgence */}
      {counts.critique > 0 && (
        <div style={{ background:"#FDF0F1", border:"1.5px solid #FECDD3",
          borderLeft:"4px solid #C0182A", borderRadius:"0 10px 10px 0",
          padding:"12px 16px", display:"flex", alignItems:"center", gap:12 }}>
          <span className="sig-pulse" style={{ fontSize:20 }}>🚨</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:800, color:"#C0182A" }}>
              {counts.critique} incident{counts.critique > 1 ? "s" : ""} critique{counts.critique > 1 ? "s" : ""} en attente
            </div>
            <div style={{ fontSize:11, color:"#9F1239" }}>Intervention requise immédiatement.</div>
          </div>
          <button onClick={() => { setFilterStatus("SIGNALE"); setFilterSev("CRITIQUE"); setTab("liste"); }}
            style={{ padding:"6px 14px", background:"#C0182A", color:"#fff", border:"none",
              borderRadius:7, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            Voir
          </button>
        </div>
      )}

      {counts.slaDepasse > 0 && (
        <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A",
          borderLeft:"4px solid #D97706", borderRadius:"0 10px 10px 0",
          padding:"10px 16px", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:16 }}>⏰</span>
          <span style={{ fontSize:12, fontWeight:600, color:"#92400E" }}>
            {counts.slaDepasse} incident{counts.slaDepasse > 1 ? "s" : ""} hors délai SLA.
          </span>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
        {[
          { label:"Nouveaux",     val:counts.nouveau,    color:"#C0182A", filter:"SIGNALE"       },
          { label:"Assistance",   val:tickets.filter(t=>t.status==="EN_DIAGNOSTIC").length, color:"#1D4ED8", filter:"EN_DIAGNOSTIC" },
          { label:"Rapatriement", val:tickets.filter(t=>t.status==="EN_REPARATION").length, color:"#D97706", filter:"EN_REPARATION" },
          { label:"Clôturés",     val:counts.cloture,    color:"#1B5E37", filter:"REPARE"        },
          { label:"SLA dépassés", val:counts.slaDepasse, color:counts.slaDepasse > 0 ? "#C0182A" : "#8EA99A", filter:"" },
        ].map((k, i) => (
          <div key={i} onClick={() => { setFilterStatus(k.filter); setTab("liste"); }}
            style={{ background:"#fff", borderRadius:10, padding:"14px 16px",
              textAlign:"center", boxShadow:"0 1px 3px rgba(0,0,0,.05)",
              borderTop:`3px solid ${k.color}`, cursor:"pointer",
              border: filterStatus === k.filter && tab === "liste"
                ? `2px solid ${k.color}` : `1px solid #E2E8E5`,
              transition:"all .1s" }}>
            <div style={{ fontSize:24, fontWeight:800, color:k.color, marginTop:4 }}>{k.val}</div>
            <div style={{ fontSize:10, color:"#8EA99A", textTransform:"uppercase",
              letterSpacing:"1px", marginTop:3 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Onglets Liste / Statistiques */}
      <div style={{ display:"flex", gap:6, background:"#F4F6F5",
        padding:4, borderRadius:10, border:"1px solid #E2E8E5", alignSelf:"flex-start" }}>
        {[
          { id:"liste", label:"Liste des incidents" },
          { id:"stats", label:"Statistiques" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:"7px 18px", borderRadius:7, border:"none", cursor:"pointer",
              fontFamily:"inherit", fontSize:12, fontWeight:700, transition:"all .12s",
              background: tab === t.id ? "#fff" : "transparent",
              color: tab === t.id ? "#1B5E37" : "#4A6358",
              boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,.08)" : "none" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "stats" ? (
        <TabStats tickets={tickets} />
      ) : (
        <>
          {/* Filtres */}
          <div style={{ background:"#fff", borderRadius:10, padding:"12px 16px",
            display:"flex", gap:10, flexWrap:"wrap", alignItems:"center",
            boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
            <div style={{ position:"relative", flex:1, minWidth:200 }}>
              <span style={{ position:"absolute", left:10, top:"50%",
                transform:"translateY(-50%)", color:"#8EA99A" }}>🔍</span>
              <input style={{ ...INP_S, paddingLeft:32, width:"100%", boxSizing:"border-box" }}
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Véhicule, déclarant, localisation…" />
            </div>
            <select style={{ ...INP_S, cursor:"pointer" }}
              value={filterSev} onChange={e => setFilterSev(e.target.value)}>
              <option value="">Toutes priorités</option>
              {Object.entries(SEVERITY_CFG).map(([k,v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
              {FILTERS.map(f => (
                <button key={f.val} onClick={() => setFilterStatus(f.val)}
                  style={{ padding:"6px 12px", borderRadius:20, fontSize:11, fontWeight:600,
                    cursor:"pointer", fontFamily:"inherit", border:"none", transition:"all .12s",
                    background: filterStatus === f.val ? "#1B5E37" : "#F4F6F5",
                    color: filterStatus === f.val ? "#fff" : "#4A6358" }}>
                  {f.label} ({f.count})
                </button>
              ))}
            </div>
            <span style={{ fontSize:11, color:"#8EA99A", whiteSpace:"nowrap" }}>
              {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
            </span>
          </div>

          {/* Note workflow */}
          <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:9,
            padding:"10px 16px", fontSize:12, color:"#1D4ED8" }}>
            <b>Workflow :</b> Nouveau → Envoyer l'assistance → Confirmer le rapatriement → Clôturer (crée automatiquement un ticket de maintenance).
          </div>

          {/* Liste */}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {filtered.length === 0 ? (
              <div style={{ background:"#fff", borderRadius:12, padding:"60px 20px",
                textAlign:"center", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
                <div style={{ fontSize:36, marginBottom:10 }}>✅</div>
                <div style={{ fontSize:15, fontWeight:700, color:"#1A2820" }}>
                  {filterStatus === "SIGNALE"
                    ? "Aucun nouveau signalement en attente"
                    : "Aucun résultat"}
                </div>
                <div style={{ fontSize:12, color:"#8EA99A", marginTop:6 }}>
                  {filterStatus === "SIGNALE"
                    ? "Tous les incidents ont été pris en charge."
                    : "Essayez de modifier vos filtres."}
                </div>
              </div>
            ) : filtered.map(t => (
              <TicketCard key={t.id} ticket={t}
                onDetail={setDetailTicket}
                onReject={setRejectTicket} />
            ))}
          </div>

          <div style={{ textAlign:"center", fontSize:10, color:"#8EA99A" }}>
            Actualisation automatique toutes les 30 secondes
          </div>
        </>
      )}
    </div>
  );
}