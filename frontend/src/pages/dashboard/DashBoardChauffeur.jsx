import { useState, useEffect } from "react";

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
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err) || `Erreur ${res.status}`);
  }
  if (res.status === 204) return null;
  const json = await res.json();
  return json?.data ?? json;
}

// ── Couleurs IUC ──────────────────────────────────────────────────────────────
const C = {
  green:      "#1B5E37",
  greenMid:   "#2D7A4F",
  greenLight: "#EAF4EE",
  red:        "#C0182A",
  redLight:   "#FDF0F1",
  white:      "#FFFFFF",
  bg:         "#F4F6F5",
  sidebar:    "#2c6549",
  sideHover:  "#1F4F37",
  sideActive: "#2D7A4F",
  border:     "#E2E8E5",
  text:       "#1A2820",
  textMid:    "#4A6358",
  textLight:  "#8EA99A",
  amber:      "#D97706",
  amberLight: "#FFFBEB",
  blue:       "#1D4ED8",
  blueLight:  "#EFF6FF",
};

const NAV = [
  { id: "dashboard",    label: "Tableau de bord", icon: "grid"    },
  { id: "planning",     label: "Mon Planning",     icon: "calendar"},
  { id: "vehicule",     label: "Mon Véhicule",     icon: "car"     },
  { id: "trajets",      label: "Trajets",          icon: "route"   },
  { id: "carburant",    label: "Carburant",        icon: "fuel"    },
  { id: "signalements", label: "Signalements",     icon: "alert"   },
  { id: "notifications",label: "Notifications",    icon: "bell"    },
];

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK = {
  user: {
    first_name: "Paul", last_name: "MBANG",
    full_name: "Paul MBANG", role_display: "Chauffeur",
    phone: "+237 699 000 003",
  },
  vehicule: {
    id: 9, brand: "Yutong", model: "ZK6729D",
    license_plate: "LT 009 CM", year: 2020,
    status: "EN_SERVICE", mileage: 143000,
    fuel_level: 65, category: "BUS",
    seating_capacity: 29,
    insurance_expiry: "2026-12-31",
    last_maintenance: "2026-01-15",
    next_maintenance: "2026-07-15",
  },
  planning: [
    {
      id: 1, heure: "07:00", periode: "MATIN",
      titre: "Circuit Bus Scolaire — Ligne A (Bonanjo-IUC)",
      type: "RECURRENT", type_label: "RÉCURRENT",
      trajet: "Départ Bonanjo → Akwa → Bonabéri → IUC",
      capacite: "45 étudiants", duree: "1h15",
      status: "EN_COURS",
    },
    {
      id: 2, heure: "10:00", periode: "MATIN",
      titre: "Mission Dr. KAMGA — Inspection Campus Edéa",
      type: "PONCTUEL", type_label: "MISSION PONCTUELLE",
      trajet: "IUC Douala → Campus Edéa (aller-retour)",
      capacite: "Dr. KAMGA (Directeur)", duree: "Journée complète",
      status: "EN_ATTENTE",
    },
    {
      id: 3, heure: "17:30", periode: "SOIR",
      titre: "Circuit Bus Scolaire — Ligne A (IUC-Bonanjo)",
      type: "RECURRENT", type_label: "RÉCURRENT",
      trajet: "Départ IUC → Bonabéri → Akwa → Bonanjo",
      capacite: "45 étudiants", duree: "1h20",
      status: "EN_ATTENTE",
    },
  ],
  trajets: [
    { id: 1, date: "2026-03-29", depart: "Bonanjo", arrivee: "IUC", km_depart: 142850, km_arrivee: 142934, passagers: 38, duree: "1h10", type: "RECURRENT" },
    { id: 2, date: "2026-03-28", depart: "IUC", arrivee: "Yaoundé", km_depart: 142700, km_arrivee: 142850, passagers: 1, duree: "3h20", type: "MISSION" },
    { id: 3, date: "2026-03-27", depart: "Bonanjo", arrivee: "IUC", km_depart: 142560, km_arrivee: 142700, passagers: 41, duree: "1h15", type: "RECURRENT" },
  ],
  notifications: [
    { id: 1, title: "Mission assignée", message: "Vous avez une mission le 02/04 : Transport Dr. Fouda vers Yaoundé.", type: "INFO", status: "NON_LU", created_at: "2026-03-29" },
    { id: 2, title: "Révision à venir", message: "Votre véhicule LT 009 CM doit passer en révision avant le 15/07.", type: "WARNING", status: "NON_LU", created_at: "2026-03-28" },
  ],
};

