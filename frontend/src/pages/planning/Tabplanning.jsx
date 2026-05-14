// ─── pages/planning/TabPlanning.jsx ──────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";

const API_BASE = "http://localhost:8000/api/v1";

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
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
  white:"#FFFFFF",  bg:"#F4F6F5",
  border:"#E2E8E5", text:"#1A2820", textMid:"#4A6358", textLight:"#8EA99A",
  amber:"#D97706",  amberLight:"#FFFBEB",
  blue:"#1D4ED8",   blueLight:"#EFF6FF",
  teal:"#0F766E",   tealLight:"#F0FDFA",
};

const STATUS_LOG = {
  EFFECTUE: { label:"Effectué",             color:C.green, bg:C.greenLight },
  RETARD:   { label:"Effectué avec retard", color:C.amber, bg:C.amberLight },
  ANNULE:   { label:"Annulé",               color:C.red,   bg:C.redLight   },
  INCIDENT: { label:"Incident signalé",     color:C.red,   bg:C.redLight   },
};

const fmtDate = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  return isNaN(date) ? "—" : date.toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" });
};
const fmtHeure = (d) => {
  if (!d) return "—";
  // Gère HH:MM (TimeField Django) et ISO datetime
  if (/^\d{2}:\d{2}/.test(d)) return d.substring(0, 5);
  const date = new Date(d);
  return isNaN(date) ? "—" : date.toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" });
};

// ── Construire un objet "route" depuis le profil chauffeur ───────────────────
function buildRouteFromProfile(driverProfile, vehicule) {
  if (!driverProfile || driverProfile.assignment_type !== "BUS_SCOLAIRE") return null;
  const veh = driverProfile.assigned_vehicle_info || vehicule;
  if (!veh) return null;
  return {
    id:            veh.id || "local",
    ligne:         veh.internal_code || veh.registration_number || "—",
    nom_trajet:    `Bus scolaire — ${veh.registration_number || veh.license_plate || "—"}`,
    point_depart:  "IUC Logbessou",
    point_arrivee: "IUC Logbessou",
    heure_depart:  driverProfile.bus_slot_start || "05:00",
    heure_arrivee: driverProfile.bus_slot_end   || "08:30",
    jours_service: ["LUN","MAR","MER","JEU","VEN"],
    arrets:        [],
    _from_profile: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
export function TabPlanning({ vehicule, isBus }) {
  const [route,          setRoute]          = useState(null);
  const [missions,       setMissions]       = useState([]);
  const [logsSemaine,    setLogsSemaine]    = useState([]);
  const [todayPointage,  setTodayPointage]  = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [jourSel,        setJourSel]        = useState("AUJ");
  const [pointing,       setPointing]       = useState(false);
  const [pointForm,      setPointForm]      = useState({
    status:"EFFECTUE", heure_depart_reelle:"",
    heure_arrivee_reelle:"", nb_passagers:"", commentaire:"",
  });
  const [missionActions, setMissionActions] = useState({});
  const [missionComment, setMissionComment] = useState({});
  const [showCommentFor, setShowCommentFor] = useState(null);
  const [toast,          setToast]          = useState({ msg:"", type:"success" });

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg:"", type:"success" }), 3500);
  };

 const today     = new Date().toISOString().split("T")[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]; // ← AJOUT

  // ── Chargement de toutes les données ────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Profil chauffeur connecté
      let driverProfile = null;
      try {
        const profile = await apiFetch("/auth/profile/");
        driverProfile  = profile?.driver_profile ?? null;
      } catch { /* ignore */ }

      // 2. Construire la route depuis le profil
      const routeData = buildRouteFromProfile(driverProfile, vehicule);
      setRoute(routeData);

      // 3. Pointage du jour depuis l'API ─────────────────────────────────────
      try {
        const tp = await apiFetch("/pointages/today/");
        setTodayPointage(tp);   // null si pas encore pointé
        if (tp) {
          // Préremplir le formulaire avec les valeurs existantes
          setPointForm({
            status:               tp.status               || "EFFECTUE",
            heure_depart_reelle:  tp.heure_depart_reelle  || "",
            heure_arrivee_reelle: tp.heure_arrivee_reelle || "",
            nb_passagers:         tp.nb_passagers?.toString() || "",
            commentaire:          tp.commentaire           || "",
          });
        }
      } catch { setTodayPointage(null); }

      // 4. Pointages de la semaine depuis l'API ─────────────────────────────
      try {
        const logs = await apiFetch("/pointages/semaine/");
        setLogsSemaine(Array.isArray(logs) ? logs : logs?.results ?? []);
      } catch { setLogsSemaine([]); }

      // 5. Missions : réservations APPROUVÉES assignées au chauffeur ─────────
     // 5. Missions assignées au chauffeur (toutes les APPROUVEES)
