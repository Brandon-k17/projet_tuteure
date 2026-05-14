// ─── pages/documents/TabDocumentsChauffeur.jsx ────────────────────────────────
import { useState, useEffect, useCallback } from "react";

const API_BASE = "http://localhost:8000/api/v1";

async function apiFetch(path) {
  const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  if (res.status === 204) return null;
  const json = await res.json();
  return json?.data ?? json;
}

const C = {
  green:"#1B5E37", greenMid:"#2D7A4F", greenLight:"#EAF4EE",
  red:"#C0182A",   redLight:"#FDF0F1",
  white:"#FFFFFF",  bg:"#F4F6F5",
  border:"#E2E8E5", text:"#1A2820", textMid:"#4A6358", textLight:"#8EA99A",
  amber:"#D97706",  amberLight:"#FFFBEB",
  blue:"#1D4ED8",   blueLight:"#EFF6FF",
};

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric" }) : "—";

const daysUntil = (d) => d ? Math.ceil((new Date(d) - Date.now()) / 86400000) : null;

function alertStatus(days) {
  if (days === null) return { color: C.green, bg: C.greenLight, icon: "✅", label: "Valide" };
  if (days < 0)      return { color: C.red,   bg: C.redLight,   icon: "❌", label: `Expiré depuis ${Math.abs(days)}j` };
  if (days <= 30)    return { color: C.red,   bg: C.redLight,   icon: "⚠️", label: `Expire dans ${days}j` };
  if (days <= 90)    return { color: C.amber, bg: C.amberLight, icon: "⚠️", label: `Encore ${days} jours` };
  return               { color: C.green, bg: C.greenLight, icon: "✅", label: `Encore ${days} jours` };
}

