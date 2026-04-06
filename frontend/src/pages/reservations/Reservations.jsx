// ─── src/reservations/Reservations.jsx ───────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../utils/api";
import { fmtDate, getCategorie } from "../../utils/api";
import { C, S, M, VEHICLE_CATEGORIES } from "../../constants";
import { Empty, Chip } from "../../components/Loader";

// ── TAB RÉSERVATIONS ──────────────────────────────────────────────────────────
export function TabReservations({ reservations, vehicles, onRefresh }) {
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
    { value:"EN_ATTENTE", label:"En attente", color:C.amber   },
    { value:"APPROUVEE",  label:"Approuvées", color:C.green   },
    { value:"REJETEE",    label:"Refusées",   color:C.red     },
    { value:"",           label:"Toutes",     color:C.textMid },
  ];

  const displayed = filterSt ? allRes.filter(r => r.status === filterSt) : allRes;

  const stMap = {
    EN_ATTENTE: { label:"En attente", bg:C.amberLight, color:C.amber },
    APPROUVEE:  { label:"Approuvée",  bg:C.greenLight, color:C.green },
    REJETEE:    { label:"Refusée",    bg:C.redLight,   color:C.red   },
    EN_COURS:   { label:"En cours",   bg:C.blueLight,  color:C.blue  },
    TERMINEE:   { label:"Terminée",   bg:C.greenLight, color:C.green },
    ANNULEE:    { label:"Annulée",    bg:"#F5F5F5",    color:"#888"  },
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { alert("Veuillez indiquer un motif."); return; }
    setActioning(rejectModal);
    try {
      await apiFetch(`/reservations/${rejectModal}/reject/`, {
        method:"POST", body:JSON.stringify({ reason:rejectReason }),
      });
      setRejectModal(null);
      await loadRes(); onRefresh();
    } catch (e) { alert("Erreur : " + e.message); }
    finally     { setActioning(null); }
  };

  return (
    <>
      {/* ── Modal refus ── */}
      {rejectModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:C.white, borderRadius:12, padding:24, width:440, boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
            <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:16 }}>Motif du refus</div>
            <textarea autoFocus value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Expliquez pourquoi la demande est refusée…" rows={4}
              style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:"inherit", resize:"vertical", outline:"none", color:C.text }} />
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:14 }}>
              <button onClick={() => setRejectModal(null)} style={S.ghostBtn}>Annuler</button>
              <button onClick={handleReject} disabled={actioning === rejectModal}
                style={{ ...S.btn, background:C.red, opacity:actioning === rejectModal ? 0.6 : 1 }}>
                {actioning === rejectModal ? "Envoi…" : "Confirmer le refus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal approbation ── */}
      {approveModal && (
        <ModalApprobation
          reservation={approveModal}
          onClose={() => setApproveModal(null)}
          onDone={async () => { setApproveModal(null); await loadRes(); onRefresh(); }}
        />
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {/* Filtres */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => setFilterSt(f.value)}
              style={{ padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer",
                fontFamily:"inherit", border:"none",
                background:filterSt === f.value ? f.color : C.bg,
                color:filterSt === f.value ? "#fff" : C.textMid,
                transition:"all .15s" }}>
              {f.label}
              <span style={{ marginLeft:6, fontSize:10, fontWeight:800,
                background:filterSt === f.value ? "rgba(255,255,255,0.3)" : f.color + "20",
                color:filterSt === f.value ? "#fff" : f.color,
                padding:"1px 6px", borderRadius:99 }}>
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
                const st  = stMap[r.status] || { label:r.status, bg:"#F5F5F5", color:"#888" };
                const nb  = r.number_of_passengers || 1;
                const rec = getCategorie(nb);
                return (
                  <div key={r.id} style={{ ...S.resCard, borderLeft:`3px solid ${st.color}`, opacity:actioning === r.id ? 0.6 : 1 }}>

                    {/* En-tête carte */}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ ...S.miniAvatar, width:40, height:40, fontSize:15, background:C.green }}>
                          {(r.requester_name || "?")[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight:700, fontSize:14, color:C.text }}>{r.requester_name || "—"}</div>
                          <div style={{ fontSize:11, color:C.textLight }}>{r.requester_role || "Personnel"}</div>
                        </div>
                      </div>
                      <span style={{ padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:700,
                        background:st.bg, color:st.color, display:"inline-flex", alignItems:"center", gap:4 }}>
                        <span style={{ width:5, height:5, borderRadius:"50%", background:st.color, display:"inline-block" }} />
                        {st.label}
                      </span>
                    </div>

                    {/* Détails */}
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
                      {[
                        ["📍","Destination", r.destination || "—"],
                        ["🎯","Motif",       r.purpose     || "—"],
                        ["📅","Départ",      fmtDate(r.start_date)],
                        ["🏁","Retour",      fmtDate(r.end_date)],
                        ["👥","Passagers",   `${nb} pers. → ${rec.icon} ${rec.label}`],
                        r.estimated_distance && ["📐","Distance", `${r.estimated_distance} km`],
                      ].filter(Boolean).map(([icon, label, value]) => (
                        <div key={label}>
                          <span style={{ fontSize:10, color:C.textLight, textTransform:"uppercase", letterSpacing:"0.8px" }}>{icon} {label}</span>
                          <div style={{ fontSize:12, fontWeight:600, color:C.text }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Notes */}
                    {r.notes && (
                      <div style={{ fontSize:11, color:C.textMid, background:C.bg, borderRadius:7, padding:"8px 10px", marginBottom:10 }}>
                        📝 {r.notes}
                      </div>
                    )}

                    {/* Infos assignation */}
                    {r.vehicle_name && r.vehicle_name !== "Non assigné" && (
                      <div style={{ fontSize:11, color:C.green, marginBottom:6 }}>🚗 Véhicule : {r.vehicle_name}</div>
                    )}
                    {r.driver_name && (
                      <div style={{ fontSize:11, color:C.green, marginBottom:6 }}>👤 Chauffeur : {r.driver_name}</div>
                    )}
                    {r.rejection_reason && (
                      <div style={{ fontSize:11, color:C.red, background:C.redLight, borderRadius:7, padding:"8px 10px", marginBottom:10 }}>
                        ❌ Motif de refus : {r.rejection_reason}
                      </div>
                    )}
                    {r.approved_by_name && (
                      <div style={{ fontSize:11, color:C.green, marginBottom:6 }}>✅ Traité par : {r.approved_by_name}</div>
                    )}

                    {/* Actions EN_ATTENTE */}
                    {r.status === "EN_ATTENTE" && (
                      <div style={{ display:"flex", gap:8, marginTop:8 }}>
                        <button disabled={actioning === r.id}
                          onClick={() => setApproveModal(r)}
                          style={{ ...S.btn, opacity:actioning === r.id ? 0.6 : 1 }}>
                          ✓ Approuver & Assigner
                        </button>
                        <button disabled={actioning === r.id}
                          onClick={() => { setRejectModal(r.id); setRejectReason(""); }}
                          style={{ ...S.ghostBtn, color:C.red, borderColor:"#fca5a5", opacity:actioning === r.id ? 0.6 : 1 }}>
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

// ── MODAL APPROBATION ─────────────────────────────────────────────────────────
function ModalApprobation({ reservation, onClose, onDone }) {
  const nb   = reservation.number_of_passengers || 1;
  const reco = getCategorie(nb);

  const [vehicles,   setVehicles]   = useState([]);
  const [drivers,    setDrivers]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selectedV,  setSelectedV]  = useState(null);
  const [selectedD,  setSelectedD]  = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterCat,  setFilterCat]  = useState(reco.cat);
  const [error,      setError]      = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // On filtre côté backend : DISPONIBLE + POOL uniquement (pas les véhicules de directeurs)
        const [v, d] = await Promise.all([
          apiFetch("/vehicles/?status=DISPONIBLE&assignment_type=POOL"),
         apiFetch("/auth/users/?role=CHAUFFEUR&is_active=true"),
        ]);
        setVehicles(Array.isArray(v) ? v : v?.results ?? []);
        setDrivers(Array.isArray(d) ? d : d?.results ?? []);
      } catch (e) {
        setError("Impossible de charger les données : " + e.message);
      } finally { setLoading(false); }
    })();
  }, []);

  // Filtre catégorie côté frontend (sur les véhicules déjà filtrés POOL)
  const filteredVeh = filterCat ? vehicles.filter(v => v.category === filterCat) : vehicles;

  const handleApprove = async () => {
    setError(""); setSubmitting(true);
    try {
      const body = {};
      if (selectedV) body.vehicle = selectedV;
      if (selectedD) body.driver  = selectedD;

      await apiFetch(`/reservations/${reservation.id}/approve/`, {
        method:"POST", body:JSON.stringify(body),
      });

      // Si un véhicule est assigné, il passera EN_SERVICE côté backend
      // (à implémenter dans la vue approve si ce n'est pas encore fait)
      onDone();
    } catch (e) { setError("Erreur : " + e.message); }
    finally     { setSubmitting(false); }
  };

  return (
    <div style={M.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...M.modal, maxWidth:700 }}>

        {/* Header */}
        <div style={M.header}>
          <div>
            <div style={M.title}>Approuver — réservation #{reservation.id}</div>
            <div style={{ fontSize:11, color:C.textLight, marginTop:2 }}>
              {reservation.requester_name} · {reservation.destination} · {nb} personne(s)
            </div>
          </div>
          <button onClick={onClose} style={M.closeBtn}>✕</button>
        </div>

        {error && <div style={M.errorBar}>{error}</div>}

        <div style={{ overflowY:"auto", padding:"20px 22px", display:"flex", flexDirection:"column", gap:20 }}>

          {/* Résumé de la demande */}
          <div style={{ background:C.amberLight, borderRadius:9, padding:"12px 16px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[
              ["📍 Destination", reservation.destination],
              ["🎯 Motif",       reservation.purpose],
              ["📅 Départ",      fmtDate(reservation.start_date)],
              ["🏁 Retour",      fmtDate(reservation.end_date)],
              ["👥 Passagers",   `${nb} pers. → ${reco.icon} ${reco.label}`],
              reservation.estimated_distance && ["📐 Distance estimée", `${reservation.estimated_distance} km`],
            ].filter(Boolean).map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize:10, color:C.textLight, textTransform:"uppercase", letterSpacing:"0.8px" }}>{label}</div>
                <div style={{ fontSize:12, fontWeight:600, color:C.text }}>{val}</div>
              </div>
            ))}
          </div>

          {/* ── 1. Sélection véhicule ── */}
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:6 }}>
              1. Choisir un véhicule du parc commun
            </div>
            <div style={{ fontSize:11, color:C.textLight, marginBottom:10 }}>
              Seuls les véhicules <b>disponibles</b> du parc commun sont listés.
              Les voitures de fonction des directeurs sont exclues.
              Le véhicule choisi passera en <b style={{ color:C.amber }}>En service</b> pour la durée de la réservation.
            </div>

            {/* Filtres catégorie */}
            <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
              <button onClick={() => setFilterCat("")}
                style={{ ...S.filterPill, ...(filterCat === "" ? S.filterPillOn : {}) }}>
                Tous ({vehicles.length})
              </button>
              {VEHICLE_CATEGORIES.map(([cat, label, icon]) => {
                const count = vehicles.filter(v => v.category === cat).length;
                const isReco = cat === reco.cat;
                return (
                  <button key={cat} onClick={() => setFilterCat(cat)}
                    style={{
                      ...S.filterPill,
                      ...(filterCat === cat ? S.filterPillOn : {}),
                      ...(isReco ? { border:`1.5px solid ${C.amber}` } : {}),
                    }}>
                    {icon} {label} ({count})
                    {isReco && <span style={{ marginLeft:4, fontSize:9, color:C.amber, fontWeight:800 }}>✓ recommandé</span>}
                  </button>
                );
              })}
            </div>

            {loading
              ? <div style={{ textAlign:"center", padding:24, color:C.textLight }}>Chargement des véhicules…</div>
              : filteredVeh.length === 0
                ? <div style={{ textAlign:"center", padding:20, color:C.red, fontSize:13, background:C.redLight, borderRadius:8 }}>
                    Aucun véhicule disponible dans cette catégorie.
                    <div style={{ fontSize:11, color:C.textLight, marginTop:4 }}>
                      Essayez une autre catégorie ou approuvez sans véhicule pour l'assigner plus tard.
                    </div>
                  </div>
                : <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, maxHeight:220, overflowY:"auto" }}>
                    {filteredVeh.map(v => {
                      const catInfo = VEHICLE_CATEGORIES.find(([c]) => c === v.category);
                      const sel     = selectedV === v.id;
                      return (
                        <div key={v.id} onClick={() => setSelectedV(sel ? null : v.id)}
                          style={{ padding:"10px 12px", borderRadius:8, cursor:"pointer",
                            border:`2px solid ${sel ? C.green : C.border}`,
                            background:sel ? C.greenLight : C.bg,
                            display:"flex", alignItems:"center", gap:10, transition:"all .15s" }}>
                          <span style={{ fontSize:22 }}>{catInfo?.[2] ?? "🚗"}</span>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{v.registration_number}</div>
                            <div style={{ fontSize:11, color:C.textMid }}>{v.make} {v.model} · {v.seating_capacity} pl.</div>
                            <div style={{ fontSize:10, color:C.textLight }}>
                              {catInfo?.[1]} · {Number(v.current_mileage || 0).toLocaleString("fr-FR")} km
                            </div>
                          </div>
                          {sel && <span style={{ color:C.green, fontWeight:800, fontSize:18 }}>✓</span>}
                        </div>
                      );
                    })}
                  </div>
            }
          </div>

          {/* ── 2. Sélection chauffeur ── */}
          {/* ── 2. Sélection chauffeur ── */}