export default function DashboardChauffeur({ onLogout }) {
  const [tab,           setTab]           = useState("dashboard");
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [trajetActif,   setTrajetActif]   = useState(null); // trajet en cours
  const [showPanne,     setShowPanne]     = useState(false);
  const [showCarburant, setShowCarburant] = useState(false);
  const [myStatus, setMyStatus] = useState("DISPONIBLE");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
       // Dans le useEffect, ajoute cet appel
const [u, v, planning, trajets, notifs, driverProfile] = await Promise.all([
  apiFetch("/auth/profile/").catch(() => null),
  apiFetch("/vehicles/my-vehicle/").catch(() => null),
  apiFetch("/reservations/?driver=me").catch(() => null),
  apiFetch("/reservations/?driver=me&status=TERMINEE").catch(() => null),
  apiFetch("/notifications/").catch(() => null),
 apiFetch("/auth/users/my-status/").catch(() => null),
]);
setData({
  user:          u             ?? MOCK.user,
  vehicule:      v             ?? MOCK.vehicule,
  planning:      Array.isArray(planning) ? planning : planning?.results ?? MOCK.planning,
  trajets:       Array.isArray(trajets)  ? trajets  : trajets?.results  ?? MOCK.trajets,
  notifications: Array.isArray(notifs)   ? notifs   : notifs?.results   ?? MOCK.notifications,
  driverProfile: driverProfile ?? null,  // ← nouveau
});
if (driverProfile?.manual_status) {
  setMyStatus(driverProfile.manual_status);
}
      } catch {
        setData(MOCK);
      } finally { setLoading(false); }
    })();
  }, []);

  const handleLogout = () => {
    localStorage.clear(); sessionStorage.clear();
    onLogout?.();
  };

  if (loading || !data) return <Loader />;

  const { user, vehicule, planning, trajets, notifications } = data;
  const unread = notifications.filter(n => n.status === "NON_LU").length;
  const planningAujourdhui = planning.filter(p =>
    !p.date || p.date === new Date().toISOString().split("T")[0]
  );

  return (
    <div style={S.shell}>
      <style>{CSS}</style>

      {/* ── SIDEBAR ── */}
      <aside style={S.sidebar}>
        <div style={S.brand}>
          <IUCLogo />
          <div style={S.brandText}>
            <div style={S.brandName}>DRIVEPARC</div>
            <div style={S.brandSub}>Institut Universitaire de la Côte</div>
          </div>
        </div>
        <div style={S.divider} />
        <div style={S.profileBadge}>
          <div style={S.profilRole}>Chauffeur</div>
        </div>
        <nav style={S.nav}>
          {NAV.map(n => {
            const active = tab === n.id;
            return (
              <button key={n.id} onClick={() => setTab(n.id)}
                style={{ ...S.navItem, ...(active ? S.navActive : {}) }}
                className={active ? "" : "nav-btn"}>
                <span style={{ display: "flex", opacity: active ? 1 : 0.65 }}>
                  <NavIcon id={n.icon} />
                </span>
                <span style={S.navLabel}>{n.label}</span>
                {n.id === "notifications" && unread > 0 &&
                  <span style={S.navBadge}>{unread}</span>
                }
                {active && <span style={S.navPip} />}
              </button>
            );
          })}
        </nav>
        <div style={S.sideBottom}>
          <div style={S.divider} />
          <button onClick={handleLogout} style={S.logoutBtn} className="logout-btn">
            <LogoutIcon /><span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={S.main}>
        <header style={S.topbar}>
          <div>
            <h1 style={S.pageTitle}>{NAV.find(n => n.id === tab)?.label ?? "Tableau de bord"}</h1>
            <p style={S.pageDate}>{new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}</p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ position:"relative" }}>
              <button style={S.iconBtn} className="icon-btn" onClick={() => setTab("notifications")}>
                <BellIcon />
              </button>
              {unread > 0 && <span style={S.badge}>{unread}</span>}
            </div>
            <div style={S.userChip}>
              <div style={S.topAvatar}>{user?.first_name?.[0]}{user?.last_name?.[0]}</div>
              <div>
                <div style={S.topName}>{user?.full_name || `${user?.first_name} ${user?.last_name}`}</div>
                <div style={S.topRole}>{user?.role_display || "Chauffeur"}</div>
              </div>
            </div>
          </div>
        </header>

        <div style={S.content}>
          {tab === "dashboard"    && (
            <TabDashboard
              user={user} vehicule={vehicule}
              planning={planningAujourdhui}
              trajetActif={trajetActif}
              setTrajetActif={setTrajetActif}
              onPanne={() => setShowPanne(true)}
              onCarburant={() => setShowCarburant(true)}
              setTab={setTab}
              myStatus={myStatus}          // ← nouveau
              setMyStatus={setMyStatus}
            />
          )}
          {tab === "planning"     && <TabPlanning     planning={planning} trajetActif={trajetActif} setTrajetActif={setTrajetActif} />}
          {tab === "vehicule"     && <TabVehicule      vehicule={vehicule} onPanne={() => setShowPanne(true)} />}
          {tab === "trajets"      && <TabTrajets       trajets={trajets} />}
          {tab === "carburant"    && <TabCarburant     vehicule={vehicule} />}
          {tab === "signalements" && <TabSignalements  vehicule={vehicule} />}
          {tab === "notifications"&& <TabNotifications notifications={notifications} />}
        </div>
      </div>

      {/* Modals */}
      {showPanne     && <ModalPanne     vehicule={vehicule} onClose={() => setShowPanne(false)} />}
      {showCarburant && <ModalCarburant vehicule={vehicule} onClose={() => setShowCarburant(false)} />}
    </div>
  );
}

// ── Tab Dashboard ─────────────────────────────────────────────────────────────
// ── Tab Dashboard ─────────────────────────────────────────────────────────────
// REMPLACE les deux fonctions TabDashboard imbriquées par celle-ci UNIQUEMENT

