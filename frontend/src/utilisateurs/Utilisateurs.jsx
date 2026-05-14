// ─── src/utilisateurs/Utilisateurs.jsx ──────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../utils/api";
import { C, S, M } from "../constants/index";
import { Empty } from "../components/ui";

const ROLE_TABS = [
  { value:"",           label:"Tous",        icon:"👥", color:C.textMid },
  { value:"PERSONNEL",  label:"Personnel",   icon:"🏢", color:C.blue   },
  { value:"CHAUFFEUR",  label:"Chauffeurs",  icon:"🚗", color:C.green  },
  { value:"TECHNICIEN", label:"Techniciens", icon:"🔧", color:C.amber  },
];

export function TabUtilisateurs() {
  return <PanelUsers />;
}

function PanelUsers() {
  const [users,       setUsers]       = useState([]);
  const [tourismVeh,  setTourismVeh]  = useState([]);
  const [busVehicles, setBusVehicles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filterRole,  setFilterRole]  = useState("");
  const [search,      setSearch]      = useState("");
  const [showForm,    setShowForm]    = useState(false);
  const [editUser,    setEditUser]    = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [formErr,     setFormErr]     = useState("");
  const [deleting,    setDeleting]    = useState(null);

const loadAll = useCallback(async () => {
  setLoading(true);
  try {
    // Charger tous les départements (toutes les pages)
    const fetchAllDepts = async () => {
      const res1 = await apiFetch("/auth/departments/?page_size=50");
      const items = Array.isArray(res1) ? res1 : res1?.results ?? [];
      return items;
    };

    const [u, v, b, d] = await Promise.all([
      apiFetch("/auth/users/"),
      apiFetch("/vehicles/?category=TOURISME&assignment_type=POOL"),
      apiFetch("/vehicles/?category=BUS&assignment_type=POOL"),
      fetchAllDepts(),
    ]);

    setUsers(Array.isArray(u) ? u : u?.results ?? []);
    setTourismVeh(Array.isArray(v) ? v : v?.results ?? []);
    setBusVehicles(Array.isArray(b) ? b : b?.results ?? []);
    setDepartments(d);

  } catch (e) { console.error(e); }
  finally { setLoading(false); }
}, []);
  useEffect(() => { loadAll(); }, [loadAll]);

  const filtered = users.filter(u => {
    const q  = search.toLowerCase();
    const ms = !q || [u.first_name, u.last_name, u.email, u.department_name, u.employee_id]
      .some(x => (x || "").toLowerCase().includes(q));
    return ms && (!filterRole || u.role === filterRole);
  });

  const openAdd  = () => { setEditUser(null); setShowForm(true); setFormErr(""); };
  const openEdit = (u) => { setEditUser(u);   setShowForm(true); setFormErr(""); };
  const closeForm= () => { setShowForm(false); setEditUser(null); setFormErr(""); };

const handleSave = async (data) => {
  setSaving(true); setFormErr("");
  try {
    // ── DEBUG : afficher ce qu'on envoie et ce que le backend répond ──
    console.log("DATA envoyée :", JSON.stringify(data, null, 2));
    
    const res = editUser
      ? await apiFetch(`/auth/users/${editUser.id}/update-with-vehicle/`, { method:"PATCH", body:JSON.stringify(data) })
      : await apiFetch("/auth/users/create-with-vehicle/", { method:"POST", body:JSON.stringify(data) });
    
    closeForm(); loadAll();
  } catch (e) {
    console.log("ERREUR brute :", e.message);
    try {
      const err = JSON.parse(e.message);
      console.log("ERREUR parsée :", err);
      setFormErr(Object.entries(err).map(([k,v]) =>
        `${k}: ${Array.isArray(v)?v.join(", "):v}`).join(" — "));
    } catch { setFormErr("Erreur : " + e.message); }
  } finally { setSaving(false); }
};

  const handleToggleActive = async (user) => {
    if (!window.confirm(`${user.is_active?"Désactiver":"Activer"} ${user.first_name} ${user.last_name} ?`)) return;
    setDeleting(user.id);
    try {
      if (user.is_active) { await apiFetch(`/auth/users/${user.id}/`, {method:"DELETE"}); }
      else { await apiFetch(`/auth/users/${user.id}/activate/`, {method:"POST"}); }
      loadAll();
    } catch(e) { alert("Erreur : "+e.message); }
    finally { setDeleting(null); }
  };

  const counts = {
    "":         users.length,
    PERSONNEL:  users.filter(u=>u.role==="PERSONNEL").length,
    CHAUFFEUR:  users.filter(u=>u.role==="CHAUFFEUR").length,
    TECHNICIEN: users.filter(u=>u.role==="TECHNICIEN").length,
  };

  return (
    <>
      {showForm && (
        <UserModal
          initial={editUser}
          tourismVeh={tourismVeh}
          busVehicles={busVehicles}
          departments={departments}
          onSave={handleSave}
          onClose={closeForm}
          saving={saving}
          error={formErr}
        />
      )}

      <div style={S.section}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {ROLE_TABS.map(t => (
              <button key={t.value} onClick={() => setFilterRole(t.value)}
                style={{ padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:600,
                  cursor:"pointer", fontFamily:"inherit", border:"none",
                  background: filterRole===t.value ? t.color : C.bg,
                  color:      filterRole===t.value ? "#fff"  : C.textMid,
                  transition:"all .15s" }}>
                {t.icon} {t.label}
                <span style={{ marginLeft:6, fontSize:10, fontWeight:800,
                  background: filterRole===t.value ? "rgba(255,255,255,0.25)" : t.color+"20",
                  color:      filterRole===t.value ? "#fff" : t.color,
                  padding:"1px 6px", borderRadius:99 }}>
                  {counts[t.value]}
                </span>
              </button>
            ))}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <input placeholder="Rechercher…" value={search}
              onChange={e=>setSearch(e.target.value)} style={S.search} />
            <button onClick={openAdd} style={S.btn} className="btn-primary">+ Ajouter</button>
          </div>
        </div>

        {loading ? <Empty text="Chargement…" icon="⏳" />
          : filtered.length===0 ? <Empty text="Aucun utilisateur trouvé" />
          : <div style={{ overflowX:"auto" }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    {["Nom / Matricule","Rôle","Email","Téléphone","Département","Véhicule","Statut","Actions"].map(h=>(
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u=>(
                    <tr key={u.id} className="tr-row">
                      <td style={S.td}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:34, height:34, borderRadius:"50%",
                            background: u.is_active ? C.green : "#CCC",
                            color:"#fff", display:"flex", alignItems:"center",
                            justifyContent:"center", fontWeight:800, fontSize:12, flexShrink:0 }}>
                            {u.first_name?.[0]}{u.last_name?.[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight:700, fontSize:13, color:C.text }}>
                              {u.first_name} {u.last_name}
                            </div>
                            <div style={{ fontSize:10, color:C.textLight }}>{u.employee_id||"—"}</div>
                          </div>
                        </div>
                      </td>
                      <td style={S.td}>
                        <RoleBadge role={u.role} />
                        <SubTypeBadge user={u} />
                      </td>
                      <td style={S.td}><span style={{ fontSize:11 }}>{u.email}</span></td>
                      <td style={S.td}>{u.phone||"—"}</td>
                      <td style={S.td}>{u.department_name||u.department||"—"}</td>
                      <td style={S.td}><VehicleCell user={u} /></td>
                      <td style={S.td}>
                        <span style={{ display:"inline-flex", alignItems:"center", gap:4,
                          padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700,
                          background: u.is_active ? C.greenLight : "#F5F5F5",
                          color:      u.is_active ? C.green : "#888" }}>
                          <span style={{ width:5, height:5, borderRadius:"50%",
                            background: u.is_active ? C.green : "#888", display:"inline-block" }}/>
                          {u.is_active ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td style={S.td}>
                        <div style={{ display:"flex", gap:5 }}>
                          <button onClick={()=>openEdit(u)}
                            style={{ padding:"4px 9px", border:"none", borderRadius:5,
                              fontSize:11, fontWeight:600, cursor:"pointer",
                              background:C.blueLight, color:C.blue, fontFamily:"inherit" }}>
                            Modifier
                          </button>
                          <button onClick={()=>handleToggleActive(u)} disabled={deleting===u.id}
                            style={{ padding:"4px 9px", border:"none", borderRadius:5,
                              fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
                              background: u.is_active ? C.redLight : C.greenLight,
                              color:      u.is_active ? C.red      : C.green,
                              opacity: deleting===u.id ? 0.6 : 1 }}>
                            {deleting===u.id ? "…" : u.is_active ? "Désactiver" : "Activer"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>
    </>
  );
}

// ── MODAL UTILISATEUR ─────────────────────────────────────────────────────────
function UserModal({ initial, tourismVeh, busVehicles, departments, onSave, onClose, saving, error }) {
  const isEdit = !!initial;

  const [form, setForm] = useState({
    employee_id:         initial?.employee_id                          || "",
    first_name:          initial?.first_name                          || "",
    last_name:           initial?.last_name                           || "",
    email:               initial?.email                               || "",
    password:            "",
    phone:               initial?.phone                               || "",
    role:                initial?.role                                || "PERSONNEL",
    personnel_type:      initial?.personnel_type                      || "DIRECTEUR",
    department:          initial?.department                          || "",
    assigned_vehicle:    initial?.assigned_vehicle?.id               ?? null,
    driver_type:         initial?.driver_profile?.assignment_type     || "POOL",
    license_number:      initial?.driver_profile?.license_number      || "",
    license_category:    initial?.driver_profile?.license_category    || "B",
    license_expiry_date: initial?.driver_profile?.license_expiry_date || "",
    years_of_experience: initial?.driver_profile?.years_of_experience || 0,
    assigned_bus:        initial?.driver_profile?.assigned_vehicle?.id ?? null,
    school: initial?.school || "", 
  });

  const set    = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const setVal = (k,v) => setForm(f=>({...f,[k]:v}));

  const isPersonnel = form.role === "PERSONNEL";
  const isDirecteur = isPersonnel && form.personnel_type === "DIRECTEUR";
  const isChauffeur = form.role === "CHAUFFEUR";
  const isBusSco    = isChauffeur && form.driver_type === "BUS_SCOLAIRE";

  const tourismDispo = tourismVeh.filter(v =>
    !v.director_user_id || v.director_user_id === initial?.id
  );
  const busDispo = busVehicles.filter(v =>
    v.assignment_type === "POOL" || initial?.driver_profile?.assigned_vehicle?.id === v.id
  );

  const handleSubmit = e => {
    e.preventDefault();

    const data = {
      employee_id:    form.employee_id,
      first_name:     form.first_name,
      last_name:      form.last_name,
      email:          form.email,
      phone:          form.phone,
      role:           form.role,
      personnel_type: isPersonnel ? form.personnel_type : "",
      school:         isPersonnel ? form.school : "",   
    };

    if (isPersonnel) data.department = form.department;
    if (form.password) data.password = form.password;

    // Véhicule directeur — optionnel, peut être null
    if (isDirecteur) {
      data.assigned_vehicle = form.assigned_vehicle; // peut être null
    } else {
      data.assigned_vehicle = null;
    }

    if (isChauffeur) {
      data.driver_assignment_type = form.driver_type;
      data.license_number         = form.license_number;
      data.license_category       = form.license_category;
      data.license_expiry_date    = form.license_expiry_date;
      data.years_of_experience    = parseInt(form.years_of_experience) || 0;
      // Bus — optionnel aussi
      data.assigned_bus = isBusSco ? form.assigned_bus : null;
    }

    onSave(data);
  };

  return (
    <div style={M.overlay} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={M.modal}>
        <div style={M.header}>
          <span style={M.title}>
            {isEdit ? `Modifier — ${initial.first_name} ${initial.last_name}` : "Ajouter un utilisateur"}
          </span>
          <button onClick={onClose} style={M.closeBtn}>✕</button>
        </div>
        {error && <div style={M.errorBar}>{error}</div>}

        <form onSubmit={handleSubmit} style={M.body}>

          {/* ── Rôle ── */}
          <div style={M.secTitle}>Rôle</div>
          <div style={{ display:"flex", gap:8 }}>
            {[
              { val:"PERSONNEL",  icon:"🏢", label:"Personnel",  color:C.blue  },
              { val:"CHAUFFEUR",  icon:"🚗", label:"Chauffeur",  color:C.green },
              { val:"TECHNICIEN", icon:"🔧", label:"Technicien", color:C.amber },
            ].map(({val,icon,label,color})=>(
              <button key={val} type="button" onClick={()=>setVal("role",val)}
                style={{ flex:1, padding:"12px 8px", borderRadius:10, cursor:"pointer",
                  border:`2px solid ${form.role===val?color:C.border}`,
                  background: form.role===val ? color+"18" : C.bg,
                  display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                  transition:"all .15s" }}>
                <span style={{ fontSize:22 }}>{icon}</span>
                <span style={{ fontSize:11, fontWeight:700,
                  color:form.role===val?color:C.textMid }}>{label}</span>
              </button>
            ))}
          </div>

          {/* ── Type Personnel ── */}
          {isPersonnel && (
            <>
              <div style={M.secTitle}>Type de personnel</div>
              <div style={{ display:"flex", gap:8 }}>
                {[
                  { val:"DIRECTEUR", icon:"🎖️", label:"Directeur",          desc:"Peut avoir un véhicule de fonction", color:C.blue    },
                  { val:"CHEF_DEPT", icon:"📋", label:"Chef de département", desc:"Sans véhicule assigné",              color:C.textMid },
                ].map(({val,icon,label,desc,color})=>(
                  <button key={val} type="button" onClick={()=>setVal("personnel_type",val)}
                    style={{ flex:1, padding:"12px 10px", borderRadius:10, cursor:"pointer",
                      border:`2px solid ${form.personnel_type===val?color:C.border}`,
                      background: form.personnel_type===val ? color+"12" : C.bg,
                      display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                      transition:"all .15s" }}>
                    <span style={{ fontSize:22 }}>{icon}</span>
                    <span style={{ fontSize:12, fontWeight:700,
                      color:form.personnel_type===val?color:C.textMid }}>{label}</span>
                    <span style={{ fontSize:10, color:C.textLight, textAlign:"center" }}>{desc}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── Type Chauffeur ── */}
          {isChauffeur && (
            <>
              <div style={M.secTitle}>Type de chauffeur</div>
              <div style={{ display:"flex", gap:8 }}>
                {[
                  { val:"POOL",         icon:"🚗", label:"Polyvalent",   desc:"Toutes les réservations", color:C.green },
                  { val:"BUS_SCOLAIRE", icon:"🚌", label:"Bus scolaire", desc:"Ramassage du matin",      color:C.blue  },
                ].map(({val,icon,label,desc,color})=>(
                  <button key={val} type="button" onClick={()=>setVal("driver_type",val)}
                    style={{ flex:1, padding:"12px 10px", borderRadius:10, cursor:"pointer",
                      border:`2px solid ${form.driver_type===val?color:C.border}`,
                      background: form.driver_type===val ? color+"12" : C.bg,
                      display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                      transition:"all .15s" }}>
                    <span style={{ fontSize:22 }}>{icon}</span>
                    <span style={{ fontSize:12, fontWeight:700,
                      color:form.driver_type===val?color:C.textMid }}>{label}</span>
                    <span style={{ fontSize:10, color:C.textLight, textAlign:"center" }}>{desc}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── Infos personnelles ── */}
          <div style={M.secTitle}>Informations personnelles</div>
          <div style={M.grid2}>
            <Fld label="Matricule *" required value={form.employee_id}
              onChange={set("employee_id")} placeholder="IUC-DIR-001" />
            <div/>
            <Fld label="Prénom *" required value={form.first_name}
              onChange={set("first_name")} placeholder="Jean" />
            <Fld label="Nom *" required value={form.last_name}
              onChange={set("last_name")} placeholder="KAMGA" />
            <Fld label="Email *" required value={form.email}
              onChange={set("email")} type="email" placeholder="jean@iuc.cm" />
            <Fld label="Téléphone" value={form.phone}
              onChange={set("phone")} placeholder="+237 6XX XXX XXX" />
          </div>

       

{/* ── École — PERSONNEL uniquement ── */}
{isPersonnel && (
  <>
    <div style={M.secTitle}>
      {isDirecteur ? "École dirigée" : "École du département"}
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
      {[
        { val:"3IAC",            label:"3IAC",            icon:"💻", desc:"Informatique" },
        { val:"ISTDI",           label:"ISTDI",           icon:"⚙️",  desc:"Technologies & Design" },
        { val:"ICIA",            label:"ICIA",            icon:"📊", desc:"Commerce & Ingénierie" },
        { val:"SEAS",            label:"SEAS",            icon:"🌍", desc:"Ingénierie anglophone" },
        { val:"GRADUATE_SCHOOL", label:"Graduate School", icon:"🎓", desc:"Masters & MBA" },
      ].map(({ val, label, icon, desc }) => (
        <button key={val} type="button"
          onClick={() => setForm(f => ({ ...f, school: val, department: "" }))}
          style={{
            padding:"10px 8px", borderRadius:10, cursor:"pointer",
            border:`2px solid ${form.school === val ? C.blue : C.border}`,
            background: form.school === val ? C.blueLight : C.bg,
            display:"flex", flexDirection:"column", alignItems:"center",
            gap:4, transition:"all .15s",
          }}>
          <span style={{ fontSize:22 }}>{icon}</span>
          <span style={{ fontSize:11, fontWeight:700,
            color: form.school === val ? C.blue : C.textMid }}>{label}</span>
          <span style={{ fontSize:9, color:C.textLight, textAlign:"center" }}>{desc}</span>
          {form.school === val &&
            <span style={{ fontSize:9, color:C.blue, fontWeight:800 }}>✓</span>}
        </button>
      ))}
    </div>

  {/* Info directeur */}
    {isDirecteur && form.school && (
      <div style={{ fontSize:12, color:C.blue, background:C.blueLight,
        borderRadius:8, padding:"10px 14px", border:`1px solid ${C.blue}20` }}>
        🎖️ Directeur de l'école <b>{form.school}</b>.
      </div>
    )}

    {/* Département — Chef de département uniquement */}
    {!isDirecteur && form.school && <DeptSelector
      school={form.school}
      departments={departments}
      selected={form.department}
      onSelect={(id) => setVal("department", id)}
    />}

  </>
)}


          {/* Mot de passe */}
          <div style={M.secTitle}>{isEdit ? "Nouveau mot de passe" : "Mot de passe"}</div>
          <Fld
            label={isEdit ? "Laisser vide = inchangé" : "Laisser vide = driveparc2026!"}
            required={false}
            value={form.password}
            onChange={set("password")}
            type="password"
            placeholder="Défaut : driveparc2026!"
          />

          {/* ── Véhicule directeur — OPTIONNEL ── */}
          {isDirecteur && (
            <>
              <div style={M.secTitle}>
                Véhicule de fonction
                <span style={{ fontSize:10, fontWeight:400, color:C.textLight, marginLeft:8 }}>
                  optionnel — peut être assigné plus tard dans Véhicules
                </span>
              </div>
              {tourismDispo.length === 0
                ? <div style={{ fontSize:12, color:C.textLight, background:C.bg,
                    borderRadius:8, padding:"12px 14px", border:`1px dashed ${C.border}` }}>
                    Aucun véhicule de tourisme disponible pour l'instant.
                    Vous pourrez en assigner un plus tard depuis le module Véhicules.
                  </div>
                : <>
                    {/* Option "aucun véhicule pour l'instant" */}
                    <div onClick={()=>setVal("assigned_vehicle", null)}
                      style={{ padding:"10px 12px", borderRadius:8, cursor:"pointer", marginBottom:8,
                        border:`2px solid ${form.assigned_vehicle===null ? C.border : C.border}`,
                        background: form.assigned_vehicle===null ? C.bg : C.white,
                        display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:18 }}>⏳</span>
                      <div>
                        <div style={{ fontSize:12, fontWeight:600, color:C.textMid }}>
                          Aucun véhicule pour l'instant
                        </div>
                        <div style={{ fontSize:10, color:C.textLight }}>
                          À assigner plus tard depuis le module Véhicules
                        </div>
                      </div>
                      {form.assigned_vehicle===null &&
                        <span style={{ color:C.green, fontWeight:800, marginLeft:"auto" }}>✓</span>}
                    </div>

                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8,
                      maxHeight:200, overflowY:"auto" }}>
                      {tourismDispo.map(v=>{
                        const sel = form.assigned_vehicle === v.id;
                        return (
                          <div key={v.id} onClick={()=>setVal("assigned_vehicle", v.id)}
                            style={{ padding:"10px 12px", borderRadius:8, cursor:"pointer",
                              border:`2px solid ${sel ? C.green : C.border}`,
                              background: sel ? C.greenLight : C.bg,
                              display:"flex", alignItems:"center", gap:10, transition:"all .15s" }}>
                            <span style={{ fontSize:20 }}>🚗</span>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:13, fontWeight:700, color:C.text }}>
                                {v.registration_number}
                              </div>
                              <div style={{ fontSize:11, color:C.textMid }}>
                                {v.make} {v.model} · {v.year}
                              </div>
                              <div style={{ fontSize:10, color:C.textLight }}>
                                {v.color} · {v.seating_capacity} pl.
                              </div>
                            </div>
                            {sel && <span style={{ color:C.green, fontWeight:800, fontSize:16 }}>✓</span>}
                          </div>
                        );
                      })}
                    </div>
                  </>
              }
            </>
          )}

          {/* ── Bus scolaire — OPTIONNEL ── */}
          {isBusSco && (
            <>
              <div style={M.secTitle}>
                Bus scolaire assigné
                <span style={{ fontSize:10, fontWeight:400, color:C.textLight, marginLeft:8 }}>
                  optionnel — peut être assigné plus tard
                </span>
              </div>
              {busDispo.length === 0
                ? <div style={{ fontSize:12, color:C.textLight, background:C.bg,
                    borderRadius:8, padding:"12px 14px", border:`1px dashed ${C.border}` }}>
                    Aucun bus disponible. À assigner plus tard depuis le module Véhicules.
                  </div>
                : <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8,
                    maxHeight:200, overflowY:"auto" }}>
                    <div onClick={()=>setVal("assigned_bus", null)}
                      style={{ padding:"10px 12px", borderRadius:8, cursor:"pointer",
                        border:`2px solid ${C.border}`, background:C.bg,
                        display:"flex", alignItems:"center", gap:8 }}>
                      <span>⏳</span>
                      <span style={{ fontSize:12, color:C.textMid }}>Aucun bus pour l'instant</span>
                      {form.assigned_bus===null &&
                        <span style={{ color:C.green, fontWeight:800, marginLeft:"auto" }}>✓</span>}
                    </div>
                    {busDispo.map(v=>{
                      const sel = form.assigned_bus === v.id;
                      return (
                        <div key={v.id} onClick={()=>setVal("assigned_bus", v.id)}
                          style={{ padding:"10px 12px", borderRadius:8, cursor:"pointer",
                            border:`2px solid ${sel ? C.blue : C.border}`,
                            background: sel ? C.blueLight : C.bg,
                            display:"flex", alignItems:"center", gap:10, transition:"all .15s" }}>
                          <span style={{ fontSize:20 }}>🚌</span>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:700, color:C.text }}>
                              {v.registration_number}
                            </div>
                            <div style={{ fontSize:11, color:C.textMid }}>
                              {v.make} {v.model} · {v.seating_capacity} pl.
                            </div>
                          </div>
                          {sel && <span style={{ color:C.blue, fontWeight:800, fontSize:16 }}>✓</span>}
                        </div>
                      );
                    })}
                  </div>
              }
            </>
          )}

          {/* ── Permis chauffeur ── */}
          {isChauffeur && (
            <>
              <div style={M.secTitle}>Permis de conduire</div>
              <div style={M.grid2}>
                <Fld label="Numéro de permis *" required value={form.license_number}
                  onChange={set("license_number")} placeholder="CM-XXX-2020" />
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  <label style={{ fontSize:11, fontWeight:700, color:C.textMid,
                    textTransform:"uppercase", letterSpacing:"0.8px" }}>Catégorie *</label>
                  <select value={form.license_category} onChange={set("license_category")}
                    style={{ ...S.search, width:"100%" }}>
                    {["A","B","C","D","E","BC","CD"].map(c=>(
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <Fld label="Date d'expiration *" required value={form.license_expiry_date}
                  onChange={set("license_expiry_date")} type="date" />
                <Fld label="Années d'expérience" value={String(form.years_of_experience)}
                  onChange={set("years_of_experience")} type="number" min="0" />
              </div>
            </>
          )}

          {/* Footer */}
          <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:20,
            paddingTop:16, borderTop:`1px solid ${C.border}` }}>
            <button type="button" onClick={onClose} style={S.ghostBtn}>Annuler</button>
            <button type="submit" disabled={saving}
              style={{ ...S.btn, opacity:saving?0.7:1 }}>
              {saving ? "Enregistrement…" : isEdit ? "Modifier" : "Créer l'utilisateur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Composants utilitaires ────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const map = {
    PERSONNEL:    {label:"Personnel",   bg:C.blueLight, color:C.blue},
    CHAUFFEUR:    {label:"Chauffeur",   bg:C.greenLight,color:C.green},
    TECHNICIEN:   {label:"Technicien",  bg:C.amberLight,color:C.amber},
    GESTIONNAIRE: {label:"Gestionnaire",bg:"#F5F3FF",   color:"#7C3AED"},
    ADMIN:        {label:"Admin",       bg:"#FEF2F2",   color:C.red},
  };
  const m = map[role]||{label:role,bg:"#F5F5F5",color:"#888"};
  return (
    <span style={{ display:"inline-block",padding:"2px 8px",borderRadius:99,
      fontSize:10,fontWeight:700,background:m.bg,color:m.color }}>{m.label}</span>
  );
}

function SubTypeBadge({ user }) {
  if (user.role==="PERSONNEL" && user.personnel_type) {
    const map = {
      DIRECTEUR: {label:"Directeur",     icon:"🎖️",color:C.blue},
      CHEF_DEPT: {label:"Chef de dept.", icon:"📋",color:C.textMid},
    };
    const m = map[user.personnel_type]; if(!m) return null;
    return <div style={{ fontSize:10,color:m.color,marginTop:2 }}>{m.icon} {m.label}</div>;
  }
  if (user.role==="CHAUFFEUR" && user.driver_profile) {
    const isBus = user.driver_profile.assignment_type==="BUS_SCOLAIRE";
    return <div style={{ fontSize:10,color:isBus?C.blue:C.green,marginTop:2 }}>
      {isBus?"🚌 Bus scolaire":"🚗 Polyvalent"}
    </div>;
  }
  return null;
}
function DeptSelector({ school, departments, selected, onSelect }) {
  const deptsFiltres = departments.filter(d =>
    String(d.school || "").trim() === String(school).trim()
  );

  if (deptsFiltres.length === 0) {
    return (
      <div style={{ fontSize:12, color:"#888", background:"#F4F6F5",
        borderRadius:8, padding:"10px 14px", marginTop:8 }}>
        Aucun département trouvé pour "{school}" (total chargé: {departments.length})
      </div>
    );
  }

  return (
    <div style={{ marginTop:8 }}>
      <div style={{ fontSize:11, fontWeight:700, color:"#4A6358",
        textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8 }}>
        Département *
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8,
        maxHeight:200, overflowY:"auto" }}>
        {deptsFiltres.map(d => {
          const sel = String(selected) === String(d.id);
          return (
            <div key={d.id} onClick={() => onSelect(d.id)}
              style={{ padding:"10px 12px", borderRadius:8, cursor:"pointer",
                border:`2px solid ${sel ? "#1B5E37" : "#E2E8E5"}`,
                background: sel ? "#EAF4EE" : "#F4F6F5",
                display:"flex", alignItems:"center", gap:8,
                transition:"all .15s" }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700,
                  color: sel ? "#1B5E37" : "#1A2820" }}>{d.name}</div>
                <div style={{ fontSize:10, color:"#8EA99A" }}>{d.code}</div>
              </div>
              {sel && <span style={{ color:"#1B5E37", fontWeight:800 }}>✓</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
function VehicleCell({ user }) {
  if (user.role==="PERSONNEL" && user.assigned_vehicle) {
    const v = user.assigned_vehicle;
    return (
      <div>
        <div style={{ fontSize:11,fontWeight:700,color:C.text }}>
          🚗 {typeof v==="object" ? v.registration_number : "Assigné"}
        </div>
        {typeof v==="object" &&
          <div style={{ fontSize:10,color:C.textLight }}>{v.make} {v.model}</div>}
      </div>
    );
  }
  if (user.role==="CHAUFFEUR" && user.driver_profile?.assigned_vehicle_info) {
    const b = user.driver_profile.assigned_vehicle_info;
    return (
      <div>
        <div style={{ fontSize:11,fontWeight:700,color:C.blue }}>🚌 {b.registration_number}</div>
        <div style={{ fontSize:10,color:C.textLight }}>{b.make} {b.model}</div>
      </div>
    );
  }
  return <span style={{ fontSize:11,color:C.textLight }}>—</span>;
}

function Fld({ label,value,onChange,required,type="text",placeholder,...rest }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
      <label style={{ fontSize:11,fontWeight:700,color:C.textMid,
        textTransform:"uppercase",letterSpacing:"0.8px" }}>{label}</label>
      <input type={type} value={value} onChange={onChange} required={required}
        placeholder={placeholder} style={{ ...S.search,width:"100%" }} {...rest} />
    </div>
  );
}