<div>
  <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:6 }}>
    2. Assigner un chauffeur
    <span style={{ fontSize:11, fontWeight:400, color:C.textLight, marginLeft:8 }}>(optionnel)</span>
  </div>

  {loading
    ? <div style={{ textAlign:"center", padding:16, color:C.textLight }}>Chargement…</div>
    : drivers.length === 0
      ? <div style={{ fontSize:12, color:C.amber, background:C.amberLight, borderRadius:8, padding:"12px 14px" }}>
          Aucun chauffeur enregistré.
        </div>
      : <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, maxHeight:220, overflowY:"auto" }}>
          {drivers.map(d => {
            const profile  = d.driver_profile;
            const status   = profile?.manual_status ?? "DISPONIBLE";
            const isBus    = profile?.assignment_type === "BUS_SCOLAIRE";
            const sel      = selectedD === d.id;

            // Calcul disponibilité
            const statusCfg = {
              DISPONIBLE:   { label:"Disponible",   color:C.green,  bg:C.greenLight  },
              EN_MISSION:   { label:"En mission",   color:C.amber,  bg:C.amberLight  },
              INDISPONIBLE: { label:"Indisponible", color:C.red,    bg:C.redLight    },
              CONGE:        { label:"En congé",     color:"#888",   bg:"#F5F5F5"     },
            }[status] || { label:status, color:"#888", bg:"#F5F5F5" };

            const isSelectable = status === "DISPONIBLE";

            return (
              <div key={d.id}
                onClick={() => isSelectable && setSelectedD(sel ? null : d.id)}
                style={{ padding:"10px 12px", borderRadius:8,
                  cursor: isSelectable ? "pointer" : "not-allowed",
                  border:`2px solid ${sel ? C.green : isSelectable ? C.border : "#E8E8E8"}`,
                  background: sel ? C.greenLight : isSelectable ? C.bg : "#FAFAFA",
                  display:"flex", alignItems:"flex-start", gap:10,
                  opacity: isSelectable ? 1 : 0.65,
                  transition:"all .15s" }}>

                {/* Avatar */}
                <div style={{ width:36, height:36, borderRadius:"50%",
                  background: isSelectable ? C.green : "#CCC",
                  color:"#fff", display:"flex", alignItems:"center",
                  justifyContent:"center", fontWeight:800, fontSize:13, flexShrink:0 }}>
                  {d.first_name?.[0]}{d.last_name?.[0]}
                </div>

                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text }}>
                    {d.full_name || `${d.first_name} ${d.last_name}`}
                  </div>

                  {/* Statut */}
                  <div style={{ display:"inline-flex", alignItems:"center", gap:4,
                    marginTop:3, padding:"1px 7px", borderRadius:99, fontSize:10,
                    fontWeight:700, background:statusCfg.bg, color:statusCfg.color }}>
                    <span style={{ width:5, height:5, borderRadius:"50%",
                      background:statusCfg.color, display:"inline-block" }}/>
                    {statusCfg.label}
                  </div>

                  {/* Infos bus scolaire */}
                  {isBus && (
                    <div style={{ fontSize:10, color:C.blue, marginTop:3,
                      background:C.blueLight, padding:"2px 7px", borderRadius:5,
                      display:"inline-block", marginLeft:4 }}>
                      🚌 Bus scolaire · {profile?.bus_slot_start ?? "05:00"}–{profile?.bus_slot_end ?? "08:30"}
                    </div>
                  )}

                  {/* Véhicule assigné si bus scolaire */}
                  {profile?.assigned_vehicle_info && (
                    <div style={{ fontSize:10, color:C.textLight, marginTop:2 }}>
                      🚌 {profile.assigned_vehicle_info.registration_number} — {profile.assigned_vehicle_info.make} {profile.assigned_vehicle_info.model}
                    </div>
                  )}

                  {/* Permis */}
                  {profile && (
                    <div style={{ fontSize:10, color:C.textLight, marginTop:2 }}>
                      Permis {profile.license_category} · {profile.years_of_experience} ans exp.
                    </div>
                  )}
                </div>

                {sel && <span style={{ color:C.green, fontWeight:800, fontSize:18, flexShrink:0 }}>✓</span>}
              </div>
            );
          })}
        </div>
  }

  <div style={{ fontSize:10, color:C.textLight, marginTop:8 }}>
    💡 Seuls les chauffeurs avec le statut <b>Disponible</b> peuvent être sélectionnés.
    Les chauffeurs bus scolaire sont bloqués sur leur créneau matin.
  </div>
