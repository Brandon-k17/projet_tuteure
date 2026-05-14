// ─── pages/signalements/TabSignalementsPersonnel.jsx ─────────────────────────
// Signalements pour le personnel :
//   • Directeur (avec véhicule de fonction) → peut signaler une panne sur son véhicule
//   • Chef de département (sans véhicule)   → page informative uniquement
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from "react";

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
  if (res.status === 204) return null;
  const json = await res.json();
  if (!res.ok) throw new Error(json?.detail || json?.message || `Erreur ${res.status}`);
  return json?.data ?? json;
}

const C = {
  green:"#1B5E37", greenMid:"#2D7A4F", greenLight:"#EAF4EE",
  red:"#C0182A",   redLight:"#FDF0F1",
  white:"#FFFFFF", bg:"#F4F6F5",
  border:"#E2E8E5", text:"#1A2820", textMid:"#4A6358", textLight:"#8EA99A",
  amber:"#D97706", amberLight:"#FFFBEB",
  blue:"#1D4ED8",  blueLight:"#EFF6FF",
  orange:"#EA580C",orangeLight:"#FFF7ED",
};

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })
  : "—";

const fmtDateShort = (d) => d
  ? new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" })
  : "—";

// ── Types de pannes pour un véhicule de fonction ──────────────────────────────
const TYPES_PANNE = [
  { val:"PANNE_MOTEUR",      label:"Panne moteur",                    icon:"🔧", grave:true  },
  { val:"ACCIDENT_COLLISION",label:"Accident / Collision",            icon:"💥", grave:true  },
  { val:"PERTE_FREINS",      label:"Problème de freinage",            icon:"⚠️", grave:true  },
  { val:"CREVAISON",         label:"Crevaison",                       icon:"🛞", grave:false },
  { val:"RETRO_CASSE",       label:"Rétroviseur cassé",               icon:"🪞", grave:false },
  { val:"VITRE_CASSEE",      label:"Vitre brisée",                    icon:"🪟", grave:false },
  { val:"ECLAIRAGE_DEFAUT",  label:"Problème d'éclairage",            icon:"💡", grave:false },
  { val:"CARROSSERIE",       label:"Dommage carrosserie",             icon:"🚗", grave:false },
  { val:"CLIMATISATION",     label:"Climatisation défaillante",       icon:"❄️", grave:false },
  { val:"BATTERIE",          label:"Problème de batterie / démarrage",icon:"🔋", grave:false },
  { val:"AUTRE",             label:"Autre problème",                  icon:"🔩", grave:false },
];

const NIVEAUX_URGENCE = [
  { val:"CRITIQUE", label:"Critique",  desc:"Véhicule immobilisé — assistance immédiate", color:C.red,    bg:C.redLight,    icon:"🔴" },
  { val:"HAUTE",    label:"Urgente",   desc:"À traiter dans les 24h",                      color:C.orange, bg:C.orangeLight, icon:"🟠" },
  { val:"MOYENNE",  label:"Normale",   desc:"Peut attendre la fin de la semaine",           color:C.amber,  bg:C.amberLight,  icon:"🟡" },
  { val:"BASSE",    label:"Faible",    desc:"Signalement informatif",                       color:C.green,  bg:C.greenLight,  icon:"🟢" },
];

const STATUT_CFG = {
  SIGNALE:         { label:"En attente",      color:C.amber, bg:C.amberLight  },
  EN_ATTENTE:      { label:"En attente",      color:C.amber, bg:C.amberLight  },
  EN_DIAGNOSTIC:   { label:"Pris en charge",  color:C.blue,  bg:C.blueLight   },
  EN_REPARATION:   { label:"En réparation",   color:C.orange,bg:C.orangeLight },
  REPARE:          { label:"Résolu ✓",        color:C.green, bg:C.greenLight  },
  NON_REPARABLE:   { label:"Non réparable",   color:C.red,   bg:C.redLight    },
};

