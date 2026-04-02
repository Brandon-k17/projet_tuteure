import { useState, useEffect, useCallback, useRef } from "react";

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
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err) || `Erreur ${res.status}`);
  }
  if (res.status === 204) return null;
  const json = await res.json();
  return json?.data ?? json;
}

async function apiUpload(path, formData, method = "PATCH") {
  const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(err) || `Erreur ${res.status}`);
  }
  if (res.status === 204) return null;
  const json = await res.json();
  return json?.data ?? json;
}

// ── Constantes ────────────────────────────────────────────────────────────────
const VEHICLE_CATEGORIES = [
  ["TOURISME",   "Tourisme",   "🚗"],
  ["UTILITAIRE", "Utilitaire", "🚐"],
  ["BUS",        "Bus",        "🚌"],
];

const VEHICLE_TYPES = [
  ["BERLINE","Berline"],["SUV","SUV"],["MINIBUS","Minibus"],
  ["CAMION","Camion"],["FOURGON","Fourgon"],["MOTO","Moto"],["AUTRE","Autre"],
];
const FUEL_TYPES    = [["ESSENCE","Essence"],["DIESEL","Diesel"],["HYBRIDE","Hybride"],["ELECTRIQUE","Électrique"],["GPL","GPL"]];
const TRANS_TYPES   = [["MANUELLE","Manuelle"],["AUTOMATIQUE","Automatique"]];
const VEHICLE_STATUS= [["DISPONIBLE","Disponible"],["EN_SERVICE","En service"],["EN_MAINTENANCE","En maintenance"],["HORS_SERVICE","Hors service"]];

// Recommandation de catégorie selon nb de passagers
function getCategorie(nb) {
  const n = parseInt(nb) || 1;
  if (n < 10)  return { cat: "TOURISME",   icon: "🚗", label: "Tourisme (< 10 places)" };
  if (n < 20)  return { cat: "UTILITAIRE", icon: "🚐", label: "Utilitaire / Minibus (10–19 places)" };
  return       { cat: "BUS",        icon: "🚌", label: `Bus (${n} places — ${Math.ceil(n/30)} bus)` };
}

const C = {
  green:"#1B5E37", greenMid:"#2D7A4F", greenLight:"#EAF4EE",
  red:"#C0182A",   redLight:"#FDF0F1",  white:"#FFFFFF", bg:"#F4F6F5",
  sidebar:"#2c6549", sideHover:"#1F4F37", sideActive:"#2D7A4F",
  border:"#E2E8E5", text:"#1A2820", textMid:"#4A6358", textLight:"#8EA99A",
  amber:"#D97706", amberLight:"#FFFBEB", blue:"#1D4ED8", blueLight:"#EFF6FF",
};

const STATUS_MAP = {
  DISPONIBLE:    {label:"Disponible",    bg:C.greenLight,  color:C.green},
  EN_SERVICE:    {label:"En service",    bg:C.amberLight,  color:C.amber},
  EN_MAINTENANCE:{label:"En maintenance",bg:C.redLight,    color:C.red  },
  HORS_SERVICE:  {label:"Hors service",  bg:"#F5F5F5",     color:"#888" },
  PENDING:       {label:"En attente",    bg:C.amberLight,  color:C.amber},
  APPROVED:      {label:"Approuvée",     bg:C.greenLight,  color:C.green},
  REJECTED:      {label:"Refusée",       bg:C.redLight,    color:C.red  },
  ACTIVE:        {label:"Actif",         bg:C.blueLight,   color:C.blue },
  COMPLETED:     {label:"Terminé",       bg:C.greenLight,  color:C.green},
};

const NAV = [
  {id:"dashboard",    label:"Tableau de bord", icon:"grid"    },
  {id:"vehicles",     label:"Véhicules",        icon:"car"     },
  {id:"reservations", label:"Réservations",     icon:"calendar"},
  {id:"maintenance",  label:"Maintenance",      icon:"tool"    },
  {id:"fuel",         label:"Carburant",        icon:"fuel"    },
  {id:"depenses",     label:"Dépenses",         icon:"money"   },
  {id:"rapports",     label:"Rapports",         icon:"chart"   },
  {id:"alertes",      label:"Alertes",          icon:"alert"   },
];

const EMPTY_VEH = {
  registration_number:"", internal_code:"", make:"", model:"",
  year: new Date().getFullYear(), color:"", category:"TOURISME",
  vehicle_type:"BERLINE", fuel_type:"DIESEL", transmission:"MANUELLE",
  seating_capacity:5, fuel_tank_capacity:"", current_mileage:"0",
  status:"DISPONIBLE", purchase_date:"", registration_date:"",
  purchase_price:"", vin_number:"", notes:"",
};

