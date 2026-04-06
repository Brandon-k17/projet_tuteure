// ─── src/utilisateurs/Utilisateurs.jsx ──────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "../utils/api";
import { C, S, M } from "../constants/index";
import { Empty } from "../components/ui";


const PERSONNEL_TYPES = [
  ["DIRECTEUR", "Directeur",           "🎖️"],
  ["CHEF_DEPT", "Chef de département", "📋"],
  ["AUTRE",     "Autre personnel",     "👤"],
];

const DRIVER_TYPES = [
  ["POOL",         "Chauffeur polyvalent",   "🚗"],
  ["BUS_SCOLAIRE", "Chauffeur bus scolaire", "🚌"],
];

const ROLE_TABS = [
  { value:"",           label:"Tous",        icon:"👥", color:C.textMid },
  { value:"PERSONNEL",  label:"Personnel",   icon:"🏢", color:C.blue   },
  { value:"CHAUFFEUR",  label:"Chauffeurs",  icon:"🚗", color:C.green  },
  { value:"TECHNICIEN", label:"Techniciens", icon:"🔧", color:C.amber  },
];

const MAIN_TABS = [
  { id:"users",    label:"Utilisateurs", icon:"👥" },
  { id:"registry", label:"Registre RH",  icon:"📋" },
];

