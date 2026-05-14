// ─── src/dashboard/Dashboard.jsx ─────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../utils/api";
import { fmtDate } from "../../utils/api";
import { C, S, M, CSS, NAV, VEHICLE_CATEGORIES } from "../../constants";
import { StatusBadge, Chip, Empty, Loader, Fld, BellIcon, LogoutIcon } from "../../components/ui";
import { VehiculesModule  } from "../vehicles/Vehicles";
import { TabReservations } from "../reservations/Reservations";
import { TabUtilisateurs } from "../../utilisateurs/Utilisateurs";
import { TabParametres } from "../parametres/Parametres";
import { TabDocumentsGestionnaire } from '../documents/TabDocumentsGestionnaire';
import { TabMaintenance } from "../maintenance/TabMaintenance";
import { TabPlanning } from '../planning/Tabplanning';
import { TabSignalementsGestionnaire } from "../signalements/TabSignalementsGestionnaire";
import { TabCarburant } from "../carburant/TabCarburant";

// ── ICÔNES SVG INLINE ─────────────────────────────────────────────────────────
function NavIcon({ id }) {
  const icons = {
    grid: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
    car: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/>
        <path d="M14 17H9"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/>
        <path d="M3 9l2-5h10l2 5"/>
      </svg>
    ),
    calendar: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    tool: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
    fuel: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 22V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M3 22h12"/>
        <path d="M13 6h4l2 2v3h-6"/><path d="M19 11v5a2 2 0 0 1-2 2"/>
        <line x1="7" y1="10" x2="9" y2="10"/>
      </svg>
    ),
    doc: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
    alert: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    users: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    money: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    chart: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
        <line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    ),
    settings: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  };
  return icons[id] ?? <span style={{ width:16, height:16, display:"inline-block" }} />;
}

// ── CSS COLLAPSE ──────────────────────────────────────────────────────────────
const COLLAPSE_CSS = `
  .nav-btn:hover { background: ${C.sideHover}!important; color:#fff!important; }
  .logout-btn:hover { background:rgba(192,24,42,0.4)!important; }
  .collapse-btn:hover { background:rgba(255,255,255,0.15)!important; }

  /* Tooltip mode collapsed */
  .nav-wrap { position: relative; }
  .nav-tooltip {
    position: absolute;
    left: calc(100% + 12px);
    top: 50%;
    transform: translateY(-50%);
    background: #1A2820;
    color: #fff;
    padding: 5px 10px;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity .15s;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,.25);
  }
  .nav-tooltip::before {
    content: '';
    position: absolute;
    right: 100%;
    top: 50%;
    transform: translateY(-50%);
    border: 5px solid transparent;
    border-right-color: #1A2820;
  }
  .nav-wrap:hover .nav-tooltip { opacity: 1; }

  /* Transitions */
  .sidebar-col-anim { transition: width .22s cubic-bezier(.4,0,.2,1); }
  .sidebar-anim     { transition: margin .22s cubic-bezier(.4,0,.2,1); }
  .brand-anim       { transition: all .22s cubic-bezier(.4,0,.2,1); }
`;

