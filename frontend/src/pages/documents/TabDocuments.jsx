// ─── pages/documents/TabDocuments.jsx ─────────────────────────────────────────
// Onglet "Mes Documents" — Directeur DRIVEPARC / IUC
// Lecture seule : affiche les documents téléversés par le gestionnaire
// Se connecte à /api/v1/documents/?vehicle={id}
// ──────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";

const API_BASE = "http://localhost:8000/api/v1";

async function apiFetch(path) {
  const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization:`Bearer ${token}`, "Content-Type":"application/json" },
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
  slate:"#475569",  slateLight:"#F8FAFC",
};

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric" }) : "—";

const daysUntil = (d) => d ? Math.ceil((new Date(d) - Date.now()) / 86400000) : null;

function docStatus(expiry) {
  if (!expiry) return { key:"VALIDE",  label:"En règle",          color:C.green, bg:C.greenLight };
  const d = daysUntil(expiry);
  if (d < 0)     return { key:"EXPIRE",  label:"Expiré",            color:C.red,   bg:C.redLight   };
  if (d <= 7)    return { key:"URGENT",  label:`Expire dans ${d}j`, color:C.red,   bg:C.redLight   };
  if (d <= 30)   return { key:"BIENTOT", label:`Expire dans ${d}j`, color:C.red,   bg:C.redLight   };
  if (d <= 90)   return { key:"BIENTOT", label:`Expire dans ${d}j`, color:C.amber, bg:C.amberLight };
  return          { key:"VALIDE",  label:"Valide",                  color:C.green, bg:C.greenLight };
}

const DOC_META = {
  insurance:    { icon:"🛡️", label:"Assurance",          cat:"Assurance"     },
  registration: { icon:"📋", label:"Carte grise",         cat:"Administratif" },
  inspection:   { icon:"🔧", label:"Visite technique",    cat:"Technique"     },
  vignette:     { icon:"🏷️", label:"Vignette automobile", cat:"Fiscal"        },
  other:        { icon:"📄", label:"Autre",               cat:"Autre"         },
};

// Règles visite technique (droit camerounais)
function vtRegle(vehicleYear, vehicleType) {
  const age = new Date().getFullYear() - vehicleYear;
  const isBus = vehicleType === "BUS";
  if (age < 2 && !isBus) return { exonere:true, label:"Exonéré — véhicule < 2 ans" };
  return {
    exonere: false,
    label: isBus ? "Semestrielle — transport en commun" : age <= 5 ? "Biennale — 2 à 5 ans" : "Annuelle — > 5 ans",
  };
}