// Dans loadData, remplacez le bloc missions par :
let missionsData = [];
try {
  const [approuvees, terminees] = await Promise.all([
    apiFetch("/reservations/?driver=me&status=APPROUVEE"),
    apiFetch("/reservations/?driver=me&status=TERMINEE"),
  ]);
  const a = Array.isArray(approuvees) ? approuvees : approuvees?.results ?? [];
  const t = Array.isArray(terminees)  ? terminees  : terminees?.results  ?? [];
  missionsData = [...a, ...t];
} catch {
  missionsData = [];
}
setMissions(missionsData);
console.log("MISSIONS CHARGÉES:", missionsData);
console.log("DATE MISSION:", missionsData[0]?.start_date); // ← AJOUT
console.log("TODAY:", today);
    // ✅ Remplacer par ça — états vides, plus d'acceptation
const initActions = {};
missionsData.forEach(m => {
  // Lire le vrai statut depuis l'API
  initActions[m.id] = m.status === "TERMINEE" ? "TERMINEE" : null;
});
setMissionActions(initActions);
    

    } catch (e) {
      console.warn("Erreur chargement planning:", e.message);
    } finally {
      setLoading(false);
    }
  }, [isBus, vehicule]);

  useEffect(() => { loadData(); }, [loadData]);

  const alreadyDone = todayPointage !== null;

  // ── Pointage bus via API ───────────────────────────────────────────────────
  const handlePointer = async () => {
    if (pointForm.status !== "EFFECTUE" && !pointForm.commentaire.trim()) {
      showToast("Un commentaire est obligatoire pour ce statut", "error"); return;
    }
    setPointing(true);

    const payload = {
      status:               pointForm.status,
      heure_depart_reelle:  pointForm.heure_depart_reelle  || null,
      heure_arrivee_reelle: pointForm.heure_arrivee_reelle || null,
      nb_passagers:         parseInt(pointForm.nb_passagers) || 0,
      commentaire:          pointForm.commentaire,
    };

    try {
      // POST vers /api/v1/pointages/ — le backend gère unicité + modification avant 12h
      const saved = await apiFetch("/pointages/", {
        method: "POST",
        body:   JSON.stringify(payload),
      });
      setTodayPointage(saved);

      // Rafraîchir la liste semaine
      try {
        const logs = await apiFetch("/pointages/semaine/");
        setLogsSemaine(Array.isArray(logs) ? logs : logs?.results ?? []);
      } catch { /* ignore */ }

      showToast(alreadyDone ? "Pointage mis à jour ✓" : "Trajet pointé avec succès ✓");
    } catch (e) {
      showToast("Erreur lors du pointage : " + e.message, "error");
    } finally {
      setPointing(false);
    }
  };

 
 const handlePointerMission = async (mission) => {
  try {
    await apiFetch(`/reservations/${mission.id}/complete/`, {
      method: "POST",
      body:   JSON.stringify({}),
    });
    setMissionActions(prev => ({ ...prev, [mission.id]: "TERMINEE" }));
    showToast("Mission marquée comme effectuée ✓");
  } catch (e) {
    showToast("Erreur : " + e.message, "error");
  }
};

  // ── Tris missions ──────────────────────────────────────────────────────────
 // Au lieu de comparer strictement à today
