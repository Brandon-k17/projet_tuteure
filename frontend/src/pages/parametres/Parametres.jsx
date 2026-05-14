// ─── src/parametres/Parametres.jsx ───────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../utils/api";
import { C, S, M } from "../../constants/index";
import { Empty } from "../../components/ui";

const PARAM_TABS = [
  { id:"departements", label:"Départements",       icon:"🏛️" },
  { id:"registre",     label:"Registre du personnel", icon:"📋" },
];

const PERSONNEL_TYPES = [
  ["DIRECTEUR", "Directeur",           "🎖️"],
  ["CHEF_DEPT", "Chef de département", "📋"],
  ["AUTRE",     "Autre personnel",     "👤"],
];

// ── TAB PARAMÈTRES ────────────────────────────────────────────────────────────
export function TabParametres() {
  const [activeTab, setActiveTab] = useState("departements");

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

      {/* En-tête */}
      <div style={{ ...S.section, padding:"14px 18px" }}>
        <div style={{ fontSize:11, color:C.textLight, marginBottom:12 }}>
          ⚙️ Ces paramètres permettent de configurer les données de base du système.
          Ils sont utilisés lors de la création des utilisateurs et des réservations.
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {PARAM_TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ padding:"8px 18px", borderRadius:8, fontSize:12, fontWeight:700,
                cursor:"pointer", fontFamily:"inherit",
                border:`2px solid ${activeTab === t.id ? C.green : C.border}`,
                background: activeTab === t.id ? C.greenLight : C.bg,
                color:      activeTab === t.id ? C.green : C.textMid,
                transition:"all .15s" }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "departements" && <PanelDepartements />}
      {activeTab === "registre"     && <PanelRegistre />}
    </div>
  );
}