function Toast({ msg, type, onDone }) {
  useEffect(() => {
    if (msg) { const t = setTimeout(onDone, 4000); return () => clearTimeout(t); }
  }, [msg]);
  if (!msg) return null;
  return (
    <div style={{
      position:"fixed", bottom:24, right:24, zIndex:9999,
      background: type==="error" ? C.red : C.green,
      color:"#fff", borderRadius:12, padding:"14px 20px",
      fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:10,
      boxShadow:"0 8px 32px rgba(0,0,0,.25)", maxWidth:420,
      animation:"slideUp .3s ease",
    }}>
      <span style={{ fontSize:18 }}>{type==="error" ? "✕" : "✓"}</span>
      {msg}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function TabSignalementsPersonnel({ isDirecteur, vehicule }) {
  const [signalements, setSignalements] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeView,   setActiveView]   = useState("nouveau");
  const [submitting,   setSubmitting]   = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [toast,        setToast]        = useState({ msg:"", type:"success" });
  const fileRef = useRef();

  const [form, setForm] = useState({
    type_incident: "",
    urgence:       "",
    description:   "",
    localisation:  "",
    immobilise:    false,
  });
  const [photo, setPhoto] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const showToast = (msg, type="success") => setToast({ msg, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sig = await apiFetch("/maintenance/breakdowns/?reported_by=me").catch(() => []);
      setSignalements(Array.isArray(sig) ? sig : sig?.results ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const typeSelectionne = TYPES_PANNE.find(t => t.val === form.type_incident);

  const handleSubmit = async () => {
    if (!form.type_incident) { showToast("Sélectionnez le type de panne", "error"); return; }
    if (!form.urgence)       { showToast("Indiquez le niveau d'urgence", "error"); return; }
    if (!form.description.trim()) { showToast("Décrivez le problème", "error"); return; }
    if (!vehicule?.id)       { showToast("Aucun véhicule assigné", "error"); return; }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title",       typeSelectionne?.label || form.type_incident);
      fd.append("vehicle",     vehicule.id);
      fd.append("description", form.description);
      fd.append("location",    form.localisation || "Non précisé");
      fd.append("severity",    form.urgence);
      fd.append("notes",       `Véhicule immobilisé: ${form.immobilise ? "Oui" : "Non"}. Signalé par directeur.`);
      if (photo) fd.append("photo", photo);

      await apiFetch("/maintenance/breakdowns/", { method:"POST", body:fd });

      setSubmitted(true);
      showToast(
        form.urgence === "CRITIQUE"
          ? "🚨 Signalement d'urgence envoyé — le gestionnaire est alerté !"
          : "✓ Panne signalée avec succès — le gestionnaire va traiter votre demande"
      );
      load();
    } catch (e) {
      showToast("Erreur : " + e.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({ type_incident:"", urgence:"", description:"", localisation:"", immobilise:false });
    setPhoto(null);
    setSubmitted(false);
  };

  const inp = {
    padding:"10px 13px", border:`1.5px solid ${C.border}`, borderRadius:8,
    fontSize:13, fontFamily:"inherit", color:C.text, background:C.white,
    width:"100%", outline:"none",
  };
  const lbl = {
    fontSize:10, fontWeight:700, color:C.textMid, textTransform:"uppercase",
    letterSpacing:"1.2px", marginBottom:6, display:"block",
  };

  // ── Chef de département — pas de véhicule ────────────────────────────────
  if (!isDirecteur) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:16, fontFamily:"'Inter',-apple-system,sans-serif" }}>
        <style>{"@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}"}</style>

        <div style={{ background:C.white, borderRadius:14, padding:"40px 32px", textAlign:"center", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
          <div style={{ fontSize:52, marginBottom:16 }}>🚗</div>
          <div style={{ fontSize:18, fontWeight:800, color:C.text, marginBottom:8 }}>
            Aucun véhicule assigné
          </div>
          <div style={{ fontSize:13, color:C.textLight, maxWidth:400, margin:"0 auto 24px", lineHeight:1.7 }}>
            En tant que chef de département, vous n'avez pas de véhicule de fonction assigné.
            Les signalements de pannes concernent uniquement les véhicules personnellement assignés.
          </div>
          <div style={{ background:C.amberLight, border:`1px solid ${C.amber}20`, borderRadius:10, padding:"14px 20px", display:"inline-flex", alignItems:"center", gap:10, fontSize:13, color:C.amber, fontWeight:600 }}>
            <span style={{ fontSize:18 }}>💡</span>
            Pour signaler un problème sur un véhicule du parc, contactez directement le gestionnaire.
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div style={{ background:C.white, borderRadius:12, padding:"20px", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
            <div style={{ fontSize:24, marginBottom:10 }}>📞</div>
            <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:6 }}>Contacter le gestionnaire</div>
            <div style={{ fontSize:12, color:C.textLight, lineHeight:1.6 }}>
              Pour tout incident ou problème lié à un véhicule du parc lors d'une mission, contactez directement le gestionnaire du parc automobile.
            </div>
          </div>
          <div style={{ background:C.white, borderRadius:12, padding:"20px", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
            <div style={{ fontSize:24, marginBottom:10 }}>📋</div>
            <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:6 }}>Faire une demande de véhicule</div>
            <div style={{ fontSize:12, color:C.textLight, lineHeight:1.6 }}>
              Vous pouvez effectuer des réservations de véhicules avec chauffeur depuis l'onglet "Mes demandes" pour vos déplacements professionnels.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Directeur sans véhicule assigné ──────────────────────────────────────
  if (!vehicule) {
    return (
      <div style={{ background:C.white, borderRadius:14, padding:"40px 32px", textAlign:"center", boxShadow:"0 1px 3px rgba(0,0,0,.05)", fontFamily:"'Inter',-apple-system,sans-serif" }}>
        <div style={{ fontSize:52, marginBottom:16 }}>⏳</div>
        <div style={{ fontSize:18, fontWeight:800, color:C.text, marginBottom:8 }}>
          Aucun véhicule de fonction assigné
        </div>
        <div style={{ fontSize:13, color:C.textLight, maxWidth:360, margin:"0 auto", lineHeight:1.7 }}>
          Le gestionnaire du parc vous assignera prochainement votre véhicule de fonction.
          Vous pourrez ensuite signaler des pannes depuis cet espace.
        </div>
      </div>
    );
  }

  // ── Directeur avec véhicule — formulaire complet ──────────────────────────
  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"80px 0", gap:12 }}>
      <div style={{ width:26, height:26, border:`3px solid ${C.green}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin .8s linear infinite" }}/>
      <span style={{ fontSize:13, color:C.textLight }}>Chargement…</span>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, fontFamily:"'Inter',-apple-system,sans-serif" }}>
      <style>{`
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)}  to{opacity:1;transform:translateY(0)} }
        .sig-card { animation:fadeIn .2s ease; }
      `}</style>

      <Toast msg={toast.msg} type={toast.type} onDone={() => setToast({ msg:"" })}/>

      {/* En-tête */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:800, color:C.text, margin:0 }}>Signalement de Panne</h2>
          <p style={{ fontSize:12, color:C.textLight, margin:"4px 0 0" }}>
            Signalez un problème sur votre véhicule de fonction
          </p>
        </div>
        {/* Badge véhicule */}
        <div style={{ background:C.greenLight, border:`1px solid ${C.green}20`, borderRadius:9, padding:"8px 16px", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:16 }}>🚗</span>
          <div>
            <div style={{ fontSize:11, color:C.textMid, fontWeight:700 }}>Votre véhicule</div>
            <div style={{ fontSize:13, fontWeight:800, color:C.green }}>
              {vehicule.registration_number || vehicule.license_plate} · {vehicule.make} {vehicule.model}
            </div>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display:"flex", gap:8 }}>
        {[
          { id:"nouveau",    label:"Signaler une panne", icon:"📋" },
          { id:"historique", label:"Mes signalements",   icon:"📂", badge:signalements.filter(s=>["SIGNALE","EN_ATTENTE","EN_DIAGNOSTIC","EN_REPARATION"].includes(s.status)).length },
        ].map(t => (
          <button key={t.id} onClick={() => { setActiveView(t.id); setSubmitted(false); }}
            style={{
              padding:"9px 20px", borderRadius:9, fontSize:12, fontWeight:700,
              cursor:"pointer", fontFamily:"inherit", border:"none",
              background: activeView===t.id ? C.green : C.white,
              color:       activeView===t.id ? "#fff"  : C.textMid,
              boxShadow:   activeView===t.id ? "0 4px 14px rgba(27,94,55,.3)" : "0 1px 3px rgba(0,0,0,.06)",
              display:"flex", alignItems:"center", gap:6, transition:"all .12s",
            }}>
            {t.icon} {t.label}
            {t.badge > 0 && (
              <span style={{ background:C.red, color:"#fff", borderRadius:99, fontSize:9, fontWeight:800, minWidth:16, height:16, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px" }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════ NOUVEAU SIGNALEMENT ════ */}
      {activeView === "nouveau" && (
        <>
          {submitted ? (
            <div className="sig-card" style={{
              background: form.urgence==="CRITIQUE" ? C.redLight : C.greenLight,
              border: `2px solid ${form.urgence==="CRITIQUE" ? C.red : C.green}30`,
              borderRadius:14, padding:"40px 28px", textAlign:"center",
            }}>
              <div style={{ fontSize:52, marginBottom:12 }}>
                {form.urgence==="CRITIQUE" ? "🚨" : "✅"}
              </div>
              <div style={{ fontSize:18, fontWeight:800, color:form.urgence==="CRITIQUE"?C.red:C.green, marginBottom:8 }}>
                {form.urgence==="CRITIQUE" ? "Signalement d'urgence envoyé !" : "Panne signalée avec succès"}
              </div>
              <div style={{ fontSize:13, color:C.textMid, maxWidth:420, margin:"0 auto 28px", lineHeight:1.7 }}>
                {form.urgence==="CRITIQUE"
                  ? "Le gestionnaire du parc a été alerté immédiatement. Une assistance vous sera envoyée dans les plus brefs délais."
                  : "Votre signalement a été transmis au gestionnaire. Il sera planifié et traité par l'équipe technique."}
              </div>
              <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
                <button onClick={resetForm}
                  style={{ padding:"10px 24px", background:C.green, color:"#fff", border:"none", borderRadius:9, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  + Nouveau signalement
                </button>
                <button onClick={() => setActiveView("historique")}
                  style={{ padding:"10px 20px", background:"transparent", color:C.textMid, border:`1px solid ${C.border}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                  Voir mes signalements
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:16, alignItems:"start" }}>

              {/* Formulaire principal */}
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

                {/* Avertissement */}
                <div style={{ background:C.redLight, border:`1px solid ${C.red}20`, borderRadius:10, padding:"12px 16px", display:"flex", gap:12, alignItems:"flex-start" }}>
                  <span style={{ fontSize:18, flexShrink:0 }}>⚠️</span>
                  <div style={{ fontSize:12, color:C.red, lineHeight:1.6 }}>
                    <b>En cas d'urgence critique</b> (accident, perte de freinage, incendie) :
                    garez le véhicule en sécurité et contactez immédiatement le gestionnaire par téléphone.
                  </div>
                </div>

                {/* ÉTAPE 1 — Type de panne */}
                <div style={{ background:C.white, borderRadius:12, padding:"20px", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
                  <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:4 }}>1. Nature du problème</div>
                  <div style={{ fontSize:11, color:C.textLight, marginBottom:14 }}>Sélectionnez ce qui correspond le mieux à votre situation</div>

                  {/* Pannes graves */}
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:C.red, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ width:6, height:6, borderRadius:"50%", background:C.red, display:"inline-block" }}/>
                      Pannes graves — immobilisation possible
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                      {TYPES_PANNE.filter(t => t.grave).map(t => (
                        <button key={t.val} type="button" onClick={() => { set("type_incident", t.val); set("urgence","CRITIQUE"); }}
                          style={{
                            padding:"10px 14px", borderRadius:9, cursor:"pointer", fontFamily:"inherit",
                            textAlign:"left", display:"flex", alignItems:"center", gap:10,
                            border:`1.5px solid ${form.type_incident===t.val?C.red:C.border}`,
                            background: form.type_incident===t.val ? C.redLight : C.bg,
                            transition:"all .1s",
                          }}>
                          <span style={{ fontSize:20, flexShrink:0 }}>{t.icon}</span>
                          <span style={{ fontSize:12, fontWeight:600, color:form.type_incident===t.val?C.red:C.text, lineHeight:1.4 }}>
                            {t.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pannes simples */}
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:C.amber, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ width:6, height:6, borderRadius:"50%", background:C.amber, display:"inline-block" }}/>
                      Problèmes mineurs — peut continuer à rouler
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                      {TYPES_PANNE.filter(t => !t.grave).map(t => (
                        <button key={t.val} type="button" onClick={() => set("type_incident", t.val)}
                          style={{
                            padding:"10px 14px", borderRadius:9, cursor:"pointer", fontFamily:"inherit",
                            textAlign:"left", display:"flex", alignItems:"center", gap:10,
                            border:`1.5px solid ${form.type_incident===t.val?C.amber:C.border}`,
                            background: form.type_incident===t.val ? C.amberLight : C.bg,
                            transition:"all .1s",
                          }}>
                          <span style={{ fontSize:18, flexShrink:0 }}>{t.icon}</span>
                          <span style={{ fontSize:12, fontWeight:600, color:form.type_incident===t.val?C.amber:C.text, lineHeight:1.4 }}>
                            {t.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ÉTAPE 2 — Niveau d'urgence */}
                {form.type_incident && (
                  <div className="sig-card" style={{ background:C.white, borderRadius:12, padding:"20px", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:4 }}>2. Niveau d'urgence</div>
                    <div style={{ fontSize:11, color:C.textLight, marginBottom:14 }}>
                      {typeSelectionne?.grave
                        ? "⚠️ Pour une panne grave, l'urgence critique est recommandée"
                        : "Évaluez la criticité du problème"}
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {NIVEAUX_URGENCE.map(n => (
                        <button key={n.val} type="button" onClick={() => set("urgence", n.val)}
                          style={{
                            padding:"12px 16px", borderRadius:9, cursor:"pointer", fontFamily:"inherit",
                            textAlign:"left", border:`1.5px solid ${form.urgence===n.val?n.color:C.border}`,
                            background: form.urgence===n.val ? n.bg : C.bg,
                            display:"flex", alignItems:"center", gap:12, transition:"all .1s",
                          }}>
                          <span style={{ fontSize:18 }}>{n.icon}</span>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:700, color:form.urgence===n.val?n.color:C.text }}>{n.label}</div>
                            <div style={{ fontSize:11, color:C.textMid, marginTop:2 }}>{n.desc}</div>
                          </div>
                          {form.urgence===n.val && <span style={{ fontSize:14, color:n.color }}>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ÉTAPE 3 — Détails */}
                {form.type_incident && form.urgence && (
                  <div className="sig-card" style={{ background:C.white, borderRadius:12, padding:"20px", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:14 }}>3. Détails</div>

                    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                      {/* Description */}
                      <div>
                        <label style={lbl}>Description du problème *</label>
                        <textarea
                          value={form.description}
                          onChange={e => set("description", e.target.value)}
                          rows={4}
                          placeholder="Décrivez précisément ce que vous observez : bruits, voyants allumés, comportement anormal…"
                          style={{ ...inp, resize:"vertical", height:110 }}
                        />
                      </div>

                      {/* Localisation */}
                      <div>
                        <label style={lbl}>Localisation du véhicule</label>
                        <input style={inp} value={form.localisation}
                          onChange={e => set("localisation", e.target.value)}
                          placeholder="Ex : Campus IUC, Parking Bonanjo, Autoroute…"/>
                      </div>

                      {/* Véhicule immobilisé */}
                      <div
                        onClick={() => set("immobilise", !form.immobilise)}
                        style={{
                          background: form.immobilise ? C.redLight : C.bg,
                          border:`1.5px solid ${form.immobilise?C.red:C.border}`,
                          borderRadius:9, padding:"12px 16px",
                          display:"flex", alignItems:"center", gap:12, cursor:"pointer",
                          transition:"all .1s",
                        }}>
                        <div style={{
                          width:22, height:22, borderRadius:6,
                          border:`2px solid ${form.immobilise?C.red:C.border}`,
                          background: form.immobilise ? C.red : C.white,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          flexShrink:0, transition:"all .1s",
                        }}>
                          {form.immobilise && <span style={{ fontSize:13, color:"#fff", fontWeight:800 }}>✓</span>}
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color:form.immobilise?C.red:C.text }}>
                            Le véhicule est immobilisé
                          </div>
                          <div style={{ fontSize:11, color:C.textMid, marginTop:2 }}>
                            Cochez si vous ne pouvez pas conduire le véhicule — une assistance sera dépêchée
                          </div>
                        </div>
                      </div>

                      {/* Photo */}
                      <div>
                        <label style={lbl}>Photo du problème (recommandé)</label>
                        <div
                          onClick={() => fileRef.current?.click()}
                          style={{
                            border:`2px dashed ${photo?C.green:C.border}`,
                            borderRadius:10, padding:"16px", textAlign:"center",
                            cursor:"pointer", background:photo?C.greenLight:C.bg,
                            transition:"all .12s",
                          }}>
                          <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
                            onChange={e => setPhoto(e.target.files?.[0])}/>
                          {photo ? (
                            <div style={{ fontSize:13, fontWeight:700, color:C.green }}>
                              📷 {photo.name}
                              <span style={{ fontWeight:400, color:C.textLight }}> ({(photo.size/1024).toFixed(0)} Ko)</span>
                              <button
                                onClick={e => { e.stopPropagation(); setPhoto(null); }}
                                style={{ marginLeft:10, fontSize:11, color:C.red, background:"none", border:"none", cursor:"pointer" }}>
                                Supprimer
                              </button>
                            </div>
                          ) : (
                            <>
                              <div style={{ fontSize:24, marginBottom:5 }}>📷</div>
                              <div style={{ fontSize:12, color:C.textMid }}>Prenez une photo du problème</div>
                              <div style={{ fontSize:11, color:C.textLight, marginTop:2 }}>JPG, PNG — max 10 Mo</div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bouton soumettre */}
                {form.type_incident && form.urgence && (
                  <button onClick={handleSubmit} disabled={submitting}
                    style={{
                      padding:"14px 24px", borderRadius:10, border:"none",
                      background: form.urgence==="CRITIQUE" ? C.red : C.green,
                      color:"#fff", fontSize:14, fontWeight:800,
                      cursor:"pointer", fontFamily:"inherit",
                      display:"flex", alignItems:"center", gap:10, justifyContent:"center",
                      opacity:submitting?0.7:1, transition:"all .12s",
                      boxShadow: form.urgence==="CRITIQUE" ? `0 4px 20px ${C.red}50` : `0 4px 20px ${C.green}50`,
                    }}>
                    {submitting ? (
                      <><span style={{ width:16, height:16, border:"2px solid rgba(255,255,255,.5)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin .8s linear infinite", display:"inline-block" }}/> Envoi en cours…</>
                    ) : form.urgence==="CRITIQUE" ? (
                      "🚨 Envoyer le signalement d'urgence"
                    ) : (
                      "📋 Soumettre le signalement"
                    )}
                  </button>
                )}
              </div>

              {/* Colonne droite — infos */}
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

                {/* Fiche véhicule */}
                <div style={{ background:C.white, borderRadius:12, padding:"18px 20px", boxShadow:"0 1px 3px rgba(0,0,0,.05)", border:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:14 }}>🚗 Mon véhicule de fonction</div>
                  {[
                    { label:"Immatriculation", val:vehicule.registration_number || vehicule.license_plate, bold:true, color:C.green },
                    { label:"Marque / Modèle", val:`${vehicule.make || vehicule.brand || ""} ${vehicule.model || ""}`.trim() },
                    { label:"Année",           val:vehicule.year || "—" },
                    { label:"Couleur",         val:vehicule.color || "—" },
                    { label:"Kilométrage",     val:vehicule.current_mileage ? `${Number(vehicule.current_mileage).toLocaleString("fr-FR")} km` : "—" },
                    { label:"Carburant",       val:vehicule.fuel_type || "—" },
                  ].map((f, i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:i<5?`1px solid ${C.border}`:"none" }}>
                      <span style={{ fontSize:11, color:C.textLight, fontWeight:600 }}>{f.label}</span>
                      <span style={{ fontSize:f.bold?14:12, fontWeight:f.bold?800:600, color:f.color||C.text }}>{f.val || "—"}</span>
                    </div>
                  ))}
                </div>

                {/* Guide */}
                <div style={{ background:C.white, borderRadius:12, padding:"18px 20px", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
                  <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:12 }}>💡 Conseils</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                    {[
                      { num:1, text:"Garez le véhicule en sécurité si nécessaire" },
                      { num:2, text:"Notez les symptômes et bruits inhabituels" },
                      { num:3, text:"Prenez une photo du problème visible" },
                      { num:4, text:"Précisez votre localisation exacte" },
                      { num:5, text:"Suivez l'avancement depuis \"Mes signalements\"" },
                    ].map(s => (
                      <div key={s.num} style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                        <div style={{ width:20, height:20, borderRadius:"50%", background:C.green, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, flexShrink:0, marginTop:1 }}>
                          {s.num}
                        </div>
                        <span style={{ fontSize:12, color:C.textMid, lineHeight:1.5 }}>{s.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Signalements récents */}
                {signalements.length > 0 && (
                  <div style={{ background:C.white, borderRadius:12, padding:"18px 20px", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:12 }}>📋 Récents</div>
                    {signalements.slice(0,3).map((s, i) => {
                      const st = STATUT_CFG[s.status] || STATUT_CFG.SIGNALE;
                      return (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:i<2?`1px solid ${C.border}`:"none" }}>
                          <div style={{ width:8, height:8, borderRadius:"50%", background:st.color, flexShrink:0 }}/>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:600, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                              {s.title || s.incident_type || "Panne"}
                            </div>
                            <div style={{ fontSize:10, color:C.textLight }}>{fmtDateShort(s.reported_date || s.created_at)}</div>
                          </div>
                          <span style={{ fontSize:9, fontWeight:700, color:st.color, background:st.bg, padding:"2px 8px", borderRadius:99, whiteSpace:"nowrap" }}>
                            {st.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ════ HISTORIQUE ════ */}
      {activeView === "historique" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
            {[
              { label:"Total",        val:signalements.length,                                                                              color:C.blue  },
              { label:"En attente",   val:signalements.filter(s=>["SIGNALE","EN_ATTENTE"].includes(s.status)).length,                      color:C.amber },
              { label:"En cours",     val:signalements.filter(s=>["EN_DIAGNOSTIC","EN_REPARATION"].includes(s.status)).length,             color:C.orange},
              { label:"Résolus",      val:signalements.filter(s=>s.status==="REPARE").length,                                              color:C.green },
            ].map((k,i) => (
              <div key={i} style={{ background:C.white, borderRadius:10, padding:"14px 16px", textAlign:"center", boxShadow:"0 1px 3px rgba(0,0,0,.05)", borderTop:`3px solid ${k.color}` }}>
                <div style={{ fontSize:22, fontWeight:800, color:k.color }}>{k.val}</div>
                <div style={{ fontSize:10, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px", marginTop:4 }}>{k.label}</div>
              </div>
            ))}
          </div>

          <div style={{ background:C.white, borderRadius:12, padding:"18px 20px", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
            <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:14 }}>Tous mes signalements</div>
            {signalements.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:C.textLight }}>
                <div style={{ fontSize:36, marginBottom:10 }}>📋</div>
                <div style={{ fontSize:13 }}>Aucun signalement enregistré</div>
              </div>
            ) : signalements.map((s, i) => {
              const st = STATUT_CFG[s.status] || STATUT_CFG.SIGNALE;
              const isUrgent = s.severity === "CRITIQUE";
              return (
                <div key={i} className="sig-card" style={{ padding:"14px 0", borderBottom:i<signalements.length-1?`1px solid ${C.border}`:"none" }}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                    <div style={{ width:44, height:44, borderRadius:10, flexShrink:0, background:isUrgent?C.redLight:C.amberLight, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
                      {isUrgent ? "🚨" : "🔧"}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                        <div>
                          <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{s.title || "Panne signalée"}</div>
                          <div style={{ fontSize:11, color:C.textLight, marginTop:2 }}>
                            {fmtDate(s.reported_date || s.created_at)}
                            {s.location && ` · 📍 ${s.location}`}
                          </div>
                        </div>
                        <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                          {isUrgent && (
                            <span style={{ padding:"2px 9px", borderRadius:99, fontSize:9, fontWeight:800, background:C.redLight, color:C.red }}>🔴 URGENT</span>
                          )}
                          <span style={{ padding:"2px 9px", borderRadius:99, fontSize:10, fontWeight:700, background:st.bg, color:st.color }}>
                            {st.label}
                          </span>
                        </div>
                      </div>
                      {s.description && (
                        <div style={{ fontSize:12, color:C.textMid, marginTop:4, lineHeight:1.5 }}>{s.description}</div>
                      )}
                      {s.diagnosis && (
                        <div style={{ marginTop:6, background:C.blueLight, borderRadius:7, padding:"6px 10px", fontSize:11, color:C.blue }}>
                          <b>🔍 Diagnostic :</b> {s.diagnosis}
                        </div>
                      )}
                      {s.repair_actions && (
                        <div style={{ marginTop:6, background:C.greenLight, borderRadius:7, padding:"6px 10px", fontSize:11, color:C.green }}>
                          <b>✓ Réparation :</b> {s.repair_actions}
                        </div>
                      )}
                      {s.assigned_technician && (
                        <div style={{ fontSize:11, color:C.textMid, marginTop:6 }}>
                          🔧 Technicien : <b>{s.technician_name || s.assigned_technician}</b>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}