function TabDashboard({ user, vehicule, planning, trajetActif, setTrajetActif,
  onPanne, onCarburant, setTab, myStatus, setMyStatus }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>

      {/* Toggle disponibilité */}
      <ToggleDisponibilite status={myStatus} onChange={setMyStatus} />

      {/* Actions rapides */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
        <ActionCard icon="▶" color={C.green}  title="Démarrer Trajet"   desc="Commencer une mission"         onClick={() => setTab("planning")} />
        <ActionCard icon="⛽" color={C.amber}  title="Plein Carburant"   desc="Enregistrer un plein"          onClick={onCarburant} />
        <ActionCard icon="📷" color={C.red}    title="Signaler Panne"    desc="Signaler un problème"          onClick={onPanne} />
        <ActionCard icon="📋" color={C.blue}   title="Historique"        desc="Voir mes trajets passés"       onClick={() => setTab("trajets")} />
      </div>

      {/* Trajet en cours */}
      {trajetActif && (
        <div style={{ background:C.green, borderRadius:12, padding:"16px 20px", color:"#fff" }}>
          <div style={{ fontSize:12, fontWeight:700, letterSpacing:"1.5px", opacity:0.7, marginBottom:6 }}>TRAJET EN COURS</div>
          <div style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>{trajetActif.titre}</div>
          <div style={{ fontSize:12, opacity:0.8, marginBottom:14 }}>{trajetActif.trajet}</div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => setTrajetActif(null)}
              style={{ padding:"8px 20px", background:"rgba(255,255,255,0.2)", color:"#fff", border:"1px solid rgba(255,255,255,0.4)", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              ⏹ Terminer le trajet
            </button>
          </div>
        </div>
      )}

      {/* Mon véhicule résumé */}
      {vehicule && (
        <div style={S.section}>
          <div style={S.secHead}>
            <span style={S.secTitle}>Mon véhicule assigné</span>
            <StatusBadge status={vehicule.status} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
            <MiniCard icon="🚌" label="Véhicule"        value={`${vehicule.brand} ${vehicule.model}`} />
            <MiniCard icon="🪪" label="Immatriculation" value={vehicule.license_plate} bold />
            <MiniCard icon="📍" label="Kilométrage"     value={`${Number(vehicule.mileage||0).toLocaleString("fr-FR")} km`} />
            <MiniCard icon="⛽" label="Carburant"       value={`${vehicule.fuel_level ?? "—"} %`} color={vehicule.fuel_level < 25 ? C.red : C.green} />
          </div>
        </div>
      )}

      {/* Planning du jour */}
      <div style={S.section}>
        <div style={S.secHead}>
          <span style={S.secTitle}>📅 Mon Planning Aujourd'hui</span>
          <Chip color={C.green}>{planning.length} mission(s)</Chip>
        </div>
        {planning.length === 0
          ? <Empty text="Aucune mission prévue aujourd'hui" icon="🎉" />
          : planning.map((p, i) => (
            <PlanningCard key={i} p={p} trajetActif={trajetActif} setTrajetActif={setTrajetActif} />
          ))
        }
      </div>
    </div>
  );
}

// ── Tab Planning ──────────────────────────────────────────────────────────────
function TabPlanning({ planning, trajetActif, setTrajetActif }) {
  const periodes = [
    { key:"MATIN",  label:"Matin",  items: planning.filter(p => p.periode === "MATIN"  || parseInt(p.heure) < 12) },
    { key:"SOIR",   label:"Soir",   items: planning.filter(p => p.periode === "SOIR"   || parseInt(p.heure) >= 16) },
    { key:"JOURNEE",label:"Journée",items: planning.filter(p => p.periode === "JOURNEE"|| (parseInt(p.heure) >= 12 && parseInt(p.heure) < 16)) },
  ].filter(p => p.items.length > 0);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {periodes.map(periode => (
        <div key={periode.key} style={S.section}>
          <div style={{ ...S.secHead, marginBottom:16 }}>
            <span style={S.secTitle}>{periode.key === "MATIN" ? "🌅" : periode.key === "SOIR" ? "🌆" : "☀️"} {periode.label}</span>
            <Chip color={C.green}>{periode.items.length} mission(s)</Chip>
          </div>
          {periode.items.map((p, i) => (
            <PlanningCard key={i} p={p} trajetActif={trajetActif} setTrajetActif={setTrajetActif} full />
          ))}
        </div>
      ))}
      {planning.length === 0 && (
        <div style={S.section}><Empty text="Aucune mission planifiée" icon="📅" /></div>
      )}
    </div>
  );
}

