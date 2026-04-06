// ─── src/dashboard/Dashboard.jsx ─────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../utils/api";
import { fmtDate } from "../../utils/api";
import { C, S, M, CSS, NAV, VEHICLE_CATEGORIES } from "../../constants";
import { StatusBadge, Chip, Empty, Loader, Fld, IUCLogo, NavIcon, BellIcon, LogoutIcon } from "../../components/ui";
import { TabVehicules } from "../vehicles/Vehicles";
import { TabReservations } from "../reservations/Reservations";
import { TabUtilisateurs } from "../../utilisateurs/Utilisateurs";

// ── COMPOSANT PRINCIPAL ───────────────────────────────────────────────────────
export default function Dashboard({ onLogout }) {
  const [tab,          setTab]          = useState("dashboard");
  const [user,         setUser]         = useState(null);
  const [vehicles,     setVehicles]     = useState([]);
  const [reservations, setReservations] = useState([]);
  const [maintenance,  setMaintenance]  = useState([]);
  const [vehStats,     setVehStats]     = useState(null);
  const [loading,      setLoading]      = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [u, v, r, m, st] = await Promise.all([
        apiFetch("/auth/profile/").catch(() => null),
        apiFetch("/vehicles/").catch(() => ({ results: [] })),
        apiFetch("/reservations/?status=EN_ATTENTE").catch(() => ({ results: [] })),
        apiFetch("/maintenance/?status=ACTIVE").catch(() => ({ results: [] })),
        apiFetch("/vehicles/stats/").catch(() => null),
      ]);
      setUser(u);
      setVehicles(Array.isArray(v) ? v : v?.results ?? []);
      setReservations(Array.isArray(r) ? r : r?.results ?? []);
      setMaintenance(Array.isArray(m) ? m : m?.results ?? []);
      setVehStats(st);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleLogout = () => { localStorage.clear(); sessionStorage.clear(); onLogout?.(); };

  if (loading) return <Loader />;

  const total       = vehStats?.total       ?? vehicles.length;
  const disponibles = vehStats?.disponibles ?? vehicles.filter(v => v.status === "DISPONIBLE").length;

  const KPIS = [
    { label:"Véhicules disponibles",   value:`${disponibles}/${total}`, trend:"+2 depuis hier",                                              color:C.green },
    { label:"Réservations en attente", value:reservations.length,        trend:`${reservations.length} nouvelle(s)`,                         color:C.amber },
    { label:"Alertes actives",         value:maintenance.length,         trend:`${maintenance.filter(m => m.urgent).length || 0} critique(s)`,color:C.red   },
    { label:"Dépenses du mois",        value:"—",                        trend:"connecter /api/v1/expenses/",                                color:C.blue  },
  ];

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

        <nav style={S.nav}>
          {NAV.map(n => {
            const active = tab === n.id;
            return (
              <button key={n.id} onClick={() => setTab(n.id)}
                style={{ ...S.navItem, ...(active ? S.navActive : {}) }}
                className={active ? "" : "nav-btn"}>
                <span style={{ display:"flex", opacity:active ? 1 : 0.65 }}><NavIcon id={n.icon} /></span>
                <span style={S.navLabel}>{n.label}</span>
                {n.id === "reservations" && reservations.length > 0 &&
                  <span style={S.navBadge}>{reservations.length}</span>}
                {active && <span style={S.navPip} />}
              </button>
            );
          })}
        </nav>

        <div style={S.sideBottom}>
          <div style={S.divider} />
          <div style={S.sideUser}>
            <div style={S.sideAvatar}>{user?.first_name?.[0]}{user?.last_name?.[0]}</div>
            <div style={{ minWidth:0 }}>
              <div style={S.sideUserName}>{user?.full_name || `${user?.first_name} ${user?.last_name}`}</div>
              <div style={S.sideUserRole}>{user?.role_display || "Gestionnaire"}</div>
            </div>
          </div>
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
              <button style={S.iconBtn} className="icon-btn" onClick={() => setTab("reservations")}><BellIcon /></button>
              {reservations.length > 0 && <span style={S.badge}>{reservations.length}</span>}
            </div>
            <div style={S.userChip}>
              <div style={S.topAvatar}>{user?.first_name?.[0]}{user?.last_name?.[0]}</div>
              <div>
                <div style={S.topName}>{user?.full_name || `${user?.first_name} ${user?.last_name}`}</div>
                <div style={S.topRole}>{user?.role_display || "Gestionnaire"}</div>
              </div>
            </div>
          </div>
        </header>

        <div style={S.content}>
  {tab === "dashboard"    && <TabDash kpis={KPIS} reservations={reservations} maintenance={maintenance} vehicles={vehicles} vehStats={vehStats} onGoReservations={() => setTab("reservations")} />}
  {tab === "vehicles"     && <TabVehicules vehicles={vehicles} onRefresh={loadAll} />}
  {tab === "reservations" && <TabReservations reservations={reservations} vehicles={vehicles} onRefresh={loadAll} />}
  {tab === "maintenance"  && <TabMaintenance maintenance={maintenance} />}
  {tab === "alertes"      && <TabAlertes maintenance={maintenance} />}
  {tab === "utilisateurs" && <TabUtilisateurs />}
 {!["dashboard","vehicles","reservations","maintenance","alertes","utilisateurs"].includes(tab)  &&
    <Placeholder label={NAV.find(n => n.id === tab)?.label} />}
</div>
      </div>
    </div>
  );
}