function ExpiryBar({ created_at, expiry_date }) {
  if (!created_at || !expiry_date) return null;
  const total   = new Date(expiry_date) - new Date(created_at);
  const elapsed = Date.now() - new Date(created_at);
  const pct     = Math.min(100, Math.max(0, (elapsed / total) * 100));
  const barColor = pct > 85 ? C.red : pct > 65 ? C.amber : C.green;
  return (
    <div style={{ margin:"10px 0 4px" }}>
      <div style={{ height:3, background:"rgba(0,0,0,0.07)", borderRadius:99, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:barColor, borderRadius:99, transition:"width .5s" }}/>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:C.textLight, marginTop:3 }}>
        <span>Ajouté le {fmt(created_at)}</span>
        <span style={{ fontWeight:700, color:barColor }}>{Math.round(pct)}% écoulé</span>
        <span>{fmt(expiry_date)}</span>
      </div>
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────────
export default function TabDocuments({ vehicule }) {
  const [docs,    setDocs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId,  setOpenId]  = useState(null);

  const loadDocs = useCallback(async () => {
    if (!vehicule?.id) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/documents/?vehicle=${vehicule.id}`);
      setDocs(Array.isArray(res) ? res : res?.results ?? []);
    } catch { setDocs([]); }
    finally  { setLoading(false); }
  }, [vehicule?.id]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  if (!vehicule) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"80px 20px", gap:14 }}>
      <div style={{ fontSize:48 }}>📂</div>
      <div style={{ fontSize:15, fontWeight:700, color:C.text }}>Aucun véhicule assigné</div>
      <div style={{ fontSize:13, color:C.textLight, textAlign:"center", maxWidth:340, lineHeight:1.6 }}>
        Les documents apparaîtront ici dès qu'un véhicule de fonction vous sera attribué.
      </div>
    </div>
  );

  const year  = vehicule.year ?? new Date().getFullYear();
  const age   = new Date().getFullYear() - year;
  const vt    = vtRegle(year, vehicule.vehicle_type);

  // Stats
  const nExpired  = docs.filter(d => { const s = docStatus(d.expiry_date); return s.key === "EXPIRE"; }).length;
  const nUrgent   = docs.filter(d => { const s = docStatus(d.expiry_date); return s.key === "URGENT" || (s.key === "BIENTOT" && daysUntil(d.expiry_date) <= 30); }).length;
  const nAttente  = 0; // tous les docs présents viennent du gestionnaire

  // Types attendus non encore chargés
  const TYPES_ATTENDUS = ["insurance","registration","inspection","vignette"];
  const typesPresents  = new Set(docs.map(d => d.type));
  const typeManquants  = TYPES_ATTENDUS.filter(t => !typesPresents.has(t));

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"60px 0", gap:12 }}>
      <div style={{ width:24, height:24, border:`3px solid ${C.green}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin .8s linear infinite" }}/>
      <span style={{ fontSize:13, color:C.textLight }}>Chargement des documents…</span>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, fontFamily:"'Inter',-apple-system,sans-serif" }}>
      <style>{"@keyframes spin { to { transform:rotate(360deg); } }"}</style>

      {/* ── Bannière véhicule ──────────────────────────────────────────────── */}
      <div style={{ background:`linear-gradient(130deg, ${C.green} 0%, ${C.greenMid} 100%)`, borderRadius:12, padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, color:"#fff" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:46, height:46, borderRadius:10, background:"rgba(255,255,255,0.18)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🚗</div>
          <div>
            <div style={{ fontSize:15, fontWeight:800 }}>{vehicule.make} {vehicule.model}</div>
            <div style={{ fontSize:20, fontWeight:900, letterSpacing:"3px", marginTop:2, opacity:0.9 }}>{vehicule.registration_number}</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"flex-end" }}>
          {[
            `Année ${year}`,
            `Âge : ${age < 1 ? "< 1 an" : `${age} an${age>1?"s":""}`}`,
            `Visite : ${vt.exonere ? "Exonéré" : vt.label.split("—")[0].trim()}`,
          ].map((c, i) => (
            <div key={i} style={{ background:"rgba(255,255,255,0.14)", borderRadius:6, padding:"4px 10px", fontSize:11 }}>{c}</div>
          ))}
        </div>
      </div>

      {/* ── Alertes ──────────────────────────────────────────────────────────*/}
      {(nExpired + nUrgent) > 0 && (
        <div style={{ display:"flex", gap:12, alignItems:"flex-start", background:C.redLight, border:`1px solid ${C.red}22`, borderRadius:10, padding:"14px 16px", fontSize:12, color:C.red, lineHeight:1.7 }}>
          <span style={{ fontSize:18, flexShrink:0 }}>⚠️</span>
          <div>
            <b>{nExpired + nUrgent} document{nExpired+nUrgent>1?"s":""} nécessite{nExpired+nUrgent>1?"nt":""} une action urgente.</b>
            {" "}Contactez le gestionnaire pour le renouvellement immédiat.
          </div>
        </div>
      )}
      {typeManquants.length > 0 && (
        <div style={{ display:"flex", gap:12, alignItems:"flex-start", background:C.blueLight, border:`1px solid ${C.blue}22`, borderRadius:10, padding:"12px 16px", fontSize:12, color:C.blue, lineHeight:1.7 }}>
          <span style={{ fontSize:16, flexShrink:0 }}>ℹ️</span>
          <div>
            <b>{typeManquants.length} document{typeManquants.length>1?"s":""} en attente de chargement par le gestionnaire :</b>
            {" "}{typeManquants.map(t => DOC_META[t]?.label).join(", ")}.
          </div>
        </div>
      )}

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {[
          { icon:"📄", val:docs.length,         label:"Documents chargés",    color:C.green  },
          { icon:"⏳", val:typeManquants.length,  label:"En attente",           color:C.slate  },
          { icon:"⚠️", val:nExpired+nUrgent,     label:"Alertes urgentes",     color:nExpired+nUrgent ? C.red : C.green },
          { icon:"📅", val:docs.find(d => d.type==="inspection")?.expiry_date ? fmt(docs.find(d => d.type==="inspection").expiry_date) : (vt.exonere ? "Exonéré" : "—"),
            label:"Prochaine visite", color:C.amber, small:true },
        ].map((k, i) => (
          <div key={i} style={{ background:C.white, borderRadius:10, padding:"14px 16px", borderTop:`3px solid ${k.color}`, boxShadow:"0 1px 3px rgba(0,0,0,.05)", display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", gap:2 }}>
            <div style={{ fontSize:20 }}>{k.icon}</div>
            <div style={{ fontSize:k.small?12:22, fontWeight:800, color:k.color, marginTop:6, lineHeight:1.2 }}>{k.val}</div>
            <div style={{ fontSize:10, color:C.textLight, fontWeight:600, textTransform:"uppercase", letterSpacing:"1px", marginTop:4, lineHeight:1.4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Documents chargés ─────────────────────────────────────────────── */}
      <div style={{ background:C.white, borderRadius:12, padding:"18px 20px", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:800, color:C.text }}>Documents officiels</div>
          <div style={{ fontSize:11, color:C.textLight, marginTop:3 }}>Téléversés et gérés par le gestionnaire · Lecture seule</div>
        </div>

        {docs.length === 0 && typeManquants.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {TYPES_ATTENDUS.map(type => {
              const meta = DOC_META[type];
              return (
                <div key={type} style={{ border:`1px solid ${C.border}`, borderLeft:`3px solid ${C.slate}`, borderRadius:10, padding:"14px 16px", background:C.bg, display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:40, height:40, borderRadius:9, background:C.white, border:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{meta.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{meta.label}</div>
                    <div style={{ fontSize:11, color:C.slate, marginTop:2, fontStyle:"italic" }}>En attente de chargement par le gestionnaire</div>
                  </div>
                  <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:99, fontSize:10, fontWeight:700, background:C.slateLight, color:C.slate }}>
                    <span style={{ width:5, height:5, borderRadius:"50%", background:C.slate, display:"inline-block" }}/>
                    En attente
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {docs.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {/* D'abord les vrais documents */}
            {docs.map(doc => {
              const st   = docStatus(doc.expiry_date);
              const meta = DOC_META[doc.type] || DOC_META.other;
              const open = openId === doc.id;
              const days = daysUntil(doc.expiry_date);
              return (
                <div key={doc.id}
                  style={{ border:`1px solid ${C.border}`, borderLeft:`3px solid ${st.color}`, borderRadius:10, padding:"14px 16px", cursor:"pointer", background:open ? C.white : C.bg, transition:"all .12s" }}
                  onClick={() => setOpenId(open ? null : doc.id)}>

                  <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                    <div style={{ width:40, height:40, borderRadius:9, background:C.bg, border:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{meta.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{doc.title}</div>
                      <div style={{ fontSize:11, color:C.textLight, marginTop:2 }}>{meta.label} · {meta.cat}</div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5, flexShrink:0 }}>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:99, fontSize:10, fontWeight:700, whiteSpace:"nowrap", background:st.bg, color:st.color }}>
                        <span style={{ width:5, height:5, borderRadius:"50%", background:st.color, display:"inline-block" }}/>
                        {st.label}
                      </span>
                      {days !== null && (
                        <div style={{ fontSize:10, color:days < 0 ? C.red : C.textLight }}>
                          {days < 0 ? `Expiré depuis ${Math.abs(days)}j` : `${days}j restants`}
                        </div>
                      )}
                    </div>
                  </div>

                  <ExpiryBar created_at={doc.created_at} expiry_date={doc.expiry_date} />

                  <div style={{ display:"flex", flexWrap:"wrap", gap:14, fontSize:11, color:C.textMid, marginTop:8 }}>
                    {doc.expiry_date && <span>⏳ Expire le {fmt(doc.expiry_date)}</span>}
                    {!doc.expiry_date && <span style={{ color:C.green }}>✅ Sans date d'expiration</span>}
                    {doc.montant && <span>💰 {Number(doc.montant).toLocaleString("fr-FR")} FCFA</span>}
                  </div>

                  {open && (
                    <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
                      {doc.notes && (
                        <div style={{ fontSize:11, color:C.textMid, marginBottom:12, background:C.bg, borderRadius:8, padding:"8px 12px" }}>
                          📝 {doc.notes}
                        </div>
                      )}
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        {doc.file && (
                          <>
                            <a href={doc.file} target="_blank" rel="noreferrer"
                              style={{ padding:"7px 14px", background:C.blueLight, color:C.blue, border:`1px solid ${C.blue}20`, borderRadius:7, fontSize:12, fontWeight:600, textDecoration:"none" }}>
                              👁️ Voir le document
                            </a>
                            <a href={doc.file} download
                              style={{ padding:"7px 14px", background:C.white, color:C.textMid, border:`1px solid ${C.border}`, borderRadius:7, fontSize:12, fontWeight:600, textDecoration:"none" }}>
                              📥 Télécharger
                            </a>
                          </>
                        )}
                        {["EXPIRE","URGENT","BIENTOT"].includes(st.key) && (
                          <div style={{ display:"flex", gap:8, background:C.redLight, border:`1px solid ${C.red}22`, borderRadius:8, padding:"8px 12px", fontSize:11, color:C.red, lineHeight:1.6, flexBasis:"100%" }}>
                            <span>⚠️</span>
                            <span>Renouvellement nécessaire — contactez le gestionnaire.</span>
                          </div>
                        )}
                      </div>
                      <div style={{ marginTop:10, fontSize:10, color:C.textLight, fontStyle:"italic" }}>
                        🔒 Lecture seule — les modifications sont effectuées par le gestionnaire.
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize:10, color:C.textLight, textAlign:"right", marginTop:8, fontWeight:600 }}>
                    {open ? "▲ Réduire" : "▼ Détails"}
                  </div>
                </div>
              );
            })}

            {/* Types manquants en grisé */}
            {typeManquants.map(type => {
              const meta = DOC_META[type];
              return (
                <div key={type} style={{ border:`1px dashed ${C.border}`, borderRadius:10, padding:"12px 16px", background:C.slateLight, display:"flex", alignItems:"center", gap:12, opacity:0.7 }}>
                  <div style={{ width:36, height:36, borderRadius:8, background:C.white, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{meta.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:C.textMid }}>{meta.label}</div>
                    <div style={{ fontSize:11, color:C.slate, marginTop:1, fontStyle:"italic" }}>En attente de chargement par le gestionnaire</div>
                  </div>
                  <span style={{ fontSize:10, color:C.slate, fontWeight:600 }}>🕐 En attente</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ textAlign:"center", fontSize:11, color:C.textLight, padding:"6px 0 2px", fontStyle:"italic" }}>
        🔒 Onglet en lecture seule. Téléversements et mises à jour effectués par le gestionnaire.
      </div>
    </div>
  );
}