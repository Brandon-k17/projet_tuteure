// ─── src/dashboard/DashboardChauffeur.jsx ────────────────────────────────────
// CORRECTION : TabPlanning et PlanningRow supprimés d'ici.
// Ils sont définis dans ../planning/TabPlanning.jsx et importés ci-dessous.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { TabPlanning } from "../planning/Tabplanning";
import { TabTrajets } from "../trajets/TabTrajets";
import TabDocumentsChauffeur from "../documents/TabDocumentsChauffeur";
import { TabCarburant } from "../carburant/TabCarburant";
import { TabSignalements } from "../signalements/TabSignalements";
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
  if (res.status === 401) { window.location.href = "/login"; return null; }
  if (res.status === 204) return null;
  const json = await res.json();
  if (!res.ok) throw new Error(json?.detail || json?.message || `Erreur ${res.status}`);
  return json?.data ?? json;
}

const C = {
  green:"#1B5E37", greenMid:"#2D7A4F", greenLight:"#EAF4EE",
  red:"#C0182A",   redLight:"#FDF0F1",
  white:"#FFFFFF",  bg:"#F4F6F5",
  sidebar:"#2c6549", sideHover:"#243d2e", sideActive:"#2D7A4F",
  border:"#E2E8E5", text:"#1A2820", textMid:"#4A6358", textLight:"#8EA99A",
  amber:"#D97706",  amberLight:"#FFFBEB",
  blue:"#1D4ED8",   blueLight:"#EFF6FF",
  purple:"#6D28D9", purpleLight:"#F5F3FF",
};

const NAV = [
  { id:"dashboard",    label:"Tableau de bord",  icon:"grid"    },
  { id:"planning",     label:"Mon Planning",      icon:"calendar"},
  { id:"trajets",      label:"Mes Trajets",       icon:"route"   },
  { id:"documents", label:"Mon Véhicule", icon:"car" },
   { id:"carburant",    label:"Carburant",         icon:"fuel"   },
  { id:"signalements", label:"Signalements",      icon:"alert"   },
  { id:"notifications",label:"Notifications",     icon:"bell"    },
];

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" })
  : "—";

const fmtDuration = (ms) => {
  const m = Math.floor(ms / 60000);
  return m < 60 ? `${m} min` : `${Math.floor(m/60)}h${String(m%60).padStart(2,"0")}`;
};

const isRamassageTime = () => {
  const n = new Date();
  const m = n.getHours() * 60 + n.getMinutes();
  return m >= 300 && m <= 510;
};