// ── TAB DASHBOARD ─────────────────────────────────────────────────────────────
function TabDash({ kpis, reservations, maintenance, vehicles, vehStats, onGoReservations }) {
  const total     = vehStats?.total       ?? vehicles.length;
  const disponibles = vehStats?.disponibles ?? vehicles.filter(v => v.status === "DISPONIBLE").length;
  const enService   = vehStats?.en_service  ?? vehicles.filter(v => v.status === "EN_SERVICE").length;
  const enMaint     = vehStats?.maintenance ?? vehicles.filter(v => v.status === "EN_MAINTENANCE").length;

  // Séparer parc commun et véhicules de fonction
  const parcCommun  = vehicles.filter(v => v.assignment_type !== "FONCTION");
  const deFunction  = vehicles.filter(v => v.assignment_type === "FONCTION");

  const byCategory = VEHICLE_CATEGORIES.map(([cat, label, icon]) => ({
    cat, label, icon,
    total: parcCommun.filter(v => v.category === cat).length,
    dispo: parcCommun.filter(v => v.category === cat && v.status === "DISPONIBLE").length,
  }));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>

      {/* KPIs */}
      <div style={S.kpiGrid}>
        {kpis.map((st, i) => (
          <div key={i} style={{ ...S.kpiCard, borderLeftColor:st.color }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.textLight, letterSpacing:"1.2px", textTransform:"uppercase", marginBottom:10 }}>{st.label}</div>
            <div style={{ fontSize:30, fontWeight:800, color:C.text, lineHeight:1 }}>{st.value}</div>
            <div style={{ fontSize:11, color:st.color, fontWeight:600, marginTop:8 }}>{st.trend}</div>
          </div>
        ))}
      </div>

      {/* Véhicules de fonction */}
      {deFunction.length > 0 && (
        <div style={{ ...S.kpiCard, borderLeftColor:C.purple, display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
          <div style={{ fontSize:28 }}>🎖️</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.purple, textTransform:"uppercase", letterSpacing:"1px" }}>
              Véhicules de fonction — directeurs
            </div>
            <div style={{ display:"flex", gap:12, marginTop:6, flexWrap:"wrap" }}>
              {deFunction.map(v => (
                <div key={v.id} style={{ fontSize:12, color:C.textMid, background:C.purpleLight, padding:"4px 10px", borderRadius:7 }}>
                  <b style={{ color:C.text }}>{v.registration_number}</b>
                  {v.assigned_director && <span style={{ color:C.purple, marginLeft:6 }}>→ {v.assigned_director}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Répartition par catégorie — parc commun uniquement */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
        {byCategory.map(({ cat, label, icon, total: t, dispo }) => (
          <div key={cat} style={{ ...S.kpiCard, borderLeftColor:C.green, display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ fontSize:28 }}>{icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px" }}>{label}</div>
              <div style={{ fontSize:22, fontWeight:800, color:C.text, lineHeight:1, marginTop:4 }}>
                {dispo}<span style={{ fontSize:13, color:C.textLight, fontWeight:500 }}>/{t}</span>
              </div>
              <div style={{ fontSize:10, color:C.green, fontWeight:600, marginTop:4 }}>disponibles</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
        {/* Réservations en attente */}
        <div style={S.section}>
          <div style={S.secHead}>
            <span style={S.secTitle}>Réservations en attente</span>
            <Chip color={C.amber}>{reservations.length}</Chip>
          </div>
          {reservations.length === 0 && <Empty text="Aucune réservation" />}
          {reservations.slice(0, 4).map((r, i) => (
            <div key={i} style={S.listItem}>
              <div style={{ ...S.miniAvatar, background:C.green }}>{(r.requester_name || "?")[0]}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={S.listName}>{r.requester_name}</div>
                <div style={S.listSub}>{r.destination} · {r.number_of_passengers} pers. · {fmtDate(r.start_date)}</div>
              </div>
              <button onClick={onGoReservations}
                style={{ fontSize:11, padding:"3px 10px", background:C.amberLight, color:C.amber, border:"none", borderRadius:5, cursor:"pointer", fontWeight:700 }}>
                Traiter
              </button>
            </div>
          ))}
        </div>

        {/* État du parc */}
        <div style={S.section}>
          <div style={S.secHead}>
            <span style={S.secTitle}>État du parc</span>
            <Chip color={C.green}>{total} véhicules</Chip>
          </div>
          {[
            { label:"Disponibles",    count:disponibles, color:C.green },
            { label:"En service",     count:enService,   color:C.amber },
            { label:"En maintenance", count:enMaint,     color:C.red   },
          ].map(row => {
            const pct = total > 0 ? Math.round(row.count / total * 100) : 0;
            return (
              <div key={row.label} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:5 }}>
                  <span style={{ color:C.textMid, fontWeight:500 }}>{row.label}</span>
                  <span style={{ fontWeight:700, color:row.color }}>{row.count}</span>
                </div>
                <div style={{ height:5, background:"#E8EDEB", borderRadius:99, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:row.color, borderRadius:99, transition:"width .5s" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}



// ── TAB MAINTENANCE ───────────────────────────────────────────────────────────
function TabMaintenance({ maintenance }) {
  return (
    <div style={S.section}>
      <div style={{ ...S.secHead, marginBottom:16 }}>
        <span style={S.secTitle}>Maintenances actives — {maintenance.length}</span>
      </div>
      {maintenance.length === 0 && <Empty text="Aucune maintenance active" />}
      {maintenance.map((m, i) => (
        <div key={i} style={{ ...S.alertItem, borderLeft:`3px solid ${m.urgent ? C.red : C.amber}` }}>
          <div style={{ ...S.dot, background:m.urgent ? C.red : C.amber }} />
          <div style={{ flex:1 }}>
            <div style={S.alertTitle}>{m.type || m.maintenance_type} — {m.vehicle_name || m.vehicle?.registration_number}</div>
            <div style={S.alertDesc}>{m.description}</div>
            <div style={{ fontSize:11, color:C.textLight, marginTop:4 }}>Prévu le {fmtDate(m.scheduled_date)}</div>
          </div>
          <StatusBadge status={m.status || "ACTIVE"} />
        </div>
      ))}
    </div>
  );
}

// ── TAB ALERTES ───────────────────────────────────────────────────────────────
function TabAlertes({ maintenance }) {
  return (
    <div style={S.section}>
      <div style={{ ...S.secHead, marginBottom:16 }}>
        <span style={S.secTitle}>Toutes les alertes</span>
        <Chip color={C.red}>{maintenance.length}</Chip>
      </div>
      {maintenance.length === 0 && <Empty text="Aucune alerte" />}
      {maintenance.map((m, i) => (
        <div key={i} style={S.alertItem}>
          <div style={{ ...S.dot, background:C.red }} />
          <div style={{ flex:1 }}>
            <div style={S.alertTitle}>{m.type || m.maintenance_type} — {m.vehicle_name || m.vehicle?.registration_number}</div>
            <div style={S.alertDesc}>{m.description}</div>
          </div>
          <span style={{ fontSize:11, color:C.textLight }}>{fmtDate(m.scheduled_date)}</span>
        </div>
      ))}
    </div>
  );
}

// ── PLACEHOLDER ───────────────────────────────────────────────────────────────
function Placeholder({ label }) {
  return <div style={S.section}><Empty text={`Module "${label}" — à connecter`} icon="🔌" /></div>;
}