// ── Composant principal ───────────────────────────────────────────────────────
export default function DashboardGestionnaire({ onLogout }) {
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
    { label: "Véhicules disponibles",   value: `${disponibles}/${total}`, trend: "+2 depuis hier",                                            color: C.green },
    { label: "Réservations en attente", value: reservations.length,        trend: `${reservations.length} nouvelle(s)`,                       color: C.amber },
    { label: "Alertes actives",         value: maintenance.length,         trend: `${maintenance.filter(m => m.urgent).length || 0} critique(s)`, color: C.red },
    { label: "Dépenses du mois",        value: "—",                        trend: "connecter /api/v1/expenses/",                              color: C.blue  },
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
                <span style={{ display: "flex", opacity: active ? 1 : 0.65 }}><NavIcon id={n.icon} /></span>
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
            <div style={{ minWidth: 0 }}>
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
            <p style={S.pageDate}>{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative" }}>
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
          {tab === "vehicles"     && <TabVehicles vehicles={vehicles} onRefresh={loadAll} />}
          {tab === "reservations" && <TabReservations reservations={reservations} vehicles={vehicles} onRefresh={loadAll} />}
          {tab === "maintenance"  && <TabMaintenance maintenance={maintenance} />}
          {tab === "alertes"      && <TabAlertes maintenance={maintenance} />}
          {!["dashboard", "vehicles", "reservations", "maintenance", "alertes"].includes(tab) &&
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

  // Répartition par catégorie
  const byCategory = VEHICLE_CATEGORIES.map(([cat, label, icon]) => ({
    cat, label, icon,
    total:     vehicles.filter(v => v.category === cat).length,
    dispo:     vehicles.filter(v => v.category === cat && v.status === "DISPONIBLE").length,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={S.kpiGrid}>
        {kpis.map((st, i) => (
          <div key={i} style={{ ...S.kpiCard, borderLeftColor: st.color }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 10 }}>{st.label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: C.text, lineHeight: 1 }}>{st.value}</div>
            <div style={{ fontSize: 11, color: st.color, fontWeight: 600, marginTop: 8 }}>{st.trend}</div>
          </div>
        ))}
      </div>

      {/* Répartition par catégorie */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {byCategory.map(({ cat, label, icon, total: t, dispo }) => (
          <div key={cat} style={{ ...S.kpiCard, borderLeftColor: C.green, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 28 }}>{icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "1px" }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.text, lineHeight: 1, marginTop: 4 }}>{dispo}<span style={{ fontSize: 13, color: C.textLight, fontWeight: 500 }}>/{t}</span></div>
              <div style={{ fontSize: 10, color: C.green, fontWeight: 600, marginTop: 4 }}>disponibles</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {/* Réservations en attente */}
        <div style={S.section}>
          <div style={S.secHead}>
            <span style={S.secTitle}>Réservations en attente</span>
            <Chip color={C.amber}>{reservations.length}</Chip>
          </div>
          {reservations.length === 0 && <Empty text="Aucune réservation" />}
          {reservations.slice(0, 4).map((r, i) => (
            <div key={i} style={S.listItem}>
              <div style={{ ...S.miniAvatar, background: C.green }}>{(r.requester_name || "?")[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.listName}>{r.requester_name}</div>
                <div style={S.listSub}>{r.destination} · {r.number_of_passengers} pers. · {fmtDate(r.start_date)}</div>
              </div>
              <button onClick={onGoReservations}
                style={{ fontSize: 11, padding: "3px 10px", background: C.amberLight, color: C.amber, border: "none", borderRadius: 5, cursor: "pointer", fontWeight: 700 }}>
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
            { label: "Disponibles",    count: disponibles, color: C.green },
            { label: "En service",     count: enService,   color: C.amber },
            { label: "En maintenance", count: enMaint,     color: C.red   },
          ].map(row => {
            const pct = total > 0 ? Math.round(row.count / total * 100) : 0;
            return (
              <div key={row.label} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                  <span style={{ color: C.textMid, fontWeight: 500 }}>{row.label}</span>
                  <span style={{ fontWeight: 700, color: row.color }}>{row.count}</span>
                </div>
                <div style={{ height: 5, background: "#E8EDEB", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: row.color, borderRadius: 99, transition: "width .5s" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── TAB VÉHICULES ─────────────────────────────────────────────────────────────
function TabVehicles({ vehicles, onRefresh }) {
  const [search,    setSearch]    = useState("");
  const [filterSt,  setFilterSt]  = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [showForm,  setShowForm]  = useState(false);
  const [editVeh,   setEditVeh]   = useState(null);
  const [deleting,  setDeleting]  = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [formErr,   setFormErr]   = useState("");
  const [photoView, setPhotoView] = useState(null);

  const filtered = vehicles.filter(v => {
    const q  = search.toLowerCase();
    const ms = !q || [v.registration_number, v.make, v.model, v.internal_code].some(x => (x || "").toLowerCase().includes(q));
    return ms && (!filterSt || v.status === filterSt) && (!filterCat || v.category === filterCat);
  });

  const openAdd  = () => { setEditVeh(null); setShowForm(true); setFormErr(""); };
  const openEdit = (v) => { setEditVeh(v);   setShowForm(true); setFormErr(""); };
  const closeForm= () => { setShowForm(false); setEditVeh(null); setFormErr(""); };

  const handleSave = async (data, photoFile) => {
    setSaving(true); setFormErr("");
    try {
      let saved;
      if (editVeh) {
        saved = await apiFetch(`/vehicles/${editVeh.id}/`, { method: "PATCH", body: JSON.stringify(data) });
      } else {
        saved = await apiFetch("/vehicles/", { method: "POST", body: JSON.stringify(data) });
      }
      if (photoFile && saved?.id) {
        const fd = new FormData(); fd.append("photo", photoFile);
        await apiUpload(`/vehicles/${saved.id}/`, fd, "PATCH");
      }
      closeForm(); onRefresh();
    } catch (e) { setFormErr("Erreur : " + e.message); }
    finally     { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce véhicule ?")) return;
    setDeleting(id);
    try { await apiFetch(`/vehicles/${id}/`, { method: "DELETE" }); onRefresh(); }
    catch (e) { alert("Erreur : " + e.message); }
    finally   { setDeleting(null); }
  };

  const getPhotoUrl = (v) => {
    if (!v.photo) return null;
    return v.photo.startsWith("http") ? v.photo : `http://localhost:8000${v.photo}`;
  };

  return (
    <>
      {photoView && (
        <div style={M.overlay} onClick={() => setPhotoView(null)}>
          <div style={{ position: "relative" }}>
            <img src={photoView} alt="Véhicule"
              style={{ maxWidth: "80vw", maxHeight: "80vh", borderRadius: 12, objectFit: "contain", display: "block" }} />
            <button onClick={() => setPhotoView(null)}
              style={{ position: "absolute", top: -12, right: -12, width: 32, height: 32, borderRadius: "50%", background: C.red, color: "#fff", border: "none", fontSize: 16, cursor: "pointer", fontWeight: 700 }}>✕</button>
          </div>
        </div>
      )}

      {showForm && <VehicleModal initial={editVeh} onSave={handleSave} onClose={closeForm} saving={saving} error={formErr} />}

      <div style={S.section}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <span style={S.secTitle}>
            Parc automobile — <b style={{ color: C.green }}>{vehicles.length}</b> véhicule{vehicles.length !== 1 ? "s" : ""}
          </span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} style={S.search} />

            {/* Filtre catégorie */}
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setFilterCat("")}
                style={{ ...S.filterPill, ...(filterCat === "" ? S.filterPillOn : {}) }}>
                Tous
              </button>
              {VEHICLE_CATEGORIES.map(([cat, label, icon]) => (
                <button key={cat} onClick={() => setFilterCat(filterCat === cat ? "" : cat)}
                  style={{ ...S.filterPill, ...(filterCat === cat ? S.filterPillOn : {}) }}>
                  {icon} {label}
                </button>
              ))}
            </div>

            {/* Filtre statut */}
            <select value={filterSt} onChange={e => setFilterSt(e.target.value)} style={{ ...S.search, width: 150 }}>
              <option value="">Tous statuts</option>
              {VEHICLE_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>

            <button onClick={openAdd} style={S.btn} className="btn-primary">+ Ajouter</button>
          </div>
        </div>

        {/* Compteurs par catégorie */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          {VEHICLE_CATEGORIES.map(([cat, label, icon]) => {
            const total = vehicles.filter(v => v.category === cat).length;
            const dispo = vehicles.filter(v => v.category === cat && v.status === "DISPONIBLE").length;
            return (
              <div key={cat} onClick={() => setFilterCat(filterCat === cat ? "" : cat)}
                style={{ padding: "6px 14px", borderRadius: 8, background: filterCat === cat ? C.greenLight : C.bg, border: `1.5px solid ${filterCat === cat ? C.green : C.border}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{label}</div>
                  <div style={{ fontSize: 10, color: C.textLight }}>{dispo} dispo / {total}</div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0
          ? <Empty text="Aucun véhicule trouvé" />
          : <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>{["Photo", "Immatriculation", "Code", "Catégorie", "Marque / Modèle", "Places", "Kilométrage", "Statut", "Actions"].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filtered.map(v => {
                  const photoUrl = getPhotoUrl(v);
                  const catInfo  = VEHICLE_CATEGORIES.find(([c]) => c === v.category);
                  return (
                    <tr key={v.id} className="tr-row">
                      <td style={S.td}>
                        {photoUrl
                          ? <img src={photoUrl} alt="" onClick={() => setPhotoView(photoUrl)}
                            style={{ width: 44, height: 36, objectFit: "cover", borderRadius: 6, cursor: "pointer", border: `1px solid ${C.border}` }} />
                          : <div style={{ width: 44, height: 36, borderRadius: 6, background: C.bg, border: `1px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                            {catInfo?.[2] ?? "🚗"}
                          </div>
                        }
                      </td>
                      <td style={S.td}><b style={{ color: C.text }}>{v.registration_number}</b></td>
                      <td style={S.td}><span style={S.typeBadge}>{v.internal_code}</span></td>
                      <td style={S.td}>
                        <span style={{ fontSize: 13 }}>{catInfo?.[2]}</span>
                        <span style={{ fontSize: 11, color: C.textMid, marginLeft: 4 }}>{catInfo?.[1] ?? v.category}</span>
                      </td>
                      <td style={S.td}>{v.make} {v.model}</td>
                      <td style={S.td}>{v.seating_capacity} pl.</td>
                      <td style={S.td}>{Number(v.current_mileage || 0).toLocaleString("fr-FR")} km</td>
                      <td style={S.td}><StatusBadge status={v.status} /></td>
                      <td style={S.td}>
                        <div style={{ display: "flex", gap: 5 }}>
                          {photoUrl && (
                            <button onClick={() => setPhotoView(photoUrl)}
                              style={{ padding: "4px 9px", border: "none", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "#F0FDF4", color: C.green, fontFamily: "inherit" }}>
                              👁 Photo
                            </button>
                          )}
                          <button onClick={() => openEdit(v)}
                            style={{ padding: "4px 9px", border: "none", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer", background: C.blueLight, color: C.blue, fontFamily: "inherit" }}>
                            Modifier
                          </button>
                          <button onClick={() => handleDelete(v.id)} disabled={deleting === v.id}
                            style={{ padding: "4px 9px", border: "none", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer", background: C.redLight, color: C.red, fontFamily: "inherit", opacity: deleting === v.id ? 0.6 : 1 }}>
                            {deleting === v.id ? "…" : "Suppr."}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        }
      </div>
    </>
  );
}

// ── MODAL VÉHICULE ────────────────────────────────────────────────────────────
function VehicleModal({ initial, onSave, onClose, saving, error }) {
  const isEdit  = !!initial;
  const fileRef = useRef(null);
  const [photoFile,    setPhotoFile]    = useState(null);
  const [photoPreview, setPhotoPreview] = useState(
    initial?.photo
      ? (initial.photo.startsWith("http") ? initial.photo : `http://localhost:8000${initial.photo}`)
      : null
  );
  const [form, setForm] = useState(initial ? {
    registration_number: initial.registration_number || "",
    internal_code:       initial.internal_code       || "",
    make:                initial.make                || "",
    model:               initial.model               || "",
    year:                initial.year                || new Date().getFullYear(),
    color:               initial.color               || "",
    category:            initial.category            || "TOURISME",
    vehicle_type:        initial.vehicle_type        || "BERLINE",
    fuel_type:           initial.fuel_type           || "DIESEL",
    transmission:        initial.transmission        || "MANUELLE",
    seating_capacity:    initial.seating_capacity    || 5,
    fuel_tank_capacity:  initial.fuel_tank_capacity  || "",
    current_mileage:     initial.current_mileage     || "0",
    status:              initial.status              || "DISPONIBLE",
    purchase_date:       initial.purchase_date       || "",
    registration_date:   initial.registration_date   || "",
    purchase_price:      initial.purchase_price      || "",
    vin_number:          initial.vin_number          || "",
    notes:               initial.notes               || "",
  } : { ...EMPTY_VEH });

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // Auto-suggestion catégorie selon nb de places
  useEffect(() => {
    const nb = parseInt(form.seating_capacity) || 1;
    const suggested = nb < 10 ? "TOURISME" : nb < 20 ? "UTILITAIRE" : "BUS";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(f => ({ ...f, category: suggested }));
  }, [form.seating_capacity]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setPhotoFile(file);
    const r = new FileReader();
    r.onload = ev => setPhotoPreview(ev.target.result);
    r.readAsDataURL(file);
  };

  const handleSubmit = e => {
    e.preventDefault();
    const clean = { ...form };
    ["purchase_date", "registration_date", "purchase_price", "vin_number"].forEach(k => { if (clean[k] === "") delete clean[k]; });
    onSave(clean, photoFile);
  };

  return (
    <div style={M.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={M.modal}>
        <div style={M.header}>
          <span style={M.title}>{isEdit ? `Modifier — ${initial.registration_number}` : "Ajouter un véhicule"}</span>
          <button onClick={onClose} style={M.closeBtn}>✕</button>
        </div>
        {error && <div style={M.errorBar}>{error}</div>}
        <form onSubmit={handleSubmit} style={M.body}>

          {/* Photo */}
          <div style={M.secTitle}>Photo du véhicule</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 120, height: 80, borderRadius: 8, overflow: "hidden", border: `1.5px dashed ${C.border}`, background: C.bg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              onClick={() => fileRef.current?.click()}>
              {photoPreview
                ? <img src={photoPreview} alt="Aperçu" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ textAlign: "center", color: C.textLight }}><div style={{ fontSize: 28 }}>📷</div><div style={{ fontSize: 10, marginTop: 4 }}>Cliquer</div></div>
              }
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button type="button" onClick={() => fileRef.current?.click()} style={{ ...S.btn, fontSize: 11, padding: "6px 14px" }}>
                {photoPreview ? "Changer" : "Téléverser"}
              </button>
              {photoPreview &&
                <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                  style={{ ...S.ghostBtn, fontSize: 11, padding: "6px 14px", color: C.red, borderColor: "#fca5a5" }}>
                  Supprimer
                </button>}
              <div style={{ fontSize: 10, color: C.textLight }}>JPG, PNG · max 5 Mo</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
          </div>

          {/* ── CATÉGORIE — choix visuel ── */}
          <div style={M.secTitle}>Catégorie du véhicule</div>
          <div style={{ display: "flex", gap: 10 }}>
            {VEHICLE_CATEGORIES.map(([cat, label, icon]) => (
              <button key={cat} type="button"
                onClick={() => setForm(f => ({ ...f, category: cat }))}
                style={{
                  flex: 1, padding: "14px 10px", borderRadius: 10, cursor: "pointer",
                  border: `2px solid ${form.category === cat ? C.green : C.border}`,
                  background: form.category === cat ? C.greenLight : C.bg,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  transition: "all .15s",
                }}>
                <span style={{ fontSize: 28 }}>{icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: form.category === cat ? C.green : C.textMid }}>{label}</span>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: C.textLight, marginTop: 4 }}>
            💡 La catégorie est suggérée automatiquement selon le nombre de places.
          </div>

          {/* Identification */}
          <div style={M.secTitle}>Identification</div>
          <div style={M.grid2}>
            <Fld label="Immatriculation *" required value={form.registration_number} onChange={set("registration_number")} placeholder="Ex: LT 001 07" />
            <Fld label="Code interne *"    required value={form.internal_code}       onChange={set("internal_code")}       placeholder="Ex: VH-001" />
          </div>

          {/* Caractéristiques */}
          <div style={M.secTitle}>Caractéristiques</div>
          <div style={M.grid2}>
            <Fld label="Marque *"  required value={form.make}  onChange={set("make")}  placeholder="Toyota" />
            <Fld label="Modèle *"  required value={form.model} onChange={set("model")} placeholder="Corolla" />
            <Fld label="Année *"   required value={form.year}  onChange={set("year")}  type="number" min="1990" max="2030" />
            <Fld label="Couleur *" required value={form.color} onChange={set("color")} placeholder="Blanc" />
          </div>
          <div style={M.grid3}>
            <Sel label="Type *"         value={form.vehicle_type} onChange={set("vehicle_type")} opts={VEHICLE_TYPES} />
            <Sel label="Carburant *"    value={form.fuel_type}    onChange={set("fuel_type")}    opts={FUEL_TYPES} />
            <Sel label="Transmission *" value={form.transmission} onChange={set("transmission")} opts={TRANS_TYPES} />
          </div>

          {/* Capacités */}
          <div style={M.secTitle}>Capacités & Kilométrage</div>
          <div style={M.grid3}>
            <Fld label="Nb places *"    required value={form.seating_capacity}   onChange={set("seating_capacity")}   type="number" min="1" />
            <Fld label="Réservoir (L)*" required value={form.fuel_tank_capacity} onChange={set("fuel_tank_capacity")} type="number" step="0.01" />
            <Fld label="Kilométrage"             value={form.current_mileage}     onChange={set("current_mileage")}    type="number" step="0.01" />
          </div>

          {/* Statut & Dates */}
          <div style={M.secTitle}>Statut & Dates</div>
          <div style={M.grid2}>
            <Sel label="Statut *" value={form.status} onChange={set("status")} opts={VEHICLE_STATUS} />
            <Fld label="N° VIN"   value={form.vin_number}        onChange={set("vin_number")}        placeholder="17 caractères" maxLength={17} />
            <Fld label="Date d'achat"           value={form.purchase_date}     onChange={set("purchase_date")}     type="date" />
            <Fld label="Date d'immatriculation" value={form.registration_date} onChange={set("registration_date")} type="date" />
            <Fld label="Prix d'achat (FCFA)"    value={form.purchase_price}    onChange={set("purchase_price")}    type="number" step="0.01" />
          </div>

          <div style={M.secTitle}>Notes</div>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
            placeholder="Remarques…"
            style={{ ...S.search, width: "100%", resize: "vertical", fontFamily: "inherit", fontSize: 12, padding: "8px 12px" }} />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            <button type="button" onClick={onClose} style={S.ghostBtn}>Annuler</button>
            <button type="submit" disabled={saving} style={{ ...S.btn, opacity: saving ? 0.7 : 1 }}>
              {saving ? "Enregistrement…" : isEdit ? "Modifier" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── MODAL APPROBATION ─────────────────────────────────────────────────────────
function ModalApprobation({ reservation, onClose, onDone }) {
  const nb       = reservation.number_of_passengers || 1;
  const reco     = getCategorie(nb);

  const [vehicles,  setVehicles]  = useState([]);
  const [drivers,   setDrivers]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selectedV, setSelectedV] = useState(null);
  const [selectedD, setSelectedD] = useState(null);
  const [submitting,setSubmitting]= useState(false);
  const [filterCat, setFilterCat] = useState(reco.cat);
  const [error,     setError]     = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [v, d] = await Promise.all([
          apiFetch("/vehicles/?status=DISPONIBLE"),
          apiFetch("/users/?role=CHAUFFEUR&is_active=true"),
        ]);
        setVehicles(Array.isArray(v) ? v : v?.results ?? []);
        setDrivers(Array.isArray(d) ? d : d?.results ?? []);
      } catch (e) {
        setError("Impossible de charger les véhicules/chauffeurs : " + e.message);
      } finally { setLoading(false); }
    })();
  }, []);

  const filteredVeh = filterCat
    ? vehicles.filter(v => v.category === filterCat)
    : vehicles;

  const handleApprove = async () => {
    setError("");
    setSubmitting(true);
    try {
      const body = {};
      if (selectedV) body.vehicle = selectedV;
      if (selectedD) body.driver  = selectedD;
      await apiFetch(`/reservations/${reservation.id}/approve/`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      onDone();
    } catch (e) {
      setError("Erreur : " + e.message);
    } finally { setSubmitting(false); }
  };

  return (
    <div style={M.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...M.modal, maxWidth: 700 }}>
        <div style={M.header}>
          <div>
            <div style={M.title}>Approuver la réservation #{reservation.id}</div>
            <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>
              {reservation.requester_name} · {reservation.destination} · {nb} personne(s)
            </div>
          </div>
          <button onClick={onClose} style={M.closeBtn}>✕</button>
        </div>

        {error && <div style={M.errorBar}>{error}</div>}

        <div style={{ overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Résumé de la demande */}
          <div style={{ background: C.amberLight, borderRadius: 9, padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              ["📍 Destination", reservation.destination],
              ["🎯 Motif",       reservation.purpose],
              ["📅 Départ",      fmtDate(reservation.start_date)],
              ["🏁 Retour",      fmtDate(reservation.end_date)],
              ["👥 Passagers",   `${nb} pers. → ${reco.icon} ${reco.label}`],
              reservation.estimated_distance && ["📐 Distance", `${reservation.estimated_distance} km`],
            ].filter(Boolean).map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: 10, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{val}</div>
              </div>
            ))}
          </div>

          {/* ── SÉLECTION VÉHICULE ── */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>
              1. Assigner un véhicule
              <span style={{ fontSize: 11, fontWeight: 400, color: C.textLight, marginLeft: 8 }}>
                (recommandé : {reco.icon} {reco.label})
              </span>
            </div>

            {/* Filtres catégorie */}
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              <button onClick={() => setFilterCat("")}
                style={{ ...S.filterPill, ...(filterCat === "" ? S.filterPillOn : {}) }}>
                Tous ({vehicles.length})
              </button>
              {VEHICLE_CATEGORIES.map(([cat, label, icon]) => {
                const count = vehicles.filter(v => v.category === cat).length;
                return (
                  <button key={cat} onClick={() => setFilterCat(cat)}
                    style={{
                      ...S.filterPill,
                      ...(filterCat === cat ? S.filterPillOn : {}),
                      ...(cat === reco.cat ? { border: `1.5px solid ${C.amber}` } : {}),
                    }}>
                    {icon} {label} ({count})
                    {cat === reco.cat && <span style={{ marginLeft: 4, fontSize: 9, color: C.amber, fontWeight: 800 }}>✓ recommandé</span>}
                  </button>
                );
              })}
            </div>

            {loading
              ? <div style={{ textAlign: "center", padding: 24, color: C.textLight }}>Chargement…</div>
              : filteredVeh.length === 0
                ? <div style={{ textAlign: "center", padding: 24, color: C.red, fontSize: 13 }}>
                    Aucun véhicule disponible dans cette catégorie.
                  </div>
                : <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: 220, overflowY: "auto" }}>
                  {filteredVeh.map(v => {
                    const catInfo = VEHICLE_CATEGORIES.find(([c]) => c === v.category);
                    const sel     = selectedV === v.id;
                    return (
                      <div key={v.id} onClick={() => setSelectedV(sel ? null : v.id)}
                        style={{
                          padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                          border: `2px solid ${sel ? C.green : C.border}`,
                          background: sel ? C.greenLight : C.bg,
                          display: "flex", alignItems: "center", gap: 10,
                          transition: "all .15s",
                        }}>
                        <span style={{ fontSize: 22 }}>{catInfo?.[2] ?? "🚗"}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{v.registration_number}</div>
                          <div style={{ fontSize: 11, color: C.textMid }}>{v.make} {v.model} · {v.seating_capacity} pl.</div>
                          <div style={{ fontSize: 10, color: C.textLight }}>{catInfo?.[1]} · {Number(v.current_mileage || 0).toLocaleString("fr-FR")} km</div>
                        </div>
                        {sel && <span style={{ color: C.green, fontWeight: 800, fontSize: 16 }}>✓</span>}
                      </div>
                    );
                  })}
                </div>
            }
          </div>

          {/* ── SÉLECTION CHAUFFEUR ── */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>
              2. Assigner un chauffeur
              <span style={{ fontSize: 11, fontWeight: 400, color: C.textLight, marginLeft: 8 }}>
                (optionnel — peut être fait plus tard)
              </span>
            </div>

            {loading
              ? <div style={{ textAlign: "center", padding: 16, color: C.textLight }}>Chargement…</div>
              : drivers.length === 0
                ? <div style={{ textAlign: "center", padding: 20, color: C.amber, fontSize: 13, background: C.amberLight, borderRadius: 8 }}>
                    Aucun chauffeur disponible pour le moment.
                    <div style={{ fontSize: 11, color: C.textLight, marginTop: 4 }}>Vous pouvez approuver sans chauffeur et l'assigner plus tard.</div>
                  </div>
                : <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: 180, overflowY: "auto" }}>
                  {drivers.map(d => {
                    const sel = selectedD === d.id;
                    return (
                      <div key={d.id} onClick={() => setSelectedD(sel ? null : d.id)}
                        style={{
                          padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                          border: `2px solid ${sel ? C.green : C.border}`,
                          background: sel ? C.greenLight : C.bg,
                          display: "flex", alignItems: "center", gap: 10,
                          transition: "all .15s",
                        }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.green, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                          {d.first_name?.[0]}{d.last_name?.[0]}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{d.full_name || `${d.first_name} ${d.last_name}`}</div>
                          <div style={{ fontSize: 11, color: C.textMid }}>{d.phone || "—"}</div>
                          {d.driver_profile && (
                            <div style={{ fontSize: 10, color: C.textLight }}>
                              Permis {d.driver_profile.license_category} · {d.driver_profile.years_of_experience} ans
                            </div>
                          )}
                        </div>
                        {sel && <span style={{ color: C.green, fontWeight: 800, fontSize: 16 }}>✓</span>}
                      </div>
                    );
                  })}
                </div>
            }
          </div>

          {/* Résumé sélection */}
          {(selectedV || selectedD) && (
            <div style={{ background: C.greenLight, borderRadius: 8, padding: "12px 14px", fontSize: 12, color: C.green, fontWeight: 600 }}>
              ✓ Sélection :
              {selectedV && ` Véhicule ${vehicles.find(v => v.id === selectedV)?.registration_number}`}
              {selectedV && selectedD && " · "}
              {selectedD && ` Chauffeur ${drivers.find(d => d.id === selectedD)?.full_name || ""}`}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={onClose} style={S.ghostBtn}>Annuler</button>
          <button onClick={handleApprove} disabled={submitting}
            style={{ ...S.btn, opacity: submitting ? 0.7 : 1, minWidth: 140 }}>
            {submitting ? "Envoi…" : selectedV ? "✓ Approuver avec véhicule" : "✓ Approuver sans véhicule"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TAB RÉSERVATIONS ──────────────────────────────────────────────────────────
function TabReservations({ reservations, vehicles, onRefresh }) {
  const [actioning,    setActioning]    = useState(null);
  const [rejectModal,  setRejectModal]  = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approveModal, setApproveModal] = useState(null);
  const [allRes,       setAllRes]       = useState([]);
  const [filterSt,     setFilterSt]     = useState("EN_ATTENTE");
  const [loadingAll,   setLoadingAll]   = useState(false);

  const loadRes = useCallback(async () => {
    setLoadingAll(true);
    try {
      const r = await apiFetch("/reservations/");
      setAllRes(Array.isArray(r) ? r : r?.results ?? []);
    } catch { setAllRes(reservations); }
    finally { setLoadingAll(false); }
  }, [reservations]);

  useEffect(() => { loadRes(); }, [loadRes]);

  const FILTERS = [
    { value: "EN_ATTENTE", label: "En attente", color: C.amber   },
    { value: "APPROUVEE",  label: "Approuvées", color: C.green   },
    { value: "REJETEE",    label: "Refusées",   color: C.red     },
    { value: "",           label: "Toutes",     color: C.textMid },
  ];

  const displayed = filterSt ? allRes.filter(r => r.status === filterSt) : allRes;

  const handleReject = async () => {
    if (!rejectReason.trim()) { alert("Veuillez indiquer un motif."); return; }
    setActioning(rejectModal);
    try {
      await apiFetch(`/reservations/${rejectModal}/reject/`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason }),
      });
      setRejectModal(null);
      await loadRes(); onRefresh();
    } catch (e) { alert("Erreur : " + e.message); }
    finally     { setActioning(null); }
  };

  const stMap = {
    EN_ATTENTE: { label: "En attente", bg: C.amberLight, color: C.amber },
    APPROUVEE:  { label: "Approuvée",  bg: C.greenLight, color: C.green },
    REJETEE:    { label: "Refusée",    bg: C.redLight,   color: C.red   },
    EN_COURS:   { label: "En cours",   bg: C.blueLight,  color: C.blue  },
    TERMINEE:   { label: "Terminée",   bg: C.greenLight, color: C.green },
    ANNULEE:    { label: "Annulée",    bg: "#F5F5F5",    color: "#888"  },
  };

  return (
    <>
      {/* Modal motif refus */}
      {rejectModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: C.white, borderRadius: 12, padding: 24, width: 440, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>Motif du refus</div>
            <textarea autoFocus value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Expliquez pourquoi la demande est refusée…" rows={4}
              style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", color: C.text }} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
              <button onClick={() => setRejectModal(null)} style={S.ghostBtn}>Annuler</button>
              <button onClick={handleReject} disabled={actioning === rejectModal}
                style={{ ...S.btn, background: C.red, opacity: actioning === rejectModal ? 0.6 : 1 }}>
                {actioning === rejectModal ? "Envoi…" : "Confirmer le refus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal approbation */}
      {approveModal && (
        <ModalApprobation
          reservation={approveModal}
          onClose={() => setApproveModal(null)}
          onDone={async () => {
            setApproveModal(null);
            await loadRes();
            onRefresh();
          }}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Filtres */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => setFilterSt(f.value)}
              style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "none", background: filterSt === f.value ? f.color : C.bg, color: filterSt === f.value ? "#fff" : C.textMid, transition: "all .15s" }}>
              {f.label}
              <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, background: filterSt === f.value ? "rgba(255,255,255,0.3)" : f.color + "20", color: filterSt === f.value ? "#fff" : f.color, padding: "1px 6px", borderRadius: 99 }}>
                {f.value ? allRes.filter(r => r.status === f.value).length : allRes.length}
              </span>
            </button>
          ))}
        </div>

        {/* Cartes */}
        {loadingAll
          ? <div style={S.section}><Empty text="Chargement…" icon="⏳" /></div>
          : displayed.length === 0
            ? <div style={S.section}><Empty text="Aucune réservation dans cette catégorie" /></div>
            : displayed.map(r => {
              const st  = stMap[r.status] || { label: r.status, bg: "#F5F5F5", color: "#888" };
              const nb  = r.number_of_passengers || 1;
              const rec = getCategorie(nb);
              return (
                <div key={r.id} style={{ ...S.resCard, borderLeft: `3px solid ${st.color}`, opacity: actioning === r.id ? 0.6 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ ...S.miniAvatar, width: 40, height: 40, fontSize: 15, background: C.green }}>
                        {(r.requester_name || "?")[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{r.requester_name || "—"}</div>
                        <div style={{ fontSize: 11, color: C.textLight }}>{r.requester_role || "Personnel"}</div>
                      </div>
                    </div>
                    <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.color, display: "inline-block" }} />
                      {st.label}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    {[
                      ["📍", "Destination", r.destination || "—"],
                      ["🎯", "Motif",       r.purpose     || "—"],
                      ["📅", "Départ",      fmtDate(r.start_date)],
                      ["🏁", "Retour",      fmtDate(r.end_date)],
                      ["👥", "Passagers",   `${nb} pers. → ${rec.icon} ${rec.label}`],
                      r.estimated_distance && ["📐", "Distance", `${r.estimated_distance} km`],
                    ].filter(Boolean).map(([icon, label, value]) => (
                      <div key={label}>
                        <span style={{ fontSize: 10, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.8px" }}>{icon} {label}</span>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {r.notes && (
                    <div style={{ fontSize: 11, color: C.textMid, background: C.bg, borderRadius: 7, padding: "8px 10px", marginBottom: 10 }}>
                      📝 {r.notes}
                    </div>
                  )}

                  {r.vehicle_name && r.vehicle_name !== "Non assigné" && (
                    <div style={{ fontSize: 11, color: C.green, marginBottom: 8 }}>
                      🚗 Véhicule assigné : {r.vehicle_name}
                    </div>
                  )}
                  {r.driver_name && (
                    <div style={{ fontSize: 11, color: C.green, marginBottom: 8 }}>
                      👤 Chauffeur : {r.driver_name}
                    </div>
                  )}
                  {r.rejection_reason && (
                    <div style={{ fontSize: 11, color: C.red, background: C.redLight, borderRadius: 7, padding: "8px 10px", marginBottom: 10 }}>
                      ❌ Motif de refus : {r.rejection_reason}
                    </div>
                  )}
                  {r.approved_by_name && (
                    <div style={{ fontSize: 11, color: C.green, marginBottom: 8 }}>
                      ✅ Traité par : {r.approved_by_name}
                    </div>
                  )}

                  {r.status === "EN_ATTENTE" && (
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <button disabled={actioning === r.id}
                        onClick={() => setApproveModal(r)}
                        style={{ ...S.btn, opacity: actioning === r.id ? 0.6 : 1 }}>
                        ✓ Approuver & Assigner
                      </button>
                      <button disabled={actioning === r.id}
                        onClick={() => { setRejectModal(r.id); setRejectReason(""); }}
                        style={{ ...S.ghostBtn, color: C.red, borderColor: "#fca5a5", opacity: actioning === r.id ? 0.6 : 1 }}>
                        ✕ Refuser
                      </button>
                    </div>
                  )}
                </div>
              );
            })
        }
      </div>
    </>
  );
}

// ── AUTRES TABS ───────────────────────────────────────────────────────────────
function TabMaintenance({ maintenance }) {
  return (
    <div style={S.section}>
      <div style={{ ...S.secHead, marginBottom: 16 }}>
        <span style={S.secTitle}>Maintenances actives — {maintenance.length}</span>
      </div>
      {maintenance.length === 0 && <Empty text="Aucune maintenance active" />}
      {maintenance.map((m, i) => (
        <div key={i} style={{ ...S.alertItem, borderLeft: `3px solid ${m.urgent ? C.red : C.amber}` }}>
          <div style={{ ...S.dot, background: m.urgent ? C.red : C.amber }} />
          <div style={{ flex: 1 }}>
            <div style={S.alertTitle}>{m.type || m.maintenance_type} — {m.vehicle_name || m.vehicle?.registration_number}</div>
            <div style={S.alertDesc}>{m.description}</div>
            <div style={{ fontSize: 11, color: C.textLight, marginTop: 4 }}>Prévu le {fmtDate(m.scheduled_date)}</div>
          </div>
          <StatusBadge status={m.status || "ACTIVE"} />
        </div>
      ))}
    </div>
  );
}

function TabAlertes({ maintenance }) {
  return (
    <div style={S.section}>
      <div style={{ ...S.secHead, marginBottom: 16 }}>
        <span style={S.secTitle}>Toutes les alertes</span>
        <Chip color={C.red}>{maintenance.length}</Chip>
      </div>
      {maintenance.length === 0 && <Empty text="Aucune alerte" />}
      {maintenance.map((m, i) => (
        <div key={i} style={S.alertItem}>
          <div style={{ ...S.dot, background: C.red }} />
          <div style={{ flex: 1 }}>
            <div style={S.alertTitle}>{m.type || m.maintenance_type} — {m.vehicle_name || m.vehicle?.registration_number}</div>
            <div style={S.alertDesc}>{m.description}</div>
          </div>
          <span style={{ fontSize: 11, color: C.textLight }}>{fmtDate(m.scheduled_date)}</span>
        </div>
      ))}
    </div>
  );
}

function Placeholder({ label }) {
  return <div style={S.section}><Empty text={`Module "${label}" — à connecter`} icon="🔌" /></div>;
}

// ── COMPOSANTS UI ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const m = STATUS_MAP[status] || { label: status, bg: "#F5F5F5", color: "#888" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: m.bg, color: m.color }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: m.color, display: "inline-block" }} />
      {m.label}
    </span>
  );
}
function Chip({ color, children }) { return <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: color + "1A", color }}>{children}</span>; }
function Empty({ text, icon = "📭" }) { return (<div style={{ textAlign: "center", padding: "48px 0", color: C.textLight }}><div style={{ fontSize: 36, marginBottom: 8 }}>{icon}</div><div style={{ fontSize: 13 }}>{text}</div></div>); }
function Loader() { return (<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: C.bg, flexDirection: "column", gap: 14 }}><div style={{ width: 32, height: 32, border: `3px solid ${C.green}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin .8s linear infinite" }} /><div style={{ fontSize: 11, color: C.textLight, letterSpacing: "2px", textTransform: "uppercase" }}>Chargement</div></div>); }
function Fld({ label, value, onChange, required, type = "text", placeholder, ...rest }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: C.textMid, textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</label>
      <input type={type} value={value} onChange={onChange} required={required} placeholder={placeholder} style={{ ...S.search, width: "100%" }} {...rest} />
    </div>
  );
}
function Sel({ label, value, onChange, opts }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: C.textMid, textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</label>
      <select value={value} onChange={onChange} style={{ ...S.search, width: "100%" }}>
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}
function IUCLogo() { return (<div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg width="28" height="28" viewBox="0 0 52 52" fill="none"><path d="M7 34L16 18Q18 13 22 13H30Q34 13 36 18L45 34" stroke="white" strokeWidth="3" strokeLinecap="round" /><rect x="5" y="32" width="42" height="12" rx="6" fill="white" opacity=".92" /><circle cx="15" cy="44" r="5.5" fill={C.red} /><circle cx="37" cy="44" r="5.5" fill={C.red} /><circle cx="15" cy="44" r="2.5" fill="white" /><circle cx="37" cy="44" r="2.5" fill="white" /></svg></div>); }
function NavIcon({ id }) { const p = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" }; switch (id) { case "grid": return <svg {...p}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>; case "car": return <svg {...p}><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h11l4 4v4a2 2 0 0 1-2 2h-1" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></svg>; case "calendar": return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>; case "tool": return <svg {...p}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>; case "fuel": return <svg {...p}><path d="M3 22V8l6-6 6 6v14" /><line x1="3" y1="22" x2="21" y2="22" /><line x1="9" y1="22" x2="9" y2="12" /><rect x="6" y="12" width="6" height="4" /></svg>; case "money": return <svg {...p}><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>; case "chart": return <svg {...p}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>; case "alert": return <svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>; default: return <svg {...p}><circle cx="12" cy="12" r="10" /></svg>; } }
function BellIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>; }
function LogoutIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>; }
function fmtDate(d) { if (!d) return "—"; return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }); }

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  shell: { display: "flex", height: "100vh", width: "100vw", fontFamily: "'Inter',-apple-system,sans-serif", background: C.bg, overflow: "hidden" },
  sidebar: { width: 224, background: C.sidebar, display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" },
  brand: { display: "flex", alignItems: "center", gap: 11, padding: "20px 16px 16px" },
  brandText: { minWidth: 0 }, brandName: { fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "2px" },
  brandSub: { fontSize: 9, color: "rgba(236,232,232,0.45)", marginTop: 2, lineHeight: 1.4 },
  divider: { height: 1, background: "rgba(255,255,255,.08)", margin: "0 14px" },
  nav: { flex: 1, padding: "10px 10px", overflowY: "auto" },
  navItem: { display: "flex", alignItems: "center", gap: 15, width: "100%", padding: "8px 10px", borderRadius: 7, border: "none", cursor: "pointer", color: "rgba(255,255,255,.65)", marginBottom: 18, textAlign: "left", background: "transparent", fontFamily: "inherit", position: "relative", transition: "all .12s" },
  navActive: { background: C.sideActive, color: "#fff", fontWeight: 600 },
  navLabel: { fontSize: 12.5, flex: 1 },
  navPip: { position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 16, background: "#fff", borderRadius: 99 },
  navBadge: { background: C.red, color: "#fff", borderRadius: 99, fontSize: 9, fontWeight: 800, width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" },
  sideBottom: { padding: "10px 10px 16px" },
  sideUser: { display: "flex", alignItems: "center", gap: 9, padding: "10px 6px 12px" },
  sideAvatar: { width: 32, height: 32, borderRadius: "50%", background: C.greenMid, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11, flexShrink: 0 },
  sideUserName: { fontSize: 12, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  sideUserRole: { fontSize: 10, color: "rgba(255,255,255,.45)" },
  logoutBtn: { display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", borderRadius: 7, border: "none", cursor: "pointer", background: "rgba(192,24,42,0.25)", color: "rgba(255,255,255,.75)", fontSize: 12, fontFamily: "inherit", transition: "all .12s" },
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 },
  topbar: { background: C.white, borderBottom: `1px solid ${C.border}`, padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 },
  pageTitle: { fontSize: 24, fontWeight: 760, color: C.text, letterSpacing: "-.4px", margin: 0 },
  pageDate: { fontSize: 11, color: C.textLight, marginTop: 2 },
  iconBtn: { width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textMid },
  badge: { position: "absolute", top: -5, right: -5, background: C.red, color: "#fff", borderRadius: 99, fontSize: 9, fontWeight: 800, width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" },
  userChip: { display: "flex", alignItems: "center", gap: 9 },
  topAvatar: { width: 34, height: 34, borderRadius: "50%", background: C.green, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 },
  topName: { fontSize: 13, fontWeight: 700, color: C.text },
  topRole: { fontSize: 10, color: C.textLight, textTransform: "uppercase", letterSpacing: "1px" },
  content: { flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 0 },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 },
  kpiCard: { background: C.white, borderRadius: 10, padding: "16px 18px", borderLeft: "3px solid transparent", boxShadow: "0 1px 3px rgba(0,0,0,.05)" },
  section: { background: C.white, borderRadius: 10, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,.05)" },
  secHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  secTitle: { fontSize: 13, fontWeight: 700, color: C.text },
  alertItem: { display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderBottom: `1px solid ${C.border}` },
  alertTitle: { fontSize: 13, fontWeight: 700, color: C.text },
  alertDesc: { fontSize: 12, color: C.textMid, marginTop: 2, lineHeight: 1.5 },
  dot: { width: 9, height: 9, borderRadius: "50%", flexShrink: 0, marginTop: 4 },
  listItem: { display: "flex", alignItems: "center", gap: 15, padding: "10px 0", borderBottom: `1px solid ${C.border}` },
  listName: { fontSize: 13, fontWeight: 600, color: C.text },
  listSub: { fontSize: 11, color: C.textLight, marginTop: 1 },
  miniAvatar: { width: 32, height: 32, borderRadius: "50%", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 },
  resCard: { background: "#FAFBFA", border: `1px solid ${C.border}`, borderRadius: 9, padding: "14px 16px" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "8px 12px", fontSize: 10, letterSpacing: "1.5px", textTransform: "uppercase", color: C.textLight, fontWeight: 700, borderBottom: `1.5px solid ${C.border}`, whiteSpace: "nowrap" },
  td: { padding: "10px 12px", fontSize: 12, color: C.textMid, borderBottom: `1px solid ${C.border}` },
  typeBadge: { display: "inline-block", padding: "2px 8px", borderRadius: 5, background: C.bg, color: C.textMid, fontSize: 11, fontWeight: 500 },
  btn: { padding: "7px 14px", background: C.green, color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
  ghostBtn: { padding: "7px 14px", background: "transparent", color: C.textMid, border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
  search: { padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 12, outline: "none", fontFamily: "inherit", width: 200, color: C.text, background: C.white },
  filterPill: { padding: "5px 12px", border: `1.5px solid ${C.border}`, borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", background: C.bg, color: C.textMid, fontFamily: "inherit", whiteSpace: "nowrap", transition: "all .15s" },
  filterPillOn: { background: C.green, color: "#fff", border: `1.5px solid ${C.green}` },
};

const M = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal: { background: C.white, borderRadius: 14, width: "100%", maxWidth: 680, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,.2)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 },
  title: { fontSize: 15, fontWeight: 700, color: C.text },
  closeBtn: { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.textLight, lineHeight: 1, padding: 4 },
  body: { overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 },
  secTitle: { fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "1.2px", marginTop: 6, paddingBottom: 6, borderBottom: `1px solid ${C.border}` },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 },
  errorBar: { background: C.redLight, color: C.red, fontSize: 12, padding: "10px 22px", borderBottom: `1px solid #fca5a5` },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  @keyframes spin{to{transform:rotate(360deg);}}
  .nav-btn:hover{background:${C.sideHover}!important;color:#fff!important;}
  .btn-primary:hover{background:${C.greenMid}!important;}
  .btn-ghost:hover{background:${C.bg}!important;}
  .logout-btn:hover{background:rgba(192,24,42,0.4)!important;}
  .icon-btn:hover{background:${C.bg}!important;}
  .tr-row:hover td{background:#FAFBFA;}
  button:active{transform:scale(0.97);}
  ::-webkit-scrollbar{width:4px;height:4px;}
  ::-webkit-scrollbar-thumb{background:#D4DDD9;border-radius:99px;}
  ::-webkit-scrollbar-track{background:transparent;}
  input:focus,select:focus,textarea:focus{border-color:${C.green}!important;box-shadow:0 0 0 3px ${C.green}18!important;outline:none;}
`;