</div>

          {/* Résumé sélection */}
          {(selectedV || selectedD) && (
            <div style={{ background:C.greenLight, borderRadius:8, padding:"12px 14px", fontSize:12, color:C.green, fontWeight:600, display:"flex", flexDirection:"column", gap:4 }}>
              <div>✓ Prêt à approuver avec :</div>
              {selectedV && (
                <div style={{ fontSize:11, color:C.text }}>
                  🚗 {vehicles.find(v => v.id === selectedV)?.registration_number} —{" "}
                  {vehicles.find(v => v.id === selectedV)?.make} {vehicles.find(v => v.id === selectedV)?.model}
                  <span style={{ color:C.amber, marginLeft:8 }}>→ passera EN SERVICE</span>
                </div>
              )}
              {selectedD && (
                <div style={{ fontSize:11, color:C.text }}>
                  👤 {drivers.find(d => d.id === selectedD)?.full_name || ""}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 22px", borderTop:`1px solid ${C.border}`,
          display:"flex", gap:10, justifyContent:"flex-end", flexShrink:0 }}>
          <button onClick={onClose} style={S.ghostBtn}>Annuler</button>
          <button onClick={handleApprove} disabled={submitting}
            style={{ ...S.btn, opacity:submitting ? 0.7 : 1, minWidth:160 }}>
            {submitting ? "Envoi en cours…" : selectedV ? "✓ Approuver & Mettre en service" : "✓ Approuver sans véhicule"}
          </button>
        </div>
      </div>
    </div>
  );
}