const missionsAujourdHui = missions; // toutes les missions assignées
const missionsAVenir     = [];
const missionPassees     = [];
  // ── Styles communs ────────────────────────────────────────────────────────
  const inp = {
    padding:"8px 12px", border:`1.5px solid ${C.border}`, borderRadius:8,
    fontSize:13, outline:"none", fontFamily:"inherit", color:C.text,
    background:C.white, width:"100%",
  };
  const lbl = {
    fontSize:10, fontWeight:700, color:C.textMid, textTransform:"uppercase",
    letterSpacing:"1px", marginBottom:5, display:"block",
  };

  const NAV_TABS = [
    { key:"AUJ",      label:"Aujourd'hui",   icon:"📋" },
    { key:"SEM",      label:"Cette semaine", icon:"📅" },
    { key:"POINTAGE", label:"Pointage",      icon:"✅" },
  ];

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"60px 0", flexDirection:"column", gap:12 }}>
      <div style={{ width:28, height:28, border:`3px solid ${C.green}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin .8s linear infinite" }}/>
      <div style={{ fontSize:12, color:C.textLight }}>Chargement du planning…</div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, fontFamily:"'Inter',-apple-system,sans-serif" }}>
      <style>{`
        @keyframes spin   { to { transform:rotate(360deg); } }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .plan-card { animation:fadeIn .2s ease; }
      `}</style>

      {/* Toast */}
      {toast.msg && (
        <div style={{
          position:"fixed", bottom:24, right:24, zIndex:9999,
          background: toast.type==="error" ? C.red : C.green,
          color:"#fff", borderRadius:10, padding:"12px 18px",
          fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:10,
          boxShadow:"0 4px 20px rgba(0,0,0,.2)", maxWidth:380,
        }}>
          {toast.type==="error" ? "✕" : "✓"} {toast.msg}
        </div>
      )}

      {/* Navigation onglets */}
      <div style={{ display:"flex", gap:8 }}>
        {NAV_TABS.map(t => (
          <button key={t.key} onClick={() => setJourSel(t.key)}
            style={{
              padding:"9px 20px", borderRadius:9, fontSize:12, fontWeight:700,
              cursor:"pointer", fontFamily:"inherit", border:"none", transition:"all .12s",
              background: jourSel===t.key ? C.green : C.white,
              color:       jourSel===t.key ? "#fff"  : C.textMid,
              boxShadow:   jourSel===t.key ? "0 4px 14px rgba(27,94,55,.3)" : "0 1px 3px rgba(0,0,0,.06)",
              display:"flex", alignItems:"center", gap:6,
            }}>
            {t.icon} {t.label}
            {t.key==="POINTAGE" && isBus && !alreadyDone && (
              <span style={{ background:C.red, color:"#fff", borderRadius:99, fontSize:9, fontWeight:800, width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center" }}>!</span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════ AUJOURD'HUI ════════════ */}
      {jourSel === "AUJ" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1.5px" }}>
            {new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
          </div>

          {/* Info profil estimé */}
          {isBus && route?._from_profile && (
            <div style={{ background:C.amberLight, border:`1px solid ${C.amber}30`, borderRadius:9, padding:"10px 14px", fontSize:12, color:C.amber }}>
              <b>ℹ️ Trajet estimé depuis votre profil.</b> Le gestionnaire peut définir les arrêts et horaires précis depuis le module Véhicules.
            </div>
          )}

          {/* Circuit bus */}
          {isBus && !route && (
            <div style={{ background:C.white, borderRadius:12, padding:"28px 20px", textAlign:"center", boxShadow:"0 1px 3px rgba(0,0,0,.05)", border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🚌</div>
              <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:4 }}>Aucun bus scolaire assigné</div>
              <div style={{ fontSize:12, color:C.textLight }}>Le gestionnaire doit vous assigner un trajet bus depuis le module Véhicules.</div>
            </div>
          )}

          {isBus && route && (
            <BusRouteCard
              route={route}
              vehicule={vehicule}
              alreadyDone={alreadyDone}
              onPointer={() => setJourSel("POINTAGE")}
            />
          )}

          {/* ── Missions du jour assignées au chauffeur ── */}
          <div style={{ fontSize:11, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1.5px", marginTop:4 }}>
            Missions assignées aujourd'hui
          </div>

          {missionsAujourdHui.length === 0 ? (
            <div style={{ background:C.white, borderRadius:12, padding:"24px 20px", textAlign:"center", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
              <div style={{ fontSize:28, marginBottom:8 }}>🗺️</div>
              <div style={{ fontSize:13, color:C.textLight }}>Aucune mission assignée aujourd'hui</div>
            </div>
          ) : missionsAujourdHui.map((m, i) => (
  <MissionCard
    key={m.id||i}
    mission={m}
    action={missionActions[m.id]}
    onPointer={() => handlePointerMission(m)}
  />
))}

          {/* ── Missions à venir ── */}
          {missionsAVenir.length > 0 && (
            <>
              <div style={{ fontSize:11, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1.5px", marginTop:4 }}>
                À venir
              </div>
              {missionsAVenir.slice(0,3).map((m,i) => (
  <MissionCard
    key={m.id||i}
    mission={m}
    action={missionActions[m.id]}
    onPointer={() => handlePointerMission(m)}
  />
))}
            </>
          )}

          {/* Aucune mission du tout */}
          {missions.length === 0 && !isBus && (
            <div style={{ background:C.white, borderRadius:12, padding:"28px 20px", textAlign:"center", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
              <div style={{ fontSize:28, marginBottom:8 }}>✅</div>
              <div style={{ fontSize:13, color:C.textLight }}>Aucune mission assignée pour le moment</div>
              <div style={{ fontSize:11, color:C.textLight, marginTop:4 }}>Le gestionnaire vous notifiera lors de l'approbation d'une réservation.</div>
            </div>
          )}
        </div>
      )}

      {/* ════════════ CETTE SEMAINE ════════════ */}
      {jourSel === "SEM" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
            {[
              { icon:"✅", label:"Pointages",  val:logsSemaine.filter(l=>["EFFECTUE","RETARD"].includes(l.status)).length, color:C.green },
              { icon:"⚠️", label:"Retards",    val:logsSemaine.filter(l=>l.status==="RETARD").length,                      color:C.amber },
              { icon:"🚨", label:"Incidents",  val:logsSemaine.filter(l=>l.status==="INCIDENT").length,                    color:C.red   },
              { icon:"🗺️", label:"Missions",   val:missions.length,                                                         color:C.blue  },
            ].map((s,i) => (
              <div key={i} style={{ background:C.white, borderRadius:10, padding:"12px 14px", textAlign:"center", boxShadow:"0 1px 3px rgba(0,0,0,.05)", borderTop:`3px solid ${s.color}` }}>
                <div style={{ fontSize:18 }}>{s.icon}</div>
                <div style={{ fontSize:22, fontWeight:800, color:s.color, marginTop:4 }}>{s.val}</div>
                <div style={{ fontSize:10, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px", marginTop:3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Historique pointages bus */}
          {isBus && (
            <div style={{ background:C.white, borderRadius:12, padding:"18px 20px", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
              <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:14 }}>🚌 Pointages ramassage scolaire — 7 derniers jours</div>
              {logsSemaine.length === 0 ? (
                <div style={{ textAlign:"center", padding:"24px 0", color:C.textLight, fontSize:13 }}>Aucun pointage cette semaine</div>
              ) : logsSemaine.map((log, i) => {
                const cfg     = STATUS_LOG[log.status] || STATUS_LOG.EFFECTUE;
                const isToday = log.date === today;
                return (
                  <div key={i} style={{
                    display:"flex", alignItems:"center", gap:14, padding:"11px 14px",
                    borderRadius:8, marginBottom:6,
                    background: isToday ? C.greenLight : C.bg,
                    border: `1px solid ${isToday ? C.green+"30" : C.border}`,
                  }}>
                    <div style={{ minWidth:90 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:C.text }}>
                        {log.date ? new Date(log.date + "T12:00:00").toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"}) : "—"}
                      </div>
                      {isToday && <div style={{ fontSize:9, color:C.green, fontWeight:700 }}>Aujourd'hui</div>}
                    </div>
                    <div style={{ flex:1, display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
                      <span style={{ padding:"2px 9px", borderRadius:99, fontSize:10, fontWeight:700, background:cfg.bg, color:cfg.color }}>{cfg.label}</span>
                      {log.heure_depart_reelle  && <span style={{ fontSize:11, color:C.textMid }}>🕐 {fmtHeure(log.heure_depart_reelle)} → {fmtHeure(log.heure_arrivee_reelle)||"?"}</span>}
                      {log.nb_passagers > 0     && <span style={{ fontSize:11, color:C.textMid }}>👥 {log.nb_passagers} pers.</span>}
                      {log.commentaire           && <span style={{ fontSize:11, color:C.textLight, fontStyle:"italic" }}>"{log.commentaire}"</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Missions de la semaine */}
          <div style={{ background:C.white, borderRadius:12, padding:"18px 20px", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
            <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:14 }}>🗺️ Toutes mes missions assignées</div>
            {missions.length === 0 ? (
              <div style={{ textAlign:"center", padding:"24px 0", color:C.textLight, fontSize:13 }}>Aucune mission cette semaine</div>
            ) : missions.map((m,i) => {
              const action = missionActions[m.id];
              const cfg = {
  TERMINEE: { color:C.teal,  bg:C.tealLight,  label:"✅ Effectuée" },
  APPROUVEE:{ color:C.green, bg:C.greenLight,  label:"En cours"    },
  ANNULEE:  { color:C.red,   bg:C.redLight,    label:"Annulée"     },
  REJETEE:  { color:C.red,   bg:C.redLight,    label:"Rejetée"     },
}[action === "TERMINEE" ? "TERMINEE" : m.status] || { color:C.amber, bg:C.amberLight, label:"En attente" }[action] || { color:C.amber, bg:C.amberLight, label:"En attente" };

              const isToday = (m.start_date||"").split("T")[0] === today;

              return (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0, background:cfg.color }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text }}>
                      {m.requester_name || m.requester_full_name || "Demande"} → {m.destination || "—"}
                    </div>
                    <div style={{ fontSize:11, color:C.textLight }}>
                      {isToday ? "Aujourd'hui" : fmtDate(m.start_date)}
                      {m.start_date && ` à ${fmtHeure(m.start_date)}`}
                      {m.number_of_passengers ? ` · ${m.number_of_passengers} pers.` : ""}
                    </div>
                  </div>
                  <span style={{ padding:"2px 9px", borderRadius:99, fontSize:10, fontWeight:700, background:cfg.bg, color:cfg.color, whiteSpace:"nowrap" }}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Missions passées */}
          {missionPassees.length > 0 && (
            <div style={{ background:C.white, borderRadius:12, padding:"18px 20px", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
              <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:14 }}>📋 Missions passées</div>
              {missionPassees.slice(0,5).map((m,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
                  <span style={{ fontSize:14 }}>✅</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:C.textMid }}>
                      {m.requester_name || m.requester_full_name || "Réservation"} → {m.destination || "—"}
                    </div>
                    <div style={{ fontSize:11, color:C.textLight }}>{fmtDate(m.start_date)}</div>
                  </div>
                  <span style={{ padding:"2px 9px", borderRadius:99, fontSize:10, fontWeight:700,
                    background: missionActions[m.id]==="TERMINEE" ? C.tealLight : C.bg,
                    color:      missionActions[m.id]==="TERMINEE" ? C.teal      : C.textLight }}>
                    {missionActions[m.id]==="TERMINEE" ? "Effectuée" : m.status || "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════ POINTAGE ════════════ */}
      {jourSel === "POINTAGE" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

          {isBus ? (
            /* ── Pointage bus scolaire ── */
            <div style={{ background:C.white, borderRadius:12, padding:"20px", boxShadow:"0 1px 3px rgba(0,0,0,.05)", border:`1.5px solid ${alreadyDone?C.green+"50":C.border}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                    <span style={{ padding:"2px 10px", borderRadius:99, fontSize:10, fontWeight:800, background:C.amberLight, color:C.amber }}>🚌 Circuit Scolaire</span>
                    {route && (
                      <span style={{ fontSize:12, fontWeight:700, color:C.text }}>
                        {route.ligne && route.ligne !== "—" ? `Ligne ${route.ligne}` : "Bus scolaire"}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:12, color:C.textLight }}>
                    {new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}
                    {route ? ` · ${route.heure_depart||"05:00"} → ${route.heure_arrivee||"08:30"}` : ""}
                  </div>
                </div>
                {alreadyDone && (
                  <span style={{ padding:"5px 14px", borderRadius:99, fontSize:12, fontWeight:700, background:C.greenLight, color:C.green }}>
                    ✅ Pointé aujourd'hui
                  </span>
                )}
              </div>

              {/* Résumé si déjà pointé */}
              {todayPointage && (
                <div style={{ background:C.greenLight, borderRadius:9, padding:"12px 14px", marginBottom:16, border:`1px solid ${C.green}20` }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.green, marginBottom:8 }}>✅ Pointage enregistré</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                    {[
                      { icon:"📊", label:"Statut",      val: STATUS_LOG[todayPointage.status]?.label || todayPointage.status },
                      { icon:"🕐", label:"Départ réel", val: fmtHeure(todayPointage.heure_depart_reelle)  || "—" },
                      { icon:"🕗", label:"Arrivée",     val: fmtHeure(todayPointage.heure_arrivee_reelle) || "—" },
                      { icon:"👥", label:"Passagers",   val: todayPointage.nb_passagers || "—" },
                      ...(todayPointage.commentaire ? [{icon:"📝",label:"Commentaire",val:todayPointage.commentaire}] : []),
                    ].map((f,fi) => (
                      <div key={fi} style={{ gridColumn:fi>=4?"1/-1":"auto" }}>
                        <div style={{ fontSize:9, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px", marginBottom:3 }}>{f.icon} {f.label}</div>
                        <div style={{ fontSize:12, fontWeight:600, color:C.green }}>{f.val}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setTodayPointage(null)}
                    style={{ marginTop:12, fontSize:11, color:C.amber, background:"none", border:`1px solid ${C.amber}30`, borderRadius:6, padding:"4px 12px", cursor:"pointer", fontFamily:"inherit" }}>
                    ✏️ Modifier le pointage
                  </button>
                </div>
              )}

              {/* Formulaire pointage */}
              {!todayPointage && (
                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  <div>
                    <label style={lbl}>Comment s'est passé le trajet ?</label>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:6 }}>
                      {Object.entries(STATUS_LOG).map(([val, cfg]) => (
                        <button key={val} type="button" onClick={() => setPointForm(f=>({...f,status:val}))}
                          style={{ padding:"8px 14px", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"all .12s",
                            border:`1.5px solid ${pointForm.status===val?cfg.color:C.border}`,
                            background: pointForm.status===val?cfg.bg:C.white,
                            color:       pointForm.status===val?cfg.color:C.textMid,
                          }}>
                          {cfg.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                    <div>
                      <label style={lbl}>Départ réel</label>
                      <input style={inp} type="time" value={pointForm.heure_depart_reelle}
                        onChange={e=>setPointForm(f=>({...f,heure_depart_reelle:e.target.value}))}/>
                    </div>
                    <div>
                      <label style={lbl}>Arrivée réelle</label>
                      <input style={inp} type="time" value={pointForm.heure_arrivee_reelle}
                        onChange={e=>setPointForm(f=>({...f,heure_arrivee_reelle:e.target.value}))}/>
                    </div>
                    <div>
                      <label style={lbl}>Passagers</label>
                      <input style={inp} type="number" min="0" max={vehicule?.seating_capacity||99}
                        value={pointForm.nb_passagers}
                        onChange={e=>setPointForm(f=>({...f,nb_passagers:e.target.value}))}
                        placeholder={`Max: ${vehicule?.seating_capacity||"?"}`}/>
                    </div>
                  </div>

                  <div>
                    <label style={{ ...lbl, color: pointForm.status!=="EFFECTUE" ? C.red : C.textMid }}>
                      Commentaire {pointForm.status!=="EFFECTUE" ? "* (obligatoire)" : "(optionnel)"}
                    </label>
                    {pointForm.status !== "EFFECTUE" ? (
                      <textarea value={pointForm.commentaire}
                        onChange={e=>setPointForm(f=>({...f,commentaire:e.target.value}))}
                        rows={3} placeholder="Décrivez la situation…"
                        style={{...inp, resize:"vertical", height:80, borderColor:C.red+"50"}}/>
                    ) : (
                      <input style={inp} value={pointForm.commentaire}
                        onChange={e=>setPointForm(f=>({...f,commentaire:e.target.value}))}
                        placeholder="Remarques éventuelles…"/>
                    )}
                  </div>

                  <button onClick={handlePointer}
                    disabled={pointing || (pointForm.status!=="EFFECTUE" && !pointForm.commentaire.trim())}
                    style={{
                      padding:"12px 24px", borderRadius:9, border:"none",
                      background: C.green, color:"#fff", fontSize:13, fontWeight:700,
                      cursor:"pointer", fontFamily:"inherit",
                      display:"flex", alignItems:"center", gap:10, alignSelf:"flex-start",
                      opacity: pointing || (pointForm.status!=="EFFECTUE" && !pointForm.commentaire.trim()) ? 0.6 : 1,
                    }}>
                    {pointing
                      ? <><span style={{width:14,height:14,border:"2px solid rgba(255,255,255,.5)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .8s linear infinite",display:"inline-block"}}/> Pointage en cours…</>
                      : "✅ Confirmer le pointage"
                    }
                  </button>
                </div>
              )}
            </div>

          ) : (
            /* ── Chauffeur polyvalent : pointage missions ── */
            <div style={{ background:C.white, borderRadius:12, padding:"20px", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
              <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:4 }}>🗺️ Missions — Acceptation & Pointage</div>
              <div style={{ fontSize:11, color:C.textLight, marginBottom:16 }}>Acceptez ou refusez les missions. Pointez-les une fois effectuées.</div>
              {missions.length === 0 ? (
                <div style={{ textAlign:"center", padding:"36px 0", color:C.textLight }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>✅</div>
                  <div style={{ fontSize:13 }}>Aucune mission à pointer pour le moment</div>
                </div>
              ) : missions.map((m,i) => (
  <MissionCard
    key={m.id||i}
    mission={m}
    action={missionActions[m.id]}
    onPointer={() => handlePointerMission(m)}
  />
))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Carte circuit scolaire ────────────────────────────────────────────────────
function BusRouteCard({ route, vehicule, alreadyDone, onPointer }) {
  const [expanded, setExpanded] = useState(false);

  const nomTrajet = route.nom_trajet && !route.nom_trajet.includes("undefined")
    ? route.nom_trajet
    : route.ligne && route.ligne !== "—" ? `Ligne ${route.ligne}` : "Circuit scolaire";

  const depart  = route.point_depart  && route.point_depart  !== "undefined" ? route.point_depart  : "Départ";
  const arrivee = route.point_arrivee && route.point_arrivee !== "undefined" ? route.point_arrivee : "IUC Logbessou";

  return (
    <div className="plan-card" style={{ background:C.white, borderRadius:12, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,.05)", border:`1px solid ${C.border}`, borderLeft:`4px solid ${C.amber}` }}>
      <div style={{ padding:"16px 18px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5, flexWrap:"wrap" }}>
              <span style={{ padding:"2px 10px", borderRadius:99, fontSize:10, fontWeight:800, background:C.amberLight, color:C.amber }}>🚌 Circuit Scolaire</span>
              <span style={{ padding:"2px 9px", borderRadius:99, fontSize:10, fontWeight:700,
                background: alreadyDone ? C.greenLight : C.amberLight,
                color:      alreadyDone ? C.green      : C.amber }}>
                {alreadyDone ? "✅ Pointé" : "À pointer"}
              </span>
            </div>
            <div style={{ fontSize:15, fontWeight:800, color:C.text }}>{nomTrajet}</div>
            <div style={{ fontSize:11, color:C.textLight, marginTop:3 }}>{depart} → {arrivee}</div>
          </div>
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.amber }}>
              {route.heure_depart||"05:00"} → {route.heure_arrivee||"08:30"}
            </div>
            {vehicule && (
              <div style={{ fontSize:11, color:C.textMid, marginTop:4 }}>
                🚌 {vehicule.registration_number || vehicule.license_plate || "—"}
              </div>
            )}
          </div>
        </div>

        <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginBottom:12 }}>
          {route.jours_service?.length > 0 && <span style={{ fontSize:11, color:C.textMid }}>📅 {route.jours_service.join(", ")}</span>}
          {route.arrets?.length > 0          && <span style={{ fontSize:11, color:C.textMid }}>📍 {route.arrets.length} arrêt{route.arrets.length>1?"s":""}</span>}
        </div>

        {route.arrets?.length > 0 && (
          <button onClick={() => setExpanded(e=>!e)}
            style={{ fontSize:11, color:C.green, background:"none", border:"none", cursor:"pointer", fontWeight:600, padding:0, marginBottom:expanded?12:0 }}>
            {expanded ? "▲ Masquer les arrêts" : `▼ Voir les ${route.arrets.length} arrêts`}
          </button>
        )}

        {!alreadyDone && (
          <button onClick={onPointer}
            style={{ padding:"8px 18px", background:C.green, color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            ✅ Pointer mon trajet
          </button>
        )}
        {alreadyDone && <div style={{ fontSize:12, color:C.green, fontWeight:600 }}>✅ Trajet pointé ce matin</div>}
      </div>
    </div>
  );
}

function MissionCard({ mission:m, action, onPointer }) {

  const isTerminee = action === "TERMINEE";

  return (
    <div className="plan-card" style={{ background:C.white, borderRadius:12, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,.05)", border:`1px solid ${C.border}`, borderLeft:`4px solid ${C.blue}` }}>
      <div style={{ padding:"16px 18px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5, flexWrap:"wrap" }}>
              <span style={{ padding:"2px 10px", borderRadius:99, fontSize:10, fontWeight:800, background:C.blueLight, color:C.blue }}>🗺️ Mission</span>
              {isTerminee && (
                <span style={{ padding:"2px 9px", borderRadius:99, fontSize:10, fontWeight:700, background:C.tealLight, color:C.teal }}>✅ Effectuée</span>
              )}
            </div>
            <div style={{ fontSize:14, fontWeight:700, color:C.text }}>
              {m.requester_name || m.requester_full_name || "Demande de réservation"}
            </div>
            <div style={{ fontSize:11, color:C.textLight, marginTop:3 }}>📍 {m.destination || "—"}</div>
          </div>
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.blue }}>{fmtHeure(m.start_date)}</div>
            <div style={{ fontSize:10, color:C.textLight, marginTop:2 }}>{fmtDate(m.start_date)}</div>
          </div>
        </div>

        <div style={{ display:"flex", gap:16, fontSize:11, color:C.textMid, marginBottom:12, flexWrap:"wrap" }}>
          {m.number_of_passengers && <span>👥 {m.number_of_passengers} pers.</span>}
          {m.purpose              && <span>💼 {m.purpose}</span>}
          {m.vehicle_name && m.vehicle_name !== "Non assigné" && <span>🚗 {m.vehicle_name}</span>}
          {m.end_date             && <span>🏁 Retour: {fmtDate(m.end_date)}</span>}
        </div>

        {/* Bouton unique */}
        {!isTerminee ? (
          <button onClick={onPointer}
            style={{ padding:"8px 20px", background:C.green, color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:8 }}>
            ✅ Marquer comme effectuée
          </button>
        ) : (
          <div style={{ fontSize:12, color:C.teal, fontWeight:600 }}>✅ Mission effectuée avec succès</div>
        )}
      </div>
    </div>
  );
}