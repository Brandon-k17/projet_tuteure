// ─── src/vehicules/Vehicules.jsx ─────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { apiFetch, apiUpload } from "../../utils/api";
import { C, S, M, VEHICLE_CATEGORIES, VEHICLE_TYPES, FUEL_TYPES, TRANS_TYPES, VEHICLE_STATUS, ASSIGNMENT_TYPES, EMPTY_VEH } from "../../constants";
import { StatusBadge, Empty, Fld, Sel } from "../../components/ui";

// ── TAB VÉHICULES ─────────────────────────────────────────────────────────────
export function TabVehicules({ vehicles, onRefresh }) {
  const [search,    setSearch]    = useState("");
  const [filterSt,  setFilterSt]  = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterAsgn,setFilterAsgn]= useState(""); // "" | "POOL" | "FONCTION"
  const [showForm,  setShowForm]  = useState(false);
  const [editVeh,   setEditVeh]   = useState(null);
  const [deleting,  setDeleting]  = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [formErr,   setFormErr]   = useState("");
  const [photoView, setPhotoView] = useState(null);

const getAssignmentType = (v) => v.assignment_type || "POOL";

const filtered = vehicles.filter(v => {
  const q  = search.toLowerCase();
  const ms = !q || [v.registration_number, v.make, v.model, v.internal_code, v.assigned_director]
    .some(x => (x || "").toLowerCase().includes(q));
  return ms
    && (!filterSt   || v.status             === filterSt)
    && (!filterCat  || v.category           === filterCat)
    && (!filterAsgn || getAssignmentType(v) === filterAsgn);
});

  const openAdd  = () => { setEditVeh(null);  setShowForm(true); setFormErr(""); };
  const openEdit = (v) => { setEditVeh(v);    setShowForm(true); setFormErr(""); };
  const closeForm= () => { setShowForm(false); setEditVeh(null); setFormErr(""); };

  const handleSave = async (data, photoFile) => {
    setSaving(true); setFormErr("");
    try {
      let saved;
      if (editVeh) {
        saved = await apiFetch(`/vehicles/${editVeh.id}/`, { method:"PATCH", body:JSON.stringify(data) });
      } else {
        saved = await apiFetch("/vehicles/", { method:"POST", body:JSON.stringify(data) });
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
    try { await apiFetch(`/vehicles/${id}/`, { method:"DELETE" }); onRefresh(); }
    catch (e) { alert("Erreur : " + e.message); }
    finally   { setDeleting(null); }
  };

  const getPhotoUrl = (v) => {
    if (!v.photo) return null;
    return v.photo.startsWith("http") ? v.photo : `http://localhost:8000${v.photo}`;
  };

 const pool       = vehicles.filter(v => getAssignmentType(v) === "POOL");
const fonction   = vehicles.filter(v => getAssignmentType(v) === "FONCTION");
const busScolaire= vehicles.filter(v => getAssignmentType(v) === "BUS_SCOLAIRE");
  return (
    <>
      {/* Visionneuse photo */}
      {photoView && (
        <div style={M.overlay} onClick={() => setPhotoView(null)}>
          <div style={{ position:"relative" }}>
            <img src={photoView} alt="Véhicule"
              style={{ maxWidth:"80vw", maxHeight:"80vh", borderRadius:12, objectFit:"contain", display:"block" }} />
            <button onClick={() => setPhotoView(null)}
              style={{ position:"absolute", top:-12, right:-12, width:32, height:32, borderRadius:"50%", background:C.red, color:"#fff", border:"none", fontSize:16, cursor:"pointer", fontWeight:700 }}>✕</button>
          </div>
        </div>
      )}

      {showForm && (
        <VehiculeModal
          initial={editVeh} onSave={handleSave} onClose={closeForm}
          saving={saving} error={formErr}
        />
      )}

      <div style={S.section}>
        {/* ── Résumé parc ── */}
        <div style={{ display:"flex", gap:12, marginBottom:18, flexWrap:"wrap" }}>
          {/* Parc commun */}
          <div style={{ flex:1, minWidth:160, padding:"12px 16px", borderRadius:9, background:C.greenLight, border:`1.5px solid ${C.green}30` }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.green, textTransform:"uppercase", letterSpacing:"1px" }}>🚗 Parc commun</div>
            <div style={{ fontSize:26, fontWeight:800, color:C.text, marginTop:4 }}>
              {pool.filter(v => v.status === "DISPONIBLE").length}
              <span style={{ fontSize:13, color:C.textLight, fontWeight:500 }}>/{pool.length}</span>
            </div>
            <div style={{ fontSize:10, color:C.green, fontWeight:600 }}>disponibles</div>
          </div>

          {/* Véhicules de fonction */}
          <div style={{ flex:1, minWidth:160, padding:"12px 16px", borderRadius:9, background:C.purpleLight, border:`1.5px solid ${C.purple}30` }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.purple, textTransform:"uppercase", letterSpacing:"1px" }}>🎖️ Véhicules de fonction</div>
            <div style={{ fontSize:26, fontWeight:800, color:C.text, marginTop:4 }}>
              {fonction.length}
              <span style={{ fontSize:13, color:C.textLight, fontWeight:500 }}> véhicule{fonction.length !== 1 ? "s" : ""}</span>
            </div>
            <div style={{ fontSize:10, color:C.purple, fontWeight:600 }}>assignés à des directeurs</div>
          </div>
        {/* Bus scolaires */}
<div style={{ flex:1, minWidth:160, padding:"12px 16px", borderRadius:9, background:C.blueLight, border:`1.5px solid ${C.blue}30` }}>
  <div style={{ fontSize:10, fontWeight:700, color:C.blue, textTransform:"uppercase", letterSpacing:"1px" }}>🚌 Bus scolaires</div>
  <div style={{ fontSize:26, fontWeight:800, color:C.text, marginTop:4 }}>
    {busScolaire.length}
    <span style={{ fontSize:13, color:C.textLight, fontWeight:500 }}> bus</span>
  </div>
  <div style={{ fontSize:10, color:C.blue, fontWeight:600 }}>ramassage matin</div>
</div>
          {/* Répartition catégories */}
          {VEHICLE_CATEGORIES.map(([cat, label, icon]) => {
            const t = vehicles.filter(v => v.category === cat).length;
            const d = vehicles.filter(v => v.category === cat && v.status === "DISPONIBLE").length;
            return (
              <div key={cat} onClick={() => setFilterCat(filterCat === cat ? "" : cat)}
                style={{ flex:1, minWidth:130, padding:"12px 16px", borderRadius:9, cursor:"pointer",
                  background: filterCat === cat ? C.greenLight : C.bg,
                  border:`1.5px solid ${filterCat === cat ? C.green : C.border}` }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px" }}>{icon} {label}</div>
                <div style={{ fontSize:22, fontWeight:800, color:C.text, marginTop:4 }}>
                  {d}<span style={{ fontSize:12, color:C.textLight, fontWeight:500 }}>/{t}</span>
                </div>
                <div style={{ fontSize:10, color:C.green, fontWeight:600 }}>disponibles</div>
              </div>
            );
          })}
        </div>

        {/* ── Barre de filtres ── */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
            <input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} style={S.search} />

            {/* Filtre type affectation */}
            {[
              { val:"",         label:"Tous types"       },
              { val:"POOL",     label:"🚗 Parc commun"   },
              { val:"FONCTION", label:"🎖️ Fonction"      },
              {  val:"BUS_SCOLAIRE",label:"🚌 Bus scolaire"   },
            ].map(f => (
              <button key={f.val} onClick={() => setFilterAsgn(f.val)}
                style={{ ...S.filterPill, ...(filterAsgn === f.val ? S.filterPillOn : {}) }}>
                {f.label}
              </button>
            ))}

            {/* Filtre statut */}
            <select value={filterSt} onChange={e => setFilterSt(e.target.value)}
              style={{ ...S.search, width:150 }}>
              <option value="">Tous statuts</option>
              {VEHICLE_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          <button onClick={openAdd} style={S.btn} className="btn-primary">+ Ajouter</button>
        </div>

        {/* ── Tableau ── */}
        {filtered.length === 0
          ? <Empty text="Aucun véhicule trouvé" />
          : <div style={{ overflowX:"auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {["Photo","Immatriculation","Code","Type","Catégorie","Marque / Modèle","Places","Kilométrage","Statut","Actions"].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => {
                  const photoUrl  = getPhotoUrl(v);
                  const catInfo   = VEHICLE_CATEGORIES.find(([c]) => c === v.category);
                  const isFonction= v.assignment_type === "FONCTION";
                  return (
                    <tr key={v.id} className="tr-row">
                      {/* Photo */}
                      <td style={S.td}>
                        {photoUrl
                          ? <img src={photoUrl} alt="" onClick={() => setPhotoView(photoUrl)}
                              style={{ width:44, height:36, objectFit:"cover", borderRadius:6, cursor:"pointer", border:`1px solid ${C.border}` }} />
                          : <div style={{ width:44, height:36, borderRadius:6, background:C.bg, border:`1px dashed ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
                              {catInfo?.[2] ?? "🚗"}
                            </div>
                        }
                      </td>

                      {/* Immat */}
                      <td style={S.td}><b style={{ color:C.text }}>{v.registration_number}</b></td>

                      {/* Code */}
                      <td style={S.td}><span style={S.typeBadge}>{v.internal_code}</span></td>

                     {/* Type affectation */}
<td style={S.td}>
  {isFonction
    ? <div>
        <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700, background:C.purpleLight, color:C.purple }}>
          🎖️ Fonction
        </span>
        {v.assigned_director && (
          <div style={{ fontSize:10, color:C.textLight, marginTop:3 }}>{v.assigned_director}</div>
        )}
      </div>
    : v.assignment_type === "BUS_SCOLAIRE"
      ? <div>
          <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700, background:C.blueLight, color:C.blue }}>
            🚌 Bus scolaire
          </span>
          {v.bus_driver_info && (
            <div style={{ fontSize:10, color:C.textLight, marginTop:3 }}>
              {v.bus_driver_info.full_name}
            </div>
          )}
        </div>
      : <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700, background:C.greenLight, color:C.green }}>
          🚗 Parc
        </span>
  }
</td>
                      {/* Catégorie */}
                      <td style={S.td}>
                        <span style={{ fontSize:13 }}>{catInfo?.[2]}</span>
                        <span style={{ fontSize:11, color:C.textMid, marginLeft:4 }}>{catInfo?.[1] ?? v.category}</span>
                      </td>

                      <td style={S.td}>{v.make} {v.model}</td>
                      <td style={S.td}>{v.seating_capacity} pl.</td>
                      <td style={S.td}>{Number(v.current_mileage || 0).toLocaleString("fr-FR")} km</td>
                      <td style={S.td}><StatusBadge status={v.status} /></td>

                      {/* Actions */}
                      <td style={S.td}>
                        <div style={{ display:"flex", gap:5 }}>
                          {photoUrl && (
                            <button onClick={() => setPhotoView(photoUrl)}
                              style={{ padding:"4px 9px", border:"none", borderRadius:5, fontSize:11, fontWeight:600, cursor:"pointer", background:"#F0FDF4", color:C.green, fontFamily:"inherit" }}>
                              👁 Photo
                            </button>
                          )}
                          <button onClick={() => openEdit(v)}
                            style={{ padding:"4px 9px", border:"none", borderRadius:5, fontSize:11, fontWeight:600, cursor:"pointer", background:C.blueLight, color:C.blue, fontFamily:"inherit" }}>
                            Modifier
                          </button>
                          <button onClick={() => handleDelete(v.id)} disabled={deleting === v.id}
                            style={{ padding:"4px 9px", border:"none", borderRadius:5, fontSize:11, fontWeight:600, cursor:"pointer", background:C.redLight, color:C.red, fontFamily:"inherit", opacity:deleting === v.id ? 0.6 : 1 }}>
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
export function VehiculeModal({ initial, onSave, onClose, saving, error }) {
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
    assignment_type:     initial.assignment_type     || "POOL",
    assigned_director:   initial.assigned_director   || "",
  } : { ...EMPTY_VEH });

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // Auto-suggestion catégorie selon nb de places
  useEffect(() => {
  // Ne pas toucher la catégorie si elle est forcée par le type d'affectation
  if (form.assignment_type === "FONCTION" || form.assignment_type === "BUS_SCOLAIRE") return;
  
  const nb = parseInt(form.seating_capacity) || 1;
  const suggested = nb < 10 ? "TOURISME" : nb < 20 ? "UTILITAIRE" : "BUS";
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setForm(f => ({ ...f, category: suggested }));
}, [form.seating_capacity]);


  // Si véhicule de fonction → statut forcé EN_SERVICE
  useEffect(() => {
    if (form.assignment_type === "FONCTION") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(f => ({ ...f, status: "EN_SERVICE" }));
    }
  }, [form.assignment_type]);

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
    // Nettoyer les champs vides optionnels
    ["purchase_date","registration_date","purchase_price","vin_number"].forEach(k => {
      if (clean[k] === "") delete clean[k];
    });
    // Si POOL, pas de directeur assigné
    if (clean.assignment_type === "POOL") clean.assigned_director = "";
    onSave(clean, photoFile);
  };

  const isFonction = form.assignment_type === "FONCTION";

  return (
    <div style={M.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={M.modal}>
        <div style={M.header}>
          <span style={M.title}>
            {isEdit ? `Modifier — ${initial.registration_number}` : "Ajouter un véhicule"}
          </span>
          <button onClick={onClose} style={M.closeBtn}>✕</button>
        </div>

        {error && <div style={M.errorBar}>{error}</div>}

        <form onSubmit={handleSubmit} style={M.body}>

          {/* ── Photo ── */}
          <div style={M.secTitle}>Photo du véhicule</div>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ width:120, height:80, borderRadius:8, overflow:"hidden", border:`1.5px dashed ${C.border}`, background:C.bg, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}
              onClick={() => fileRef.current?.click()}>
              {photoPreview
                ? <img src={photoPreview} alt="Aperçu" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : <div style={{ textAlign:"center", color:C.textLight }}><div style={{ fontSize:28 }}>📷</div><div style={{ fontSize:10, marginTop:4 }}>Cliquer</div></div>
              }
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <button type="button" onClick={() => fileRef.current?.click()} style={{ ...S.btn, fontSize:11, padding:"6px 14px" }}>
                {photoPreview ? "Changer" : "Téléverser"}
              </button>
              {photoPreview && (
                <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                  style={{ ...S.ghostBtn, fontSize:11, padding:"6px 14px", color:C.red, borderColor:"#fca5a5" }}>
                  Supprimer
                </button>
              )}
              <div style={{ fontSize:10, color:C.textLight }}>JPG, PNG · max 5 Mo</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display:"none" }} />
          </div>

         {/* ── Type d'affectation ── */}
<div style={M.secTitle}>Type d'affectation</div>
<div style={{ display:"flex", gap:10 }}>
  {[
    { val:"POOL",        icon:"🚗", label:"Parc commun",         desc:"Réservable par tous" },
    { val:"FONCTION",    icon:"🎖️", label:"Voiture de fonction", desc:"Tourisme uniquement — directeurs" },
    { val:"BUS_SCOLAIRE",icon:"🚌", label:"Bus scolaire",        desc:"Bus uniquement — ramassage matin" },
  ].map(({ val, icon, label, desc }) => (
    <button key={val} type="button"
      onClick={() => {
        setForm(f => ({
          ...f,
          assignment_type: val,
          // Forcer la catégorie selon le type
          category: val === "FONCTION" ? "TOURISME" : val === "BUS_SCOLAIRE" ? "BUS" : f.category,
        }));
      }}
      style={{
        flex:1, padding:"12px 8px", borderRadius:10, cursor:"pointer",
        border:`2px solid ${form.assignment_type === val
          ? val === "FONCTION" ? C.purple : val === "BUS_SCOLAIRE" ? C.blue : C.green
          : C.border}`,
        background: form.assignment_type === val
          ? val === "FONCTION" ? C.purpleLight : val === "BUS_SCOLAIRE" ? C.blueLight : C.greenLight
          : C.bg,
        display:"flex", flexDirection:"column", alignItems:"center", gap:4, transition:"all .15s",
      }}>
      <span style={{ fontSize:24 }}>{icon}</span>
      <span style={{ fontSize:11, fontWeight:700, color: form.assignment_type === val
        ? val === "FONCTION" ? C.purple : val === "BUS_SCOLAIRE" ? C.blue : C.green
        : C.textMid }}>
        {label}
      </span>
      <span style={{ fontSize:10, color:C.textLight, textAlign:"center", lineHeight:1.3 }}>{desc}</span>
    </button>
  ))}
</div>

{/* Champ directeur — FONCTION uniquement */}
{form.assignment_type === "FONCTION" && (
  <div style={{ background:C.purpleLight, border:`1.5px solid ${C.purple}30`, borderRadius:9, padding:"12px 14px", display:"flex", flexDirection:"column", gap:10 }}>
    <div style={{ fontSize:11, color:C.purple, fontWeight:700 }}>
      🎖️ Voiture de fonction — ne sera pas disponible pour les réservations ordinaires.
    </div>
    <Fld label="Directeur assigné *" required
      value={form.assigned_director} onChange={set("assigned_director")}
      placeholder="Ex: Dr. Emmanuel Kamga" />
  </div>
)}

{/* Champ chauffeur — BUS_SCOLAIRE uniquement */}
{form.assignment_type === "BUS_SCOLAIRE" && (
  <div style={{ background:C.blueLight, border:`1.5px solid ${C.blue}30`, borderRadius:9, padding:"12px 14px", display:"flex", flexDirection:"column", gap:10 }}>
    <div style={{ fontSize:11, color:C.blue, fontWeight:700 }}>
      🚌 Bus scolaire — utilisé uniquement pour le ramassage du matin (5h–8h30).
      Le chauffeur assigné sera indisponible sur ce créneau.
    </div>
    <Fld label="Chauffeur assigné (nom)" value={form.assigned_driver_name || ""}
      onChange={e => setForm(f => ({ ...f, assigned_driver_name: e.target.value }))}
      placeholder="Ex: Paul MBANG" />
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
      <Fld label="Heure début créneau" value={form.bus_slot_start || "05:00"}
        onChange={e => setForm(f => ({ ...f, bus_slot_start: e.target.value }))}
        type="time" />
      <Fld label="Heure fin créneau" value={form.bus_slot_end || "08:30"}
        onChange={e => setForm(f => ({ ...f, bus_slot_end: e.target.value }))}
        type="time" />
    </div>
  </div>
)}

          {/* ── Catégorie ── */}
<div style={M.secTitle}>Catégorie du véhicule</div>
<div style={{ display:"flex", gap:10 }}>
  {VEHICLE_CATEGORIES.map(([cat, label, icon]) => {
    // Bloquer les catégories selon le type d'affectation
    const blocked =
      (form.assignment_type === "FONCTION"    && cat !== "TOURISME") ||
      (form.assignment_type === "BUS_SCOLAIRE" && cat !== "BUS");

    return (
      <button key={cat} type="button"
        disabled={blocked}
        onClick={() => !blocked && setForm(f => ({ ...f, category: cat }))}
        style={{
          flex:1, padding:"14px 10px", borderRadius:10,
          cursor: blocked ? "not-allowed" : "pointer",
          border:`2px solid ${
            form.category === cat ? C.green :
            blocked ? "#E8E8E8" : C.border
          }`,
          background: form.category === cat ? C.greenLight :
                      blocked ? "#F5F5F5" : C.bg,
          display:"flex", flexDirection:"column", alignItems:"center", gap:6,
          transition:"all .15s",
          opacity: blocked ? 0.4 : 1,
        }}>
        <span style={{ fontSize:28 }}>{icon}</span>
        <span style={{ fontSize:12, fontWeight:700,
          color: form.category === cat ? C.green :
                 blocked ? "#BBB" : C.textMid }}>
          {label}
        </span>
        {blocked && (
          <span style={{ fontSize:9, color:"#BBB", fontWeight:600 }}>
            {form.assignment_type === "FONCTION" ? "Tourisme uniquement" : "Bus uniquement"}
          </span>
        )}
      </button>
    );
  })}
</div>
<div style={{ fontSize:10, color:C.textLight, marginTop:4 }}>
  {form.assignment_type === "FONCTION"
    ? "🎖️ Les voitures de fonction sont uniquement de catégorie Tourisme."
    : form.assignment_type === "BUS_SCOLAIRE"
    ? "🚌 Les bus scolaires sont uniquement de catégorie Bus."
    : "💡 La catégorie est suggérée automatiquement selon le nombre de places."}
</div>
          {/* ── Identification ── */}
          <div style={M.secTitle}>Identification</div>
          <div style={M.grid2}>
            <Fld label="Immatriculation *" required value={form.registration_number} onChange={set("registration_number")} placeholder="Ex: LT 001 07" />
            <Fld label="Code interne *"    required value={form.internal_code}       onChange={set("internal_code")}       placeholder="Ex: VH-001" />
          </div>

          {/* ── Caractéristiques ── */}
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

          {/* ── Capacités ── */}
          <div style={M.secTitle}>Capacités & Kilométrage</div>
          <div style={M.grid3}>
            <Fld label="Nb places *"    required value={form.seating_capacity}   onChange={set("seating_capacity")}   type="number" min="1" />
            <Fld label="Réservoir (L)*" required value={form.fuel_tank_capacity} onChange={set("fuel_tank_capacity")} type="number" step="0.01" />
            <Fld label="Kilométrage"             value={form.current_mileage}     onChange={set("current_mileage")}    type="number" step="0.01" />
          </div>

          {/* ── Statut & Dates ── */}
          <div style={M.secTitle}>Statut & Dates</div>
          {isFonction && (
            <div style={{ fontSize:11, color:C.purple, background:C.purpleLight, borderRadius:7, padding:"8px 12px", marginBottom:4 }}>
              🎖️ Statut automatiquement défini sur <b>En service</b> pour un véhicule de fonction.
            </div>
          )}
          <div style={M.grid2}>
            <Sel label="Statut *" value={form.status} onChange={set("status")} opts={
              isFonction
                ? [["EN_SERVICE","En service"],["EN_MAINTENANCE","En maintenance"],["HORS_SERVICE","Hors service"]]
                : VEHICLE_STATUS
            } />
            <Fld label="N° VIN" value={form.vin_number} onChange={set("vin_number")} placeholder="17 caractères" maxLength={17} />
            <Fld label="Date d'achat"           value={form.purchase_date}     onChange={set("purchase_date")}     type="date" />
            <Fld label="Date d'immatriculation" value={form.registration_date} onChange={set("registration_date")} type="date" />
            <Fld label="Prix d'achat (FCFA)"    value={form.purchase_price}    onChange={set("purchase_price")}    type="number" step="0.01" />
          </div>

          {/* ── Notes ── */}
          <div style={M.secTitle}>Notes</div>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={3} placeholder="Remarques…"
            style={{ ...S.search, width:"100%", resize:"vertical", fontFamily:"inherit", fontSize:12, padding:"8px 12px" }} />

          {/* ── Footer ── */}
          <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:20, paddingTop:16, borderTop:`1px solid ${C.border}` }}>
            <button type="button" onClick={onClose} style={S.ghostBtn}>Annuler</button>
            <button type="submit" disabled={saving} style={{ ...S.btn, opacity:saving ? 0.7 : 1 }}>
              {saving ? "Enregistrement…" : isEdit ? "Modifier" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}