export function TabUtilisateurs() {
  const [mainTab, setMainTab] = useState("users");
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", gap:8 }}>
        {MAIN_TABS.map(t => (
          <button key={t.id} onClick={() => setMainTab(t.id)}
            style={{ padding:"7px 18px", borderRadius:8, fontSize:12, fontWeight:700,
              cursor:"pointer", fontFamily:"inherit", border:"none",
              background: mainTab === t.id ? C.green : C.bg,
              color:      mainTab === t.id ? "#fff" : C.textMid,
              transition:"all .15s" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {mainTab === "users"    && <PanelUsers />}
      {mainTab === "registry" && <PanelRegistry />}
    </div>
  );
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
      const [u, v, b, d] = await Promise.all([
        apiFetch("/auth/users/"),
        apiFetch("/vehicles/?category=TOURISME"),
        apiFetch("/vehicles/?category=BUS"),
        apiFetch("/auth/departments/"),
      ]);
      setUsers(Array.isArray(u) ? u : u?.results ?? []);
      setTourismVeh(Array.isArray(v) ? v : v?.results ?? []);
      setBusVehicles(Array.isArray(b) ? b : b?.results ?? []);
      setDepartments(Array.isArray(d) ? d : d?.results ?? []);
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
      if (editUser) {
        await apiFetch(`/auth/users/${editUser.id}/update-with-vehicle/`, { method:"PATCH", body:JSON.stringify(data) });
      } else {
        await apiFetch("/auth/users/create-with-vehicle/", { method:"POST", body:JSON.stringify(data) });
      }
      closeForm(); loadAll();
    } catch (e) {
      try {
        const err = JSON.parse(e.message);
        setFormErr(Object.entries(err).map(([k,v]) => `${k}: ${Array.isArray(v)?v.join(", "):v}`).join(" — "));
      } catch { setFormErr("Erreur: " + e.message); }
    } finally { setSaving(false); }
  };

  const handleToggleActive = async (user) => {
    if (!window.confirm(`${user.is_active?"Désactiver":"Activer"} ${user.first_name} ${user.last_name}?`)) return;
    setDeleting(user.id);
    try {
      if (user.is_active) { await apiFetch(`/auth/users/${user.id}/`, {method:"DELETE"}); }
      else { await apiFetch(`/auth/users/${user.id}/activate/`, {method:"POST"}); }
      loadAll();
    } catch(e) { alert("Erreur: "+e.message); }
    finally { setDeleting(null); }
  };

  const counts = { "":users.length, PERSONNEL:users.filter(u=>u.role==="PERSONNEL").length, CHAUFFEUR:users.filter(u=>u.role==="CHAUFFEUR").length, TECHNICIEN:users.filter(u=>u.role==="TECHNICIEN").length };

  return (
    <>
      {showForm && <UserModal initial={editUser} tourismVeh={tourismVeh} busVehicles={busVehicles} departments={departments} onSave={handleSave} onClose={closeForm} saving={saving} error={formErr} />}
      <div style={S.section}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {ROLE_TABS.map(t => (
              <button key={t.value} onClick={() => setFilterRole(t.value)}
                style={{ padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", border:"none", background:filterRole===t.value?t.color:C.bg, color:filterRole===t.value?"#fff":C.textMid, transition:"all .15s" }}>
                {t.icon} {t.label}
                <span style={{ marginLeft:6, fontSize:10, fontWeight:800, background:filterRole===t.value?"rgba(255,255,255,0.25)":t.color+"20", color:filterRole===t.value?"#fff":t.color, padding:"1px 6px", borderRadius:99 }}>{counts[t.value]}</span>
              </button>
            ))}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <input placeholder="Rechercher…" value={search} onChange={e=>setSearch(e.target.value)} style={S.search} />
            <button onClick={openAdd} style={S.btn} className="btn-primary">+ Ajouter</button>
          </div>
        </div>
        {loading ? <Empty text="Chargement…" icon="⏳" /> : filtered.length===0 ? <Empty text="Aucun utilisateur trouvé" /> :
          <div style={{ overflowX:"auto" }}>
            <table style={S.table}>
              <thead><tr>{["Nom / Matricule","Rôle / Type","Email","Téléphone","Département","Véhicule","Statut","Actions"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} className="tr-row">
                    <td style={S.td}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:34, height:34, borderRadius:"50%", background:u.is_active?C.green:"#CCC", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:12, flexShrink:0 }}>{u.first_name?.[0]}{u.last_name?.[0]}</div>
                        <div><div style={{ fontWeight:700, fontSize:13, color:C.text }}>{u.first_name} {u.last_name}</div><div style={{ fontSize:10, color:C.textLight }}>{u.employee_id||"—"}</div></div>
                      </div>
                    </td>
                    <td style={S.td}><RoleBadge role={u.role} /><SubTypeBadge user={u} /></td>
                    <td style={S.td}><span style={{ fontSize:11 }}>{u.email}</span></td>
                    <td style={S.td}>{u.phone||"—"}</td>
                    <td style={S.td}>{u.department_name||u.department||"—"}</td>
                    <td style={S.td}><VehicleCell user={u} /></td>
                    <td style={S.td}>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700, background:u.is_active?C.greenLight:"#F5F5F5", color:u.is_active?C.green:"#888" }}>
                        <span style={{ width:5, height:5, borderRadius:"50%", background:u.is_active?C.green:"#888", display:"inline-block" }}/>{u.is_active?"Actif":"Inactif"}
                      </span>
                    </td>
                    <td style={S.td}>
                      <div style={{ display:"flex", gap:5 }}>
                        <button onClick={()=>openEdit(u)} style={{ padding:"4px 9px", border:"none", borderRadius:5, fontSize:11, fontWeight:600, cursor:"pointer", background:C.blueLight, color:C.blue, fontFamily:"inherit" }}>Modifier</button>
                        <button onClick={()=>handleToggleActive(u)} disabled={deleting===u.id} style={{ padding:"4px 9px", border:"none", borderRadius:5, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", background:u.is_active?C.redLight:C.greenLight, color:u.is_active?C.red:C.green, opacity:deleting===u.id?0.6:1 }}>{deleting===u.id?"…":u.is_active?"Désactiver":"Activer"}</button>
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

function UserModal({ initial, tourismVeh, busVehicles, departments, onSave, onClose, saving, error }) {
  const isEdit = !!initial;
  const lookupTimer = useRef(null);
  const [registryEntry, setRegistryEntry] = useState(null);
  const [lookupStatus,  setLookupStatus]  = useState("idle");
  const [lookupDone,    setLookupDone]    = useState(isEdit);

  const [form, setForm] = useState({
    first_name: initial?.first_name || "", last_name: initial?.last_name || "",
    email: initial?.email || "", password: "", phone: initial?.phone || "",
    role: initial?.role || "PERSONNEL", personnel_type: initial?.personnel_type || "AUTRE",
    department: initial?.department || "", employee_id: initial?.employee_id || "",
    assigned_vehicle: initial?.assigned_vehicle?.id ?? null,
    driver_assignment_type: initial?.driver_profile?.assignment_type || "POOL",
    license_number: initial?.driver_profile?.license_number || "",
    license_category: initial?.driver_profile?.license_category || "B",
    license_expiry_date: initial?.driver_profile?.license_expiry_date || "",
    years_of_experience: initial?.driver_profile?.years_of_experience || 0,
    assigned_bus: initial?.driver_profile?.assigned_vehicle?.id ?? null,
  });

  const set    = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setVal = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleMatriculeChange = (e) => {
    const val = e.target.value;
    setForm(f => ({ ...f, employee_id: val }));
    setLookupDone(false); setRegistryEntry(null); setLookupStatus("idle");
    if (!val || val.length < 3) return;
    clearTimeout(lookupTimer.current);
    lookupTimer.current = setTimeout(async () => {
      setLookupStatus("loading");
      try {
        const res = await apiFetch(`/auth/registry/lookup/?employee_id=${encodeURIComponent(val)}`);
        if (res?.found) {
          if (res.is_activated) { setLookupStatus("activated"); }
          else {
            setLookupStatus("found"); setRegistryEntry(res); setLookupDone(true);
            setForm(f => ({ ...f, first_name:res.first_name, last_name:res.last_name, department:res.department||f.department, role:res.role_hint||f.role, personnel_type:res.personnel_type_hint||f.personnel_type }));
          }
        } else { setLookupStatus("not_found"); }
      } catch { setLookupStatus("not_found"); }
    }, 500);
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (!isEdit && !lookupDone) { alert("Entrez un matricule valide du registre RH."); return; }
    const data = { first_name:form.first_name, last_name:form.last_name, email:form.email, phone:form.phone, role:form.role, personnel_type:form.role==="PERSONNEL"?form.personnel_type:"", department:form.department, employee_id:form.employee_id };
    if (form.password) data.password = form.password;
    if (form.role==="PERSONNEL" && form.personnel_type==="DIRECTEUR") data.assigned_vehicle = form.assigned_vehicle;
    if (form.role==="CHAUFFEUR") {
      data.driver_assignment_type = form.driver_assignment_type;
      data.license_number = form.license_number; data.license_category = form.license_category;
      data.license_expiry_date = form.license_expiry_date;
      data.years_of_experience = parseInt(form.years_of_experience)||0;
      if (form.driver_assignment_type==="BUS_SCOLAIRE") data.assigned_bus = form.assigned_bus;
    }
    onSave(data);
  };

  const isPersonnel=form.role==="PERSONNEL", isDirecteur=isPersonnel&&form.personnel_type==="DIRECTEUR";
  const isChauffeur=form.role==="CHAUFFEUR", isBusScolaire=isChauffeur&&form.driver_assignment_type==="BUS_SCOLAIRE";
  const vehiculesDispo = tourismVeh.filter(v => !v.director_user_id || v.director_user_id===initial?.id);

  const LookupBanner = () => {
    if (isEdit) return null;
    if (lookupStatus==="loading") return <div style={{ background:C.bg, borderRadius:8, padding:"10px 14px", fontSize:11, color:C.textMid, display:"flex", alignItems:"center", gap:8 }}><div style={{ width:12, height:12, border:`2px solid ${C.green}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin .6s linear infinite" }}/>Recherche dans le registre…</div>;
    if (lookupStatus==="found") return <div style={{ background:C.greenLight, borderRadius:8, padding:"10px 14px", fontSize:11, color:C.green, fontWeight:600 }}>✅ {registryEntry?.full_name} trouvé. Informations pré-remplies.</div>;
    if (lookupStatus==="not_found") return <div style={{ background:C.redLight, borderRadius:8, padding:"10px 14px", fontSize:11, color:C.red, fontWeight:600 }}>❌ Matricule introuvable. Ajoutez ce membre dans l'onglet <b>Registre RH</b> d'abord.</div>;
    if (lookupStatus==="activated") return <div style={{ background:C.amberLight, borderRadius:8, padding:"10px 14px", fontSize:11, color:C.amber, fontWeight:600 }}>⚠️ Un compte existe déjà pour ce matricule.</div>;
    return null;
  };

  return (
    <div style={M.overlay} onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={M.modal}>
        <div style={M.header}><span style={M.title}>{isEdit?`Modifier — ${initial.first_name} ${initial.last_name}`:"Créer un accès utilisateur"}</span><button onClick={onClose} style={M.closeBtn}>✕</button></div>
        {error && <div style={M.errorBar}>{error}</div>}
        <form onSubmit={handleSubmit} style={M.body}>

          <div style={M.secTitle}>{isEdit?"Matricule":"Étape 1 — Matricule du registre RH"}</div>
          {!isEdit && <div style={{ fontSize:11, color:C.textLight, marginBottom:8 }}>Entrez le matricule officiel IUC. Le formulaire se pré-remplira automatiquement.</div>}
          <input value={form.employee_id} onChange={isEdit?set("employee_id"):handleMatriculeChange} placeholder="Ex: IUC-DIR-001" required disabled={isEdit}
            style={{ ...S.search, width:"100%", borderColor:lookupStatus==="found"?C.green:lookupStatus==="not_found"?C.red:lookupStatus==="activated"?C.amber:C.border, background:isEdit?"#F5F5F5":C.white, fontWeight:600, letterSpacing:"1px" }} />
          
          
          <LookupBanner />

          {(lookupDone||isEdit) && <>
            <div style={M.secTitle}>{isEdit?"Rôle":"Étape 2 — Rôle"}</div>
            <div style={{ display:"flex", gap:8 }}>
              {[{val:"PERSONNEL",icon:"🏢",label:"Personnel",color:C.blue},{val:"CHAUFFEUR",icon:"🚗",label:"Chauffeur",color:C.green},{val:"TECHNICIEN",icon:"🔧",label:"Technicien",color:C.amber}].map(({val,icon,label,color})=>(
                <button key={val} type="button" onClick={()=>setVal("role",val)} style={{ flex:1, padding:"12px 8px", borderRadius:10, cursor:"pointer", border:`2px solid ${form.role===val?color:C.border}`, background:form.role===val?color+"18":C.bg, display:"flex", flexDirection:"column", alignItems:"center", gap:4, transition:"all .15s" }}>
                  <span style={{ fontSize:22 }}>{icon}</span><span style={{ fontSize:11, fontWeight:700, color:form.role===val?color:C.textMid }}>{label}</span>
                </button>
              ))}
            </div>

            {isPersonnel && <>
              <div style={M.secTitle}>Type de personnel</div>
              <div style={{ display:"flex", gap:8 }}>
                {PERSONNEL_TYPES.map(([val,label,icon])=>(
                  <button key={val} type="button" onClick={()=>setVal("personnel_type",val)} style={{ flex:1, padding:"10px 8px", borderRadius:9, cursor:"pointer", border:`2px solid ${form.personnel_type===val?C.blue:C.border}`, background:form.personnel_type===val?C.blueLight:C.bg, display:"flex", flexDirection:"column", alignItems:"center", gap:4, transition:"all .15s" }}>
                    <span style={{ fontSize:18 }}>{icon}</span><span style={{ fontSize:11, fontWeight:700, color:form.personnel_type===val?C.blue:C.textMid }}>{label}</span>
                  </button>
                ))}
              </div>
              {isDirecteur && <div style={{ background:C.blueLight, borderRadius:8, padding:"10px 14px", fontSize:11, color:C.blue, fontWeight:600 }}>🎖️ Un directeur peut faire des réservations ET dispose d'un véhicule de fonction.</div>}
            </>}

            {isChauffeur && <>
              <div style={M.secTitle}>Type de chauffeur</div>
              <div style={{ display:"flex", gap:8 }}>
                {DRIVER_TYPES.map(([val,label,icon])=>(
                  <button key={val} type="button" onClick={()=>setVal("driver_assignment_type",val)} style={{ flex:1, padding:"10px 8px", borderRadius:9, cursor:"pointer", border:`2px solid ${form.driver_assignment_type===val?C.green:C.border}`, background:form.driver_assignment_type===val?C.greenLight:C.bg, display:"flex", flexDirection:"column", alignItems:"center", gap:4, transition:"all .15s" }}>
                    <span style={{ fontSize:18 }}>{icon}</span><span style={{ fontSize:11, fontWeight:700, color:form.driver_assignment_type===val?C.green:C.textMid }}>{label}</span>
                  </button>
                ))}
              </div>
            </>}

            <div style={M.secTitle}>{isEdit?"Informations":"Étape 3 — Vérification"}</div>
            <div style={M.grid2}>
              <FldM label="Prénom *" required value={form.first_name} onChange={set("first_name")} placeholder="Jean" readOnly={!isEdit&&lookupDone} />
              <FldM label="Nom *" required value={form.last_name} onChange={set("last_name")} placeholder="KAMGA" readOnly={!isEdit&&lookupDone} />
              <FldM label="Email *" required value={form.email} onChange={set("email")} type="email" placeholder="jean@iuc.cm" />
              <FldM label="Téléphone" value={form.phone} onChange={set("phone")} placeholder="+237 6XX XXX XXX" />
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <label style={{ fontSize:11, fontWeight:700, color:C.textMid, textTransform:"uppercase", letterSpacing:"0.8px" }}>Département *</label>
                <select value={form.department} onChange={set("department")} required style={{ ...S.search, width:"100%" }}>
                  <option value="">— Choisir —</option>
                  {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:4, justifyContent:"flex-end" }}>
                <div style={{ background:C.greenLight, borderRadius:7, padding:"8px 12px", fontSize:11, color:C.green, fontWeight:600 }}>✓ Matricule vérifié : <b>{form.employee_id}</b></div>
              </div>
            </div>

            <div style={M.secTitle}>{isEdit?"Nouveau mot de passe":"Étape 4 — Mot de passe *"}</div>
            <FldM label={isEdit?"Laisser vide = inchangé":"Mot de passe *"} required={!isEdit} value={form.password} onChange={set("password")} type="password" placeholder="Min. 8 caractères" />

            {isDirecteur && <>
              <div style={M.secTitle}>Véhicule de fonction</div>
              <div style={{ fontSize:11, color:C.textLight, marginBottom:10 }}>Véhicules de tourisme disponibles. Les véhicules déjà assignés sont exclus.</div>
              {vehiculesDispo.length===0 ? <div style={{ fontSize:12, color:C.amber, background:C.amberLight, borderRadius:8, padding:"12px 14px" }}>Aucun véhicule disponible. Ajoutez-en dans Véhicules.</div> :
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, maxHeight:200, overflowY:"auto" }}>
                  <div onClick={()=>setVal("assigned_vehicle",null)} style={{ padding:"10px 12px", borderRadius:8, cursor:"pointer", border:`2px solid ${form.assigned_vehicle===null?"#CCC":C.border}`, background:form.assigned_vehicle===null?"#F5F5F5":C.bg, display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:18 }}>🚫</span><span style={{ fontSize:12, color:C.textMid }}>Aucun véhicule</span>{form.assigned_vehicle===null&&<span style={{ color:C.textLight, fontWeight:800, marginLeft:"auto" }}>✓</span>}
                  </div>
                  {vehiculesDispo.map(v=>{ const sel=form.assigned_vehicle===v.id; return (
                    <div key={v.id} onClick={()=>setVal("assigned_vehicle",v.id)} style={{ padding:"10px 12px", borderRadius:8, cursor:"pointer", border:`2px solid ${sel?C.green:C.border}`, background:sel?C.greenLight:C.bg, display:"flex", alignItems:"center", gap:10, transition:"all .15s" }}>
                      <span style={{ fontSize:20 }}>🚗</span>
                      <div style={{ flex:1, minWidth:0 }}><div style={{ fontSize:13, fontWeight:700, color:C.text }}>{v.registration_number}</div><div style={{ fontSize:11, color:C.textMid }}>{v.make} {v.model} · {v.year}</div><div style={{ fontSize:10, color:C.textLight }}>{v.color} · {v.seating_capacity} pl.</div></div>
                      {sel&&<span style={{ color:C.green, fontWeight:800, fontSize:16 }}>✓</span>}
                    </div>
                  );})}
                </div>
              }
            </>}

            {isBusScolaire && <>
              <div style={M.secTitle}>Bus scolaire assigné</div>
              {busVehicles.length===0 ? <div style={{ fontSize:12, color:C.amber, background:C.amberLight, borderRadius:8, padding:"12px 14px" }}>Aucun bus disponible.</div> :
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, maxHeight:180, overflowY:"auto" }}>
                  <div onClick={()=>setVal("assigned_bus",null)} style={{ padding:"10px 12px", borderRadius:8, cursor:"pointer", border:`2px solid ${C.border}`, background:C.bg, display:"flex", alignItems:"center", gap:8 }}><span>🚫</span><span style={{ fontSize:12, color:C.textMid }}>Aucun bus fixe</span></div>
                  {busVehicles.map(v=>{ const sel=form.assigned_bus===v.id; return (
                    <div key={v.id} onClick={()=>setVal("assigned_bus",v.id)} style={{ padding:"10px 12px", borderRadius:8, cursor:"pointer", border:`2px solid ${sel?C.blue:C.border}`, background:sel?C.blueLight:C.bg, display:"flex", alignItems:"center", gap:10, transition:"all .15s" }}>
                      <span style={{ fontSize:20 }}>🚌</span>
                      <div style={{ flex:1, minWidth:0 }}><div style={{ fontSize:13, fontWeight:700, color:C.text }}>{v.registration_number}</div><div style={{ fontSize:11, color:C.textMid }}>{v.make} {v.model} · {v.seating_capacity} pl.</div></div>
                      {sel&&<span style={{ color:C.blue, fontWeight:800, fontSize:16 }}>✓</span>}
                    </div>
                  );})}
                </div>
              }
            </>}

            {isChauffeur && <>
              <div style={M.secTitle}>Permis de conduire</div>
              <div style={M.grid2}>
                <FldM label="Numéro de permis *" required value={form.license_number} onChange={set("license_number")} placeholder="CM-XXX-2020" />
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  <label style={{ fontSize:11, fontWeight:700, color:C.textMid, textTransform:"uppercase", letterSpacing:"0.8px" }}>Catégorie *</label>
                  <select value={form.license_category} onChange={set("license_category")} style={{ ...S.search, width:"100%" }}>
                    {["A","B","C","D","E","BC","CD"].map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <FldM label="Date d'expiration *" required value={form.license_expiry_date} onChange={set("license_expiry_date")} type="date" />
                <FldM label="Années d'expérience" value={String(form.years_of_experience)} onChange={set("years_of_experience")} type="number" min="0" />
              </div>
            </>}
          </>}

          <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:20, paddingTop:16, borderTop:`1px solid ${C.border}` }}>
            <button type="button" onClick={onClose} style={S.ghostBtn}>Annuler</button>
            <button type="submit" disabled={saving||(!isEdit&&!lookupDone)} style={{ ...S.btn, opacity:(saving||(!isEdit&&!lookupDone))?0.5:1 }}>
              {saving?"Enregistrement…":isEdit?"Modifier":"Créer l'accès"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PanelRegistry() {
  const [entries,     setEntries]     = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [filterRole,  setFilterRole]  = useState("");
  const [showForm,    setShowForm]    = useState(false);
  const [editEntry,   setEditEntry]   = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [formErr,     setFormErr]     = useState("");
  const [deleting,    setDeleting]    = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [e, d] = await Promise.all([apiFetch("/auth/registry/"), apiFetch("/auth/departments/")]);
      setEntries(Array.isArray(e)?e:e?.results??[]);
      setDepartments(Array.isArray(d)?d:d?.results??[]);
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filtered = entries.filter(e => {
    const q=search.toLowerCase();
    const ms=!q||[e.employee_id,e.first_name,e.last_name,e.department_name].some(x=>(x||"").toLowerCase().includes(q));
    return ms&&(!filterRole||e.role_hint===filterRole);
  });

  const handleSave = async (data) => {
    setSaving(true); setFormErr("");
    try {
      if (editEntry) { await apiFetch(`/auth/registry/${editEntry.id}/`, {method:"PATCH",body:JSON.stringify(data)}); }
      else { await apiFetch("/auth/registry/", {method:"POST",body:JSON.stringify(data)}); }
      setShowForm(false); setEditEntry(null); loadAll();
    } catch(e) {
      try { setFormErr(Object.values(JSON.parse(e.message)).flat().join(" — ")); }
      catch { setFormErr("Erreur: "+e.message); }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette entrée du registre ?")) return;
    setDeleting(id);
    try { await apiFetch(`/auth/registry/${id}/`, {method:"DELETE"}); loadAll(); }
    catch(e) { alert("Erreur: "+e.message); }
    finally { setDeleting(null); }
  };

  const counts = { "":entries.length, PERSONNEL:entries.filter(e=>e.role_hint==="PERSONNEL").length, CHAUFFEUR:entries.filter(e=>e.role_hint==="CHAUFFEUR").length, TECHNICIEN:entries.filter(e=>e.role_hint==="TECHNICIEN").length };

  return (
    <>
      {showForm && <RegistryModal initial={editEntry} departments={departments} onSave={handleSave} onClose={()=>{setShowForm(false);setEditEntry(null);setFormErr("");}} saving={saving} error={formErr} />}
      <div style={S.section}>
        <div style={{ background:C.blueLight, borderRadius:8, padding:"10px 14px", fontSize:11, color:C.blue, marginBottom:14 }}>
          📋 Le registre RH contient la liste officielle du personnel IUC. Un matricule doit exister ici avant de créer un accès. <b>{entries.filter(e=>!e.is_activated).length} membres</b> sans compte.
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {[{value:"",label:"Tous",color:C.textMid},{value:"PERSONNEL",label:"Personnel",color:C.blue},{value:"CHAUFFEUR",label:"Chauffeurs",color:C.green},{value:"TECHNICIEN",label:"Techniciens",color:C.amber}].map(t=>(
              <button key={t.value} onClick={()=>setFilterRole(t.value)} style={{ padding:"5px 12px", borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", border:"none", background:filterRole===t.value?t.color:C.bg, color:filterRole===t.value?"#fff":C.textMid }}>
                {t.label} <span style={{ fontSize:10, opacity:0.8 }}>({counts[t.value]})</span>
              </button>
            ))}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <input placeholder="Rechercher…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...S.search, width:180 }} />
            <button onClick={()=>{setEditEntry(null);setShowForm(true);setFormErr("");}} style={S.btn} className="btn-primary">+ Ajouter au registre</button>
          </div>
        </div>
        {loading ? <Empty text="Chargement…" icon="⏳" /> : filtered.length===0 ? <Empty text="Registre vide" icon="📋" /> :
          <div style={{ overflowX:"auto" }}>
            <table style={S.table}>
              <thead><tr>{["Matricule","Nom complet","Département","Rôle suggéré","Compte","Actions"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map(e=>(
                  <tr key={e.id} className="tr-row">
                    <td style={S.td}><b style={{ color:C.text, fontSize:12, letterSpacing:"1px" }}>{e.employee_id}</b></td>
                    <td style={S.td}><div style={{ fontWeight:600, fontSize:13, color:C.text }}>{e.first_name} {e.last_name}</div></td>
                    <td style={S.td}>{e.department_name||"—"}</td>
                    <td style={S.td}><RoleBadge role={e.role_hint} /></td>
                    <td style={S.td}>
                      {e.is_activated
                        ? <span style={{ fontSize:10, fontWeight:700, color:C.green, background:C.greenLight, padding:"2px 8px", borderRadius:99 }}>✓ Compte actif</span>
                        : <span style={{ fontSize:10, fontWeight:700, color:C.amber, background:C.amberLight, padding:"2px 8px", borderRadius:99 }}>Pas de compte</span>}
                    </td>
                    <td style={S.td}>
                      <div style={{ display:"flex", gap:5 }}>
                        <button onClick={()=>{setEditEntry(e);setShowForm(true);setFormErr("");}} style={{ padding:"4px 9px", border:"none", borderRadius:5, fontSize:11, fontWeight:600, cursor:"pointer", background:C.blueLight, color:C.blue, fontFamily:"inherit" }}>Modifier</button>
                        {!e.is_activated&&<button onClick={()=>handleDelete(e.id)} disabled={deleting===e.id} style={{ padding:"4px 9px", border:"none", borderRadius:5, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", background:C.redLight, color:C.red, opacity:deleting===e.id?0.6:1 }}>{deleting===e.id?"…":"Suppr."}</button>}
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

function RegistryModal({ initial, departments, onSave, onClose, saving, error }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    employee_id: initial?.employee_id||"", first_name: initial?.first_name||"",
    last_name: initial?.last_name||"", department: initial?.department||"",
    role_hint: initial?.role_hint||"PERSONNEL", personnel_type_hint: initial?.personnel_type_hint||"",
    notes: initial?.notes||"",
  });
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  return (
    <div style={M.overlay} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{ ...M.modal, maxWidth:520 }}>
        <div style={M.header}><span style={M.title}>{isEdit?`Modifier — ${initial.employee_id}`:"Ajouter au registre RH"}</span><button onClick={onClose} style={M.closeBtn}>✕</button></div>
        {error&&<div style={M.errorBar}>{error}</div>}
        <form onSubmit={e=>{e.preventDefault();onSave(form);}} style={M.body}>
          <div style={M.grid2}>
            <FldM label="Matricule *" required value={form.employee_id} onChange={set("employee_id")} placeholder="IUC-DIR-001" readOnly={isEdit} />
            <div/>
            <FldM label="Prénom *" required value={form.first_name} onChange={set("first_name")} placeholder="Jean" />
            <FldM label="Nom *" required value={form.last_name} onChange={set("last_name")} placeholder="KAMGA" />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4, marginTop:4 }}>
            <label style={{ fontSize:11, fontWeight:700, color:C.textMid, textTransform:"uppercase", letterSpacing:"0.8px" }}>Département</label>
            <select value={form.department} onChange={set("department")} style={{ ...S.search, width:"100%" }}>
              <option value="">— Choisir —</option>
              {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div style={M.secTitle}>Rôle suggéré</div>
          <div style={{ display:"flex", gap:8 }}>
            {[{val:"PERSONNEL",icon:"🏢",label:"Personnel",color:C.blue},{val:"CHAUFFEUR",icon:"🚗",label:"Chauffeur",color:C.green},{val:"TECHNICIEN",icon:"🔧",label:"Technicien",color:C.amber}].map(({val,icon,label,color})=>(
              <button key={val} type="button" onClick={()=>setForm(f=>({...f,role_hint:val}))} style={{ flex:1, padding:"10px 8px", borderRadius:9, cursor:"pointer", border:`2px solid ${form.role_hint===val?color:C.border}`, background:form.role_hint===val?color+"18":C.bg, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                <span style={{ fontSize:18 }}>{icon}</span><span style={{ fontSize:10, fontWeight:700, color:form.role_hint===val?color:C.textMid }}>{label}</span>
              </button>
            ))}
          </div>
          {form.role_hint==="PERSONNEL"&&<>
            <div style={M.secTitle}>Type de personnel</div>
            <div style={{ display:"flex", gap:8 }}>
              {PERSONNEL_TYPES.map(([val,label,icon])=>(
                <button key={val} type="button" onClick={()=>setForm(f=>({...f,personnel_type_hint:val}))} style={{ flex:1, padding:"8px 6px", borderRadius:8, cursor:"pointer", border:`2px solid ${form.personnel_type_hint===val?C.blue:C.border}`, background:form.personnel_type_hint===val?C.blueLight:C.bg, fontSize:10, fontWeight:700, color:form.personnel_type_hint===val?C.blue:C.textMid }}>
                  {icon} {label}
                </button>
              ))}
            </div>
          </>}
          <div style={M.secTitle}>Notes</div>
          <textarea value={form.notes} onChange={set("notes")} rows={2} placeholder="Remarques optionnelles…" style={{ ...S.search, width:"100%", resize:"vertical", fontFamily:"inherit", fontSize:12, padding:"8px 12px" }} />
          <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:20, paddingTop:16, borderTop:`1px solid ${C.border}` }}>
            <button type="button" onClick={onClose} style={S.ghostBtn}>Annuler</button>
            <button type="submit" disabled={saving} style={{ ...S.btn, opacity:saving?0.7:1 }}>{saving?"Enregistrement…":isEdit?"Modifier":"Ajouter"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RoleBadge({ role }) {
  const map = { PERSONNEL:{label:"Personnel",bg:C.blueLight,color:C.blue}, CHAUFFEUR:{label:"Chauffeur",bg:C.greenLight,color:C.green}, TECHNICIEN:{label:"Technicien",bg:C.amberLight,color:C.amber}, GESTIONNAIRE:{label:"Gestionnaire",bg:"#F5F3FF",color:"#7C3AED"}, ADMIN:{label:"Admin",bg:"#FEF2F2",color:C.red} };
  const m = map[role]||{label:role,bg:"#F5F5F5",color:"#888"};
  return <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700, background:m.bg, color:m.color }}>{m.label}</span>;
}

function SubTypeBadge({ user }) {
  if (user.role==="PERSONNEL"&&user.personnel_type) {
    const map = { DIRECTEUR:{label:"Directeur",icon:"🎖️",color:C.blue}, CHEF_DEPT:{label:"Chef de dept.",icon:"📋",color:C.textMid}, AUTRE:{label:"Personnel",icon:"👤",color:C.textLight} };
    const m=map[user.personnel_type]; if(!m) return null;
    return <div style={{ fontSize:10, color:m.color, marginTop:2 }}>{m.icon} {m.label}</div>;
  }
  if (user.role==="CHAUFFEUR"&&user.driver_profile) {
    const isBus=user.driver_profile.assignment_type==="BUS_SCOLAIRE";
    return <div style={{ fontSize:10, color:isBus?C.blue:C.green, marginTop:2 }}>{isBus?"🚌 Bus scolaire":"🚗 Polyvalent"}</div>;
  }
  return null;
}

function VehicleCell({ user }) {
  if (user.role==="PERSONNEL"&&user.assigned_vehicle) {
    const v=user.assigned_vehicle;
    return <div><div style={{ fontSize:11, fontWeight:700, color:C.text }}>🚗 {typeof v==="object"?v.registration_number:"Assigné"}</div>{typeof v==="object"&&<div style={{ fontSize:10, color:C.textLight }}>{v.make} {v.model}</div>}</div>;
  }
  if (user.role==="CHAUFFEUR"&&user.driver_profile?.assigned_vehicle_info) {
    const b=user.driver_profile.assigned_vehicle_info;
    return <div><div style={{ fontSize:11, fontWeight:700, color:C.blue }}>🚌 {b.registration_number}</div><div style={{ fontSize:10, color:C.textLight }}>{b.make} {b.model}</div></div>;
  }
  return <span style={{ fontSize:11, color:C.textLight }}>—</span>;
}

function FldM({ label, value, onChange, required, type="text", placeholder, readOnly, ...rest }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={{ fontSize:11, fontWeight:700, color:C.textMid, textTransform:"uppercase", letterSpacing:"0.8px" }}>{label}</label>
      <input type={type} value={value} onChange={onChange} required={required} readOnly={readOnly} placeholder={placeholder}
        style={{ ...S.search, width:"100%", background:readOnly?"#F5F5F5":C.white, color:readOnly?C.textMid:C.text }} {...rest} />
    </div>
  );
}