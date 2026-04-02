import { useState, useEffect } from "react";

const API_BASE = "http://localhost:8000/api/v1";

async function apiFetch(path) {
  const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (res.status === 401) { window.location.href = "/login"; return null; }
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

// Nav selon le profil
const NAV_DIRECTEUR = [
  { id: "dashboard",     label: "Tableau de bord",    icon: "grid"     },
  { id: "mon-vehicule",  label: "Mon véhicule",        icon: "car"      },
  { id: "reservations",  label: "Mes réservations",    icon: "calendar" },
  { id: "historique",    label: "Historique",          icon: "history"  },
  { id: "pannes",        label: "Signaler une panne",  icon: "tool"     },
  { id: "documents",     label: "Mes documents",       icon: "doc"      },
  { id: "notifications", label: "Notifications",       icon: "bell"     },
];

const NAV_CHEF = [
  { id: "dashboard",     label: "Tableau de bord",    icon: "grid"     },
  { id: "reservations",  label: "Mes demandes",        icon: "calendar" },
  { id: "historique",    label: "Historique",          icon: "history"  },
  { id: "pannes",        label: "Signaler un incident",icon: "tool"     },
  { id: "notifications", label: "Notifications",       icon: "bell"     },
];

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_DIRECTEUR = {
  user: {
    first_name: "Antoine", last_name: "Mbarga",
    full_name: "Dr. Antoine Mbarga",
    role: "DIRECTEUR", role_display: "Directeur Académique",
    is_director: true,
  },
  vehicule_fonction: {
    id: 1, brand: "Toyota", model: "Camry",
    license_plate: "LT 234 AB", year: 2022,
    status: "DISPONIBLE", mileage: 45320,
    fuel_level: 72, insurance_expiry: "2026-08-15",
    last_maintenance: "2026-01-10",
  },
  reservations: [
    { id: 1, vehicle_name: "Toyota Camry · LT 234 AB", start_date: "2026-03-28", end_date: "2026-03-28", destination: "Yaoundé", status: "APPROVED",  purpose: "Réunion ministérielle" },
    { id: 2, vehicle_name: "Mercedes Sprinter · LT 012", start_date: "2026-04-02", end_date: "2026-04-03", destination: "Limbé",   status: "PENDING",   purpose: "Conférence régionale" },
  ],
  notifications: [
    { id: 1, title: "Réservation approuvée",   message: "Votre réservation du 28 mars a été approuvée.", type: "SUCCESS", status: "NON_LU", created_at: "2026-03-26" },
    { id: 2, title: "Révision à planifier",    message: "Le véhicule LT 234 AB approche du seuil kilométrique.", type: "WARNING", status: "NON_LU", created_at: "2026-03-25" },
  ],
};

const MOCK_CHEF = {
  user: {
    first_name: "Claire", last_name: "Nkomo",
    full_name: "Prof. Claire Nkomo",
    role: "CHEF_DEPARTEMENT", role_display: "Chef de Département",
    is_director: false,
  },
  vehicule_fonction: null,
  reservations: [
    { id: 3, vehicle_name: "Véhicule + Chauffeur", start_date: "2026-03-29", end_date: "2026-03-29", destination: "Akwa", status: "PENDING",  purpose: "Réunion pédagogique" },
    { id: 4, vehicle_name: "Véhicule + Chauffeur", start_date: "2026-03-15", end_date: "2026-03-15", destination: "Bonanjo", status: "APPROVED", purpose: "Formation externe" },
  ],
  notifications: [
    { id: 1, title: "Demande reçue", message: "Votre demande du 29 mars est en cours de traitement.", type: "INFO", status: "NON_LU", created_at: "2026-03-26" },
  ],
};

// ── Composant principal ───────────────────────────────────────────────────────
export default function DashboardPersonnel() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState("dashboard");
  const [showModal,  setShowModal]  = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [u, vf, res, notifs] = await Promise.all([
          apiFetch("/auth/profile/"),
          apiFetch("/vehicles/my-vehicle/").catch(() => null),
          apiFetch("/reservations/?requester=me"),
          apiFetch("/notifications/"),
        ]);
        const user = u ?? MOCK_DIRECTEUR.user;
      const isDirector = user?.department?.toLowerCase().includes("direction") ||
                   user?.department?.toLowerCase().includes("directeur");
        setData({
          user,
          isDirector,
          vehicule_fonction: isDirector ? (vf ?? MOCK_DIRECTEUR.vehicule_fonction) : null,
          reservations: Array.isArray(res) ? res : res?.results ?? (isDirector ? MOCK_DIRECTEUR.reservations : MOCK_CHEF.reservations),
          notifications: Array.isArray(notifs) ? notifs : notifs?.results ?? (isDirector ? MOCK_DIRECTEUR.notifications : MOCK_CHEF.notifications),
        });
      } catch {
        // Démo : alterner entre directeur et chef
        const demo = MOCK_DIRECTEUR;
        setData({ ...demo, isDirector: demo.user.is_director });
      } finally { setLoading(false); }
    })();
  }, []);

  const handleLogout = async () => {
    const refresh = localStorage.getItem("refresh_token");
    await fetch(`${API_BASE}/auth/logout/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      body: JSON.stringify({ refresh_token: refresh }),
    }).catch(() => {});
    localStorage.clear(); sessionStorage.clear();
    window.location.href = "/login";
  };

  if (loading || !data) return <Loader />;

  const { user, isDirector, vehicule_fonction, reservations, notifications } = data;
  const unread = notifications.filter(n => n.status === "NON_LU").length;
  const NAV = isDirector ? NAV_DIRECTEUR : NAV_CHEF;

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

        {/* Badge profil */}
        <div style={S.profileBadge}>
          <div style={S.profilRole}>{isDirector ? "Directeur" : "Chef de département"}</div>
        </div>

        <nav style={S.nav}>
          {NAV.map(n => {
            const active = tab === n.id;
            return (
              <button key={n.id} onClick={() => setTab(n.id)}
                style={{ ...S.navItem, ...(active ? S.navActive : {}) }}
                className={active ? "" : "nav-btn"}
              >
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
            <LogoutIcon />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={S.main}>

        {/* Topbar */}
        <header style={S.topbar}>
          <div>
            <h1 style={S.pageTitle}>{NAV.find(n => n.id === tab)?.label ?? "Tableau de bord"}</h1>
            <p style={S.pageDate}>{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <button style={S.iconBtn} className="icon-btn" onClick={() => setTab("notifications")}>
                <BellIcon />
              </button>
              {unread > 0 && <span style={S.badge}>{unread}</span>}
            </div>
            <div style={S.userChip}>
              <div style={S.topAvatar}>{user?.first_name?.[0]}{user?.last_name?.[0]}</div>
              <div>
                <div style={S.topName}>{user?.full_name || `${user?.first_name} ${user?.last_name}`}</div>
                <div style={S.topRole}>{user?.role_display}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Contenu */}
        <div style={S.content}>
          {tab === "dashboard"     && <TabDashboard    data={data} isDirector={isDirector} onReserver={() => setShowModal(true)} setTab={setTab} />}
          {tab === "mon-vehicule"  && isDirector && <TabMonVehicule vehicule={vehicule_fonction} />}
          {tab === "reservations"  && <TabReservations reservations={reservations} isDirector={isDirector} onNew={() => setShowModal(true)} />}
          {tab === "historique"    && <TabHistorique   reservations={reservations} />}
          {tab === "notifications" && <TabNotifications notifications={notifications} />}
          {/* Ajoute ces lignes à la suite des autres tabs */}
{tab === "pannes"    && <TabPannes isDirector={isDirector} vehicule={vehicule_fonction} />}
{tab === "documents" && isDirector && <TabDocuments />}
        </div>
      </div>

      {/* Modal nouvelle réservation */}
      {showModal && <ModalReservation isDirector={isDirector} onClose={() => setShowModal(false)} />}
    </div>
  );
}

// ── Tab Dashboard ─────────────────────────────────────────────────────────────
function TabDashboard({ data, isDirector, onReserver, setTab }) {
  const { vehicule_fonction, reservations, notifications } = data;
  const pending   = reservations.filter(r => r.status === "PENDING").length;
  const approved  = reservations.filter(r => r.status === "APPROVED").length;
  const unread    = notifications.filter(n => n.status === "NON_LU").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Actions rapides */}
      <div style={S.actionsRow}>
        <ActionCard
          icon="📋" color={C.green} bg={C.greenLight}
          title="Nouvelle réservation"
          desc={isDirector ? "Réserver un véhicule du parc" : "Faire une demande avec chauffeur"}
          onClick={onReserver}
        />
        <ActionCard
          icon="🔍" color={C.blue} bg={C.blueLight}
          title="Voir disponibilités"
          desc="Consulter les véhicules disponibles"
          onClick={() => setTab("reservations")}
        />
        <ActionCard
          icon="⚠️" color={C.amber} bg={C.amberLight}
          title="Signaler une panne"
          desc={isDirector ? "Signaler un problème sur mon véhicule" : "Signaler un incident"}
          onClick={() => alert("Formulaire de signalement — à connecter")}
        />
        <ActionCard
          icon="📂" color={C.textMid} bg={C.bg}
          title="Consulter historique"
          desc="Voir mes courses passées"
          onClick={() => setTab("historique")}
        />
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: isDirector ? "repeat(4,1fr)" : "repeat(3,1fr)", gap: 14 }}>
        {isDirector && (
          <KpiCard
            label="Véhicule de fonction"
            value={vehicule_fonction?.status === "DISPONIBLE" ? "Disponible" : "En service"}
            sub={`${vehicule_fonction?.brand} ${vehicule_fonction?.model}`}
            color={C.green}
          />
        )}
        <KpiCard label="Réservations en attente" value={pending}   sub="En cours de validation" color={C.amber} />
        <KpiCard label="Réservations approuvées" value={approved}  sub="Ce mois-ci"             color={C.green} />
        <KpiCard label="Notifications non lues"  value={unread}    sub="À consulter"            color={unread > 0 ? C.red : C.textLight} />
      </div>

      {/* Véhicule de fonction — directeur seulement */}
      {isDirector && vehicule_fonction && (
        <div style={S.section}>
          <div style={S.secHead}>
            <span style={S.secTitle}>Mon véhicule de fonction</span>
            <Status status={vehicule_fonction.status} />
          </div>
          <div style={S.vfGrid}>
            <VFField icon="🚗" label="Véhicule"      value={`${vehicule_fonction.brand} ${vehicule_fonction.model} ${vehicule_fonction.year}`} />
            <VFField icon="🪪" label="Immatriculation" value={vehicule_fonction.license_plate} big />
            <VFField icon="📍" label="Kilométrage"   value={`${vehicule_fonction.mileage?.toLocaleString("fr-FR")} km`} />
            <VFField icon="⛽" label="Carburant"     value={`${vehicule_fonction.fuel_level ?? "—"} %`} />
            <VFField icon="📋" label="Assurance"     value={fmtDate(vehicule_fonction.insurance_expiry)} />
            <VFField icon="🔧" label="Dernière révision" value={fmtDate(vehicule_fonction.last_maintenance)} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <Btn>Voir détails complets</Btn>
            <GhostBtn>Historique</GhostBtn>
            <GhostBtn style={{ color: C.red, borderColor: "#fca5a5" }}>Signaler une panne</GhostBtn>
          </div>
        </div>
      )}

      {/* Réservations récentes */}
      <div style={S.section}>
        <div style={S.secHead}>
          <span style={S.secTitle}>{isDirector ? "Mes réservations récentes" : "Mes demandes récentes"}</span>
          <GhostBtn onClick={() => setTab("reservations")}>Voir tout</GhostBtn>
        </div>
        {reservations.length === 0
          ? <Empty text="Aucune réservation pour le moment" />
          : reservations.slice(0, 3).map((r, i) => (
            <div key={i} style={S.resRow}>
              <div style={{ ...S.resIcon, background: statusColor(r.status) + "20" }}>
                <span style={{ fontSize: 16 }}>🚗</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{r.destination}</div>
                <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>
                  {r.vehicle_name} · {fmtDate(r.start_date)}
                  {r.end_date !== r.start_date ? ` → ${fmtDate(r.end_date)}` : ""}
                </div>
                {r.purpose && <div style={{ fontSize: 11, color: C.textMid, marginTop: 1 }}>Motif : {r.purpose}</div>}
              </div>
              <Status status={r.status} />
            </div>
          ))
        }
      </div>

      {/* Notifications récentes */}
      {notifications.length > 0 && (
        <div style={S.section}>
          <div style={S.secHead}>
            <span style={S.secTitle}>Notifications récentes</span>
            {notifications.filter(n => n.status === "NON_LU").length > 0 &&
              <Chip color={C.red}>{notifications.filter(n => n.status === "NON_LU").length} non lues</Chip>
            }
          </div>
          {notifications.slice(0, 3).map((n, i) => (
            <div key={i} style={S.notifRow}>
              <span style={S.notifDot(n.type)} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{n.title}</div>
                <div style={{ fontSize: 11, color: C.textMid, marginTop: 2 }}>{n.message}</div>
              </div>
              <span style={{ fontSize: 10, color: C.textLight, whiteSpace: "nowrap" }}>{fmtDate(n.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab Mon Véhicule (directeur) ──────────────────────────────────────────────
function TabMonVehicule({ vehicule }) {
  if (!vehicule) return <div style={S.section}><Empty text="Aucun véhicule de fonction attribué" /></div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={S.section}>
        <div style={S.secHead}>
          <span style={S.secTitle}>{vehicule.brand} {vehicule.model} — {vehicule.license_plate}</span>
          <Status status={vehicule.status} />
        </div>
        <div style={S.vfGrid}>
          <VFField icon="🚗" label="Marque / Modèle"    value={`${vehicule.brand} ${vehicule.model}`} />
          <VFField icon="🪪" label="Immatriculation"    value={vehicule.license_plate} big />
          <VFField icon="📅" label="Année"              value={vehicule.year} />
          <VFField icon="📍" label="Kilométrage"        value={`${vehicule.mileage?.toLocaleString("fr-FR")} km`} />
          <VFField icon="⛽" label="Niveau carburant"   value={`${vehicule.fuel_level ?? "—"} %`} />
          <VFField icon="📋" label="Fin d'assurance"    value={fmtDate(vehicule.insurance_expiry)} />
          <VFField icon="🔧" label="Dernière révision"  value={fmtDate(vehicule.last_maintenance)} />
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <Btn>Historique complet</Btn>
          <GhostBtn style={{ color: C.red, borderColor: "#fca5a5" }}>Signaler une panne</GhostBtn>
          <GhostBtn>Demander véhicule de remplacement</GhostBtn>
        </div>
      </div>
    </div>
  );
}

// ── Tab Réservations ──────────────────────────────────────────────────────────
function TabReservations({ reservations, isDirector, onNew }) {
  const [filter, setFilter] = useState("TOUS");
  const statuts = ["TOUS", "PENDING", "APPROVED", "REJECTED"];
  const filtered = filter === "TOUS" ? reservations : reservations.filter(r => r.status === filter);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={S.section}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={S.secTitle}>{isDirector ? "Mes réservations" : "Mes demandes de véhicule"}</span>
          <Btn onClick={onNew}>+ {isDirector ? "Nouvelle réservation" : "Nouvelle demande"}</Btn>
        </div>
        {/* Filtres */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {statuts.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              style={{ ...S.filterBtn, ...(filter === s ? S.filterActive : {}) }}>
              {s === "TOUS" ? "Toutes" : s === "PENDING" ? "En attente" : s === "APPROVED" ? "Approuvées" : "Refusées"}
            </button>
          ))}
        </div>
        {filtered.length === 0
          ? <Empty text="Aucune réservation dans cette catégorie" />
          : filtered.map((r, i) => (
            <div key={i} style={S.resCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>📍 {r.destination}</div>
                  <div style={{ fontSize: 12, color: C.textLight, marginTop: 3 }}>{r.vehicle_name}</div>
                </div>
                <Status status={r.status} />
              </div>
              <div style={{ display: "flex", gap: 20, fontSize: 12, color: C.textMid }}>
                <span>📅 {fmtDate(r.start_date)}{r.end_date !== r.start_date ? ` → ${fmtDate(r.end_date)}` : ""}</span>
                {r.purpose && <span>Motif : {r.purpose}</span>}
              </div>
              {r.status === "PENDING" && (
                <div style={{ marginTop: 10 }}>
                  <GhostBtn style={{ fontSize: 11, padding: "4px 10px", color: C.red, borderColor: "#fca5a5" }}>
                    Annuler la demande
                  </GhostBtn>
                </div>
              )}
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ── Tab Historique ────────────────────────────────────────────────────────────
function TabHistorique({ reservations }) {
  const done = reservations.filter(r => ["APPROVED", "REJECTED", "COMPLETED"].includes(r.status));
  return (
    <div style={S.section}>
      <div style={{ ...S.secHead, marginBottom: 16 }}>
        <span style={S.secTitle}>Historique de mes courses</span>
        <Chip color={C.green}>{done.length} trajet(s)</Chip>
      </div>
      {done.length === 0
        ? <Empty text="Aucun historique disponible" />
        : done.map((r, i) => (
          <div key={i} style={S.resRow}>
            <div style={{ ...S.resIcon, background: C.greenLight }}>
              <span style={{ fontSize: 16 }}>✅</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{r.destination}</div>
              <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>
                {r.vehicle_name} · {fmtDate(r.start_date)}
              </div>
              {r.purpose && <div style={{ fontSize: 11, color: C.textMid }}>Motif : {r.purpose}</div>}
            </div>
            <Status status={r.status} />
          </div>
        ))
      }
    </div>
  );
}

// ── Tab Notifications ─────────────────────────────────────────────────────────
function TabNotifications({ notifications }) {
  const [list, setList] = useState(notifications);
  const markRead = (id) => setList(l => l.map(n => n.id === id ? { ...n, status: "LU" } : n));
  return (
    <div style={S.section}>
      <div style={{ ...S.secHead, marginBottom: 16 }}>
        <span style={S.secTitle}>Notifications</span>
        {list.filter(n => n.status === "NON_LU").length > 0 &&
          <button style={S.linkBtn} onClick={() => setList(l => l.map(n => ({ ...n, status: "LU" })))}>
            Tout marquer comme lu
          </button>
        }
      </div>
      {list.length === 0
        ? <Empty text="Aucune notification" icon="🔔" />
        : list.map((n, i) => (
          <div key={i} style={{ ...S.notifRow, background: n.status === "NON_LU" ? C.greenLight : "transparent", borderRadius: 8, padding: "10px 12px", marginBottom: 4 }}>
            <span style={S.notifDot(n.type)} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: n.status === "NON_LU" ? 700 : 500, color: C.text }}>{n.title}</div>
              <div style={{ fontSize: 11, color: C.textMid, marginTop: 2 }}>{n.message}</div>
              <div style={{ fontSize: 10, color: C.textLight, marginTop: 4 }}>{fmtDate(n.created_at)}</div>
            </div>
            {n.status === "NON_LU" && (
              <button style={S.linkBtn} onClick={() => markRead(n.id)}>Marquer lu</button>
            )}
          </div>
        ))
      }
    </div>
  );
}
function TabPannes({ isDirector, vehicule }) {
  const [form, setForm] = useState({ description: "", urgence: "NORMALE" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={S.section}>
        <div style={{ ...S.secHead, marginBottom: 20 }}>
          <span style={S.secTitle}>
            {isDirector ? "Signaler une panne sur mon véhicule" : "Signaler un incident"}
          </span>
        </div>

        {isDirector && vehicule && (
          <div style={{ background: C.greenLight, borderRadius: 8, padding: "10px 14px",
                        fontSize: 12, color: C.green, marginBottom: 16, fontWeight: 600 }}>
            🚗 Véhicule concerné : {vehicule.brand} {vehicule.model} — {vehicule.license_plate}
          </div>
        )}

        {!isDirector && (
          <div style={{ background: C.amberLight, borderRadius: 8, padding: "10px 14px",
                        fontSize: 12, color: C.amber, marginBottom: 16 }}>
            ℹ️ Décrivez l'incident observé sur le véhicule qui vous a été assigné.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={S.field}>
            <label style={S.label}>Description du problème *</label>
            <textarea
              style={{ ...S.input, height: 110, resize: "vertical" }}
              placeholder="Ex : Bruit anormal au niveau du moteur, fuite d'huile, pneu crevé…"
              value={form.description}
              onChange={e => set("description", e.target.value)}
            />
          </div>
          <div style={S.field}>
            <label style={S.label}>Niveau d'urgence</label>
            <select style={S.input} value={form.urgence} onChange={e => set("urgence", e.target.value)}>
              <option value="NORMALE">Normale — peut attendre</option>
              <option value="URGENTE">Urgente — à traiter rapidement</option>
              <option value="CRITIQUE">Critique — véhicule immobilisé</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <Btn onClick={() => alert("Signalement envoyé au gestionnaire !")}>
            Envoyer le signalement
          </Btn>
          <GhostBtn onClick={() => setForm({ description: "", urgence: "NORMALE" })}>
            Réinitialiser
          </GhostBtn>
        </div>
      </div>
    </div>
  );
}

function TabDocuments() {
  const docs = [
    { nom: "Attestation d'assurance",     expiry: "2026-08-15", status: "VALIDE"   },
    { nom: "Contrôle technique",          expiry: "2026-05-01", status: "BIENTOT"  },
    { nom: "Carte grise",                 expiry: null,         status: "VALIDE"   },
    { nom: "Vignette",                    expiry: "2026-12-31", status: "VALIDE"   },
  ];
  const statusDoc = {
    VALIDE:  { label: "Valide",        bg: C.greenLight, color: C.green },
    BIENTOT: { label: "Expire bientôt",bg: C.amberLight, color: C.amber },
    EXPIRE:  { label: "Expiré",        bg: C.redLight,   color: C.red   },
  };
  return (
    <div style={S.section}>
      <div style={{ ...S.secHead, marginBottom: 16 }}>
        <span style={S.secTitle}>Documents de mon véhicule</span>
      </div>
      {docs.map((d, i) => {
        const st = statusDoc[d.status];
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12,
                                padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 22 }}>📄</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{d.nom}</div>
              {d.expiry && (
                <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>
                  Expire le {fmtDate(d.expiry)}
                </div>
              )}
            </div>
            <span style={{ padding: "3px 9px", borderRadius: 99, fontSize: 11,
                           fontWeight: 700, background: st.bg, color: st.color }}>
              {st.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
// ── Modal Réservation ─────────────────────────────────────────────────────────
function ModalReservation({ isDirector, onClose }) {
  const [form, setForm] = useState({
    destination: "", start_date: "", end_date: "",
    heure_depart: "", heure_retour: "",
    purpose: "", nb_places: "",
    lieu_depart: "", lieu_depart_coords: null,
    destination_coords: null,
  });
  const [locLoading,  setLocLoading]  = useState(false);
  const [distLoading, setDistLoading] = useState(false);
  const [locError,    setLocError]    = useState("");
  const [distance,    setDistance]    = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Récupère la position actuelle de l'utilisateur ──────────────────
  const getGeolocation = () => {
    if (!navigator.geolocation) {
      setLocError("Géolocalisation non supportée par votre navigateur.");
      return;
    }
    setLocLoading(true);
    setLocError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const json = await res.json();
          const addr = json.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          set("lieu_depart", addr);
          set("lieu_depart_coords", { lat: latitude, lng: longitude });
        } catch {
          set("lieu_depart", `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          set("lieu_depart_coords", { lat: latitude, lng: longitude });
        } finally { setLocLoading(false); }
      },
      (err) => {
        setLocLoading(false);
        setLocError(
          err.code === 1 ? "Accès refusé. Activez la localisation dans votre navigateur." :
          err.code === 2 ? "Position introuvable." : "Délai dépassé. Réessayez."
        );
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // ── Calcule la distance entre lieu de départ et destination ─────────
  const calcDistance = async () => {
    if (!form.lieu_depart_coords || !form.destination.trim()) {
      setLocError("Localisez-vous d'abord et entrez une destination.");
      return;
    }
    setDistLoading(true);
    setLocError("");
    try {
      // Géocode la destination via Nominatim
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(form.destination)}&format=json&limit=1`
      );
      const json = await res.json();
      if (!json.length) { setLocError("Destination introuvable."); return; }
      const destLat = parseFloat(json[0].lat);
      const destLng = parseFloat(json[0].lon);
      set("destination_coords", { lat: destLat, lng: destLng });

      // Formule Haversine
      const R    = 6371;
      const dLat = (destLat - form.lieu_depart_coords.lat) * Math.PI / 180;
      const dLng = (destLng - form.lieu_depart_coords.lng) * Math.PI / 180;
      const a    = Math.sin(dLat/2)**2 +
                   Math.cos(form.lieu_depart_coords.lat * Math.PI/180) *
                   Math.cos(destLat * Math.PI/180) *
                   Math.sin(dLng/2)**2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      setDistance(Math.round(dist));
    } catch {
      setLocError("Erreur lors du calcul de distance.");
    } finally { setDistLoading(false); }
  };

  // ── Recommandation véhicule selon nb de places ──────────────────────
  const getVehiculeReco = (n) => {
    const nb = parseInt(n);
    if (!nb || isNaN(nb)) return null;
    if (nb < 5)           return { label: "Véhicule berline / utilitaire",  icon: "🚗", color: C.blue,  bg: C.blueLight,  detail: "1 véhicule de tourisme ou utilitaire" };
    if (nb < 20)          return { label: "Minibus",                        icon: "🚐", color: C.green, bg: C.greenLight, detail: "1 minibus" };
    if (nb <= 30)         return { label: "1 Bus",                          icon: "🚌", color: C.amber, bg: C.amberLight, detail: "1 bus (jusqu'à 30 places)" };
    if (nb <= 60)         return { label: "2 Bus",                          icon: "🚌🚌", color: C.amber, bg: C.amberLight, detail: "2 bus (jusqu'à 60 places)" };
    const nbBus = Math.ceil(nb / 30);
    return { label: `${nbBus} Bus`,  icon: "🚌", color: C.red, bg: C.redLight, detail: `${nbBus} bus nécessaires` };
  };

  const reco = getVehiculeReco(form.nb_places);

   
const handleSubmit = async () => {
  // ── Validation locale ──────────────────────────────────────────────────────
  if (!form.destination || !form.start_date || !form.heure_depart || !form.purpose || !form.nb_places) {
    alert("Veuillez remplir tous les champs obligatoires (*)");
    return;
  }
 
  // ── Construire les datetime ISO 8601 attendus par Django ──────────────────
  const start_datetime = `${form.start_date}T${form.heure_depart || "08:00"}:00`;
  const end_datetime   = form.end_date
    ? `${form.end_date}T${form.heure_retour   || "18:00"}:00`
    : `${form.start_date}T${form.heure_retour || "18:00"}:00`;
 
  // ── Payload — PAS de vehicle, PAS de requester ─────────────────────────────
  // Le backend injecte requester=request.user automatiquement via perform_create
  // Le gestionnaire assignera le vehicle lors de l'approbation
  const payload = {
    destination:          form.destination.trim(),
    purpose:              form.purpose.trim(),
    start_date:           start_datetime,
    end_date:             end_datetime,
    number_of_passengers: parseInt(form.nb_places) || 1,
    // Optionnels
    ...(distance != null && { estimated_distance: distance }),
    ...((form.lieu_depart || form.notes) && {
      notes: [
        form.lieu_depart ? `Lieu de départ : ${form.lieu_depart}` : "",
        form.lieu_depart_coords
          ? `GPS : ${form.lieu_depart_coords.lat.toFixed(5)}, ${form.lieu_depart_coords.lng.toFixed(5)}`
          : "",
        form.notes || "",
      ].filter(Boolean).join(" | "),
    }),
  };
 
  // ── Appel API ──────────────────────────────────────────────────────────────
  try {
   const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
console.log("TOKEN:", token);
console.log("localStorage keys:", Object.keys(localStorage));
console.log("sessionStorage keys:", Object.keys(sessionStorage));
    const res   = await fetch(`${API_BASE}/reservations/`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
 
    // ── Lire la réponse ────────────────────────────────────────────────────
    const json = await res.json();
    console.log("ERREUR 400:", JSON.stringify(json, null, 2));
 
    if (!res.ok) {
      // Afficher l'erreur Django lisible
      const errMsg =
        json?.detail ||
        json?.message ||
        Object.entries(json)
          .map(([k, v]) => `${k} : ${Array.isArray(v) ? v.join(", ") : v}`)
          .join("\n") ||
        "Erreur inconnue.";
      alert("❌ Erreur :\n" + errMsg);
      return;
    }
 
    // ── Succès ─────────────────────────────────────────────────────────────
    alert("✅ Demande envoyée avec succès !\nElle est en attente de validation par le gestionnaire.");
    onClose();
 
  } catch {
    alert("❌ Impossible de joindre le serveur. Vérifiez votre connexion.");
  }
};
  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, width: 600, maxHeight: "92vh", overflowY: "auto" }}>

        {/* Entête */}
        <div style={S.modalHead}>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
            {isDirector ? "Nouvelle réservation" : "Demande de véhicule avec chauffeur"}
          </span>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>

        {!isDirector && (
          <div style={S.infoBanner}>
            ℹ️ Votre demande sera traitée avec un chauffeur assigné. Le véhicule sera restitué après la course.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ── Destination + Motif ── */}
          <div style={S.formGrid}>
            <div style={S.field}>
              <label style={S.label}>Destination *</label>
              <input style={S.input} placeholder="Ex: Yaoundé, Bonaberi, Akwa…"
                value={form.destination} onChange={e => set("destination", e.target.value)} />
            </div>
            <div style={S.field}>
              <label style={S.label}>Motif *</label>
              <input style={S.input} placeholder="Ex: Réunion, Conférence…"
                value={form.purpose} onChange={e => set("purpose", e.target.value)} />
            </div>
          </div>

          {/* ── Dates ── */}
          <div style={S.formGrid}>
            <div style={S.field}>
              <label style={S.label}>Date de départ *</label>
              <input style={S.input} type="date"
                value={form.start_date} onChange={e => set("start_date", e.target.value)} />
            </div>
            <div style={S.field}>
              <label style={S.label}>Date de retour</label>
              <input style={S.input} type="date"
                value={form.end_date} onChange={e => set("end_date", e.target.value)} />
            </div>
          </div>

          {/* ── Heures ── */}
          <div style={S.formGrid}>
            <div style={S.field}>
              <label style={S.label}>Heure de départ *</label>
              <input style={S.input} type="time"
                value={form.heure_depart} onChange={e => set("heure_depart", e.target.value)} />
            </div>
            <div style={S.field}>
              <label style={S.label}>Heure de retour estimée</label>
              <input style={S.input} type="time"
                value={form.heure_retour} onChange={e => set("heure_retour", e.target.value)} />
            </div>
          </div>

          {/* ── Lieu de départ + géoloc ── */}
          <div style={S.field}>
            <label style={S.label}>Lieu de prise en charge *</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={{ ...S.input, flex: 1 }}
                placeholder="Entrez votre adresse ou cliquez sur Me localiser…"
                value={form.lieu_depart}
                onChange={e => { set("lieu_depart", e.target.value); setDistance(null); }}
              />
              <button onClick={getGeolocation} disabled={locLoading} style={S.geoBtn}>
                {locLoading ? <><SpinIcon /> Localisation…</> : <><PinIcon /> Me localiser</>}
              </button>
            </div>

            {form.lieu_depart_coords && (
              <div style={{ fontSize: 10, color: C.green, marginTop: 4, fontWeight: 600 }}>
                ✓ Position capturée — {form.lieu_depart_coords.lat.toFixed(4)}, {form.lieu_depart_coords.lng.toFixed(4)}
              </div>
            )}

            {/* Bouton calculer distance */}
            {form.lieu_depart_coords && form.destination && (
              <button onClick={calcDistance} disabled={distLoading}
                style={{ ...S.geoBtn, marginTop: 8, background: C.blueLight, color: C.blue,
                         border: `1px solid ${C.blue}30`, width: "fit-content" }}>
                {distLoading
                  ? <><SpinIcon /> Calcul en cours…</>
                  : <>📐 Calculer la distance vers {form.destination}</>
                }
              </button>
            )}

            {/* Résultat distance */}
            {distance !== null && (
              <div style={{ marginTop: 8, background: C.blueLight, borderRadius: 8,
                            padding: "10px 14px", fontSize: 12, color: C.blue, fontWeight: 600,
                            display: "flex", alignItems: "center", gap: 8 }}>
                📍 Distance estimée : <span style={{ fontSize: 16, fontWeight: 800 }}>{distance} km</span>
                <span style={{ fontWeight: 400, color: C.textMid }}>
                  (environ {Math.round(distance / 60 * 60)} min en voiture)
                </span>
              </div>
            )}

            {locError && (
              <div style={{ fontSize: 11, color: C.red, marginTop: 6 }}>⚠️ {locError}</div>
            )}
          </div>

          {/* ── Nombre de places ── */}
          <div style={S.field}>
            <label style={S.label}>Nombre de personnes *</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                style={{ ...S.input, width: 100, textAlign: "center", fontSize: 16, fontWeight: 700 }}
                type="number" min="1" max="200"
                placeholder="Ex: 12"
                value={form.nb_places}
                onChange={e => set("nb_places", e.target.value)}
              />
              <span style={{ fontSize: 12, color: C.textLight }}>personne(s)</span>
            </div>

            {/* Recommandation automatique */}
            {reco && (
              <div style={{ marginTop: 10, background: reco.bg, borderRadius: 8,
                            padding: "12px 14px", border: `1px solid ${reco.color}25` }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: reco.color, marginBottom: 4 }}>
                  {reco.icon} Véhicule recommandé : {reco.label}
                </div>
                <div style={{ fontSize: 11, color: C.textMid }}>
                  Pour <b>{form.nb_places} personne(s)</b> → {reco.detail}
                </div>
                <div style={{ fontSize: 10, color: C.textLight, marginTop: 4 }}>
                  {parseInt(form.nb_places) < 5    && "Berline ou utilitaire · moins de 5 places"}
                  {parseInt(form.nb_places) >= 5  && parseInt(form.nb_places) < 20  && "Minibus · 5 à 19 places"}
                  {parseInt(form.nb_places) >= 20 && parseInt(form.nb_places) <= 30 && "1 Bus · 20 à 30 places"}
                  {parseInt(form.nb_places) >= 31 && parseInt(form.nb_places) <= 60 && "2 Bus · 31 à 60 places"}
                  {parseInt(form.nb_places) > 60  && `${Math.ceil(parseInt(form.nb_places)/30)} Bus · ${parseInt(form.nb_places)} places`}
                </div>
              </div>
            )}
          </div>

          {/* ── Notes ── */}
          <div style={S.field}>
            <label style={S.label}>Notes complémentaires</label>
            <textarea
              style={{ ...S.input, height: 65, resize: "vertical" }}
              placeholder="Informations supplémentaires pour le gestionnaire…"
              value={form.notes || ""}
              onChange={e => set("notes", e.target.value)}
            />
          </div>

        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <GhostBtn onClick={onClose}>Annuler</GhostBtn>
          <Btn onClick={handleSubmit}>Envoyer la demande</Btn>
        </div>
      </div>
    </div>
  );
}

function PinIcon({ size = 13, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}

function SpinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: "spin .8s linear infinite" }}>
      <path d="M21 12a9 9 0 1 1-6.21-8.56"/>
    </svg>
  );
}

// ── Petits composants ─────────────────────────────────────────────────────────
function ActionCard({ icon, title, desc, color, onClick }) {
  return (
    <button onClick={onClick} style={{ ...S.actionCard, borderTop: `3px solid ${color}` }} className="action-card">
      <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 11, color: C.textLight, lineHeight: 1.4 }}>{desc}</div>
    </button>
  );
}

function KpiCard({ label, value, sub, color }) {
  return (
    <div style={{ ...S.kpiCard, borderLeftColor: color }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: C.text, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 6 }}>{sub}</div>
    </div>
  );
}

function VFField({ icon, label, value, big }) {
  return (
    <div style={{ padding: "12px 14px", background: C.bg, borderRadius: 8 }}>
      <div style={{ fontSize: 10, color: C.textLight, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 5 }}>{icon} {label}</div>
      <div style={{ fontSize: big ? 20 : 14, fontWeight: big ? 800 : 600, color: C.text }}>{value}</div>
    </div>
  );
}

function Status({ status }) {
  const map = {
    DISPONIBLE:     { label: "Disponible",    bg: C.greenLight, color: C.green  },
    EN_SERVICE:     { label: "En service",    bg: C.amberLight, color: C.amber  },
    EN_MAINTENANCE: { label: "En maintenance",bg: C.redLight,   color: C.red    },
    PENDING:        { label: "En attente",    bg: C.amberLight, color: C.amber  },
    APPROVED:       { label: "Approuvée",     bg: C.greenLight, color: C.green  },
    REJECTED:       { label: "Refusée",       bg: C.redLight,   color: C.red    },
    COMPLETED:      { label: "Terminée",      bg: C.greenLight, color: C.green  },
  };
  const m = map[status] || { label: status, bg: "#F5F5F5", color: "#888" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: m.bg, color: m.color, whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: m.color, display: "inline-block" }} />
      {m.label}
    </span>
  );
}

function Chip({ color, children }) {
  return <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: color + "1A", color }}>{children}</span>;
}
function Btn({ children, onClick }) {
  return <button onClick={onClick} style={S.btn} className="btn-primary">{children}</button>;
}
function GhostBtn({ children, onClick, style: extra }) {
  return <button onClick={onClick} style={{ ...S.ghostBtn, ...extra }} className="btn-ghost">{children}</button>;
}
function Empty({ text, icon = "📭" }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 0", color: C.textLight }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 13 }}>{text}</div>
    </div>
  );
}
function Loader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: C.bg, flexDirection: "column", gap: 14 }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${C.green}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
      <div style={{ fontSize: 11, color: C.textLight, letterSpacing: "2px", textTransform: "uppercase" }}>Chargement</div>
    </div>
  );
}

function IUCLogo() {
  return (
    <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width="28" height="28" viewBox="0 0 52 52" fill="none">
        <path d="M7 34L16 18Q18 13 22 13H30Q34 13 36 18L45 34" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <rect x="5" y="32" width="42" height="12" rx="6" fill="white" opacity=".92" />
        <circle cx="15" cy="44" r="5.5" fill="#C0182A" />
        <circle cx="37" cy="44" r="5.5" fill="#C0182A" />
        <circle cx="15" cy="44" r="2.5" fill="white" />
        <circle cx="37" cy="44" r="2.5" fill="white" />
        <rect x="22" y="17" width="8" height="7" rx="1.5" fill="white" opacity=".4" />
      </svg>
    </div>
  );
}

function NavIcon({ id }) {
  const p = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none",
              stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" };
  switch (id) {
    case "grid":     return <svg {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
    case "car":      return <svg {...p}><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h11l4 4v4a2 2 0 0 1-2 2h-1"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>;
    case "calendar": return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    case "history":  return <svg {...p}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>;
    case "tool":     return <svg {...p}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;
    case "doc":      return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
    case "bell":     return <svg {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
    default:         return <svg {...p}><circle cx="12" cy="12" r="10"/></svg>;
  }
}
function BellIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
}
function LogoutIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
}

function statusColor(s) {
  return s === "APPROVED" ? C.green : s === "PENDING" ? C.amber : C.red;
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  shell:    { display: "flex", height: "100vh", width: "100vw", fontFamily: "'Inter',-apple-system,sans-serif", background: C.bg, overflow: "hidden" },
  sidebar:  { width: 224, background: C.sidebar, display: "flex", flexDirection: "column", flexShrink: 0 },
  brand:    { display: "flex", alignItems: "center", gap: 11, padding: "20px 16px 14px" },
  brandText:{ minWidth: 0 },
  brandName:{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "2px" },
  brandSub: { fontSize: 9, color: "rgba(255,255,255,.4)", marginTop: 2, lineHeight: 1.4 },
  divider:  { height: 1, background: "rgba(255,255,255,.08)", margin: "0 14px" },
  profileBadge: { padding: "8px 14px" },
  profilRole: { fontSize: 9, color: "rgba(255,255,255,.45)", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 700 },
  nav:      { flex: 1, padding: "8px 10px", overflowY: "auto" },
  navItem:  { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 10px", borderRadius: 7, border: "none", cursor: "pointer", color: "rgba(255,255,255,.65)", marginBottom: 2, textAlign: "left", background: "transparent", fontFamily: "inherit", position: "relative", transition: "all .12s" },
  navActive:{ background: C.sideActive, color: "#fff", fontWeight: 600 },
  navLabel: { fontSize: 12.5, flex: 1 },
  navPip:   { position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 16, background: "#fff", borderRadius: 99 },
  navBadge: { background: C.red, color: "#fff", borderRadius: 99, fontSize: 9, fontWeight: 800, width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" },
  sideBottom:{ padding: "8px 10px 14px" },
  logoutBtn:{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", borderRadius: 7, border: "none", cursor: "pointer", background: "rgba(192,24,42,0.25)", color: "rgba(255,255,255,.75)", fontSize: 12, fontFamily: "inherit", marginTop: 8, transition: "all .12s" },
  main:     { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 },
  topbar:   { background: C.white, borderBottom: `1px solid ${C.border}`, padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 },
  pageTitle:{ fontSize: 22, fontWeight: 760, color: C.text, letterSpacing: "-.4px", margin: 0 },
  pageDate: { fontSize: 11, color: C.textLight, marginTop: 2 },
  iconBtn:  { width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textMid },
  badge:    { position: "absolute", top: -5, right: -5, background: C.red, color: "#fff", borderRadius: 99, fontSize: 9, fontWeight: 800, width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" },
  userChip: { display: "flex", alignItems: "center", gap: 9 },
  topAvatar:{ width: 34, height: 34, borderRadius: "50%", background: C.green, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 },
  topName:  { fontSize: 13, fontWeight: 700, color: C.text },
  topRole:  { fontSize: 10, color: C.textLight, textTransform: "uppercase", letterSpacing: "1px" },
  content:  { flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 0 },

  actionsRow:{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 },
  actionCard:{ background: C.white, borderRadius: 10, padding: "18px 16px", border: `1px solid ${C.border}`, cursor: "pointer", textAlign: "left", fontFamily: "inherit", boxShadow: "0 1px 3px rgba(0,0,0,.05)", transition: "all .15s" },

  kpiCard:  { background: C.white, borderRadius: 10, padding: "16px 18px", borderLeft: "3px solid transparent", boxShadow: "0 1px 3px rgba(0,0,0,.05)" },
  section:  { background: C.white, borderRadius: 10, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,.05)", marginBottom: 0 },
  secHead:  { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  secTitle: { fontSize: 13, fontWeight: 700, color: C.text },

  vfGrid:   { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 },

  resRow:   { display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}` },
  resIcon:  { width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  resCard:  { background: "#FAFBFA", border: `1px solid ${C.border}`, borderRadius: 9, padding: "14px 16px", marginBottom: 10 },

  notifRow: { display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` },
  notifDot: (type) => ({
    width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 5,
    background: type === "SUCCESS" ? C.green : type === "WARNING" ? C.amber : type === "ERROR" ? C.red : C.blue,
  }),

  filterBtn:   { padding: "5px 12px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer", background: "transparent", color: C.textMid, fontFamily: "inherit" },
  filterActive:{ background: C.green, color: "#fff", border: `1px solid ${C.green}` },

  btn:      { padding: "7px 14px", background: C.green, color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
  ghostBtn: { padding: "7px 14px", background: "transparent", color: C.textMid, border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
  linkBtn:  { background: "none", border: "none", color: C.green, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" },

  overlay:  { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal:    { background: C.white, borderRadius: 14, padding: "24px", width: 520, maxWidth: "95vw", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" },
  modalHead:{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  closeBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.textLight },
  infoBanner:{ background: C.amberLight, border: `1px solid ${C.amber}30`, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: C.amber, marginBottom: 16, lineHeight: 1.5 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  field:    { display: "flex", flexDirection: "column", gap: 5 },
  label:    { fontSize: 11, fontWeight: 600, color: C.textMid, textTransform: "uppercase", letterSpacing: "1px" },
  input:    { padding: "8px 12px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 13, outline: "none", fontFamily: "inherit", color: C.text },
  geoBtn: {
  padding: "8px 12px", background: C.green, color: "#fff",
  border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700,
  cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
  display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
},
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
  input:focus { border-color: ${C.green} !important; box-shadow: 0 0 0 3px ${C.green}18 !important; }
`;