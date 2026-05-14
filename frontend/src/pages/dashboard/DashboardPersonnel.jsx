// ─── src/dashboard/DashboardPersonnel.jsx ────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { lazy, Suspense } from "react";
const TabTracking = lazy(() => import('../tabtraking/TabTracking'));
import TabDocuments from '../documents/TabDocuments';
import TabParametres from '../parametre/TabParametre';
import TabSignalementsPersonnel from "../signalements/TabSignalementsPersonnel";
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
  return json?.data ?? json;
}

const C = {
  green:"#1B5E37", greenMid:"#2D7A4F", greenLight:"#EAF4EE",
  red:"#C0182A", redLight:"#FDF0F1",
  white:"#FFFFFF", bg:"#F4F6F5",
  sidebar:"#2c6549", sideHover:"#1F4F37", sideActive:"#2D7A4F",
  border:"#E2E8E5", text:"#1A2820", textMid:"#4A6358", textLight:"#8EA99A",
  amber:"#D97706", amberLight:"#FFFBEB",
  blue:"#1D4ED8", blueLight:"#EFF6FF",
};

const NAV_DIRECTEUR = [
  { id:"dashboard",    label:"Tableau de bord",    icon:"grid"     },
  { id:"mon-vehicule", label:"Mon véhicule",        icon:"car"      },
  { id:"reservations", label:"Mes réservations",    icon:"calendar" },
  { id:"tracking",     label:"Suivi GPS",           icon:"map"      },
  { id:"historique",   label:"Historique",          icon:"history"  },
  { id:"pannes",       label:"Signaler une panne",  icon:"tool"     },
  { id:"documents",    label:"Mes documents",       icon:"doc"      },
  { id:"notifications",label:"Notifications",       icon:"bell"     },
  { id:"parametres", label:"Paramètres", icon:"settings" }
];

const NAV_CHEF = [
  { id:"dashboard",    label:"Tableau de bord",     icon:"grid"     },
  { id:"reservations", label:"Mes demandes",         icon:"calendar" },
  { id:"tracking",     label:"Suivi GPS",           icon:"map"      },
  { id:"historique",   label:"Historique",           icon:"history"  },
  { id:"pannes",       label:"Signaler un incident", icon:"tool"     },
  { id:"notifications",label:"Notifications",        icon:"bell"     },
  { id:"parametres", label:"Paramètres", icon:"settings" }
];