const MOCK = {
  user: { first_name:"Paul", last_name:"MBANG", full_name:"Paul MBANG",
          role_display:"Chauffeur", phone:"+237 699 000 003", driver_type:"BUS" },
  vehicule: {
    id:9, brand:"Yutong", model:"ZK6729D", license_plate:"LT 009 CM",
    year:2020, status:"EN_SERVICE", mileage:143000, category:"BUS",
    seating_capacity:29, insurance_expiry:"2026-12-31",
    last_maintenance:"2026-01-15", next_maintenance:"2026-07-15",
    color:"Blanc", transmission:"Automatique",
  },
  ligne: {
    id:1, code:"LIGNE-A", nom:"Ligne A — Bonanjo / IUC",
    arrêts:[
      { nom:"Rond-Point Deido",   heure:"05:15" },
      { nom:"Bonanjo Cathédrale", heure:"05:28" },
      { nom:"Akwa BCEAO",         heure:"05:40" },
      { nom:"Carrefour Ndokoti",  heure:"05:58" },
      { nom:"Bonabéri Marché",    heure:"06:18" },
      { nom:"Entrée IUC",         heure:"06:45" },
    ],
    tours_matinaux:2, capacite:29,
  },
  planning: [
    { id:"ram-1", heure:"05:00", fin:"08:30", periode:"MATIN", type:"RAMASSAGE",
      titre:"Ramassage scolaire — Ligne A (Tour 1)",
      trajet:"Rond-Point Deido → Bonanjo → Akwa → Ndokoti → Bonabéri → IUC",
      passagers_prevus:29, duree:"1h45", status:"EN_COURS", verrouille:true, recurrent:true, jours:"Lun–Ven" },
    { id:"ram-2", heure:"07:00", fin:"08:30", periode:"MATIN", type:"RAMASSAGE",
      titre:"Ramassage scolaire — Ligne A (Tour 2 retour)",
      trajet:"IUC → Bonabéri → Akwa → Bonanjo → Deido",
      passagers_prevus:25, duree:"1h15", status:"EN_ATTENTE", verrouille:true, recurrent:true, jours:"Lun–Ven" },
    { id:"res-1", heure:"10:00", fin:"17:00", periode:"JOURNEE", type:"MISSION",
      titre:"Mission Dr. KAMGA — Inspection Campus Edéa",
      trajet:"IUC Douala → Campus Edéa (aller-retour)",
      passagers_prevus:4, duree:"Journée complète", status:"EN_ATTENTE",
      verrouille:false, recurrent:false, requester:"Dr. KAMGA", destination:"Campus Edéa — 145 km" },
    { id:"res-2", heure:"17:30", fin:"19:00", periode:"SOIR", type:"RAMASSAGE",
      titre:"Retour scolaire — Ligne A (soir)",
      trajet:"IUC → Bonabéri → Akwa → Bonanjo → Deido",
      passagers_prevus:28, duree:"1h20", status:"EN_ATTENTE", verrouille:true, recurrent:true, jours:"Lun–Ven" },
  ],
  trajets: [
    { id:1, date:"2026-04-09", type:"RAMASSAGE", depart:"Deido", arrivee:"IUC",
      km_depart:142920, km_arrivee:143000, passagers:27, duree_ms:6300000,
      start_lat:4.0511, start_lng:9.7085, end_lat:4.1121, end_lng:9.7245 },
    { id:2, date:"2026-04-08", type:"MISSION", depart:"IUC", arrivee:"Yaoundé",
      km_depart:142750, km_arrivee:142920, passagers:2, duree_ms:12600000,
      start_lat:4.1121, start_lng:9.7245, end_lat:3.8480, end_lng:11.5021 },
    { id:3, date:"2026-04-07", type:"RAMASSAGE", depart:"Deido", arrivee:"IUC",
      km_depart:142600, km_arrivee:142750, passagers:29, duree_ms:6600000,
      start_lat:4.0511, start_lng:9.7085, end_lat:4.1121, end_lng:9.7245 },
  ],
  notifications: [
    { id:1, title:"Nouvelle mission assignée", message:"Mission Dr. Fouda le 12/04 — Yaoundé.", type:"INFO", status:"NON_LU", created_at:"2026-04-09T08:00:00" },
    { id:2, title:"Révision à prévoir", message:"Votre bus LT 009 CM doit passer en révision avant le 15/07.", type:"WARNING", status:"NON_LU", created_at:"2026-04-08T14:00:00" },
    { id:3, title:"Plein validé", message:"Votre saisie carburant du 07/04 a été validée.", type:"SUCCESS", status:"LU", created_at:"2026-04-07T16:00:00" },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardChauffeur({ onLogout }) {
  const [tab,        setTab]        = useState("dashboard");
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [myStatus,   setMyStatus]   = useState("DISPONIBLE");
  const [trajetLive, setTrajetLive] = useState(null);
  const [showPanne,  setShowPanne]  = useState(false);
  const [showCarb,   setShowCarb]   = useState(false);

 useEffect(() => {
  (async () => {
    setLoading(true);
    try {
      const [u, v, planning, trajets, notifs, driverProfile] = await Promise.all([
        apiFetch("/auth/profile/").catch(() => null),
        apiFetch("/vehicles/my-vehicle/").catch(() => null),
        apiFetch("/reservations/?driver=me").catch(() => null),
        apiFetch("/trips/?driver=me").catch(() => null),
        apiFetch("/notifications/").catch(() => null),
        apiFetch("/auth/users/my-status/").catch(() => null),
        // /routes/my-line/ SUPPRIMÉ — TabPlanning gère ça lui-même
      ]);

      const vNorm = v ? {
        ...v,
        brand:            v.brand            ?? v.make,
        license_plate:    v.license_plate    ?? v.registration_number,
        mileage:          v.mileage          ?? v.current_mileage,
        seating_capacity: v.seating_capacity ?? v.capacity,
      } : null;

      setData({
        user:          u     ?? MOCK.user,
        vehicule:      vNorm ?? MOCK.vehicule,
        planning:      Array.isArray(planning) ? planning : planning?.results ?? MOCK.planning,
        trajets:       Array.isArray(trajets)  ? trajets  : trajets?.results  ?? MOCK.trajets,
        notifications: Array.isArray(notifs)   ? notifs   : notifs?.results   ?? MOCK.notifications,
        ligne:         MOCK.ligne, // retiré de l'API, TabPlanning le charge seul
      });
      if (driverProfile?.manual_status) setMyStatus(driverProfile.manual_status);
    } catch {
      setData({ ...MOCK });
    } finally { setLoading(false); }
  })();
}, []);

  const handleLogout = () => { localStorage.clear(); sessionStorage.clear(); onLogout?.(); };

  if (loading || !data) return <Loader />;

  const { user, vehicule, planning, trajets, notifications, ligne } = data;
  const unread      = notifications.filter(n => n.status === "NON_LU").length;
  const isBus       = user?.driver_type === "BUS" || vehicule?.category === "BUS";
  const enRamassage = isBus && isRamassageTime();

  return (
    <div style={S.shell}>
      <style>{CSS}</style>

      <aside style={S.sidebar}>
        <div style={S.brand}>
          <IUCLogo />
          <div style={S.brandText}>
            <div style={S.brandName}>DRIVEPARC</div>
            <div style={S.brandSub}>Institut Universitaire de la Côte</div>
          </div>
        </div>
        <div style={S.divider}/>

        <div style={{ padding:"10px 14px 6px" }}>
          <div style={{ fontSize:9, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:"1.5px", fontWeight:700 }}>
            {isBus ? "Chauffeur Bus" : "Chauffeur"}
          </div>
          {isBus && (
            <div style={{ marginTop:4, fontSize:10, background:"rgba(255,255,255,0.08)", borderRadius:6, padding:"4px 8px", color:"rgba(255,255,255,.6)" }}>
              🚌 {ligne?.code || "LIGNE-A"} · {ligne?.nom?.split("—")[0] || "Ramassage"}
            </div>
          )}
          {enRamassage && (
            <div style={{ marginTop:6, fontSize:10, background:"rgba(217,119,6,0.3)", borderRadius:6, padding:"4px 8px", color:C.amber, fontWeight:700 }}>
              🔒 05h–08h30 · Ramassage
            </div>
          )}
        </div>

        <nav style={S.nav}>
          {NAV.map(n => {
            const active = tab === n.id;
            return (
              <button key={n.id} onClick={() => setTab(n.id)}
                style={{ ...S.navItem, ...(active ? S.navActive : {}) }}
                className={active ? "" : "nav-btn"}>
                <span style={{ display:"flex", opacity:active?1:0.65 }}><NavIcon id={n.icon}/></span>
                <span style={S.navLabel}>{n.label}</span>
                {n.id === "notifications" && unread > 0 && <span style={S.navBadge}>{unread}</span>}
                {active && <span style={S.navPip}/>}
              </button>
            );
          })}
        </nav>

        <div style={S.sideBottom}>
          <div style={S.divider}/>
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 8px 8px" }}>
            <div style={{ width:30, height:30, borderRadius:"50%", background:C.greenMid, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:11, flexShrink:0 }}>
              {user.first_name?.[0]}{user.last_name?.[0]}
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {user.full_name || `${user.first_name} ${user.last_name}`}
              </div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,.4)" }}>{user.role_display}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={S.logoutBtn} className="logout-btn">
            <LogoutIcon/><span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <div style={S.main}>
        <header style={S.topbar}>
          <div>
            <h1 style={S.pageTitle}>{NAV.find(n => n.id === tab)?.label ?? "Tableau de bord"}</h1>
            <p style={S.pageDate}>{new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}</p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {trajetLive && (
              <div style={{ display:"flex", alignItems:"center", gap:8, background:C.greenLight, border:`1px solid ${C.green}30`, borderRadius:8, padding:"6px 12px" }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:C.green, display:"inline-block", animation:"pulse 1.5s ease-in-out infinite" }}/>
                <span style={{ fontSize:11, fontWeight:700, color:C.green }}>Trajet en cours</span>
              </div>
            )}
            <div style={{ position:"relative" }}>
              <button style={S.iconBtn} className="icon-btn" onClick={() => setTab("notifications")}><BellIcon/></button>
              {unread > 0 && <span style={S.badge}>{unread}</span>}
            </div>
            <div style={S.userChip}>
              <div style={S.topAvatar}>{user.first_name?.[0]}{user.last_name?.[0]}</div>
              <div>
                <div style={S.topName}>{user.full_name || `${user.first_name} ${user.last_name}`}</div>
                <div style={S.topRole}>{user.role_display}</div>
              </div>
            </div>
          </div>
        </header>

        <div style={S.content}>
          {tab === "dashboard"     && (
            <TabDashboard
              user={user} vehicule={vehicule} planning={planning}
              trajetLive={trajetLive} setTrajetLive={setTrajetLive}
              onPanne={() => setShowPanne(true)} onCarburant={() => setShowCarb(true)}
              setTab={setTab} myStatus={myStatus} setMyStatus={setMyStatus}
              isBus={isBus} enRamassage={enRamassage} ligne={ligne}
            />
          )}

          {/* ── TabPlanning importé depuis ../planning/TabPlanning.jsx ── */}
          {tab === "planning" && (
            <TabPlanning vehicule={vehicule} isBus={isBus} />
          )}

        {tab === "trajets" && <TabTrajets vehicule={vehicule} />}
         
         {tab === "documents"     && <TabDocumentsChauffeur vehicule={vehicule} />} 
         
{tab === "carburant" && (
  <TabCarburant role="CHAUFFEUR" reservations={data?.planning ?? []} />
)}
          {tab === "signalements" && <TabSignalements vehicule={vehicule} />}
          {tab === "notifications" && <TabNotifications  notifications={notifications} />}
        </div>
      </div>

      {showPanne && <ModalPanne     vehicule={vehicule} onClose={() => setShowPanne(false)} />}
      {showCarb  && <ModalCarburant vehicule={vehicule} onClose={() => setShowCarb(false)}  />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function TabDashboard({ user, vehicule, planning, trajetLive, setTrajetLive,
  onPanne, onCarburant, setTab, myStatus, setMyStatus, isBus, enRamassage, ligne }) {
  return (
    <div style={S.colGap}>
      <ToggleDisponibilite status={myStatus} onChange={setMyStatus} isBus={isBus} enRamassage={enRamassage} />

      {enRamassage && isBus && (
        <div style={{ background:`linear-gradient(130deg, ${C.amber} 0%, #b45309 100%)`, borderRadius:12, padding:"14px 18px", color:"#fff" }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"1.5px", opacity:0.8, marginBottom:4 }}>🔒 RAMASSAGE SCOLAIRE EN COURS — 05h00 → 08h30</div>
          <div style={{ fontSize:15, fontWeight:800, marginBottom:6 }}>{ligne?.nom || "Ligne A"}</div>
          <div style={{ display:"flex", gap:16, fontSize:12, opacity:0.9 }}>
            <span>🚌 {ligne?.tours_matinaux || 2} tours matinaux</span>
            <span>👥 Capacité : {vehicule?.seating_capacity} places</span>
          </div>
          <div style={{ marginTop:10, fontSize:11, background:"rgba(0,0,0,.2)", borderRadius:7, padding:"6px 12px" }}>
            Vous êtes automatiquement indisponible pour les réservations pendant cette période.
          </div>
        </div>
      )}

      {trajetLive && (
        <div style={{ background:C.green, borderRadius:12, padding:"16px 20px", color:"#fff" }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"1.5px", opacity:0.7, marginBottom:6 }}>▶ TRAJET EN COURS</div>
          <div style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>{trajetLive.titre}</div>
          <LiveTimer startTime={trajetLive.startTime} />
          <button onClick={() => setTrajetLive(null)}
            style={{ marginTop:12, padding:"8px 20px", background:"rgba(255,255,255,.2)", color:"#fff", border:"1px solid rgba(255,255,255,.4)", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            ⏹ Terminer et enregistrer le trajet
          </button>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        <ActionCard icon="▶" color={C.green} title="Démarrer trajet"  desc="Activer la géolocalisation" onClick={() => setTab("trajets")} />
        <ActionCard icon="⛽" color={C.amber} title="Plein carburant"  desc="Enregistrer un ravitaillement" onClick={onCarburant} />
        <ActionCard icon="🔧" color={C.red}   title="Signaler panne"   desc="Incident sur le véhicule" onClick={onPanne} />
        <ActionCard icon="📋" color={C.blue}  title="Mes trajets"      desc="Historique et statistiques" onClick={() => setTab("trajets")} />
      </div>

      {vehicule && (
        <div style={S.card}>
          <div style={S.cardHead}>
            <span style={S.cardTitle}>Mon véhicule assigné</span>
            <StatusBadge status={vehicule.status}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
            <MiniCard icon="🚌" label="Véhicule"          value={`${vehicule.brand} ${vehicule.model}`}/>
            <MiniCard icon="🪪" label="Immatriculation"   value={vehicule.license_plate} bold/>
            <MiniCard icon="📍" label="Kilométrage"       value={`${Number(vehicule.mileage||0).toLocaleString("fr-FR")} km`}/>
            <MiniCard icon="🔧" label="Prochaine révision" value={fmtDate(vehicule.next_maintenance)} color={C.amber}/>
          </div>
        </div>
      )}

      <div style={S.card}>
        <div style={S.cardHead}>
          <span style={S.cardTitle}>Planning d'aujourd'hui</span>
          <Chip color={C.green}>{planning.length} mission{planning.length>1?"s":""}</Chip>
        </div>
        {planning.length === 0
          ? <Empty text="Aucune mission prévue aujourd'hui" icon="🎉"/>
          : planning.map((p, i) => <DashPlanningRow key={i} p={p} trajetLive={trajetLive} setTrajetLive={setTrajetLive}/>)
        }
      </div>
    </div>
  );
}

// Ligne planning simplifiée pour le Dashboard (pas de conflit de nom)
function DashPlanningRow({ p, trajetLive, setTrajetLive }) {
  const isLive = trajetLive?.id === p.id;
  const typeCfg = {
    RAMASSAGE:{ bg:C.amberLight, color:C.amber, label:"Ramassage" },
    MISSION:  { bg:C.blueLight,  color:C.blue,  label:"Mission"   },
  }[p.type] || { bg:C.bg, color:C.textMid, label:p.type };

  return (
    <div style={{ display:"flex", gap:14, padding:"12px 0", borderBottom:`1px solid ${C.border}`, alignItems:"flex-start", opacity:p.status==="TERMINE"?0.55:1 }}>
      <div style={{ textAlign:"center", minWidth:48, flexShrink:0 }}>
        <div style={{ fontSize:16, fontWeight:800, color:C.green }}>{p.heure}</div>
        {p.fin && <div style={{ fontSize:9, color:C.textLight }}>→ {p.fin}</div>}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
          <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{p.titre}</span>
          <span style={{ fontSize:9, fontWeight:800, background:typeCfg.bg, color:typeCfg.color, padding:"2px 8px", borderRadius:99 }}>{typeCfg.label}</span>
          {p.verrouille && <span style={{ fontSize:9, fontWeight:800, background:C.amberLight, color:C.amber, padding:"2px 8px", borderRadius:99 }}>🔒</span>}
        </div>
        <div style={{ fontSize:11, color:C.textMid }}>📍 {p.trajet}</div>
        {!p.verrouille && p.status === "EN_ATTENTE" && (
          <button onClick={() => setTrajetLive(isLive ? null : { ...p, startTime:Date.now() })}
            style={{ marginTop:8, padding:"5px 14px", borderRadius:7, border:"none", background:isLive?C.red:C.green, color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            {isLive ? "⏹ Terminer" : "▶ Démarrer"}
          </button>
        )}
      </div>
    </div>
  );
}

function LiveTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(Date.now() - startTime);
  useEffect(() => {
    const t = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(t);
  }, [startTime]);
  return (
    <div style={{ fontSize:28, fontWeight:900, letterSpacing:"2px", color:"#fff", fontVariantNumeric:"tabular-nums" }}>
      {String(Math.floor(elapsed/3600000)).padStart(2,"0")}:
      {String(Math.floor((elapsed%3600000)/60000)).padStart(2,"0")}:
      {String(Math.floor((elapsed%60000)/1000)).padStart(2,"0")}
    </div>
  );
}




// ─────────────────────────────────────────────────────────────────────────────
// TAB NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────
function TabNotifications({ notifications }) {
  const [list, setList] = useState(notifications);
  const markRead = id => setList(l=>l.map(n=>n.id===id?{...n,status:"LU"}:n));
  const unread = list.filter(n=>n.status==="NON_LU").length;
  return (
    <div style={S.card}>
      <div style={{ ...S.cardHead, marginBottom:16 }}>
        <div><span style={S.cardTitle}>Notifications</span><div style={{ fontSize:11, color:C.textLight, marginTop:3 }}>{unread} non lue{unread>1?"s":""}</div></div>
        {unread>0 && <button style={S.linkBtn} onClick={()=>setList(l=>l.map(n=>({...n,status:"LU"})))}>Tout marquer lu</button>}
      </div>
      {list.length===0 ? <Empty text="Aucune notification" icon="🔔"/> : list.map((n,i) => (
        <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 12px", marginBottom:4, borderRadius:8, background:n.status==="NON_LU"?C.greenLight:"transparent" }}>
          <span style={{ width:8,height:8,borderRadius:"50%",flexShrink:0,marginTop:5, background:n.type==="SUCCESS"?C.green:n.type==="WARNING"?C.amber:n.type==="ERROR"?C.red:C.blue }}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13,fontWeight:n.status==="NON_LU"?700:500,color:C.text }}>{n.title}</div>
            <div style={{ fontSize:11,color:C.textMid,marginTop:2 }}>{n.message}</div>
            <div style={{ fontSize:10,color:C.textLight,marginTop:4 }}>{fmtDate(n.created_at)}</div>
          </div>
          {n.status==="NON_LU" && <button style={S.linkBtn} onClick={()=>markRead(n.id)}>Marquer lu</button>}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOGGLE DISPONIBILITÉ
// ─────────────────────────────────────────────────────────────────────────────
function ToggleDisponibilite({ status, onChange, isBus, enRamassage }) {
  const [loading, setLoading] = useState(false);
  const options = [
    { val:"DISPONIBLE",   label:"Disponible",  color:C.green, bg:C.greenLight, icon:"🟢" },
    { val:"INDISPONIBLE", label:"Indisponible", color:C.red,   bg:C.redLight,   icon:"🔴" },
    { val:"CONGE",        label:"En congé",     color:"#888",  bg:"#F5F5F5",    icon:"🏖️" },
  ];
  const current = options.find(o=>o.val===status)||options[0];
  const handleChange = async (val) => {
    if (val===status||enRamassage) return;
    setLoading(true);
    try {
      const tkn = localStorage.getItem("access_token");
      await fetch(`${API_BASE}/auth/users/my-status/`, { method:"PATCH", headers:{"Content-Type":"application/json",Authorization:`Bearer ${tkn}`}, body:JSON.stringify({manual_status:val}) });
      onChange(val);
    } catch { onChange(val); }
    finally { setLoading(false); }
  };
  return (
    <div style={{ background:current.bg, border:`1.5px solid ${current.color}30`, borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
      <div>
        <div style={{ fontSize:10, fontWeight:700, color:current.color, textTransform:"uppercase", letterSpacing:"1px" }}>Mon statut</div>
        <div style={{ fontSize:16, fontWeight:800, color:C.text, marginTop:3 }}>
          {current.icon} {current.label}
          {enRamassage&&isBus && <span style={{ fontSize:10, color:C.amber, marginLeft:10 }}>🔒 Ramassage en cours</span>}
        </div>
      </div>
      <div style={{ display:"flex", gap:6 }}>
        {options.filter(o=>o.val!==status).map(o => (
          <button key={o.val} onClick={()=>handleChange(o.val)} disabled={loading||enRamassage}
            style={{ padding:"6px 12px", borderRadius:7, fontSize:11, fontWeight:700, cursor:enRamassage?"not-allowed":"pointer", fontFamily:"inherit", border:`1.5px solid ${o.color}30`, background:o.bg, color:o.color, opacity:enRamassage?0.4:loading?0.6:1 }}>
            {o.icon} {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODALS
// ─────────────────────────────────────────────────────────────────────────────
function ModalPanne({ vehicule, onClose }) {
  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, width:520 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <span style={{ fontSize:15, fontWeight:700, color:C.text }}>🔧 Signaler une panne</span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:C.textLight }}>✕</button>
        </div>
        <TabSignalements vehicule={vehicule}/>
      </div>
    </div>
  );
}
function ModalCarburant({ vehicule, onClose }) {
  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, width:520 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <span style={{ fontSize:15, fontWeight:700, color:C.text }}>⛽ Enregistrer un plein</span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:C.textLight }}>✕</button>
        </div>
        <TabCarburant vehicule={vehicule}/>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MICRO-COMPOSANTS
// ─────────────────────────────────────────────────────────────────────────────
function ActionCard({ icon, color, title, desc, onClick }) {
  return <button onClick={onClick} className="action-card" style={{ background:C.white, borderRadius:10, padding:"16px 14px", border:`1px solid ${C.border}`, borderTop:`3px solid ${color}`, cursor:"pointer", textAlign:"left", fontFamily:"inherit", boxShadow:"0 1px 3px rgba(0,0,0,.05)", transition:"all .15s" }}><div style={{ fontSize:24, marginBottom:8 }}>{icon}</div><div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:3 }}>{title}</div><div style={{ fontSize:11, color:C.textLight, lineHeight:1.4 }}>{desc}</div></button>;
}
function MiniCard({ icon, label, value, bold, color }) {
  return <div style={{ padding:"10px 12px", background:C.bg, borderRadius:8 }}><div style={{ fontSize:10, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px", marginBottom:4 }}>{icon} {label}</div><div style={{ fontSize:bold?17:13, fontWeight:bold?800:600, color:color||C.text }}>{value||"—"}</div></div>;
}
function StatusBadge({ status }) {
  const m={DISPONIBLE:{label:"Disponible",bg:C.greenLight,color:C.green},EN_SERVICE:{label:"En service",bg:C.amberLight,color:C.amber},EN_MAINTENANCE:{label:"Maintenance",bg:C.redLight,color:C.red},HORS_SERVICE:{label:"Hors service",bg:"#F5F5F5",color:"#888"}}[status]||{label:status,bg:"#F5F5F5",color:"#888"};
  return <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:99, fontSize:11, fontWeight:700, background:m.bg, color:m.color }}><span style={{ width:5, height:5, borderRadius:"50%", background:m.color, display:"inline-block" }}/>{m.label}</span>;
}
function Chip({ color, children }) { return <span style={{ padding:"2px 10px", borderRadius:99, fontSize:11, fontWeight:700, background:color+"1A", color }}>{children}</span>; }
function Empty({ text, icon="📭" }) { return <div style={{ textAlign:"center", padding:"40px 0", color:C.textLight }}><div style={{ fontSize:34, marginBottom:8 }}>{icon}</div><div style={{ fontSize:13 }}>{text}</div></div>; }
function Loader() { return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:C.bg, flexDirection:"column", gap:14 }}><div style={{ width:32, height:32, border:`3px solid ${C.green}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin .8s linear infinite" }}/><div style={{ fontSize:11, color:C.textLight, letterSpacing:"2px", textTransform:"uppercase" }}>Chargement</div></div>; }
function IUCLogo() { return <div style={{ width:44, height:44, borderRadius:10, background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><svg width="28" height="28" viewBox="0 0 52 52" fill="none"><path d="M7 34L16 18Q18 13 22 13H30Q34 13 36 18L45 34" stroke="white" strokeWidth="3" strokeLinecap="round"/><rect x="5" y="32" width="42" height="12" rx="6" fill="white" opacity=".92"/><circle cx="15" cy="44" r="5.5" fill="#C0182A"/><circle cx="37" cy="44" r="5.5" fill="#C0182A"/><circle cx="15" cy="44" r="2.5" fill="white"/><circle cx="37" cy="44" r="2.5" fill="white"/><rect x="22" y="17" width="8" height="7" rx="1.5" fill="white" opacity=".4"/></svg></div>; }
function NavIcon({ id }) {
  const p={width:16,height:16,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round"};
  switch(id){
    case "grid":     return <svg {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
    case "calendar": return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    case "car":      return <svg {...p}><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h11l4 4v4a2 2 0 0 1-2 2h-1"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>;
    case "route":    return <svg {...p}><path d="M3 17l6-6 4 4 8-8"/><path d="M21 17H3"/></svg>;
    case "fuel":     return <svg {...p}><path d="M3 22V8l6-6 6 6v14"/><line x1="3" y1="22" x2="21" y2="22"/><line x1="9" y1="22" x2="9" y2="12"/><rect x="6" y="12" width="6" height="4"/></svg>;
    case "alert":    return <svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    case "bell":     return <svg {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
    default:         return <svg {...p}><circle cx="12" cy="12" r="10"/></svg>;
  }
}
function BellIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>; }
function LogoutIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const C_greenMid = C.greenMid;
const S = {
  shell:     { display:"flex", height:"100vh", width:"100vw", fontFamily:"'Inter',-apple-system,sans-serif", background:C.bg, overflow:"hidden" },
  sidebar:   { width:224, background:C.sidebar, display:"flex", flexDirection:"column", flexShrink:0, height:"100vh" },
  brand:     { display:"flex", alignItems:"center", gap:11, padding:"18px 16px 12px" },
  brandText: { minWidth:0 },
  brandName: { fontSize:13, fontWeight:800, color:"#fff", letterSpacing:"2px" },
  brandSub:  { fontSize:9, color:"rgba(255,255,255,.35)", marginTop:2, lineHeight:1.4 },
  divider:   { height:1, background:"rgba(255,255,255,.07)", margin:"0 14px" },
  nav:       { flex:1, padding:"6px 10px", overflowY:"auto", minHeight:0 },
  navItem:   { display:"flex", alignItems:"center", gap:10, width:"100%", padding:"7px 10px", borderRadius:7, border:"none", cursor:"pointer", color:"rgba(255,255,255,.6)", marginBottom:1, textAlign:"left", background:"transparent", fontFamily:"inherit", position:"relative", transition:"all .12s" },
  navActive: { background:C.sideActive, color:"#fff", fontWeight:600 },
  navLabel:  { fontSize:12, flex:1 },
  navPip:    { position:"absolute", right:0, top:"50%", transform:"translateY(-50%)", width:3, height:16, background:"#fff", borderRadius:99 },
  navBadge:  { background:C.red, color:"#fff", borderRadius:99, fontSize:9, fontWeight:800, width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center" },
  sideBottom:{ padding:"6px 10px 12px", flexShrink:0 },
  logoutBtn: { display:"flex", alignItems:"center", gap:8, width:"100%", padding:"8px 10px", borderRadius:7, border:"none", cursor:"pointer", background:"rgba(192,24,42,0.22)", color:"rgba(255,255,255,.7)", fontSize:12, fontFamily:"inherit", marginTop:8, transition:"all .12s" },
  main:      { flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 },
  topbar:    { background:C.white, borderBottom:`1px solid ${C.border}`, padding:"12px 22px", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 },
  pageTitle: { fontSize:20, fontWeight:760, color:C.text, letterSpacing:"-.4px", margin:0 },
  pageDate:  { fontSize:11, color:C.textLight, marginTop:2 },
  iconBtn:   { width:34, height:34, borderRadius:8, border:`1px solid ${C.border}`, background:C.white, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:C.textMid },
  badge:     { position:"absolute", top:-5, right:-5, background:C.red, color:"#fff", borderRadius:99, fontSize:9, fontWeight:800, width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center" },
  userChip:  { display:"flex", alignItems:"center", gap:9 },
  topAvatar: { width:34, height:34, borderRadius:"50%", background:C.green, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:12 },
  topName:   { fontSize:13, fontWeight:700, color:C.text },
  topRole:   { fontSize:10, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px" },
  content:   { flex:1, overflowY:"auto", padding:"18px 22px" },
  colGap:    { display:"flex", flexDirection:"column", gap:16 },
  card:      { background:C.white, borderRadius:10, padding:"16px 18px", boxShadow:"0 1px 3px rgba(0,0,0,.05)" },
  cardHead:  { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 },
  cardTitle: { fontSize:13, fontWeight:700, color:C.text },
  input:     { padding:"8px 12px", border:`1.5px solid ${C.border}`, borderRadius:7, fontSize:13, outline:"none", fontFamily:"inherit", color:C.text, background:C.white, width:"100%" },
  label:     { fontSize:10, fontWeight:700, color:C.textMid, textTransform:"uppercase", letterSpacing:"1px", marginBottom:5, display:"block" },
  linkBtn:   { background:"none", border:"none", color:C.green, fontSize:11, fontWeight:600, cursor:"pointer", textDecoration:"underline", fontFamily:"inherit" },
  overlay:   { position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 },
  modal:     { background:C.white, borderRadius:14, padding:24, maxWidth:"95vw", boxShadow:"0 20px 60px rgba(0,0,0,.2)", maxHeight:"90vh", overflowY:"auto" },
  greenMid:  C.greenMid,
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  .nav-btn:hover { background:${C.sideHover} !important; color:#fff !important; }
  .logout-btn:hover { background:rgba(192,24,42,0.4) !important; }
  .icon-btn:hover { background:${C.bg} !important; }
  .action-card:hover { transform:translateY(-2px); box-shadow:0 4px 16px rgba(0,0,0,0.1) !important; }
  button:active { transform:scale(0.97); }
  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-thumb { background:#D4DDD9; border-radius:99px; }
  input:focus, textarea:focus { border-color:${C.green} !important; box-shadow:0 0 0 3px ${C.green}18 !important; outline:none; }
`;