// ── COMPOSANT PRINCIPAL ───────────────────────────────────────────────────────
export default function Dashboard({ onLogout }) {
  const [tab,          setTab]          = useState("dashboard");
  const [user,         setUser]         = useState(null);
  const [vehicles,     setVehicles]     = useState([]);
  const [reservations, setReservations] = useState([]);
  const [maintenance,  setMaintenance]  = useState([]);
  const [vehStats,     setVehStats]     = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [collapsed,    setCollapsed]    = useState(false);

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
    { label:"Véhicules disponibles",   value:`${disponibles}/${total}`, trend:"+2 depuis hier",                                               color:C.green },
    { label:"Réservations en attente", value:reservations.length,        trend:`${reservations.length} nouvelle(s)`,                          color:C.amber },
    { label:"Alertes actives",         value:maintenance.length,         trend:`${maintenance.filter(m => m.urgent).length || 0} critique(s)`, color:C.red   },
    { label:"Dépenses du mois",        value:"—",                        trend:"connecter /api/v1/expenses/",                                  color:C.blue  },
  ];

  return (
    <div style={S.shell}>
      <style>{CSS + COLLAPSE_CSS}</style>

      {/* ── COLONNE SIDEBAR ── */}
      <div
        className="sidebar-col-anim"
        style={{
          ...S.sidebarCol,
          width: collapsed ? 68 : (S.sidebarCol?.width ?? 224),
          overflow: "visible",
        }}
      >

        {/* Header blanc : logo + DRIVEPARC */}
        <div
          className="brand-anim"
          style={{
            ...S.sideHeader,
            justifyContent: collapsed ? "center" : "flex-start",
            padding: collapsed ? "16px 10px" : S.sideHeader?.padding,
            overflow: "hidden",
          }}
        >
          <img
            src="/assets/logo (3).png"
            alt="DriveParc"
            style={{ height:43.14, width:"auto", objectFit:"contain", flexShrink:0 }}
          />
          {!collapsed && (
            <div>
              <div style={S.brandName}>
                <span style={{ color:"#26282a" }}>DRIVE</span>
                <span style={{ color:"#1a8a4a" }}>PARC</span>
              </div>
              <div style={S.brandSub}>Institut Universitaire de la côte</div>
            </div>
          )}
        </div>

        {/* Sidebar verte arrondie */}
        <aside
          className="sidebar-anim"
          style={{
            ...S.sidebar,
            overflow: "visible",          // pour que les tooltips débordent
            position: "relative",
          }}
        >

          {/* ── BOUTON COLLAPSE — bord droit de la sidebar ── */}
          <button
            className="collapse-btn"
            onClick={() => setCollapsed(c => !c)}
            style={{
              position: "absolute",
              top: 20,
              right: -11,
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "#fff",
              border: `1.5px solid ${C.border}`,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
              boxShadow: "0 2px 6px rgba(0,0,0,.12)",
              padding: 0,
              color: C.textMid,
              transition: "background .15s",
            }}
          >
            <svg
              width="10" height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition:"transform .22s", transform: collapsed ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <nav style={{ ...S.nav, overflowX: "visible" }}>
            {NAV.map(n => {
              const active = tab === n.id;
              return (
                <div key={n.id} className="nav-wrap">
                  <button
                    onClick={() => setTab(n.id)}
                    style={{
                      ...S.navItem,
                      ...(active ? S.navActive : {}),
                      justifyContent: collapsed ? "center" : "flex-start",
                      padding: collapsed ? "9px 0" : S.navItem?.padding,
                    }}
                    className={active ? "" : "nav-btn"}
                  >
                    <span style={{ display:"flex", opacity: active ? 1 : 0.65 }}>
                      <NavIcon id={n.icon} />
                    </span>

                    {!collapsed && (
                      <span style={S.navLabel}>{n.label}</span>
                    )}

                    {n.id === "reservations" && reservations.length > 0 && (
                      <span style={{
                        ...S.navBadge,
                        position: collapsed ? "absolute" : "static",
                        top: collapsed ? 4 : "auto",
                        right: collapsed ? 4 : "auto",
                      }}>
                        {reservations.length}
                      </span>
                    )}

                    {active && !collapsed && <span style={S.navPip} />}
                  </button>

                  {/* Tooltip visible uniquement en mode collapsed */}
                  {collapsed && (
                    <div className="nav-tooltip">{n.label}</div>
                  )}
                </div>
              );
            })}
          </nav>

          <div style={S.sideBottom}>
            <div style={S.divider} />
            <div style={S.sideUser}>
              <div style={{ minWidth:0 }} />
            </div>
            <button onClick={handleLogout} style={{
              ...S.logoutBtn,
              justifyContent: collapsed ? "center" : "flex-start",
            }} className="logout-btn">
              <LogoutIcon />
              {!collapsed && <span>Déconnexion</span>}
            </button>
          </div>
        </aside>
      </div>

      {/* ── ZONE PRINCIPALE ── */}
      <div style={S.main}>

        {/* Topbar blanc arrondi */}
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

        {/* Contenu */}
        <div style={S.content}>
          {tab === "dashboard"    && <TabDash kpis={KPIS} reservations={reservations} maintenance={maintenance} vehicles={vehicles} vehStats={vehStats} onGoReservations={() => setTab("reservations")} />}
          {tab === "vehicles"     && <VehiculesModule  vehicles={vehicles} onRefresh={loadAll} />}
          {tab === "reservations" && <TabReservations reservations={reservations} vehicles={vehicles} onRefresh={loadAll} />}
          {tab === "documents"    && <TabDocumentsGestionnaire vehicles={vehicles} />}
          {tab === "maintenance"  && <TabMaintenance vehicles={vehicles} onRefresh={loadAll} />}
          {tab === "signalements" && <TabSignalementsGestionnaire />}
          {tab === "carburant"    && <TabCarburant role="GESTIONNAIRE" />}
          {tab === "alertes"      && <TabAlertes maintenance={maintenance} />}
          {tab === "utilisateurs" && <TabUtilisateurs />}
          {tab === "parametres"   && <TabParametres />}
          {!["dashboard","vehicles","reservations","maintenance","alertes","utilisateurs","parametres","carburant","documents","depenses","rapports","signalements"].includes(tab) &&
            <Placeholder label={NAV.find(n => n.id === tab)?.label} />}
        </div>
      </div>
    </div>
  );
}

// ── TAB DASHBOARD ─────────────────────────────────────────────────────────────
function TabDash({ kpis, reservations, maintenance, vehicles, vehStats, onGoReservations }) {
  const total       = vehStats?.total       ?? vehicles.length;
  const disponibles = vehStats?.disponibles ?? vehicles.filter(v => v.status === "DISPONIBLE").length;
  const enService   = vehStats?.en_service  ?? vehicles.filter(v => v.status === "EN_SERVICE").length;
  const enMaint     = vehStats?.maintenance ?? vehicles.filter(v => v.status === "EN_MAINTENANCE").length;

  const parcCommun = vehicles.filter(v => v.assignment_type !== "FONCTION");
  const deFunction = vehicles.filter(v => v.assignment_type === "FONCTION");

  const byCategory = VEHICLE_CATEGORIES.map(([cat, label, icon]) => ({
    cat, label, icon,
    total: parcCommun.filter(v => v.category === cat).length,
    dispo: parcCommun.filter(v => v.category === cat && v.status === "DISPONIBLE").length,
  }));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      <div style={S.kpiGrid}>
        {kpis.map((st, i) => (
          <div key={i} style={{ ...S.kpiCard, borderLeftColor:st.color }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.textLight, letterSpacing:"1.2px", textTransform:"uppercase", marginBottom:10 }}>{st.label}</div>
            <div style={{ fontSize:30, fontWeight:800, color:C.text, lineHeight:1 }}>{st.value}</div>
            <div style={{ fontSize:11, color:st.color, fontWeight:600, marginTop:8 }}>{st.trend}</div>
          </div>
        ))}
      </div>

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