export default function DashboardPersonnel({ onLogout }) {
  const [data,      setData]      = useState(null);
  const [refresh,   setRefresh]   = useState(0);   // incrémenter pour recharger
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState("dashboard");
  const [showModal, setShowModal] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
  const stored = localStorage.getItem("driveparc_theme");
  if (stored) return stored === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
});
const [lang, setLang] = useState(
  localStorage.getItem("driveparc_lang") || "fr"
);
 const handleThemeChange = (isDark) => {
  setDarkMode(isDark);
  const theme = isDark ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("driveparc_theme", theme);
};
 
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const u = await apiFetch("/auth/profile/");
      const isDirecteur = u?.personnel_type === "DIRECTEUR";

      let vehiculeFonction = null;
      if (isDirecteur && u?.assigned_vehicle) {
        const vid = typeof u.assigned_vehicle === "object" ? u.assigned_vehicle.id : u.assigned_vehicle;
        if (vid) vehiculeFonction = await apiFetch(`/vehicles/${vid}/`).catch(() => null);
        if (!vehiculeFonction && typeof u.assigned_vehicle === "object") vehiculeFonction = u.assigned_vehicle;
      }

      const [res, notifs] = await Promise.all([
        apiFetch("/reservations/?requester=me").catch(() => ({ results:[] })),
        apiFetch("/notifications/").catch(() => ({ results:[] })),
      ]);

      setData({
        user: u,
        isDirecteur,
        vehiculeFonction,
        reservations: Array.isArray(res) ? res : res?.results ?? [],
        notifications: Array.isArray(notifs) ? notifs : notifs?.results ?? [],
      });
    } catch (err) {
      console.error("Erreur chargement dashboard:", err);
      setData({
        user: { first_name:"Antoine", last_name:"Mbarga", full_name:"Dr. Antoine Mbarga",
                role:"PERSONNEL", personnel_type:"DIRECTEUR", role_display:"Directeur", school:"3IAC" },
        isDirecteur: true,
        vehiculeFonction: {
          id:1, registration_number:"LT 234 AB", make:"Toyota", model:"Camry",
          year:2022, color:"Blanc", status:"DISPONIBLE", current_mileage:45320,
          fuel_type:"DIESEL", seating_capacity:5,
        },
        reservations: [],
        notifications: [],
      });
    } finally { setLoading(false); }
  }, []);

  // Rechargement automatique quand refresh change
  useEffect(() => { loadAll(); }, [loadAll, refresh]);
  useEffect(() => {
  const stored = localStorage.getItem("driveparc_theme");
  if (stored) {
    document.documentElement.setAttribute("data-theme", stored);
  }
}, []);
  const handleLogout = () => { localStorage.clear(); sessionStorage.clear(); onLogout?.(); };
  const handleRefresh = () => setRefresh(r => r + 1); // déclenche le rechargement


  if (loading || !data) return <Loader />;

  const { user, isDirecteur, vehiculeFonction, reservations, notifications } = data;
  const unread = notifications.filter(n => n.status === "NON_LU").length;
  const NAV = isDirecteur ? NAV_DIRECTEUR : NAV_CHEF;


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
        <div style={S.divider} />
        <div style={{ padding:"8px 16px 4px" }}>
          <div style={{ fontSize:9, color:"rgba(255,255,255,.45)", textTransform:"uppercase", letterSpacing:"1.5px", fontWeight:700 }}>
            {isDirecteur ? `Directeur · ${user.school || ""}` : "Chef de département"}
          </div>
        </div>
        <nav style={S.nav}>
          {NAV.map(n => {
            const active = tab === n.id;
            return (
              <button key={n.id} onClick={() => setTab(n.id)}
                style={{ ...S.navItem, ...(active ? S.navActive : {}) }}
                className={active ? "" : "nav-btn"}>
                <span style={{ display:"flex", opacity:active?1:0.65 }}><NavIcon id={n.icon} /></span>
                <span style={S.navLabel}>{n.label}</span>
                {n.id === "notifications" && unread > 0 && <span style={S.navBadge}>{unread}</span>}
                {active && <span style={S.navPip} />}
              </button>
            );
          })}
        </nav>
        <div style={S.sideBottom}>
          <div style={S.divider} />
          <div style={{ display:"flex", alignItems:"center", gap:9, padding:"10px 6px 10px" }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:C.greenMid,
              color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
              fontWeight:800, fontSize:11, flexShrink:0 }}>
              {user.first_name?.[0]}{user.last_name?.[0]}
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {user.full_name || `${user.first_name} ${user.last_name}`}
              </div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,.45)" }}>
                {user.role_display || (isDirecteur ? "Directeur" : "Chef de département")}
              </div>
            </div>
          </div>
          <button onClick={handleLogout} style={S.logoutBtn} className="logout-btn">
            <LogoutIcon /><span>Déconnexion</span>
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
            <div style={{ position:"relative" }}>
              <button style={S.iconBtn} className="icon-btn" onClick={() => setTab("notifications")}><BellIcon /></button>
              {unread > 0 && <span style={S.badge}>{unread}</span>}
            </div>
            <div style={S.userChip}>
              <div style={S.topAvatar}>{user.first_name?.[0]}{user.last_name?.[0]}</div>
              <div>
                <div style={S.topName}>{user.full_name || `${user.first_name} ${user.last_name}`}</div>
                <div style={S.topRole}>{user.role_display || (isDirecteur ? "Directeur" : "Chef de département")}</div>
              </div>
            </div>
          </div>
        </header>

        <div style={S.content}>
          {tab === "dashboard"     && <TabDashboard data={data} isDirecteur={isDirecteur} onReserver={() => setShowModal(true)} setTab={setTab} />}
          {tab === "mon-vehicule"  && isDirecteur && <TabMonVehicule vehicule={vehiculeFonction} />}
          {tab === "reservations"  && <TabReservations reservations={reservations} isDirecteur={isDirecteur} onNew={() => setShowModal(true)} />}
            {tab === "tracking" && (
  <Suspense fallback={<div style={{padding:40, textAlign:"center", color:"#4A6358"}}>Chargement de la carte…</div>}>
    <TabTracking reservations={reservations} isDirecteur={isDirecteur} vehiculeFonction={vehiculeFonction} />
  </Suspense>
)}
          {tab === "historique"    && <TabHistorique reservations={reservations} />}
          {tab === "pannes" && (
  <TabSignalementsPersonnel
    isDirecteur={isDirecteur}
    vehicule={vehiculeFonction}
  />
)}
        {tab === "documents" && isDirecteur && (
  <TabDocuments vehicule={vehiculeFonction} documentsFromAPI={[]} />
)}
          {tab === "notifications" && <TabNotifications notifications={notifications} />}
          {tab === "parametres" && (
  <TabParametres
    user={user}
    darkMode={darkMode}
    onThemeChange={handleThemeChange}
    onLangChange={setLang}
    lang={lang}
  />
)}
        </div>
      </div>

      {showModal && (
        <ModalReservation
          isDirecteur={isDirecteur}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            handleRefresh(); // rafraîchissement automatique après création
          }}
        />
      )}
    </div>
  );
}