export default function TabDocumentsChauffeur({ vehicule }) {
  const [docs,    setDocs]    = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDocs = useCallback(async () => {
    if (!vehicule?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await apiFetch(`/documents/?vehicle=${vehicule.id}`);
      setDocs(Array.isArray(res) ? res : res?.results ?? []);
    } catch { setDocs([]); }
    finally { setLoading(false); }
  }, [vehicule?.id]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  if (!vehicule) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"80px 20px", gap:14 }}>
      <div style={{ fontSize:48 }}>🚗</div>
      <div style={{ fontSize:15, fontWeight:700, color:C.text }}>Aucun véhicule assigné</div>
      <div style={{ fontSize:13, color:C.textLight }}>Contactez le gestionnaire.</div>
    </div>
  );

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"60px 0", gap:12 }}>
      <div style={{ width:24, height:24, border:`3px solid ${C.green}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin .8s linear infinite" }}/>
      <span style={{ fontSize:13, color:C.textLight }}>Chargement…</span>
    </div>
  );

  // ── Infos techniques du véhicule ──────────────────────────────────────────
  const infos = [
    { label:"Marque",              val: vehicule.brand || vehicule.make || "—" },
    { label:"Modèle",              val: vehicule.model || "—" },
    { label:"Immatriculation",     val: vehicule.registration_number || vehicule.license_plate || "—", bold:true },
    { label:"Année",               val: vehicule.year || "—" },
    { label:"Catégorie",           val: vehicule.category || vehicule.vehicle_type || "—" },
    { label:"Capacité",            val: vehicule.seating_capacity ? `${vehicule.seating_capacity} places` : "—" },
    { label:"Transmission",        val: vehicule.transmission || "—" },
    { label:"Couleur",             val: vehicule.color || "—" },
    { label:"Mise en service",     val: fmt(vehicule.created_at) },
    { label:"Kilométrage actuel",  val: vehicule.current_mileage ? `${Number(vehicule.current_mileage).toLocaleString("fr-FR")} km` : "—" },
    { label:"Type de carburant",   val: vehicule.fuel_type || "—" },
    { label:"Puissance",           val: vehicule.power ? `${vehicule.power} CV` : "—" },
  ];

  // ── Alertes depuis les documents ──────────────────────────────────────────
  const docMap = {};
  docs.forEach(d => { docMap[d.type] = d; });

const alertes = [
  {
    key:"insurance",
    label:"Assurance",
    icon:"🛡️",
    expiry:   docMap.insurance?.expiry_date ?? null,
    detail:   docMap.insurance?.title ?? null,
    present:  !!docMap.insurance,
  },
  {
    key:"inspection",
    label:"Contrôle technique",
    icon:"🔧",
    expiry:   docMap.inspection?.expiry_date ?? null,
    detail:   docMap.inspection?.title ?? null,
    present:  !!docMap.inspection,
  },
  {
    key:"vignette",
    label:"Vignette",
    icon:"🏷️",
    expiry:   docMap.vignette?.expiry_date ?? null,
    detail:   docMap.vignette?.title ?? null,
    present:  !!docMap.vignette,
  },
  {
    key:"maintenance",
    label:"Révision",
    icon:"⚙️",
    expiry:   docMap.maintenance?.expiry_date ?? null,
    detail:   docMap.maintenance?.title ?? null,
    present:  !!docMap.maintenance,
  },
];
  // ── Documents complets ────────────────────────────────────────────────────
  const autresDocs = docs.filter(d => !["insurance","inspection","vignette"].includes(d.type));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, fontFamily:"'Inter',-apple-system,sans-serif" }}>
      <style>{"@keyframes spin { to { transform:rotate(360deg); } }"}</style>

      {/* ── Header véhicule ── */}
      <div style={{ background:`linear-gradient(130deg, ${C.green} 0%, ${C.greenMid} 100%)`, borderRadius:12, padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, color:"#fff" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:48, height:48, borderRadius:10, background:"rgba(255,255,255,0.18)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>🚗</div>
          <div>
            <div style={{ fontSize:11, opacity:0.7, textTransform:"uppercase", letterSpacing:"1.5px", fontWeight:600 }}>Mon véhicule assigné</div>
            <div style={{ fontSize:18, fontWeight:800, marginTop:2 }}>
              {vehicule.brand || vehicule.make} {vehicule.model}
            </div>
            <div style={{ fontSize:22, fontWeight:900, letterSpacing:"3px", opacity:0.9 }}>
              {vehicule.registration_number || vehicule.license_plate}
            </div>
          </div>
        </div>
        <div style={{ background:"rgba(255,255,255,0.12)", borderRadius:8, padding:"8px 14px", fontSize:11, textAlign:"right" }}>
          <div style={{ opacity:0.7, marginBottom:2 }}>Statut</div>
          <div style={{ fontWeight:800, fontSize:14 }}>
            {vehicule.status === "DISPONIBLE" ? "✅ Disponible" :
             vehicule.status === "EN_SERVICE" ? "🟡 En service" :
             vehicule.status === "EN_MAINTENANCE" ? "🔧 Maintenance" : vehicule.status || "—"}
          </div>
        </div>
      </div>

      {/* ── Deux colonnes : Infos + Alertes ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>

        {/* Colonne gauche — Informations techniques */}
        <div style={{ background:C.white, borderRadius:12, padding:"18px 20px", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
            <span style={{ fontSize:16 }}>🔩</span>
            <span style={{ fontSize:14, fontWeight:800, color:C.text }}>Informations Techniques</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1, border:`1px solid ${C.border}`, borderRadius:9, overflow:"hidden" }}>
            {infos.map((info, i) => (
              <div key={i} style={{
                padding:"11px 14px",
                background: i % 2 === 0 ? C.white : C.bg,
                borderBottom: i < infos.length - 2 ? `1px solid ${C.border}` : "none",
              }}>
                <div style={{ fontSize:9, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1.2px", marginBottom:4 }}>
                  {info.label}
                </div>
                <div style={{ fontSize:info.bold ? 15 : 13, fontWeight:info.bold ? 800 : 600, color:info.bold ? C.green : C.text }}>
                  {info.val}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:12, fontSize:11, color:C.textLight, fontStyle:"italic", textAlign:"center" }}>
            🔒 Lecture seule — modifiable par le gestionnaire uniquement
          </div>
        </div>

        {/* Colonne droite — Alertes et Documents */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

          {/* Alertes maintenance / documents */}
          <div style={{ background:C.white, borderRadius:12, padding:"18px 20px", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
              <span style={{ fontSize:16 }}>🔔</span>
              <span style={{ fontSize:14, fontWeight:800, color:C.text }}>Alertes et Maintenance</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {alertes.map((a, i) => {
  // Si document pas encore chargé par le gestionnaire
  if (!a.present) {
    return (
      <div key={i} style={{
        display:"flex", alignItems:"center", gap:12,
        padding:"12px 14px", borderRadius:9,
        background:"#F8FAFC",
        border:`1px solid #E2E8E5`,
      }}>
        <div style={{ width:32, height:32, borderRadius:8, background:"#fff", border:"1px solid #E2E8E5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
          {a.icon}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{a.label}</div>
          <div style={{ fontSize:11, color:C.textLight, marginTop:3, fontStyle:"italic" }}>
            En attente de chargement par le gestionnaire
          </div>
        </div>
        <span style={{ fontSize:10, fontWeight:700, color:"#64748B", background:"#F1F5F9", padding:"2px 10px", borderRadius:99 }}>
          🕐 En attente
        </span>
      </div>
    );
  }

  // Document présent — afficher statut réel
  const days = daysUntil(a.expiry);
  const st   = alertStatus(days);
  return (
    <div key={i} style={{
      display:"flex", alignItems:"flex-start", gap:12,
      padding:"12px 14px", borderRadius:9,
      background: st.bg,
      border: `1px solid ${st.color}22`,
    }}>
      <div style={{ width:32, height:32, borderRadius:8, background:"rgba(255,255,255,0.7)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
        {a.icon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{a.label}</div>
          <span style={{ fontSize:10, fontWeight:700, color:st.color, background:"rgba(255,255,255,0.6)", padding:"2px 8px", borderRadius:99, whiteSpace:"nowrap" }}>
            {st.icon} {st.label}
          </span>
        </div>
        <div style={{ fontSize:11, color:C.textMid, marginTop:3 }}>{a.detail}</div>
        {a.expiry && (
          <div style={{ fontSize:10, color:C.textLight, marginTop:3 }}>
            {days !== null && days >= 0
              ? `Valide jusqu'au ${fmt(a.expiry)}`
              : `Expiré le ${fmt(a.expiry)}`}
          </div>
        )}
      </div>
    </div>
  );
})}
            </div>
          </div>

          {/* Documents officiels */}
          {docs.length > 0 && (
            <div style={{ background:C.white, borderRadius:12, padding:"18px 20px", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                <span style={{ fontSize:16 }}>📄</span>
                <span style={{ fontSize:14, fontWeight:800, color:C.text }}>Documents officiels</span>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {docs.map((doc, i) => {
                  const days = daysUntil(doc.expiry_date);
                  const st   = alertStatus(days);
                  return (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:C.bg, borderRadius:8, border:`1px solid ${C.border}` }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{doc.title}</div>
                        {doc.expiry_date && <div style={{ fontSize:10, color:C.textLight, marginTop:2 }}>Expire le {fmt(doc.expiry_date)}</div>}
                      </div>
                      <span style={{ fontSize:10, fontWeight:700, color:st.color, background:st.bg, padding:"2px 8px", borderRadius:99, whiteSpace:"nowrap" }}>
                        {st.icon} {st.label}
                      </span>
                      {doc.file && (
                        <a href={doc.file} target="_blank" rel="noreferrer"
                          style={{ fontSize:11, color:C.blue, fontWeight:600, textDecoration:"none", background:C.blueLight, padding:"4px 10px", borderRadius:6, whiteSpace:"nowrap" }}>
                          👁️ Voir
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Aucun document */}
          {docs.length === 0 && (
            <div style={{ background:C.white, borderRadius:12, padding:"24px 20px", boxShadow:"0 1px 3px rgba(0,0,0,.05)", textAlign:"center" }}>
              <div style={{ fontSize:32, marginBottom:8 }}>📂</div>
              <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:4 }}>Aucun document chargé</div>
              <div style={{ fontSize:11, color:C.textLight }}>Le gestionnaire n'a pas encore téléversé de documents pour ce véhicule.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}