// ── PANEL DÉPARTEMENTS ────────────────────────────────────────────────────────
function PanelDepartements() {
  const [depts,    setDepts]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [formErr,  setFormErr]  = useState("");
  const [deleting, setDeleting] = useState(null);
  const [search,   setSearch]   = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch("/auth/departments/");
      setDepts(Array.isArray(d) ? d : d?.results ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filtered = depts.filter(d => {
    const q = search.toLowerCase();
    return !q || [d.name, d.code, d.description].some(x => (x||"").toLowerCase().includes(q));
  });

  const openAdd  = () => { setEditDept(null); setShowForm(true); setFormErr(""); };
  const openEdit = (d) => { setEditDept(d);   setShowForm(true); setFormErr(""); };
  const closeForm= () => { setShowForm(false); setEditDept(null); setFormErr(""); };

  const handleSave = async (data) => {
    setSaving(true); setFormErr("");
    try {
      if (editDept) {
        await apiFetch(`/auth/departments/${editDept.id}/`, { method:"PATCH", body:JSON.stringify(data) });
      } else {
        await apiFetch("/auth/departments/", { method:"POST", body:JSON.stringify(data) });
      }
      closeForm(); loadAll();
    } catch (e) {
      try { setFormErr(Object.values(JSON.parse(e.message)).flat().join(" — ")); }
      catch { setFormErr("Erreur : " + e.message); }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce département ? Les utilisateurs associés ne seront pas supprimés.")) return;
    setDeleting(id);
    try { await apiFetch(`/auth/departments/${id}/`, { method:"DELETE" }); loadAll(); }
    catch (e) { alert("Erreur : " + e.message); }
    finally { setDeleting(null); }
  };

  return (
    <>
      {showForm && (
        <DeptModal
          initial={editDept}
          onSave={handleSave}
          onClose={closeForm}
          saving={saving}
          error={formErr}
        />
      )}

      <div style={S.section}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
          <div>
            <div style={S.secTitle}>🏛️ Départements</div>
            <div style={{ fontSize:11, color:C.textLight, marginTop:2 }}>
              {depts.length} département{depts.length !== 1 ? "s" : ""} enregistré{depts.length !== 1 ? "s" : ""}
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <input placeholder="Rechercher…" value={search}
              onChange={e => setSearch(e.target.value)} style={{ ...S.search, width:180 }} />
            <button onClick={openAdd} style={S.btn} className="btn-primary">+ Nouveau département</button>
          </div>
        </div>

        {loading
          ? <Empty text="Chargement…" icon="⏳" />
          : filtered.length === 0
            ? <Empty text="Aucun département" icon="🏛️" />
            : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:12 }}>
                {filtered.map(d => (
                  <div key={d.id} style={{ padding:"14px 16px", borderRadius:9,
                    background:C.bg, border:`1.5px solid ${C.border}`,
                    display:"flex", flexDirection:"column", gap:6 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{d.name}</div>
                        {d.code && (
                          <span style={{ fontSize:10, fontWeight:700, color:C.textMid,
                            background:C.white, border:`1px solid ${C.border}`,
                            padding:"1px 6px", borderRadius:4, marginTop:3, display:"inline-block" }}>
                            {d.code}
                          </span>
                        )}
                      </div>
                      <div style={{ display:"flex", gap:5 }}>
                        <button onClick={() => openEdit(d)}
                          style={{ padding:"4px 9px", border:"none", borderRadius:5,
                            fontSize:11, fontWeight:600, cursor:"pointer",
                            background:C.blueLight, color:C.blue, fontFamily:"inherit" }}>
                          Modifier
                        </button>
                        <button onClick={() => handleDelete(d.id)} disabled={deleting === d.id}
                          style={{ padding:"4px 9px", border:"none", borderRadius:5,
                            fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
                            background:C.redLight, color:C.red,
                            opacity: deleting === d.id ? 0.6 : 1 }}>
                          {deleting === d.id ? "…" : "Suppr."}
                        </button>
                      </div>
                    </div>
                    {d.description && (
                      <div style={{ fontSize:11, color:C.textLight, lineHeight:1.4 }}>{d.description}</div>
                    )}
                    <div style={{ fontSize:10, color:C.green, fontWeight:600 }}>
                      👥 {d.member_count || 0} membre{(d.member_count||0) !== 1 ? "s" : ""}
                    </div>
                  </div>
                ))}
              </div>
        }
      </div>
    </>
  );
}

// ── MODAL DÉPARTEMENT ─────────────────────────────────────────────────────────
function DeptModal({ initial, onSave, onClose, saving, error }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    name:        initial?.name        || "",
    code:        initial?.code        || "",
    description: initial?.description || "",
  });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div style={M.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...M.modal, maxWidth:460 }}>
        <div style={M.header}>
          <span style={M.title}>{isEdit ? `Modifier — ${initial.name}` : "Nouveau département"}</span>
          <button onClick={onClose} style={M.closeBtn}>✕</button>
        </div>
        {error && <div style={M.errorBar}>{error}</div>}
        <form onSubmit={e => { e.preventDefault(); onSave(form); }} style={M.body}>
          <FldP label="Nom du département *" required value={form.name}
            onChange={set("name")} placeholder="Ex: Département Informatique" />
          <FldP label="Code *" required value={form.code}
            onChange={set("code")} placeholder="Ex: DEP-INFO"
            style={{ textTransform:"uppercase" }} />
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:11, fontWeight:700, color:C.textMid,
              textTransform:"uppercase", letterSpacing:"0.8px" }}>Description</label>
            <textarea value={form.description} onChange={set("description")} rows={3}
              placeholder="Description optionnelle du département…"
              style={{ ...S.search, width:"100%", resize:"vertical",
                fontFamily:"inherit", fontSize:12, padding:"8px 12px" }} />
          </div>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:16,
            paddingTop:16, borderTop:`1px solid ${C.border}` }}>
            <button type="button" onClick={onClose} style={S.ghostBtn}>Annuler</button>
            <button type="submit" disabled={saving}
              style={{ ...S.btn, opacity:saving ? 0.7 : 1 }}>
              {saving ? "Enregistrement…" : isEdit ? "Modifier" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── PANEL REGISTRE DU PERSONNEL ───────────────────────────────────────────────
function PanelRegistre() {
  const [entries,     setEntries]     = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [filterRole,  setFilterRole]  = useState("");
  const [filterActiv, setFilterActiv] = useState(""); // "" | "true" | "false"
  const [showForm,    setShowForm]    = useState(false);
  const [editEntry,   setEditEntry]   = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [formErr,     setFormErr]     = useState("");
  const [deleting,    setDeleting]    = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [e, d] = await Promise.all([
        apiFetch("/auth/registry/"),
        apiFetch("/auth/departments/"),
      ]);
      setEntries(Array.isArray(e) ? e : e?.results ?? []);
      setDepartments(Array.isArray(d) ? d : d?.results ?? []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filtered = entries.filter(e => {
    const q  = search.toLowerCase();
    const ms = !q || [e.employee_id, e.first_name, e.last_name, e.department_name]
      .some(x => (x||"").toLowerCase().includes(q));
    const roleOk  = !filterRole  || e.role_hint === filterRole;
    const activOk = !filterActiv || String(e.is_activated) === filterActiv;
    return ms && roleOk && activOk;
  });

  const handleSave = async (data) => {
    setSaving(true); setFormErr("");
    try {
      if (editEntry) {
        await apiFetch(`/auth/registry/${editEntry.id}/`, { method:"PATCH", body:JSON.stringify(data) });
      } else {
        await apiFetch("/auth/registry/", { method:"POST", body:JSON.stringify(data) });
      }
      setShowForm(false); setEditEntry(null); loadAll();
    } catch (e) {
      try { setFormErr(Object.values(JSON.parse(e.message)).flat().join(" — ")); }
      catch { setFormErr("Erreur : " + e.message); }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette entrée du registre ?")) return;
    setDeleting(id);
    try { await apiFetch(`/auth/registry/${id}/`, { method:"DELETE" }); loadAll(); }
    catch (e) { alert("Erreur : " + e.message); }
    finally { setDeleting(null); }
  };

  const sansCompte = entries.filter(e => !e.is_activated).length;

  return (
    <>
      {showForm && (
        <RegistryModal
          initial={editEntry}
          departments={departments}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditEntry(null); setFormErr(""); }}
          saving={saving}
          error={formErr}
        />
      )}

      <div style={S.section}>
        {/* Info banner */}
        <div style={{ background:C.blueLight, borderRadius:8, padding:"10px 14px",
          fontSize:11, color:C.blue, marginBottom:14 }}>
          📋 Le registre contient la liste officielle du personnel IUC.
          Un matricule doit y figurer avant de créer un compte utilisateur.
          {sansCompte > 0 && <b> · {sansCompte} membre{sansCompte > 1 ? "s" : ""} sans compte.</b>}
        </div>

        {/* Filtres */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          marginBottom:14, flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {[
              { value:"",           label:"Tous rôles" },
              { value:"PERSONNEL",  label:"🏢 Personnel" },
              { value:"CHAUFFEUR",  label:"🚗 Chauffeurs" },
              { value:"TECHNICIEN", label:"🔧 Techniciens" },
            ].map(t => (
              <button key={t.value} onClick={() => setFilterRole(t.value)}
                style={{ padding:"5px 12px", borderRadius:20, fontSize:11, fontWeight:600,
                  cursor:"pointer", fontFamily:"inherit", border:"none",
                  background: filterRole === t.value ? C.green : C.bg,
                  color:      filterRole === t.value ? "#fff"  : C.textMid }}>
                {t.label}
              </button>
            ))}
            <div style={{ width:1, background:C.border, margin:"0 4px" }} />
            {[
              { value:"",      label:"Tous" },
              { value:"false", label:"Sans compte" },
              { value:"true",  label:"Avec compte"  },
            ].map(t => (
              <button key={t.value} onClick={() => setFilterActiv(t.value)}
                style={{ padding:"5px 12px", borderRadius:20, fontSize:11, fontWeight:600,
                  cursor:"pointer", fontFamily:"inherit", border:"none",
                  background: filterActiv === t.value ? C.textMid : C.bg,
                  color:      filterActiv === t.value ? "#fff"    : C.textMid }}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <input placeholder="Rechercher…" value={search}
              onChange={e => setSearch(e.target.value)} style={{ ...S.search, width:180 }} />
            <button onClick={() => { setEditEntry(null); setShowForm(true); setFormErr(""); }}
              style={S.btn} className="btn-primary">
              + Ajouter au registre
            </button>
          </div>
        </div>

        {/* Tableau */}
        {loading
          ? <Empty text="Chargement…" icon="⏳" />
          : filtered.length === 0
            ? <Empty text="Aucune entrée dans le registre" icon="📋" />
            : <div style={{ overflowX:"auto" }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      {["Matricule","Nom complet","Département","Rôle","Type","Compte","Actions"].map(h => (
                        <th key={h} style={S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(e => (
                      <tr key={e.id} className="tr-row">
                        <td style={S.td}>
                          <b style={{ color:C.text, fontSize:12, letterSpacing:"1px" }}>
                            {e.employee_id}
                          </b>
                        </td>
                        <td style={S.td}>
                          <div style={{ fontWeight:600, fontSize:13, color:C.text }}>
                            {e.first_name} {e.last_name}
                          </div>
                        </td>
                        <td style={S.td}>{e.department_name || "—"}</td>
                        <td style={S.td}><RoleBadge role={e.role_hint} /></td>
                        <td style={S.td}>
                          {e.role_hint === "PERSONNEL" && e.personnel_type_hint
                            ? <span style={{ fontSize:11, color:C.textMid }}>
                                {e.personnel_type_hint === "DIRECTEUR" ? "🎖️ Directeur"
                                  : e.personnel_type_hint === "CHEF_DEPT" ? "📋 Chef de dept."
                                  : "👤 Personnel"}
                              </span>
                            : <span style={{ fontSize:11, color:C.textLight }}>—</span>
                          }
                        </td>
                        <td style={S.td}>
                          {e.is_activated
                            ? <span style={{ fontSize:10, fontWeight:700, color:C.green,
                                background:C.greenLight, padding:"2px 8px", borderRadius:99 }}>
                                ✓ Actif
                              </span>
                            : <span style={{ fontSize:10, fontWeight:700, color:C.amber,
                                background:C.amberLight, padding:"2px 8px", borderRadius:99 }}>
                                Sans compte
                              </span>
                          }
                        </td>
                        <td style={S.td}>
                          <div style={{ display:"flex", gap:5 }}>
                            <button onClick={() => { setEditEntry(e); setShowForm(true); setFormErr(""); }}
                              style={{ padding:"4px 9px", border:"none", borderRadius:5,
                                fontSize:11, fontWeight:600, cursor:"pointer",
                                background:C.blueLight, color:C.blue, fontFamily:"inherit" }}>
                              Modifier
                            </button>
                            {!e.is_activated && (
                              <button onClick={() => handleDelete(e.id)} disabled={deleting === e.id}
                                style={{ padding:"4px 9px", border:"none", borderRadius:5,
                                  fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
                                  background:C.redLight, color:C.red,
                                  opacity: deleting === e.id ? 0.6 : 1 }}>
                                {deleting === e.id ? "…" : "Suppr."}
                              </button>
                            )}
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

// ── MODAL REGISTRE ────────────────────────────────────────────────────────────
function RegistryModal({ initial, departments, onSave, onClose, saving, error }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    employee_id:         initial?.employee_id         || "",
    first_name:          initial?.first_name          || "",
    last_name:           initial?.last_name           || "",
    department:          initial?.department          || "",
    role_hint:           initial?.role_hint           || "PERSONNEL",
    personnel_type_hint: initial?.personnel_type_hint || "",
    notes:               initial?.notes               || "",
  });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div style={M.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...M.modal, maxWidth:520 }}>
        <div style={M.header}>
          <span style={M.title}>{isEdit ? `Modifier — ${initial.employee_id}` : "Ajouter au registre"}</span>
          <button onClick={onClose} style={M.closeBtn}>✕</button>
        </div>
        {error && <div style={M.errorBar}>{error}</div>}

        <form onSubmit={e => { e.preventDefault(); onSave(form); }} style={M.body}>
          <div style={M.grid2}>
            <FldP label="Matricule *" required value={form.employee_id}
              onChange={set("employee_id")} placeholder="IUC-DIR-001"
              readOnly={isEdit} />
            <div />
            <FldP label="Prénom *" required value={form.first_name}
              onChange={set("first_name")} placeholder="Jean" />
            <FldP label="Nom *" required value={form.last_name}
              onChange={set("last_name")} placeholder="KAMGA" />
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:4, marginTop:4 }}>
            <label style={{ fontSize:11, fontWeight:700, color:C.textMid,
              textTransform:"uppercase", letterSpacing:"0.8px" }}>Département</label>
            <select value={form.department} onChange={set("department")}
              style={{ ...S.search, width:"100%" }}>
              <option value="">— Choisir —</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div style={M.secTitle}>Rôle suggéré</div>
          <div style={{ display:"flex", gap:8 }}>
            {[
              { val:"PERSONNEL",  icon:"🏢", label:"Personnel",  color:C.blue  },
              { val:"CHAUFFEUR",  icon:"🚗", label:"Chauffeur",  color:C.green },
              { val:"TECHNICIEN", icon:"🔧", label:"Technicien", color:C.amber },
            ].map(({ val, icon, label, color }) => (
              <button key={val} type="button"
                onClick={() => setForm(f => ({ ...f, role_hint:val }))}
                style={{ flex:1, padding:"10px 8px", borderRadius:9, cursor:"pointer",
                  border:`2px solid ${form.role_hint===val?color:C.border}`,
                  background: form.role_hint===val ? color+"18" : C.bg,
                  display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                <span style={{ fontSize:18 }}>{icon}</span>
                <span style={{ fontSize:10, fontWeight:700,
                  color: form.role_hint===val?color:C.textMid }}>{label}</span>
              </button>
            ))}
          </div>

          {form.role_hint === "PERSONNEL" && (
            <>
              <div style={M.secTitle}>Type de personnel</div>
              <div style={{ display:"flex", gap:8 }}>
                {PERSONNEL_TYPES.map(([val, label, icon]) => (
                  <button key={val} type="button"
                    onClick={() => setForm(f => ({ ...f, personnel_type_hint:val }))}
                    style={{ flex:1, padding:"8px 6px", borderRadius:8, cursor:"pointer",
                      border:`2px solid ${form.personnel_type_hint===val?C.blue:C.border}`,
                      background: form.personnel_type_hint===val?C.blueLight:C.bg,
                      fontSize:10, fontWeight:700,
                      color: form.personnel_type_hint===val?C.blue:C.textMid }}>
                    {icon} {label}
                  </button>
                ))}
              </div>
            </>
          )}

          <div style={M.secTitle}>Notes</div>
          <textarea value={form.notes} onChange={set("notes")} rows={2}
            placeholder="Remarques optionnelles…"
            style={{ ...S.search, width:"100%", resize:"vertical",
              fontFamily:"inherit", fontSize:12, padding:"8px 12px" }} />

          <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:16,
            paddingTop:16, borderTop:`1px solid ${C.border}` }}>
            <button type="button" onClick={onClose} style={S.ghostBtn}>Annuler</button>
            <button type="submit" disabled={saving}
              style={{ ...S.btn, opacity:saving ? 0.7 : 1 }}>
              {saving ? "Enregistrement…" : isEdit ? "Modifier" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Petits composants ─────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const map = {
    PERSONNEL:  { label:"Personnel",  bg:C.blueLight,  color:C.blue  },
    CHAUFFEUR:  { label:"Chauffeur",  bg:C.greenLight, color:C.green },
    TECHNICIEN: { label:"Technicien", bg:C.amberLight, color:C.amber },
  };
  const m = map[role] || { label:role, bg:"#F5F5F5", color:"#888" };
  return (
    <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:99,
      fontSize:10, fontWeight:700, background:m.bg, color:m.color }}>
      {m.label}
    </span>
  );
}

function FldP({ label, value, onChange, required, type="text", placeholder, readOnly }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={{ fontSize:11, fontWeight:700, color:C.textMid,
        textTransform:"uppercase", letterSpacing:"0.8px" }}>{label}</label>
      <input type={type} value={value} onChange={onChange} required={required}
        readOnly={readOnly} placeholder={placeholder}
        style={{ ...S.search, width:"100%",
          background: readOnly ? "#F5F5F5" : C.white,
          color:      readOnly ? C.textMid : C.text }} />
    </div>
  );
}