// ── TAB DASHBOARD ─────────────────────────────────────────────────────────────
function TabDashboard({ data, isDirecteur, onReserver, setTab }) {
  const { vehiculeFonction, reservations, notifications } = data;
  const pending  = reservations.filter(r => r.status === "PENDING" || r.status === "EN_ATTENTE").length;
  const approved = reservations.filter(r => r.status === "APPROVED" || r.status === "APPROUVEE").length;
  const unread   = notifications.filter(n => n.status === "NON_LU").length;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
        <ActionCard icon="📋" color={C.green} title="Nouvelle réservation"
          desc={isDirecteur ? "Réserver un véhicule du parc" : "Demande avec chauffeur"} onClick={onReserver} />
        <ActionCard icon="🔍" color={C.blue} title="Voir mes réservations"
          desc="Consulter mes demandes" onClick={() => setTab("reservations")} />
        <ActionCard icon="⚠️" color={C.amber} title="Signaler une panne"
          desc={isDirecteur ? "Problème sur mon véhicule" : "Signaler un incident"} onClick={() => setTab("pannes")} />
        <ActionCard icon="📂" color={C.textMid} title="Historique"
          desc="Mes courses passées" onClick={() => setTab("historique")} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:isDirecteur ? "repeat(4,1fr)" : "repeat(3,1fr)", gap:14 }}>
        {isDirecteur && (
          <div style={{ ...S.kpiCard, borderLeftColor:C.green }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>Véhicule de fonction</div>
            {vehiculeFonction
              ? <><div style={{ fontSize:16, fontWeight:800, color:C.text }}>{vehiculeFonction.registration_number}</div>
                  <div style={{ fontSize:11, color:C.green, fontWeight:600, marginTop:4 }}>{vehiculeFonction.make} {vehiculeFonction.model} · {vehiculeFonction.year}</div></>
              : <div style={{ fontSize:12, color:C.textLight, marginTop:8 }}>Non assigné</div>
            }
          </div>
        )}
        <div style={{ ...S.kpiCard, borderLeftColor:C.amber }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>En attente</div>
          <div style={{ fontSize:28, fontWeight:800, color:C.text }}>{pending}</div>
          <div style={{ fontSize:11, color:C.amber, fontWeight:600, marginTop:6 }}>En cours de validation</div>
        </div>
        <div style={{ ...S.kpiCard, borderLeftColor:C.green }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>Approuvées</div>
          <div style={{ fontSize:28, fontWeight:800, color:C.text }}>{approved}</div>
          <div style={{ fontSize:11, color:C.green, fontWeight:600, marginTop:6 }}>Ce mois-ci</div>
        </div>
        <div style={{ ...S.kpiCard, borderLeftColor:unread > 0 ? C.red : C.textLight }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>Notifications</div>
          <div style={{ fontSize:28, fontWeight:800, color:C.text }}>{unread}</div>
          <div style={{ fontSize:11, color:unread > 0 ? C.red : C.textLight, fontWeight:600, marginTop:6 }}>Non lues</div>
        </div>
      </div>

      {isDirecteur && vehiculeFonction && (
        <div style={S.section}>
          <div style={S.secHead}>
            <span style={S.secTitle}>🚗 Mon véhicule de fonction</span>
            <StatusBadge status={vehiculeFonction.status} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
            <VFField icon="🚗" label="Véhicule"       value={`${vehiculeFonction.make} ${vehiculeFonction.model}`} />
            <VFField icon="🪪" label="Immatriculation" value={vehiculeFonction.registration_number} big />
            <VFField icon="📅" label="Année"          value={vehiculeFonction.year} />
            <VFField icon="📍" label="Kilométrage"    value={`${Number(vehiculeFonction.current_mileage||0).toLocaleString("fr-FR")} km`} />
            <VFField icon="⛽" label="Carburant"      value={vehiculeFonction.fuel_type || "—"} />
            <VFField icon="🎨" label="Couleur"        value={vehiculeFonction.color || "—"} />
          </div>
        </div>
      )}

      {isDirecteur && !vehiculeFonction && (
        <div style={{ background:C.amberLight, borderRadius:10, padding:"16px 20px", fontSize:13, color:C.amber, fontWeight:600 }}>
          ⏳ Aucun véhicule de fonction assigné. Le gestionnaire vous en assignera un.
        </div>
      )}

      <div style={S.section}>
        <div style={S.secHead}>
          <span style={S.secTitle}>{isDirecteur ? "Mes réservations récentes" : "Mes demandes récentes"}</span>
          <button onClick={() => setTab("reservations")} style={S.ghostBtn}>Voir tout</button>
        </div>
        {reservations.length === 0
          ? <Empty text="Aucune réservation pour le moment" />
          : reservations.slice(0,3).map((r,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ width:36, height:36, borderRadius:8, background:C.greenLight, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🚗</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:13, color:C.text }}>{r.destination || "—"}</div>
                <div style={{ fontSize:11, color:C.textLight, marginTop:2 }}>{fmtDate(r.start_date)}</div>
                {r.purpose && <div style={{ fontSize:11, color:C.textMid }}>Motif : {r.purpose}</div>}
              </div>
              <StatusBadge status={r.status} />
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ── TAB MON VÉHICULE ──────────────────────────────────────────────────────────
function TabMonVehicule({ vehicule }) {
  if (!vehicule) return (
    <div style={S.section}>
      <Empty text="Aucun véhicule de fonction assigné pour le moment" icon="🚗" />
      <div style={{ textAlign:"center", fontSize:12, color:C.textLight, marginTop:8 }}>
        Le gestionnaire vous assignera un véhicule depuis le module Véhicules.
      </div>
    </div>
  );
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={S.section}>
        <div style={S.secHead}>
          <span style={S.secTitle}>{vehicule.make} {vehicule.model} — {vehicule.registration_number}</span>
          <StatusBadge status={vehicule.status} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
          <VFField icon="🚗" label="Marque / Modèle"  value={`${vehicule.make} ${vehicule.model}`} />
          <VFField icon="🪪" label="Immatriculation"  value={vehicule.registration_number} big />
          <VFField icon="📅" label="Année"            value={vehicule.year} />
          <VFField icon="📍" label="Kilométrage"      value={`${Number(vehicule.current_mileage||0).toLocaleString("fr-FR")} km`} />
          <VFField icon="⛽" label="Type carburant"   value={vehicule.fuel_type || "—"} />
          <VFField icon="🎨" label="Couleur"          value={vehicule.color || "—"} />
          <VFField icon="🔢" label="Nb places"        value={vehicule.seating_capacity} />
          <VFField icon="⚙️"  label="Transmission"    value={vehicule.transmission || "—"} />
          <VFField icon="📋" label="Code interne"     value={vehicule.internal_code || "—"} />
        </div>
      </div>
    </div>
  );
}

// ── TAB RÉSERVATIONS ──────────────────────────────────────────────────────────
function TabReservations({ reservations, isDirecteur, onNew }) {
  const [filter, setFilter] = useState("TOUS");
  const statuts = ["TOUS","EN_ATTENTE","APPROUVEE","REJETEE","PENDING","APPROVED","REJECTED"];
  const filtered = filter === "TOUS" ? reservations : reservations.filter(r => r.status === filter);
  const filterButtons = [
    { val:"TOUS",      label:"Toutes"     },
    { val:"EN_ATTENTE",label:"En attente" },
    { val:"APPROUVEE", label:"Approuvées" },
    { val:"REJETEE",   label:"Refusées"   },
  ];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={S.section}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <span style={S.secTitle}>{isDirecteur ? "Mes réservations" : "Mes demandes de véhicule"}</span>
          <button onClick={onNew} style={S.btn}>+ {isDirecteur ? "Nouvelle réservation" : "Nouvelle demande"}</button>
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          {filterButtons.map(f => (
            <button key={f.val} onClick={() => setFilter(f.val)}
              style={{ padding:"5px 12px", border:`1px solid ${C.border}`, borderRadius:6,
                fontSize:11, fontWeight:500, cursor:"pointer",
                background: filter===f.val ? C.green : "transparent",
                color:      filter===f.val ? "#fff"  : C.textMid,
                fontFamily:"inherit" }}>
              {f.label}
            </button>
          ))}
        </div>
        {filtered.length === 0
          ? <Empty text="Aucune réservation dans cette catégorie" />
          : filtered.map((r,i) => (
            <div key={i} style={{ background:"#FAFBFA", border:`1px solid ${C.border}`, borderRadius:9, padding:"14px 16px", marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, color:C.text }}>📍 {r.destination || "—"}</div>
                  <div style={{ fontSize:12, color:C.textLight, marginTop:3 }}>{r.vehicle_name || "—"}</div>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div style={{ display:"flex", gap:20, fontSize:12, color:C.textMid }}>
                <span>📅 {fmtDate(r.start_date)}</span>
                {r.purpose && <span>Motif : {r.purpose}</span>}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ── TAB HISTORIQUE ────────────────────────────────────────────────────────────
function TabHistorique({ reservations }) {
  const [filter, setFilter] = useState("TOUS");
  const done = reservations.filter(r =>
    ["APPROUVEE","APPROVED","TERMINEE","COMPLETED","REJETEE","REJECTED","ANNULEE"].includes(r.status)
  );
  const filtered = filter === "TOUS" ? done : done.filter(r => r.status === filter);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
        <div style={{ ...S.kpiCard, borderLeftColor:C.green }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>Total trajets</div>
          <div style={{ fontSize:28, fontWeight:800, color:C.text }}>{done.length}</div>
        </div>
        <div style={{ ...S.kpiCard, borderLeftColor:C.green }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>Approuvées</div>
          <div style={{ fontSize:28, fontWeight:800, color:C.text }}>{done.filter(r => ["APPROUVEE","APPROVED","TERMINEE","COMPLETED"].includes(r.status)).length}</div>
        </div>
        <div style={{ ...S.kpiCard, borderLeftColor:C.red }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>Refusées</div>
          <div style={{ fontSize:28, fontWeight:800, color:C.text }}>{done.filter(r => ["REJETEE","REJECTED"].includes(r.status)).length}</div>
        </div>
      </div>
      <div style={S.section}>
        <div style={{ ...S.secHead, marginBottom:12 }}>
          <span style={S.secTitle}>Historique de mes courses</span>
        </div>
        <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
          {[{v:"TOUS",label:"Toutes"},{v:"APPROUVEE",label:"Approuvées"},{v:"REJETEE",label:"Refusées"}].map(f => (
            <button key={f.v} onClick={() => setFilter(f.v)}
              style={{ padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:600,
                cursor:"pointer", fontFamily:"inherit", border:"none",
                background:filter===f.v ? C.green : C.bg, color:filter===f.v ? "#fff" : C.textMid }}>
              {f.label}
            </button>
          ))}
        </div>
        {filtered.length === 0
          ? <Empty text="Aucun trajet dans cette catégorie" />
          : filtered.map((r,i) => (
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"12px 0", borderBottom:`1px solid ${C.border}` }}>
              <div style={{ width:36, height:36, borderRadius:8, background:C.greenLight, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
                {["APPROUVEE","APPROVED","TERMINEE","COMPLETED"].includes(r.status) ? "✅" : "❌"}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:13, color:C.text }}>{r.destination || "—"}</div>
                <div style={{ fontSize:11, color:C.textLight, marginTop:2 }}>{fmtDate(r.start_date)}{r.number_of_passengers ? ` · ${r.number_of_passengers} pers.` : ""}</div>
                {r.purpose && <div style={{ fontSize:11, color:C.textMid, marginTop:2 }}>Motif : {r.purpose}</div>}
                {r.rejection_reason && (
                  <div style={{ fontSize:11, color:C.red, marginTop:4, background:C.redLight, borderRadius:6, padding:"4px 8px" }}>
                    ❌ Motif refus : {r.rejection_reason}
                  </div>
                )}
              </div>
              <StatusBadge status={r.status} />
            </div>
          ))
        }
      </div>
    </div>
  );
}


// ── TAB NOTIFICATIONS ─────────────────────────────────────────────────────────
function TabNotifications({ notifications }) {
  const [list, setList] = useState(notifications);
  const markRead = (id) => setList(l => l.map(n => n.id===id ? {...n,status:"LU"} : n));
  return (
    <div style={S.section}>
      <div style={{ ...S.secHead, marginBottom:16 }}>
        <span style={S.secTitle}>Notifications</span>
        {list.filter(n => n.status==="NON_LU").length > 0 &&
          <button style={{ background:"none", border:"none", color:C.green, fontSize:11, fontWeight:600, cursor:"pointer", textDecoration:"underline" }}
            onClick={() => setList(l => l.map(n => ({...n,status:"LU"})))}>
            Tout marquer comme lu
          </button>}
      </div>
      {list.length === 0
        ? <Empty text="Aucune notification" icon="🔔" />
        : list.map((n,i) => (
          <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 12px", marginBottom:4, borderRadius:8,
            background:n.status==="NON_LU" ? C.greenLight : "transparent" }}>
            <span style={{ width:8, height:8, borderRadius:"50%", flexShrink:0, marginTop:5,
              background:n.type==="SUCCESS" ? C.green : n.type==="WARNING" ? C.amber : C.blue }} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:n.status==="NON_LU"?700:500, color:C.text }}>{n.title}</div>
              <div style={{ fontSize:11, color:C.textMid, marginTop:2 }}>{n.message}</div>
              <div style={{ fontSize:10, color:C.textLight, marginTop:4 }}>{fmtDate(n.created_at)}</div>
            </div>
            {n.status==="NON_LU" &&
              <button style={{ background:"none", border:"none", color:C.green, fontSize:11, fontWeight:600, cursor:"pointer", textDecoration:"underline" }}
                onClick={() => markRead(n.id)}>Marquer lu</button>}
          </div>
        ))
      }
    </div>
  );
}

// ── MODAL RÉSERVATION ─────────────────────────────────────────────────────────
// onSuccess : callback appelé après création réussie → déclenche le refresh
function ModalReservation({ isDirecteur, onClose, onSuccess }) {
  const [form, setForm] = useState({
    destination:"", start_date:"", end_date:"",
    heure_depart:"", heure_retour:"", purpose:"", nb_places:"", notes:"",
    lieu_depart:"", lieu_depart_coords:null,
  });
  const [locLoading,  setLocLoading]  = useState(false);
  const [distLoading, setDistLoading] = useState(false);
  const [locError,    setLocError]    = useState("");
  const [distance,    setDistance]    = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  const getGeolocation = () => {
    if (!navigator.geolocation) { setLocError("Géolocalisation non supportée."); return; }
    setLocLoading(true); setLocError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const json = await res.json();
          set("lieu_depart", json.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          set("lieu_depart_coords", { lat:latitude, lng:longitude });
        } catch {
          set("lieu_depart", `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          set("lieu_depart_coords", { lat:latitude, lng:longitude });
        } finally { setLocLoading(false); }
      },
      (err) => {
        setLocLoading(false);
        setLocError(err.code===1 ? "Accès refusé. Activez la localisation." : "Position introuvable.");
      },
      { timeout:10000, enableHighAccuracy:true }
    );
  };

  const calcDistance = async () => {
    if (!form.lieu_depart_coords || !form.destination.trim()) { setLocError("Localisez-vous d'abord."); return; }
    setDistLoading(true); setLocError("");
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(form.destination)}&format=json&limit=1`);
      const json = await res.json();
      if (!json.length) { setLocError("Destination introuvable."); return; }
      const dLat = (parseFloat(json[0].lat) - form.lieu_depart_coords.lat) * Math.PI / 180;
      const dLng = (parseFloat(json[0].lon) - form.lieu_depart_coords.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(form.lieu_depart_coords.lat*Math.PI/180)*Math.cos(parseFloat(json[0].lat)*Math.PI/180)*Math.sin(dLng/2)**2;
      setDistance(Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))));
    } catch { setLocError("Erreur calcul distance."); }
    finally  { setDistLoading(false); }
  };

  const nb = parseInt(form.nb_places);
  const reco = !nb || isNaN(nb) ? null
    : nb <= 5  ? { label:"Tourisme / Utilitaire", icon:"🚗", color:C.blue,  bg:C.blueLight,  detail:"jusqu'à 5 places" }
    : nb <= 30 ? { label:"1 Bus",                icon:"🚌", color:C.green, bg:C.greenLight, detail:"6 à 30 places" }
    : nb <= 60 ? { label:"2 Bus",                icon:"🚌", color:C.amber, bg:C.amberLight, detail:"31 à 60 places" }
    : nb <= 90 ? { label:"3 Bus",                icon:"🚌", color:C.amber, bg:C.amberLight, detail:"61 à 90 places" }
    :            { label:`${Math.ceil(nb/30)} Bus`, icon:"🚌", color:C.red, bg:C.redLight, detail:`${nb} personnes` };

  const handleSubmit = async () => {
    if (!form.destination || !form.start_date || !form.heure_depart || !form.purpose || !form.nb_places) {
      alert("Remplissez tous les champs obligatoires (*)"); return;
    }
    setSubmitting(true);
    const payload = {
      destination:          form.destination.trim(),
      purpose:              form.purpose.trim(),
      start_date:           `${form.start_date}T${form.heure_depart}:00`,
      end_date:             `${form.end_date || form.start_date}T${form.heure_retour || "18:00"}:00`,
      number_of_passengers: parseInt(form.nb_places) || 1,
      ...(distance != null && { estimated_distance:distance }),
      ...(form.lieu_depart && { notes:`Lieu de départ : ${form.lieu_depart}${form.notes ? " | "+form.notes : ""}` }),
    };
    try {
      const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/reservations/`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json();
        alert("Erreur : " + (json?.message || JSON.stringify(json)));
        return;
      }
      // Succès → appeler onSuccess qui ferme le modal ET déclenche le refresh
      onSuccess();
    } catch { alert("Impossible de joindre le serveur."); }
    finally  { setSubmitting(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
      <div style={{ background:C.white, borderRadius:14, padding:24, width:600,
        maxWidth:"95vw", maxHeight:"92vh", overflowY:"auto",
        boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <span style={{ fontSize:15, fontWeight:700, color:C.text }}>
            {isDirecteur ? "Nouvelle réservation" : "Demande de véhicule avec chauffeur"}
          </span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:16, color:C.textLight }}>✕</button>
        </div>
        {!isDirecteur && (
          <div style={{ background:C.amberLight, border:`1px solid ${C.amber}30`, borderRadius:8, padding:"10px 14px", fontSize:12, color:C.amber, marginBottom:16 }}>
            ℹ️ Votre demande sera traitée avec un chauffeur assigné par le gestionnaire.
          </div>
        )}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <FldM label="Destination *"       value={form.destination} onChange={e=>set("destination",e.target.value)} placeholder="Ex: Yaoundé, Akwa…" />
            <FldM label="Motif *"             value={form.purpose}     onChange={e=>set("purpose",e.target.value)}     placeholder="Ex: Réunion, Conférence…" />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <FldM label="Date de départ *"        type="date" value={form.start_date}   onChange={e=>set("start_date",e.target.value)} />
            <FldM label="Date de retour"          type="date" value={form.end_date}     onChange={e=>set("end_date",e.target.value)} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <FldM label="Heure de départ *"       type="time" value={form.heure_depart} onChange={e=>set("heure_depart",e.target.value)} />
            <FldM label="Heure de retour estimée" type="time" value={form.heure_retour} onChange={e=>set("heure_retour",e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Lieu de prise en charge *</label>
            <div style={{ display:"flex", gap:8, marginTop:5 }}>
              <input style={{ ...S.input, flex:1, background:C.white, color:C.text }}
                placeholder="Votre adresse ou cliquez Me localiser"
                value={form.lieu_depart} onChange={e=>{set("lieu_depart",e.target.value);setDistance(null);}} />
              <button onClick={getGeolocation} disabled={locLoading}
                style={{ padding:"8px 12px", background:C.green, color:"#fff", border:"none", borderRadius:7, fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                {locLoading ? "Localisation…" : "📍 Me localiser"}
              </button>
            </div>
            {form.lieu_depart_coords && form.destination && (
              <button onClick={calcDistance} disabled={distLoading}
                style={{ marginTop:8, padding:"6px 12px", background:C.blueLight, color:C.blue, border:`1px solid ${C.blue}30`, borderRadius:7, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                {distLoading ? "Calcul…" : `📐 Calculer distance vers ${form.destination}`}
              </button>
            )}
            {distance !== null && (
              // Dans ModalReservation, après le calcul de distance :

 

              <div style={{ marginTop:8, background:C.blueLight, borderRadius:8, padding:"10px 14px", fontSize:12, color:C.blue, fontWeight:600 }}>
                📍 Distance estimée : <b>{distance} km</b>
              </div>
            )}
            {locError && <div style={{ fontSize:11, color:C.red, marginTop:6 }}>⚠️ {locError}</div>}
          </div>
          <div>
            <label style={S.label}>Nombre de personnes *</label>
            <input style={{ ...S.input, width:120, textAlign:"center", fontSize:16, fontWeight:700, marginTop:5, background:C.white, color:C.text }}
              type="number" min="1" max="200" placeholder="Ex: 12"
              value={form.nb_places} onChange={e=>set("nb_places",e.target.value)} />
            {reco && (
              <div style={{ marginTop:10, background:reco.bg, borderRadius:8, padding:"12px 14px", border:`1px solid ${reco.color}25` }}>
                <div style={{ fontSize:13, fontWeight:700, color:reco.color, marginBottom:4 }}>{reco.icon} Recommandé : {reco.label}</div>
                <div style={{ fontSize:11, color:C.textMid }}>{reco.detail}</div>
              </div>
            )}
          </div>
          <div>
            <label style={S.label}>Notes complémentaires</label>
            <textarea style={{ ...S.input, height:65, resize:"vertical", marginTop:5, background:C.white, color:C.text }}
              placeholder="Informations supplémentaires…"
              value={form.notes} onChange={e=>set("notes",e.target.value)} />
          </div>
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20 }}>
          <button onClick={onClose} style={S.ghostBtn}>Annuler</button>
          <button onClick={handleSubmit} disabled={submitting} style={{ ...S.btn, opacity:submitting?0.7:1 }}>
            {submitting ? "Envoi en cours…" : "Envoyer la demande"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Petits composants ─────────────────────────────────────────────────────────
function ActionCard({ icon, title, desc, color, onClick }) {
  return (
    <button onClick={onClick} className="action-card"
      style={{ background:C.white, borderRadius:10, padding:"18px 16px",
        border:`1px solid ${C.border}`, borderTop:`3px solid ${color}`,
        cursor:"pointer", textAlign:"left", fontFamily:"inherit",
        boxShadow:"0 1px 3px rgba(0,0,0,.05)", transition:"all .15s" }}>
      <div style={{ fontSize:28, marginBottom:10 }}>{icon}</div>
      <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:4 }}>{title}</div>
      <div style={{ fontSize:11, color:C.textLight, lineHeight:1.4 }}>{desc}</div>
    </button>
  );
}
function VFField({ icon, label, value, big }) {
  return (
    <div style={{ padding:"12px 14px", background:C.bg, borderRadius:8 }}>
      <div style={{ fontSize:10, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px", marginBottom:5 }}>{icon} {label}</div>
      <div style={{ fontSize:big?20:14, fontWeight:big?800:600, color:C.text }}>{value || "—"}</div>
    </div>
  );
}
function StatusBadge({ status }) {
  const map = {
    DISPONIBLE:    { label:"Disponible",    bg:C.greenLight, color:C.green },
    EN_SERVICE:    { label:"En service",    bg:C.amberLight, color:C.amber },
    EN_MAINTENANCE:{ label:"Maintenance",   bg:C.redLight,   color:C.red   },
    HORS_SERVICE:  { label:"Hors service",  bg:"#F5F5F5",    color:"#888"  },
    PENDING:       { label:"En attente",    bg:C.amberLight, color:C.amber },
    EN_ATTENTE:    { label:"En attente",    bg:C.amberLight, color:C.amber },
    APPROVED:      { label:"Approuvée",     bg:C.greenLight, color:C.green },
    APPROUVEE:     { label:"Approuvée",     bg:C.greenLight, color:C.green },
    REJECTED:      { label:"Refusée",       bg:C.redLight,   color:C.red   },
    REJETEE:       { label:"Refusée",       bg:C.redLight,   color:C.red   },
    COMPLETED:     { label:"Terminée",      bg:C.greenLight, color:C.green },
    TERMINEE:      { label:"Terminée",      bg:C.greenLight, color:C.green },
  };
  const m = map[status] || { label:status, bg:"#F5F5F5", color:"#888" };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 9px",
      borderRadius:99, fontSize:11, fontWeight:700, background:m.bg, color:m.color, whiteSpace:"nowrap" }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:m.color, display:"inline-block" }}/>
      {m.label}
    </span>
  );
}
function Empty({ text, icon="📭" }) {
  return (
    <div style={{ textAlign:"center", padding:"48px 0", color:C.textLight }}>
      <div style={{ fontSize:36, marginBottom:10 }}>{icon}</div>
      <div style={{ fontSize:13 }}>{text}</div>
    </div>
  );
}
function Loader() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:C.bg, flexDirection:"column", gap:14 }}>
      <div style={{ width:32, height:32, border:`3px solid ${C.green}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin .8s linear infinite" }}/>
      <div style={{ fontSize:11, color:C.textLight, letterSpacing:"2px", textTransform:"uppercase" }}>Chargement</div>
    </div>
  );
}
function IUCLogo() {
  return (
    <div style={{ width:44, height:44, borderRadius:10, background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <svg width="28" height="28" viewBox="0 0 52 52" fill="none">
        <path d="M7 34L16 18Q18 13 22 13H30Q34 13 36 18L45 34" stroke="white" strokeWidth="3" strokeLinecap="round"/>
        <rect x="5" y="32" width="42" height="12" rx="6" fill="white" opacity=".92"/>
        <circle cx="15" cy="44" r="5.5" fill="#C0182A"/><circle cx="37" cy="44" r="5.5" fill="#C0182A"/>
        <circle cx="15" cy="44" r="2.5" fill="white"/><circle cx="37" cy="44" r="2.5" fill="white"/>
        <rect x="22" y="17" width="8" height="7" rx="1.5" fill="white" opacity=".4"/>
      </svg>
    </div>
  );
}
function NavIcon({ id }) {
  const p = { width:16, height:16, viewBox:"0 0 24 24", fill:"none", stroke:"currentColor", strokeWidth:1.8, strokeLinecap:"round" };
  switch(id) {
    case "grid":     return <svg {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
    case "car":      return <svg {...p}><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h11l4 4v4a2 2 0 0 1-2 2h-1"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>;
    case "calendar": return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    case "map":      return <svg {...p}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>;
    case "history":  return <svg {...p}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>;
    case "tool":     return <svg {...p}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;
    case "doc":      return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
    case "bell":     return <svg {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
    case "settings":
  return (
    <svg {...p}>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
    default:         return <svg {...p}><circle cx="12" cy="12" r="10"/></svg>;
  }
}
function BellIcon()   { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>; }
function LogoutIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
function FldM({ label, value, onChange, type="text", placeholder }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      <label style={S.label}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          ...S.input,
          background: C.white,
          color: C.text,
          // Fix pour que les pickers date/time s'affichent correctement
          colorScheme: "light",
        }}
      />
    </div>
  );
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" });
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  shell:    { display:"flex", height:"100vh", width:"100vw", fontFamily:"'Inter',-apple-system,sans-serif", background:C.bg, overflow:"hidden" },
 sidebar: { 
  width:224, 
  background:C.sidebar, 
  display:"flex", 
  flexDirection:"column", 
  flexShrink:0, 
  height:"100vh",
  overflow:"hidden"   // ← retire overflowY:"auto"
},
  brand:    { display:"flex", alignItems:"center", gap:11, padding:"20px 16px 14px" },
  brandText:{ minWidth:0 },
  brandName:{ fontSize:13, fontWeight:800, color:"#fff", letterSpacing:"2px" },
  brandSub: { fontSize:9, color:"rgba(255,255,255,.4)", marginTop:2, lineHeight:1.4 },
  divider:  { height:1, background:"rgba(255,255,255,.08)", margin:"0 14px" },
  nav: { 
  flex:1, 
  padding:"8px 10px", 
  overflowY:"auto",   // ← le scroll est ICI seulement
  minHeight:0         // ← CRUCIAL : permet à flex de rétrécir
},
  navItem: { 
  display:"flex", alignItems:"center", gap:10, width:"100%", 
  padding:"6px 10px",       // ← était 8px, passer à 6px
  borderRadius:7, border:"none", cursor:"pointer", 
  color:"rgba(255,255,255,.65)", 
  marginBottom:1,            // ← était 2, passer à 1
  textAlign:"left", background:"transparent", fontFamily:"inherit", 
  position:"relative", transition:"all .12s" 
},
  navActive:{ background:C.sideActive, color:"#fff", fontWeight:600 },
  navLabel: { fontSize:12.5, flex:1 },
  navPip:   { position:"absolute", right:0, top:"50%", transform:"translateY(-50%)", width:3, height:16, background:"#fff", borderRadius:99 },
  navBadge: { background:C.red, color:"#fff", borderRadius:99, fontSize:9, fontWeight:800, width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center" },
 sideBottom: { 
  padding:"8px 10px 14px", 
  flexShrink:0         // ← CRUCIAL : empêche le bas de comprimer la nav
},
  logoutBtn:{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"8px 10px", borderRadius:7, border:"none", cursor:"pointer", background:"rgba(192,24,42,0.25)", color:"rgba(255,255,255,.75)", fontSize:12, fontFamily:"inherit", marginTop:8, transition:"all .12s" },
  main:     { flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 },
  topbar:   { background:C.white, borderBottom:`1px solid ${C.border}`, padding:"14px 24px", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 },
  pageTitle:{ fontSize:22, fontWeight:760, color:C.text, letterSpacing:"-.4px", margin:0 },
  pageDate: { fontSize:11, color:C.textLight, marginTop:2 },
  iconBtn:  { width:34, height:34, borderRadius:8, border:`1px solid ${C.border}`, background:C.white, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:C.textMid },
  badge:    { position:"absolute", top:-5, right:-5, background:C.red, color:"#fff", borderRadius:99, fontSize:9, fontWeight:800, width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center" },
  userChip: { display:"flex", alignItems:"center", gap:9 },
  topAvatar:{ width:34, height:34, borderRadius:"50%", background:C.green, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:12 },
  topName:  { fontSize:13, fontWeight:700, color:C.text },
  topRole:  { fontSize:10, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px" },
  content:  { flex:1, overflowY:"auto", padding:"20px 24px", display:"flex", flexDirection:"column", gap:18 },
  kpiCard:  { background:C.white, borderRadius:10, padding:"16px 18px", borderLeft:"3px solid transparent", boxShadow:"0 1px 3px rgba(0,0,0,.05)" },
  section:  { background:C.white, borderRadius:10, padding:"16px 18px", boxShadow:"0 1px 3px rgba(0,0,0,.05)" },
  secHead:  { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 },
  secTitle: { fontSize:13, fontWeight:700, color:C.text },
  // Inputs : fond blanc, texte noir
  input:    { padding:"8px 12px", border:`1.5px solid ${C.border}`, borderRadius:7, fontSize:13, outline:"none", fontFamily:"inherit", color:C.text, background:C.white, width:"100%",colorScheme:"dark" },
  label:    { fontSize:11, fontWeight:600, color:C.textMid, textTransform:"uppercase", letterSpacing:"1px" },
  btn:      { padding:"7px 14px", background:C.green, color:"#fff", border:"none", borderRadius:7, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" },
  ghostBtn: { padding:"7px 14px", background:"transparent", color:C.textMid, border:`1px solid ${C.border}`, borderRadius:7, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" },
};

// Alias pour la sidebar (utilisé dans l'avatar)
const C_greenMid = C.greenMid;

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
  input:focus, textarea:focus, select:focus {
    border-color: ${C.green} !important;
    box-shadow: 0 0 0 3px ${C.green}18 !important;
    outline: none;
  }
  input, textarea, select {
    background: #FFFFFF !important;
    color: #1A2820 !important;
  }
   /* ── Variables globales LIGHT (défaut) ── */
:root {
  --c-bg:           #F4F6F5;
  --c-card:         #FFFFFF;
  --c-sidebar:      #2c6549;
  --c-border:       #E2E8E5;
  --c-text:         #1A2820;
  --c-text-mid:     #4A6358;
  --c-text-light:   #8EA99A;
  --c-green:        #1B5E37;
  --c-green-light:  #EAF4EE;
  --c-input:        #FFFFFF;
  --c-input-border: #D1D9D5;
  --c-red:          #C0182A;
  --c-red-light:    #FDF0F1;
  --c-amber:        #D97706;
  --c-amber-light:  #FFFBEB;
  --c-blue:         #1D4ED8;
  --c-blue-light:   #EFF6FF;
}
 
/* ── Variables DARK ── */
[data-theme="dark"] {
  --c-bg:           #0F1A14;
  --c-card:         #162010;
  --c-sidebar:      #0A1510;
  --c-border:       #1E3020;
  --c-text:         #E8F0E4;
  --c-text-mid:     #8FAF85;
  --c-text-light:   #4A6A40;
  --c-green:        #4ADE80;
  --c-green-light:  #14321A;
  --c-input:        #1C2B18;
  --c-input-border: #2D4228;
  --c-red:          #F87171;
  --c-red-light:    #2D0F0F;
  --c-amber:        #FBB800;
  --c-amber-light:  #2A1E00;
  --c-blue:         #60A5FA;
  --c-blue-light:   #0A1A2E;
}
 
/* ── Fond global ── */
body, #root {
  background: var(--c-bg);
  color: var(--c-text);
  transition: background-color .25s ease, color .2s ease;
}
 
/* ── Sidebar ── */
[data-theme="dark"] aside {
  background: var(--c-sidebar) !important;
}
 
/* ── Topbar ── */
[data-theme="dark"] header {
  background: var(--c-card) !important;
  border-bottom-color: var(--c-border) !important;
}
[data-theme="dark"] header h1,
[data-theme="dark"] header p {
  color: var(--c-text) !important;
}
 
/* ── Cards / sections (les divs avec background blanc) ── */
[data-theme="dark"] .dp-section,
[data-theme="dark"] .dp-card {
  background: var(--c-card) !important;
  border-color: var(--c-border) !important;
  color: var(--c-text) !important;
}
 
/* ── Inputs, selects, textareas ── */
[data-theme="dark"] input,
[data-theme="dark"] textarea,
[data-theme="dark"] select {
  background: var(--c-input) !important;
  color: var(--c-text) !important;
  border-color: var(--c-input-border) !important;
  color-scheme: dark;
}
 
/* ── Transitions douces sur tout ── */
*,
*::before,
*::after {
  transition:
    background-color .2s ease,
    border-color .2s ease,
    color .15s ease;
}
 
/* Mais pas sur les animations existantes */
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes slideUp {
  from { opacity:0; transform:translateY(12px); }
  to   { opacity:1; transform:translateY(0); }
}
`;