function PlanningCard({ p, trajetActif, setTrajetActif, full }) {
  const isActif   = trajetActif?.id === p.id;
  const typeCfg   = p.type === "RECURRENT"
    ? { bg:"#EFF6FF", color:C.blue,  label: p.type_label || "RÉCURRENT" }
    : { bg:C.amberLight, color:C.amber, label: p.type_label || "MISSION PONCTUELLE" };
  const statusCfg = {
    EN_COURS:   { label:"En cours",    color:C.green  },
    EN_ATTENTE: { label:"En attente",  color:C.amber  },
    TERMINE:    { label:"Terminé",     color:C.textLight },
  }[p.status] || { label: p.status, color: C.textLight };

  return (
    <div style={{
      display:"flex", gap:16, padding:"14px 0",
      borderBottom:`1px solid ${C.border}`,
      alignItems:"flex-start",
      opacity: p.status === "TERMINE" ? 0.6 : 1,
    }}>
      {/* Heure */}
      <div style={{ textAlign:"center", minWidth:52, flexShrink:0 }}>
        <div style={{ fontSize:20, fontWeight:800, color:C.green, lineHeight:1 }}>{p.heure}</div>
        <div style={{ fontSize:10, color:C.textLight, textTransform:"uppercase", marginTop:2 }}>{p.periode || ""}</div>
      </div>

      {/* Contenu */}
      <div style={{ flex:1 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{p.titre}</div>
          <span style={{ fontSize:10, fontWeight:700, background:typeCfg.bg, color:typeCfg.color, padding:"2px 8px", borderRadius:99 }}>
            {typeCfg.label}
          </span>
        </div>
        <div style={{ fontSize:12, color:C.textMid, marginBottom:3 }}>📍 {p.trajet}</div>
        <div style={{ display:"flex", gap:14, fontSize:11, color:C.textLight }}>
          <span>👥 {p.capacite}</span>
          <span>⏱ {p.duree}</span>
          <span style={{ color:statusCfg.color, fontWeight:600 }}>● {statusCfg.label}</span>
        </div>

        {full && p.status === "EN_ATTENTE" && (
          <div style={{ marginTop:10 }}>
            <button
              onClick={() => setTrajetActif(isActif ? null : p)}
              style={{
                padding:"6px 16px", borderRadius:7, border:"none",
                background: isActif ? C.red : C.green,
                color:"#fff", fontSize:12, fontWeight:700,
                cursor:"pointer", fontFamily:"inherit",
              }}>
              {isActif ? "⏹ Arrêter" : "▶ Démarrer ce trajet"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
function ToggleDisponibilite({ status, onChange }) {
  const [loading, setLoading] = useState(false);

  const options = [
    { val:"DISPONIBLE",   label:"Disponible",   color:C.green, bg:C.greenLight, icon:"🟢" },
    { val:"INDISPONIBLE", label:"Indisponible",  color:C.red,   bg:C.redLight,   icon:"🔴" },
    { val:"CONGE",        label:"En congé",      color:"#888",  bg:"#F5F5F5",    icon:"🏖️" },
  ];

  const handleChange = async (val) => {
    if (val === status) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      await fetch(`${API_BASE}/auth/users/my-status/`, {
        method: "PATCH",
        headers: { "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body: JSON.stringify({ manual_status: val }),
      });
      onChange(val);
    } catch { alert("Erreur mise à jour statut"); }
    finally { setLoading(false); }
  };

  const current = options.find(o => o.val === status) || options[0];

  return (
    <div style={{ background:current.bg, border:`1.5px solid ${current.color}30`,
      borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center",
      justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
      <div>
        <div style={{ fontSize:10, fontWeight:700, color:current.color,
          textTransform:"uppercase", letterSpacing:"1px" }}>
          Mon statut aujourd'hui
        </div>
        <div style={{ fontSize:16, fontWeight:800, color:C.text, marginTop:3 }}>
          {current.icon} {current.label}
        </div>
      </div>
      <div style={{ display:"flex", gap:6 }}>
        {options.filter(o => o.val !== status).map(o => (
          <button key={o.val} onClick={() => handleChange(o.val)} disabled={loading}
            style={{ padding:"6px 12px", borderRadius:7, fontSize:11, fontWeight:700,
              cursor:"pointer", fontFamily:"inherit", border:`1.5px solid ${o.color}30`,
              background: o.bg, color: o.color, opacity: loading ? 0.6 : 1 }}>
            {o.icon} {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
// ── Tab Mon Véhicule ──────────────────────────────────────────────────────────
function TabVehicule({ vehicule, onPanne }) {
  if (!vehicule) return <div style={S.section}><Empty text="Aucun véhicule assigné" /></div>;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={S.section}>
        <div style={S.secHead}>
          <span style={S.secTitle}>{vehicule.brand} {vehicule.model} — {vehicule.license_plate}</span>
          <StatusBadge status={vehicule.status} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
          <MiniCard icon="🚌" label="Catégorie"          value={vehicule.category || "Bus"} />
          <MiniCard icon="🪪" label="Immatriculation"    value={vehicule.license_plate} bold />
          <MiniCard icon="📅" label="Année"              value={vehicule.year} />
          <MiniCard icon="👥" label="Capacité"           value={`${vehicule.seating_capacity} places`} />
          <MiniCard icon="📍" label="Kilométrage"        value={`${Number(vehicule.mileage||0).toLocaleString("fr-FR")} km`} />
          <MiniCard icon="⛽" label="Niveau carburant"   value={`${vehicule.fuel_level ?? "—"} %`} color={vehicule.fuel_level < 25 ? C.red : C.green} />
          <MiniCard icon="📋" label="Fin d'assurance"    value={fmtDate(vehicule.insurance_expiry)} />
          <MiniCard icon="🔧" label="Dernière révision"  value={fmtDate(vehicule.last_maintenance)} />
          <MiniCard icon="📆" label="Prochaine révision" value={fmtDate(vehicule.next_maintenance)} color={C.amber} />
        </div>

        {/* Barre carburant */}
        {vehicule.fuel_level !== undefined && (
          <div style={{ marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:6 }}>
              <span style={{ color:C.textMid, fontWeight:600 }}>⛽ Niveau de carburant</span>
              <span style={{ fontWeight:700, color: vehicule.fuel_level < 25 ? C.red : C.green }}>{vehicule.fuel_level}%</span>
            </div>
            <div style={{ height:8, background:"#E8EDEB", borderRadius:99, overflow:"hidden" }}>
              <div style={{
                height:"100%",
                width:`${vehicule.fuel_level}%`,
                background: vehicule.fuel_level < 25 ? C.red : vehicule.fuel_level < 50 ? C.amber : C.green,
                borderRadius:99, transition:"width .5s"
              }}/>
            </div>
            {vehicule.fuel_level < 25 && (
              <div style={{ fontSize:11, color:C.red, marginTop:6, fontWeight:600 }}>
                ⚠️ Niveau bas — pensez à faire le plein
              </div>
            )}
          </div>
        )}

        <div style={{ display:"flex", gap:10 }}>
          <GhostBtn style={{ color:C.red, borderColor:"#fca5a5" }} onClick={onPanne}>
            🔧 Signaler une panne
          </GhostBtn>
        </div>
      </div>
    </div>
  );
}

// ── Tab Trajets ───────────────────────────────────────────────────────────────
function TabTrajets({ trajets }) {
  const totalKm = trajets.reduce((sum, t) => sum + ((t.km_arrivee || 0) - (t.km_depart || 0)), 0);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
        <KpiCard label="Trajets ce mois" value={trajets.length}                sub="missions effectuées" color={C.green} />
        <KpiCard label="Distance totale" value={`${totalKm} km`}               sub="parcourus ce mois"   color={C.blue}  />
        <KpiCard label="Passagers"       value={trajets.reduce((s,t)=>s+(t.passagers||0),0)} sub="transportés" color={C.amber} />
      </div>

      <div style={S.section}>
        <div style={{ ...S.secHead, marginBottom:16 }}>
          <span style={S.secTitle}>Historique des trajets</span>
          <Chip color={C.green}>{trajets.length} trajet(s)</Chip>
        </div>
        {trajets.length === 0
          ? <Empty text="Aucun trajet enregistré" />
          : trajets.map((t, i) => (
            <div key={i} style={{ display:"flex", gap:12, padding:"12px 0", borderBottom:`1px solid ${C.border}`, alignItems:"flex-start" }}>
              <div style={{ width:36, height:36, borderRadius:8, background:C.greenLight, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
                {t.type === "RECURRENT" ? "🔄" : "🗺️"}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:13, color:C.text }}>{t.depart} → {t.arrivee}</div>
                <div style={{ fontSize:11, color:C.textLight, marginTop:2 }}>
                  {fmtDate(t.date)} · {(t.km_arrivee||0)-(t.km_depart||0)} km · {t.passagers} passager(s)
                </div>
                {t.duree && <div style={{ fontSize:11, color:C.textMid }}>⏱ Durée : {t.duree}</div>}
              </div>
              <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99,
                background: t.type==="RECURRENT" ? C.blueLight : C.amberLight,
                color: t.type==="RECURRENT" ? C.blue : C.amber }}>
                {t.type}
              </span>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ── Tab Carburant ─────────────────────────────────────────────────────────────
function TabCarburant({ vehicule }) {
  const [form, setForm] = useState({ quantite:"", montant:"", station:"", km:"", type_paiement:"BON" });
  const [sent, setSent] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.quantite || !form.station || !form.km) { alert("Remplissez tous les champs *"); return; }
    try {
      const token = localStorage.getItem("access_token");
      await fetch(`${API_BASE}/fuel/transactions/`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body: JSON.stringify({ ...form, vehicle: vehicule?.id, transaction_date: new Date().toISOString() }),
      });
      setSent(true);
      setTimeout(() => setSent(false), 3000);
      setForm({ quantite:"", montant:"", station:"", km:"", type_paiement:"BON" });
    } catch { alert("Enregistrement mode démo"); setSent(true); setTimeout(()=>setSent(false),3000); }
  };

  return (
    <div style={S.section}>
      <div style={{ ...S.secHead, marginBottom:20 }}>
        <span style={S.secTitle}>⛽ Enregistrer un plein de carburant</span>
        {vehicule && <span style={{ fontSize:12, color:C.textMid }}>{vehicule.license_plate}</span>}
      </div>

      {sent && (
        <div style={{ background:C.greenLight, border:`1px solid ${C.green}30`, borderRadius:8, padding:"10px 14px", fontSize:13, color:C.green, fontWeight:600, marginBottom:16 }}>
          ✅ Plein enregistré avec succès !
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <Field label="Quantité (Litres) *" value={form.quantite} onChange={e=>set("quantite",e.target.value)} type="number" placeholder="Ex: 80" />
          <Field label="Montant (FCFA) *"    value={form.montant}  onChange={e=>set("montant",e.target.value)}  type="number" placeholder="Ex: 64000" />
          <Field label="Station service *"   value={form.station}  onChange={e=>set("station",e.target.value)}  placeholder="Ex: Total Bonaberi" />
          <Field label="Kilométrage *"       value={form.km}       onChange={e=>set("km",e.target.value)}       type="number" placeholder={`Actuel: ${Number(vehicule?.mileage||0).toLocaleString("fr-FR")} km`} />
        </div>
        <div>
          <label style={S.label}>Mode de paiement</label>
          <div style={{ display:"flex", gap:10, marginTop:6 }}>
            {[["BON","Bon carburant"],["ESPECES","Espèces"],["CARTE","Carte bancaire"]].map(([v,l])=>(
              <button key={v} onClick={()=>set("type_paiement",v)}
                style={{ padding:"7px 16px", borderRadius:7, fontSize:12, fontWeight:600,
                  cursor:"pointer", fontFamily:"inherit", border:`1.5px solid ${form.type_paiement===v?C.green:C.border}`,
                  background:form.type_paiement===v?C.greenLight:"transparent",
                  color:form.type_paiement===v?C.green:C.textMid }}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginTop:6 }}>
          <Btn onClick={handleSubmit}>Enregistrer le plein</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Tab Signalements ──────────────────────────────────────────────────────────
function TabSignalements({ vehicule }) {
  const [form, setForm] = useState({ description:"", urgence:"NORMALE", type:"MECANIQUE" });
  const [sent, setSent] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.description.trim()) { alert("Décrivez le problème"); return; }
    try {
      const token = localStorage.getItem("access_token");
      await fetch(`${API_BASE}/maintenance/breakdowns/`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body: JSON.stringify({ ...form, vehicle: vehicule?.id, reported_at: new Date().toISOString() }),
      });
      setSent(true);
      setForm({ description:"", urgence:"NORMALE", type:"MECANIQUE" });
      setTimeout(()=>setSent(false), 4000);
    } catch { alert("Signalement envoyé — mode démo"); setSent(true); setTimeout(()=>setSent(false),4000); }
  };

  return (
    <div style={S.section}>
      <div style={{ ...S.secHead, marginBottom:20 }}>
        <span style={S.secTitle}>🔧 Signaler une panne ou un incident</span>
        {vehicule && <span style={{ fontSize:12, color:C.textMid }}>{vehicule.license_plate}</span>}
      </div>

      {sent && (
        <div style={{ background:C.greenLight, border:`1px solid ${C.green}30`, borderRadius:8, padding:"10px 14px", fontSize:13, color:C.green, fontWeight:600, marginBottom:16 }}>
          ✅ Signalement envoyé au gestionnaire !
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {/* Type */}
        <div>
          <label style={S.label}>Type de problème</label>
          <div style={{ display:"flex", gap:8, marginTop:6, flexWrap:"wrap" }}>
            {[["MECANIQUE","🔩 Mécanique"],["ELECTRIQUE","⚡ Électrique"],["CARROSSERIE","🚗 Carrosserie"],["PNEU","🔵 Pneu"],["AUTRE","❓ Autre"]].map(([v,l])=>(
              <button key={v} onClick={()=>set("type",v)}
                style={{ padding:"6px 14px", borderRadius:7, fontSize:12, fontWeight:600,
                  cursor:"pointer", fontFamily:"inherit", border:`1.5px solid ${form.type===v?C.green:C.border}`,
                  background:form.type===v?C.greenLight:"transparent",
                  color:form.type===v?C.green:C.textMid }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={S.label}>Description *</label>
          <textarea value={form.description} onChange={e=>set("description",e.target.value)} rows={4}
            placeholder="Décrivez précisément le problème observé…"
            style={{ ...S.inputStyle, width:"100%", resize:"vertical", marginTop:6 }} />
        </div>

        {/* Urgence */}
        <div>
          <label style={S.label}>Niveau d'urgence</label>
          <div style={{ display:"flex", gap:8, marginTop:6 }}>
            {[["NORMALE","🟡 Normale"],["URGENTE","🟠 Urgente"],["CRITIQUE","🔴 Critique — Véhicule immobilisé"]].map(([v,l])=>(
              <button key={v} onClick={()=>set("urgence",v)}
                style={{ padding:"6px 14px", borderRadius:7, fontSize:12, fontWeight:600,
                  cursor:"pointer", fontFamily:"inherit",
                  border:`1.5px solid ${form.urgence===v?(v==="CRITIQUE"?C.red:v==="URGENTE"?C.amber:C.green):C.border}`,
                  background:form.urgence===v?(v==="CRITIQUE"?C.redLight:v==="URGENTE"?C.amberLight:C.greenLight):"transparent",
                  color:form.urgence===v?(v==="CRITIQUE"?C.red:v==="URGENTE"?C.amber:C.green):C.textMid }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <Btn onClick={handleSubmit}>Envoyer le signalement</Btn>
      </div>
    </div>
  );
}

// ── Tab Notifications ─────────────────────────────────────────────────────────
function TabNotifications({ notifications }) {
  const [list, setList] = useState(notifications);
  const markRead = id => setList(l => l.map(n => n.id===id ? {...n,status:"LU"} : n));
  return (
    <div style={S.section}>
      <div style={{ ...S.secHead, marginBottom:16 }}>
        <span style={S.secTitle}>Notifications</span>
        {list.filter(n=>n.status==="NON_LU").length > 0 &&
          <button style={S.linkBtn} onClick={()=>setList(l=>l.map(n=>({...n,status:"LU"})))}>
            Tout marquer comme lu
          </button>
        }
      </div>
      {list.length===0
        ? <Empty text="Aucune notification" icon="🔔" />
        : list.map((n,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10,
            background:n.status==="NON_LU"?C.greenLight:"transparent",
            borderRadius:8, padding:"10px 12px", marginBottom:4 }}>
            <span style={{ width:8,height:8,borderRadius:"50%",flexShrink:0,marginTop:5,
              background:n.type==="SUCCESS"?C.green:n.type==="WARNING"?C.amber:n.type==="ERROR"?C.red:C.blue }}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13,fontWeight:n.status==="NON_LU"?700:500,color:C.text }}>{n.title}</div>
              <div style={{ fontSize:11,color:C.textMid,marginTop:2 }}>{n.message}</div>
              <div style={{ fontSize:10,color:C.textLight,marginTop:4 }}>{fmtDate(n.created_at)}</div>
            </div>
            {n.status==="NON_LU" &&
              <button style={S.linkBtn} onClick={()=>markRead(n.id)}>Marquer lu</button>
            }
          </div>
        ))
      }
    </div>
  );
}

// ── Modals ────────────────────────────────────────────────────────────────────
function ModalPanne({ vehicule, onClose }) {
  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, width:500 }}>
        <div style={S.modalHead}>
          <span style={{ fontSize:15,fontWeight:700,color:C.text }}>🔧 Signaler une panne</span>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>
        <TabSignalements vehicule={vehicule} />
      </div>
    </div>
  );
}

function ModalCarburant({ vehicule, onClose }) {
  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, width:500 }}>
        <div style={S.modalHead}>
          <span style={{ fontSize:15,fontWeight:700,color:C.text }}>⛽ Enregistrer un plein</span>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>
        <div style={{ padding:"0 0 4px" }}>
          <TabCarburant vehicule={vehicule} />
        </div>
      </div>
    </div>
  );
}

// ── Petits composants ─────────────────────────────────────────────────────────
function ActionCard({ icon, color, title, desc, onClick }) {
  return (
    <button onClick={onClick} style={{ ...S.actionCard, borderTop:`3px solid ${color}` }} className="action-card">
      <div style={{ fontSize:28, marginBottom:8 }}>{icon}</div>
      <div style={{ fontSize:13,fontWeight:700,color:C.text,marginBottom:3 }}>{title}</div>
      <div style={{ fontSize:11,color:C.textLight,lineHeight:1.4 }}>{desc}</div>
    </button>
  );
}

function MiniCard({ icon, label, value, bold, color }) {
  return (
    <div style={{ padding:"10px 12px",background:C.bg,borderRadius:8 }}>
      <div style={{ fontSize:10,color:C.textLight,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4 }}>{icon} {label}</div>
      <div style={{ fontSize:bold?18:13,fontWeight:bold?800:600,color:color||C.text }}>{value}</div>
    </div>
  );
}

function KpiCard({ label, value, sub, color }) {
  return (
    <div style={{ ...S.kpiCard, borderLeftColor:color }}>
      <div style={{ fontSize:11,fontWeight:700,color:C.textLight,letterSpacing:"1px",textTransform:"uppercase",marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:28,fontWeight:800,color:C.text,lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:11,color,fontWeight:600,marginTop:6 }}>{sub}</div>
    </div>
  );
}

function Field({ label, value, onChange, type="text", placeholder }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:5 }}>
      <label style={S.label}>{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={S.inputStyle} />
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    DISPONIBLE:    { label:"Disponible",    bg:C.greenLight,color:C.green },
    EN_SERVICE:    { label:"En service",    bg:C.amberLight,color:C.amber },
    EN_MAINTENANCE:{ label:"En maintenance",bg:C.redLight,  color:C.red   },
    HORS_SERVICE:  { label:"Hors service",  bg:"#F5F5F5",   color:"#888"  },
  };
  const m = map[status]||{label:status,bg:"#F5F5F5",color:"#888"};
  return (
    <span style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",
      borderRadius:99,fontSize:11,fontWeight:700,background:m.bg,color:m.color }}>
      <span style={{ width:5,height:5,borderRadius:"50%",background:m.color,display:"inline-block" }}/>
      {m.label}
    </span>
  );
}

function Chip({ color, children }) {
  return <span style={{ padding:"2px 10px",borderRadius:99,fontSize:11,fontWeight:700,background:color+"1A",color }}>{children}</span>;
}
function Btn({ children, onClick }) {
  return <button onClick={onClick} style={S.btn} className="btn-primary">{children}</button>;
}
function GhostBtn({ children, onClick, style:extra }) {
  return <button onClick={onClick} style={{ ...S.ghostBtn,...extra }} className="btn-ghost">{children}</button>;
}
function Empty({ text, icon="📭" }) {
  return (
    <div style={{ textAlign:"center",padding:"40px 0",color:C.textLight }}>
      <div style={{ fontSize:34,marginBottom:8 }}>{icon}</div>
      <div style={{ fontSize:13 }}>{text}</div>
    </div>
  );
}
function Loader() {
  return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg,flexDirection:"column",gap:14 }}>
      <div style={{ width:32,height:32,border:`3px solid ${C.green}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite" }}/>
      <div style={{ fontSize:11,color:C.textLight,letterSpacing:"2px",textTransform:"uppercase" }}>Chargement</div>
    </div>
  );
}
function IUCLogo() {
  return (
    <div style={{ width:44,height:44,borderRadius:10,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
      <svg width="28" height="28" viewBox="0 0 52 52" fill="none">
        <path d="M7 34L16 18Q18 13 22 13H30Q34 13 36 18L45 34" stroke="white" strokeWidth="3" strokeLinecap="round"/>
        <rect x="5" y="32" width="42" height="12" rx="6" fill="white" opacity=".92"/>
        <circle cx="15" cy="44" r="5.5" fill="#C0182A"/>
        <circle cx="37" cy="44" r="5.5" fill="#C0182A"/>
        <circle cx="15" cy="44" r="2.5" fill="white"/>
        <circle cx="37" cy="44" r="2.5" fill="white"/>
        <rect x="22" y="17" width="8" height="7" rx="1.5" fill="white" opacity=".4"/>
      </svg>
    </div>
  );
}
function NavIcon({ id }) {
  const p = { width:16,height:16,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round" };
  switch(id) {
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
function fmtDate(d) { if(!d)return"—"; return new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}); }

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  shell:    { display:"flex",height:"100vh",width:"100vw",fontFamily:"'Inter',-apple-system,sans-serif",background:C.bg,overflow:"hidden" },
  sidebar:  { width:224,background:C.sidebar,display:"flex",flexDirection:"column",flexShrink:0 },
  brand:    { display:"flex",alignItems:"center",gap:11,padding:"20px 16px 14px" },
  brandText:{ minWidth:0 },
  brandName:{ fontSize:13,fontWeight:800,color:"#fff",letterSpacing:"2px" },
  brandSub: { fontSize:9,color:"rgba(255,255,255,.4)",marginTop:2,lineHeight:1.4 },
  divider:  { height:1,background:"rgba(255,255,255,.08)",margin:"0 14px" },
  profileBadge:{ padding:"8px 14px" },
  profilRole:  { fontSize:9,color:"rgba(255,255,255,.45)",textTransform:"uppercase",letterSpacing:"1.5px",fontWeight:700 },
  nav:      { flex:1,padding:"8px 10px",overflowY:"auto" },
  navItem:  { display:"flex",alignItems:"center",gap:10,width:"100%",padding:"8px 10px",borderRadius:7,border:"none",cursor:"pointer",color:"rgba(255,255,255,.65)",marginBottom:2,textAlign:"left",background:"transparent",fontFamily:"inherit",position:"relative",transition:"all .12s" },
  navActive:{ background:C.sideActive,color:"#fff",fontWeight:600 },
  navLabel: { fontSize:12.5,flex:1 },
  navPip:   { position:"absolute",right:0,top:"50%",transform:"translateY(-50%)",width:3,height:16,background:"#fff",borderRadius:99 },
  navBadge: { background:C.red,color:"#fff",borderRadius:99,fontSize:9,fontWeight:800,width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center" },
  sideBottom:{ padding:"8px 10px 14px" },
  logoutBtn:{ display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 10px",borderRadius:7,border:"none",cursor:"pointer",background:"rgba(192,24,42,0.25)",color:"rgba(255,255,255,.75)",fontSize:12,fontFamily:"inherit",marginTop:8,transition:"all .12s" },
  main:     { flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0 },
  topbar:   { background:C.white,borderBottom:`1px solid ${C.border}`,padding:"14px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0 },
  pageTitle:{ fontSize:22,fontWeight:760,color:C.text,letterSpacing:"-.4px",margin:0 },
  pageDate: { fontSize:11,color:C.textLight,marginTop:2 },
  iconBtn:  { width:34,height:34,borderRadius:8,border:`1px solid ${C.border}`,background:C.white,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:C.textMid },
  badge:    { position:"absolute",top:-5,right:-5,background:C.red,color:"#fff",borderRadius:99,fontSize:9,fontWeight:800,width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center" },
  userChip: { display:"flex",alignItems:"center",gap:9 },
  topAvatar:{ width:34,height:34,borderRadius:"50%",background:C.green,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12 },
  topName:  { fontSize:13,fontWeight:700,color:C.text },
  topRole:  { fontSize:10,color:C.textLight,textTransform:"uppercase",letterSpacing:"1px" },
  content:  { flex:1,overflowY:"auto",padding:"20px 24px",display:"flex",flexDirection:"column",gap:0 },
  section:  { background:C.white,borderRadius:10,padding:"16px 18px",boxShadow:"0 1px 3px rgba(0,0,0,.05)",marginBottom:0 },
  secHead:  { display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 },
  secTitle: { fontSize:13,fontWeight:700,color:C.text },
  kpiCard:  { background:C.white,borderRadius:10,padding:"16px 18px",borderLeft:"3px solid transparent",boxShadow:"0 1px 3px rgba(0,0,0,.05)" },
  actionCard:{ background:C.white,borderRadius:10,padding:"18px 16px",border:`1px solid ${C.border}`,cursor:"pointer",textAlign:"left",fontFamily:"inherit",boxShadow:"0 1px 3px rgba(0,0,0,.05)",transition:"all .15s" },
  btn:      { padding:"7px 14px",background:C.green,color:"#fff",border:"none",borderRadius:7,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap" },
  ghostBtn: { padding:"7px 14px",background:"transparent",color:C.textMid,border:`1px solid ${C.border}`,borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap" },
  linkBtn:  { background:"none",border:"none",color:C.green,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",textDecoration:"underline" },
  label:    { fontSize:11,fontWeight:600,color:C.textMid,textTransform:"uppercase",letterSpacing:"1px" },
  inputStyle:{ padding:"8px 12px",border:`1.5px solid ${C.border}`,borderRadius:7,fontSize:13,outline:"none",fontFamily:"inherit",color:C.text,background:C.white },
  overlay:  { position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000 },
  modal:    { background:C.white,borderRadius:14,padding:"24px",maxWidth:"95vw",boxShadow:"0 20px 60px rgba(0,0,0,0.2)",maxHeight:"90vh",overflowY:"auto" },
  modalHead:{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 },
  closeBtn: { background:"none",border:"none",cursor:"pointer",fontSize:16,color:C.textLight },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .nav-btn:hover { background: ${C.sideHover} !important; color: #fff !important; }
  .btn-primary:hover { filter: brightness(1.1); }
  .btn-ghost:hover { background: ${C.bg} !important; }
  .logout-btn:hover { background: rgba(192,24,42,0.4) !important; }
  .icon-btn:hover { background: ${C.bg} !important; }
  .action-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.1) !important; }
  button:active { transform: scale(0.97); }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: #D4DDD9; border-radius: 99px; }
  input:focus, select:focus, textarea:focus { border-color: ${C.green} !important; box-shadow: 0 0 0 3px ${C.green}18 !important; outline: none; }
`;