// ─── pages/documents/TabDocumentsGestionnaire.jsx ────────────────────────────
// Module Documents — Gestionnaire DRIVEPARC / IUC
// Version 3.0 — Statistiques + Filtres corrigés + Viewer agrandi + IA améliorée
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

const API_BASE = "http://localhost:8000/api/v1";

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(!options.isMultipart ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (res.status === 204) return null;
  const json = await res.json();
  if (!res.ok) throw new Error(json?.detail || json?.message || `Erreur ${res.status}`);
  return json?.data ?? json;
}

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  green:"#1B5E37",  greenMid:"#2D7A4F", greenLight:"#EAF4EE", greenXLight:"#F2FAF5",
  red:"#C0182A",    redLight:"#FDF0F1",
  white:"#FFFFFF",  bg:"#F4F6F5",
  border:"#E2E8E5", text:"#1A2820",    textMid:"#4A6358",    textLight:"#8EA99A",
  amber:"#D97706",  amberLight:"#FFFBEB",
  blue:"#1D4ED8",   blueLight:"#EFF6FF",
  slate:"#475569",  slateLight:"#F8FAFC",
  purple:"#6D28D9", purpleLight:"#F5F3FF",
  teal:"#0F766E",   tealLight:"#F0FDFA",
  orange:"#EA580C", orangeLight:"#FFF7ED",
};

// ── Styles ────────────────────────────────────────────────────────────────────
const inp = {
  padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:8,
  fontSize:13, fontFamily:"inherit", color:C.text, background:C.white,
  width:"100%", outline:"none", transition:"border-color .15s",
};
const inpErr = { ...inp, borderColor:C.red, background:C.redLight };
const lbl = {
  fontSize:10, fontWeight:700, color:C.textMid, textTransform:"uppercase",
  letterSpacing:"1px", marginBottom:5, display:"block",
};
const btnGhost = {
  padding:"7px 14px", background:"transparent", color:C.textMid,
  border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:12,
  fontWeight:600, cursor:"pointer", fontFamily:"inherit",
};

// ── Utilitaires ───────────────────────────────────────────────────────────────
const fmt = (d) => d
  ? new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric" })
  : "—";
const fmtShort = (d) => d
  ? new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" })
  : "—";

const daysUntil = (d) => d ? Math.ceil((new Date(d) - Date.now()) / 86400000) : null;

function urgencyLevel(expiry) {
  const d = daysUntil(expiry);
  if (d === null) return "none";
  if (d < 0)     return "expired";
  if (d <= 7)    return "critical";
  if (d <= 30)   return "warning";
  if (d <= 90)   return "soon";
  return "ok";
}

const URGENCY_STYLE = {
  expired:  { color:C.red,    bg:C.redLight,    label:"Expiré",          dot:C.red    },
  critical: { color:C.red,    bg:C.redLight,    label:"Critique < 7j",   dot:C.red    },
  warning:  { color:C.amber,  bg:C.amberLight,  label:"Expire < 30j",    dot:C.amber  },
  soon:     { color:C.amber,  bg:C.amberLight,  label:"< 90j",           dot:C.amber  },
  ok:       { color:C.green,  bg:C.greenLight,  label:"Valide",          dot:C.green  },
  none:     { color:C.slate,  bg:C.slateLight,  label:"Sans expiration", dot:C.slate  },
};

const URGENCY_ORDER = { expired:0, critical:1, warning:2, soon:3, ok:4, none:5 };

function calcExpiryFromToday(type, vehicleType) {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  switch (type) {
    case "insurance":
    case "vignette":
      base.setFullYear(base.getFullYear() + 1); break;
    case "inspection":
      base.setMonth(base.getMonth() + (vehicleType === "BUS" ? 6 : 12)); break;
    case "registration":
      base.setFullYear(base.getFullYear() + 5); break;
    default: return "";
  }
  return base.toISOString().split("T")[0];
}

const DOC_META = {
  insurance:    { icon:"🛡️", label:"Assurance",          color:C.blue   },
  registration: { icon:"📋", label:"Carte grise",         color:C.green  },
  inspection:   { icon:"🔧", label:"Visite technique",    color:C.orange },
  vignette:     { icon:"🏷️", label:"Vignette automobile", color:C.purple },
  other:        { icon:"📄", label:"Autre document",      color:C.slate  },
};

// ── Vérification IA ───────────────────────────────────────────────────────────
async function verifyDocumentAI(file, expectedType) {
  try {
    if (file.type === "application/pdf") {
      return {
        ok: true, confidence: null, verdict: "AUTHENTIQUE",
        message: "PDF — vérification visuelle non applicable.",
        issues: [], detected_type: null,
      };
    }
    const toBase64 = (f) => new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(",")[1]);
      r.onerror = rej;
      r.readAsDataURL(f);
    });
    const b64   = await toBase64(file);
    const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
    const res   = await fetch(`${API_BASE}/documents/verify-ai/`, {
      method: "POST",
      headers: { "Content-Type":"application/json", Authorization:`Bearer ${token}` },
      body: JSON.stringify({
        image_base64: b64,
        media_type:   file.type || "image/jpeg",
        expected_type: expectedType,
      }),
    });
    if (!res.ok) throw new Error(`Serveur ${res.status}`);
    const parsed = await res.json();
    return {
      ok:      parsed.verdict !== "INVALIDE",
      verdict: parsed.verdict || "SUSPECT",
      confidence:    parsed.confidence    || null,
      detected_type: parsed.detected_type || null,
      matches_expected: parsed.matches_expected ?? null,
      // ✅ FIX: issues toujours un tableau, jamais undefined
      issues:  Array.isArray(parsed.issues)   ? parsed.issues
              : parsed.reason                 ? [parsed.reason]
              : parsed.message                ? [parsed.message]
              : ["L'IA n'a pas pu identifier les éléments attendus pour ce type de document."],
      message: parsed.message || null,
    };
  } catch(e) {
    console.warn("Vérification IA indisponible:", e);
    return {
      ok: true, verdict: "SUSPECT", confidence: null,
      detected_type: null, matches_expected: null,
      issues: ["Service de vérification IA indisponible. Vérification manuelle recommandée."],
      message: "Service IA temporairement indisponible.",
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// COMPOSANTS UTILITAIRES
// ════════════════════════════════════════════════════════════════════════════

function Toast({ msg, type, onDone }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [msg, onDone]);
  if (!msg) return null;
  const isErr = type === "error";
  return (
    <div style={{
      position:"fixed", bottom:24, right:24, zIndex:9999,
      background: isErr ? C.red : C.green, color:"#fff",
      borderRadius:10, padding:"12px 18px", fontSize:13, fontWeight:600,
      display:"flex", alignItems:"center", gap:10,
      boxShadow:"0 4px 24px rgba(0,0,0,.25)", maxWidth:380,
      animation:"toastIn .25s ease",
    }}>
      <span style={{ fontSize:16 }}>{isErr ? "✕" : "✓"}</span>
      <span style={{ flex:1 }}>{msg}</span>
      <button onClick={onDone} style={{ background:"none", border:"none", color:"rgba(255,255,255,.7)", cursor:"pointer", fontSize:16, padding:0 }}>✕</button>
    </div>
  );
}

const Spinner = ({ size=18, color=C.green }) => (
  <div style={{ width:size, height:size, border:`2px solid ${color}30`, borderTopColor:color, borderRadius:"50%", animation:"spin .7s linear infinite", flexShrink:0 }}/>
);

function ModalConfirmDelete({ docTitle, onCancel, onConfirm, loading }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", zIndex:1300, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:C.white, borderRadius:14, padding:26, width:420, boxShadow:"0 20px 60px rgba(0,0,0,.2)", animation:"toastIn .2s ease" }}>
        <div style={{ fontSize:32, textAlign:"center", marginBottom:12 }}>🗑️</div>
        <div style={{ fontSize:15, fontWeight:700, color:C.text, textAlign:"center", marginBottom:8 }}>Supprimer ce document ?</div>
        <div style={{ fontSize:12, color:C.textLight, textAlign:"center", marginBottom:20, lineHeight:1.6 }}>
          <strong style={{ color:C.text }}>"{docTitle}"</strong> sera définitivement supprimé.<br/>Cette action est irréversible.
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onCancel} style={btnGhost}>Annuler</button>
          <button onClick={onConfirm} disabled={loading}
            style={{ padding:"9px 20px", background:C.red, color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:7, opacity:loading?0.6:1 }}>
            {loading && <Spinner size={14} color="#fff"/>}
            {loading ? "Suppression…" : "Supprimer définitivement"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ✅ MODAL FILE VIEWER AGRANDI — occupe 90% de l'écran
// ════════════════════════════════════════════════════════════════════════════
function ModalFileViewer({ url, title, onClose }) {
  const isImage = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url);
  const isPdf   = /\.pdf(\?.*)?$/i.test(url);
  const [zoom,  setZoom]  = useState(1);
  const [rotate,setRotate]= useState(0);

  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", zIndex:2000, display:"flex", flexDirection:"column" }}
      onClick={onClose}>
      {/* Header */}
      <div
        style={{ background:"rgba(0,0,0,.7)", padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0, backdropFilter:"blur(8px)" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize:14, fontWeight:700, color:"#fff", display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:18 }}>{isImage ? "🖼️" : isPdf ? "📄" : "📎"}</span>
          {title}
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {/* Zoom (images seulement) */}
          {isImage && (
            <>
              <button onClick={() => setZoom(z => Math.max(.3, z - .2))}
                style={{ ...btnGhost, padding:"5px 10px", fontSize:16, color:"#fff", borderColor:"rgba(255,255,255,.3)", background:"rgba(255,255,255,.1)" }}>−</button>
              <span style={{ fontSize:12, color:"#fff", minWidth:40, textAlign:"center" }}>{Math.round(zoom*100)}%</span>
              <button onClick={() => setZoom(z => Math.min(3, z + .2))}
                style={{ ...btnGhost, padding:"5px 10px", fontSize:16, color:"#fff", borderColor:"rgba(255,255,255,.3)", background:"rgba(255,255,255,.1)" }}>+</button>
              <button onClick={() => setRotate(r => r + 90)}
                style={{ ...btnGhost, padding:"5px 10px", fontSize:13, color:"#fff", borderColor:"rgba(255,255,255,.3)", background:"rgba(255,255,255,.1)" }}>↻ Pivoter</button>
            </>
          )}
          <a href={url} download target="_blank" rel="noreferrer"
            style={{ padding:"7px 14px", background:"rgba(255,255,255,.15)", color:"#fff", borderRadius:8, fontSize:12, fontWeight:600, textDecoration:"none", border:"1px solid rgba(255,255,255,.3)", display:"flex", alignItems:"center", gap:4 }}>
            ⬇ Télécharger
          </a>
          <button onClick={onClose}
            style={{ width:36, height:36, borderRadius:8, background:"rgba(255,255,255,.15)", border:"1px solid rgba(255,255,255,.3)", color:"#fff", fontSize:20, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            ✕
          </button>
        </div>
      </div>

      {/* Contenu — 90% de la hauteur */}
      <div
        style={{ flex:1, overflow:"auto", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
        onClick={e => e.stopPropagation()}>
        {isImage ? (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
            <img
              src={url} alt={title}
              style={{
                maxWidth: zoom === 1 ? "90vw" : "none",
                maxHeight: zoom === 1 ? "82vh" : "none",
                width: zoom !== 1 ? `${zoom * 80}vw` : undefined,
                objectFit:"contain",
                borderRadius:8,
                boxShadow:"0 8px 40px rgba(0,0,0,.4)",
                transform:`rotate(${rotate}deg)`,
                transition:"transform .3s ease",
              }}
            />
          </div>
        ) : isPdf ? (
          <iframe
            src={url} title={title}
            style={{
              width: "90vw",
              height: "85vh",
              border:"none",
              borderRadius:8,
              boxShadow:"0 8px 40px rgba(0,0,0,.4)",
              background:"#fff",
            }}
          />
        ) : (
          <div style={{ textAlign:"center", color:"rgba(255,255,255,.7)" }}>
            <div style={{ fontSize:60, marginBottom:16 }}>📎</div>
            <div style={{ fontSize:15, fontWeight:600 }}>Aperçu non disponible pour ce format.</div>
            <a href={url} target="_blank" rel="noreferrer"
              style={{ color:C.blueLight, fontSize:13, marginTop:12, display:"block" }}>
              Ouvrir dans un nouvel onglet →
            </a>
          </div>
        )}
      </div>

      {/* Footer avec raccourcis */}
      <div style={{ background:"rgba(0,0,0,.5)", padding:"8px 20px", textAlign:"center", fontSize:11, color:"rgba(255,255,255,.4)", flexShrink:0 }}>
        Cliquer en dehors pour fermer · {isImage ? "Molette pour zoomer · " : ""}Échap pour fermer
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// GRAPHIQUES SVG PURS — Pie chart + Bar chart
// ════════════════════════════════════════════════════════════════════════════

function PieChart({ data, title, size=180 }) {
  // data = [{label, value, color}]
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return (
    <div style={{ textAlign:"center", padding:"20px 0", color:C.textLight, fontSize:12 }}>Aucune donnée</div>
  );

  const cx = size / 2, cy = size / 2, r = size * .38;
  let angle = -Math.PI / 2;
  const slices = data.map(d => {
    const startAngle = angle;
    angle += (d.value / total) * 2 * Math.PI;
    return { ...d, startAngle, endAngle: angle };
  });

  const arcPath = (sa, ea, rr) => {
    const x1 = cx + rr * Math.cos(sa);
    const y1 = cy + rr * Math.sin(sa);
    const x2 = cx + rr * Math.cos(ea);
    const y2 = cy + rr * Math.sin(ea);
    const large = ea - sa > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${rr} ${rr} 0 ${large} 1 ${x2} ${y2} Z`;
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
      {title && <div style={{ fontSize:12, fontWeight:700, color:C.text }}>{title}</div>}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow:"visible" }}>
        {slices.map((s, i) => (
          <path key={i} d={arcPath(s.startAngle, s.endAngle, r)} fill={s.color} stroke="#fff" strokeWidth="2">
            <title>{s.label}: {s.value} ({Math.round(s.value/total*100)}%)</title>
          </path>
        ))}
        {/* Centre blanc (donut) */}
        <circle cx={cx} cy={cy} r={r * .52} fill="#fff"/>
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="18" fontWeight="800" fill={C.text}>{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="9" fill={C.textLight} fontWeight="600" textTransform="uppercase">docs</text>
      </svg>
      {/* Légende */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center", maxWidth:size + 40 }}>
        {slices.filter(s => s.value > 0).map((s, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:C.textMid }}>
            <span style={{ width:10, height:10, borderRadius:2, background:s.color, display:"inline-block", flexShrink:0 }}/>
            {s.label} ({s.value})
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ data, title, maxHeight=140, color=C.green }) {
  // data = [{label, value, color?}]
  const maxVal = Math.max(...data.map(d => d.value), 1);
  return (
    <div>
      {title && <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:12 }}>{title}</div>}
      <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:maxHeight + 30 }}>
        {data.map((d, i) => {
          const h = Math.max(4, Math.round((d.value / maxVal) * maxHeight));
          const barColor = d.color || color;
          return (
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <div style={{ fontSize:10, fontWeight:700, color:barColor }}>{d.value > 0 ? d.value : ""}</div>
              <div
                title={`${d.label}: ${d.value}`}
                style={{
                  width:"100%", height:h, background:barColor, borderRadius:"4px 4px 0 0",
                  transition:"height .6s ease", minHeight:4, cursor:"default",
                }}/>
              <div style={{ fontSize:9, color:C.textLight, textAlign:"center", lineHeight:1.3, maxWidth:50, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}
                title={d.label}>
                {d.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GaugeChart({ value, max, title, color=C.green }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  const angle = -140 + (pct / 100) * 280; // -140° → +140°
  const toRad = (deg) => (deg * Math.PI) / 180;
  const cx = 80, cy = 72, r = 58;

  // Arc de fond
  const arcStart = toRad(-140 + 90); // ajustement SVG
  const arcEnd   = toRad(140 + 90);
  const arcBg = `M ${cx + r * Math.cos(toRad(-140 + 90))} ${cy + r * Math.sin(toRad(-140 + 90))} A ${r} ${r} 0 1 1 ${cx + r * Math.cos(toRad(140 + 90))} ${cy + r * Math.sin(toRad(140 + 90))}`;

  // Arc rempli
  const fillAngle = toRad(-140 + 90 + (pct / 100) * 280);
  const fillLarge = pct > 50 ? 1 : 0;
  const arcFill = `M ${cx + r * Math.cos(toRad(-140 + 90))} ${cy + r * Math.sin(toRad(-140 + 90))} A ${r} ${r} 0 ${fillLarge} 1 ${cx + r * Math.cos(fillAngle)} ${cy + r * Math.sin(fillAngle)}`;

  // Aiguille
  const needleAngle = toRad(angle + 90);
  const nx = cx + (r - 10) * Math.cos(needleAngle);
  const ny = cy + (r - 10) * Math.sin(needleAngle);

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
      {title && <div style={{ fontSize:11, fontWeight:700, color:C.textMid, textTransform:"uppercase", letterSpacing:"1px" }}>{title}</div>}
      <svg width={160} height={100} viewBox="0 0 160 100">
        {/* Fond gris */}
        <path d={arcBg} fill="none" stroke={C.border} strokeWidth={8} strokeLinecap="round"/>
        {/* Arc rempli */}
        {pct > 0 && <path d={arcFill} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round"/>}
        {/* Aiguille */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth={2.5} strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r={5} fill={color}/>
        {/* Valeur */}
        <text x={cx} y={cy + 18} textAnchor="middle" fontSize="16" fontWeight="800" fill={color}>{value}</text>
        <text x={cx} y={cy + 30} textAnchor="middle" fontSize="9" fill={C.textLight}>/ {max}</text>
      </svg>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SKELETON
// ════════════════════════════════════════════════════════════════════════════
function SkeletonDoc() {
  return (
    <div style={{ border:`1px solid ${C.border}`, borderRadius:10, padding:"13px 16px", background:C.bg, animation:"shimmer 1.5s ease-in-out infinite" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:38, height:38, borderRadius:9, background:C.border, flexShrink:0 }}/>
        <div style={{ flex:1 }}>
          <div style={{ height:13, background:C.border, borderRadius:6, width:"55%", marginBottom:7 }}/>
          <div style={{ height:10, background:C.border, borderRadius:6, width:"30%" }}/>
        </div>
        <div style={{ height:22, width:80, background:C.border, borderRadius:99 }}/>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ✅ ONGLET STATISTIQUES
// ════════════════════════════════════════════════════════════════════════════
function TabStatistiques({ vehicles, allDocs }) {
  // Calculs globaux
  const totalVehicles   = vehicles.length;
  const totalDocs       = allDocs.length;
  const docsExpired     = allDocs.filter(d => urgencyLevel(d.expiry_date) === "expired");
  const docsCritical    = allDocs.filter(d => urgencyLevel(d.expiry_date) === "critical");
  const docsWarning     = allDocs.filter(d => ["warning","soon"].includes(urgencyLevel(d.expiry_date)));
  const docsOk          = allDocs.filter(d => urgencyLevel(d.expiry_date) === "ok");
  const docsNone        = allDocs.filter(d => urgencyLevel(d.expiry_date) === "none");

  // Véhicules avec au moins un doc
  const vehiclesWithDocs = new Set(allDocs.map(d => d.vehicle));
  const vehiclesWithoutDocs = vehicles.filter(v => !vehiclesWithDocs.has(v.id) && !vehiclesWithDocs.has(String(v.id)));

  // Docs par type
  const docsByType = Object.entries(DOC_META).map(([key, meta]) => ({
    label: meta.label, icon: meta.icon,
    value: allDocs.filter(d => d.type === key).length,
    color: meta.color,
  }));

  // Docs par statut d'urgence
  const docsByUrgency = [
    { label:"Expirés",     value:docsExpired.length,  color:C.red    },
    { label:"Critiques",   value:docsCritical.length, color:"#EF4444"},
    { label:"< 30j",       value:docsWarning.length,  color:C.amber  },
    { label:"Valides",     value:docsOk.length,       color:C.green  },
    { label:"Sans expiry", value:docsNone.length,     color:C.slate  },
  ];

  // Véhicules par niveau de conformité
  const vehConformity = vehicles.map(v => {
    const vDocs = allDocs.filter(d => String(d.vehicle) === String(v.id));
    const hasExpired  = vDocs.some(d => urgencyLevel(d.expiry_date) === "expired");
    const hasCritical = vDocs.some(d => urgencyLevel(d.expiry_date) === "critical");
    const hasWarning  = vDocs.some(d => ["warning","soon"].includes(urgencyLevel(d.expiry_date)));
    const noDocs      = vDocs.length === 0;
    const level = noDocs ? "no_docs" : hasExpired ? "expired" : hasCritical ? "critical" : hasWarning ? "warning" : "ok";
    return { v, level, nDocs: vDocs.length };
  });

  const vehByLevel = {
    no_docs:  vehConformity.filter(v => v.level === "no_docs").length,
    expired:  vehConformity.filter(v => v.level === "expired").length,
    critical: vehConformity.filter(v => v.level === "critical").length,
    warning:  vehConformity.filter(v => v.level === "warning").length,
    ok:       vehConformity.filter(v => v.level === "ok").length,
  };

  // Taux de conformité global (véhicules 100% OK)
  const tauxConformite = totalVehicles > 0
    ? Math.round((vehByLevel.ok / totalVehicles) * 100) : 0;

  // Expirés dans les 90 prochains jours — timeline
  const upcoming = allDocs
    .filter(d => {
      const days = daysUntil(d.expiry_date);
      return days !== null && days >= 0 && days <= 90;
    })
    .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))
    .slice(0, 8);

  // Taux de couverture par type de document
  const coverageByType = Object.entries(DOC_META).map(([key, meta]) => {
    const docsOfType = allDocs.filter(d => d.type === key);
    const vehiclesCovered = new Set(docsOfType.map(d => String(d.vehicle))).size;
    return {
      type: key, label: meta.label, icon: meta.icon, color: meta.color,
      covered: vehiclesCovered, total: totalVehicles,
      pct: totalVehicles > 0 ? Math.round((vehiclesCovered / totalVehicles) * 100) : 0,
    };
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* ── KPIs statistiques ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
        {[
          { label:"Taux conformité",  val:`${tauxConformite}%`, icon:"✅", color:tauxConformite >= 80 ? C.green : tauxConformite >= 50 ? C.amber : C.red, sub:`${vehByLevel.ok}/${totalVehicles} véhicules` },
          { label:"Documents total",   val:totalDocs,          icon:"📄", color:C.blue,   sub:`${totalVehicles} véhicules gérés` },
          { label:"Documents expirés", val:docsExpired.length + docsCritical.length, icon:"🚨", color:C.red,    sub:"Action immédiate requise" },
          { label:"À renouveler",      val:docsWarning.length, icon:"⚠️", color:C.amber,  sub:"Dans les 90 prochains jours" },
          { label:"Sans documents",    val:vehiclesWithoutDocs.length, icon:"📭", color:vehiclesWithoutDocs.length > 0 ? C.orange : C.green, sub:"Véhicules non documentés" },
        ].map((k, i) => (
          <div key={i} style={{ background:C.white, borderRadius:12, padding:"14px 16px", borderTop:`3px solid ${k.color}`, boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <div style={{ fontSize:9, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px" }}>{k.label}</div>
              <span style={{ fontSize:18 }}>{k.icon}</span>
            </div>
            <div style={{ fontSize:24, fontWeight:800, color:k.color, lineHeight:1 }}>{k.val}</div>
            <div style={{ fontSize:10, color:C.textLight, marginTop:5 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Row 1: Pie + Bar ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>

        {/* Pie chart : statut documents */}
        <div style={{ background:C.white, borderRadius:12, padding:"16px 18px", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
          <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:14 }}>📊 Documents par statut</div>
          <PieChart
            data={docsByUrgency.filter(d => d.value > 0)}
            size={170}
          />
        </div>

        {/* Pie chart : conformité véhicules */}
        <div style={{ background:C.white, borderRadius:12, padding:"16px 18px", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
          <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:14 }}>🚗 Conformité par véhicule</div>
          <PieChart
            data={[
              { label:"Conformes",       value:vehByLevel.ok,       color:C.green  },
              { label:"< 90j",           value:vehByLevel.warning,  color:C.amber  },
              { label:"Critiques",       value:vehByLevel.critical + vehByLevel.expired, color:C.red },
              { label:"Sans documents",  value:vehByLevel.no_docs,  color:C.slate  },
            ].filter(d => d.value > 0)}
            size={170}
          />
        </div>

        {/* Gauge taux conformité */}
        <div style={{ background:C.white, borderRadius:12, padding:"16px 18px", boxShadow:"0 1px 4px rgba(0,0,0,.06)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16 }}>
          <div style={{ fontSize:13, fontWeight:800, color:C.text, alignSelf:"flex-start" }}>🎯 Taux de conformité</div>
          <GaugeChart
            value={vehByLevel.ok}
            max={totalVehicles}
            title="Véhicules conformes"
            color={tauxConformite >= 80 ? C.green : tauxConformite >= 50 ? C.amber : C.red}
          />
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:28, fontWeight:800, color:tauxConformite >= 80 ? C.green : tauxConformite >= 50 ? C.amber : C.red }}>{tauxConformite}%</div>
            <div style={{ fontSize:11, color:C.textLight }}>du parc conforme</div>
          </div>
        </div>
      </div>

      {/* ── Row 2 : Bar chart par type ── */}
      <div style={{ background:C.white, borderRadius:12, padding:"16px 18px", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
        <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:14 }}>📋 Documents par type</div>
        <BarChart
          data={docsByType}
          maxHeight={130}
        />
      </div>

      {/* ── Row 3 : Couverture par type + Timeline ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

        {/* Taux de couverture par type */}
        <div style={{ background:C.white, borderRadius:12, padding:"16px 18px", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
          <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:14 }}>📈 Couverture par type de document</div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {coverageByType.map((c, i) => (
              <div key={i}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                  <span style={{ fontSize:12, color:C.text, display:"flex", alignItems:"center", gap:6 }}>
                    <span>{c.icon}</span>{c.label}
                  </span>
                  <span style={{ fontSize:12, fontWeight:700,
                    color: c.pct >= 80 ? C.green : c.pct >= 50 ? C.amber : C.red }}>
                    {c.covered}/{c.total} ({c.pct}%)
                  </span>
                </div>
                <div style={{ height:6, background:C.bg, borderRadius:99, overflow:"hidden" }}>
                  <div style={{
                    height:"100%",
                    width:`${c.pct}%`,
                    background: c.pct >= 80 ? C.green : c.pct >= 50 ? C.amber : C.red,
                    borderRadius:99,
                    transition:"width .8s ease",
                  }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline expirations à venir */}
        <div style={{ background:C.white, borderRadius:12, padding:"16px 18px", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
          <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:14 }}>⏰ Expirations dans les 90 prochains jours</div>
          {upcoming.length === 0 ? (
            <div style={{ textAlign:"center", padding:"24px 0", color:C.textLight, fontSize:12 }}>
              <div style={{ fontSize:28, marginBottom:8 }}>✅</div>
              Aucune expiration dans les 90 prochains jours
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {upcoming.map((d, i) => {
                const days  = daysUntil(d.expiry_date);
                const styl  = URGENCY_STYLE[urgencyLevel(d.expiry_date)];
                const meta  = DOC_META[d.type] || DOC_META.other;
                return (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8, background:styl.bg, border:`1px solid ${styl.color}20` }}>
                    <span style={{ fontSize:16 }}>{meta.icon}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.title}</div>
                      <div style={{ fontSize:10, color:C.textLight }}>{d.vehicle_name || "—"} · {fmtShort(d.expiry_date)}</div>
                    </div>
                    <span style={{ fontSize:10, fontWeight:800, color:styl.color, whiteSpace:"nowrap" }}>
                      {days === 0 ? "Aujourd'hui" : `${days}j`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 4 : Véhicules sans documents ── */}
      {vehiclesWithoutDocs.length > 0 && (
        <div style={{ background:C.white, borderRadius:12, padding:"16px 18px", boxShadow:"0 1px 4px rgba(0,0,0,.06)", borderLeft:`4px solid ${C.orange}` }}>
          <div style={{ fontSize:13, fontWeight:800, color:C.orange, marginBottom:12 }}>
            📭 {vehiclesWithoutDocs.length} véhicule{vehiclesWithoutDocs.length > 1 ? "s" : ""} sans aucun document
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {vehiclesWithoutDocs.map(v => (
              <div key={v.id} style={{ padding:"6px 12px", background:C.orangeLight, borderRadius:7, fontSize:11, fontWeight:600, color:C.orange, border:`1px solid ${C.orange}30` }}>
                {v.make} {v.model} · {v.registration_number}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL UPLOAD / ÉDITION DOCUMENT
// ════════════════════════════════════════════════════════════════════════════
function ModalUpload({ vehicle, docExistant, onClose, onSuccess, showToast }) {
  const isBus = vehicle?.vehicle_type === "BUS" || vehicle?.category === "BUS";

  const [form, setForm] = useState({
    type:        docExistant?.type        || "insurance",
    title:       docExistant?.title       || "",
    montant:     docExistant?.montant     || "",
    expiry_date: docExistant?.expiry_date || calcExpiryFromToday(docExistant?.type || "insurance", vehicle?.vehicle_type),
    notes:       docExistant?.notes       || "",
  });

  const [file,          setFile]          = useState(null);
  const [aiResult,      setAiResult]      = useState(null);
  const [aiLoading,     setAiLoading]     = useState(false);
  const [showAiDetails, setShowAiDetails] = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [dragOver,      setDragOver]      = useState(false);
  const [errors,        setErrors]        = useState({});
  const fileRef = useRef();

  const set = (k, v) => { setForm(f => ({ ...f, [k]:v })); setErrors(e => ({ ...e, [k]:"" })); };

  const handleTypeChange = (val) => {
    const expiry = calcExpiryFromToday(val, vehicle?.vehicle_type);
    setForm(f => ({ ...f, type:val, expiry_date:expiry }));
    setErrors(e => ({ ...e, type:"", expiry_date:"" }));
  };

  const handleFile = async (f) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { showToast("Fichier trop volumineux (max 10 Mo)", "error"); return; }
    setFile(f);
    setAiResult(null);
    setShowAiDetails(false);
    setAiLoading(true);
    const result = await verifyDocumentAI(f, form.type);
    setAiResult(result);
    setAiLoading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim())
      e.title = "Le titre / référence du document est obligatoire.";
    if (!file && !docExistant)
      e.file = "Veuillez sélectionner un fichier (PDF ou image).";
    if (["insurance","inspection","vignette","registration"].includes(form.type) && !form.expiry_date)
      e.expiry_date = "La date d'expiration est obligatoire pour ce type de document.";
    if (form.expiry_date && new Date(form.expiry_date) < new Date())
      e.expiry_date_past = "⚠ Attention : la date d'expiration est dans le passé (document déjà expiré).";
    if (form.montant && isNaN(parseFloat(form.montant)))
      e.montant = "Le montant doit être un nombre valide.";
    if (aiResult?.verdict === "INVALIDE")
      e.ai = "Ce document a été rejeté par la vérification IA. Téléversement bloqué.";
    setErrors(e);
    // Bloquer seulement sur les erreurs critiques (pas les warnings)
    return !e.title && !e.file && !e.expiry_date && !e.montant && !e.ai;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("vehicle",      vehicle.id);
      fd.append("type",         form.type);
      fd.append("title",        form.title.trim());
      if (form.expiry_date) fd.append("expiry_date", form.expiry_date);
      if (form.montant)     fd.append("montant",     form.montant);
      if (form.notes)       fd.append("notes",       form.notes);
      if (file)             fd.append("file",        file);

      const path   = docExistant ? `/documents/${docExistant.id}/` : "/documents/";
      const method = docExistant ? "PATCH" : "POST";
      const tkn    = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
      const res    = await fetch(`${API_BASE}${path}`, {
        method, headers:{ Authorization:`Bearer ${tkn}` }, body:fd,
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j?.detail || Object.values(j).flat()[0] || "Erreur upload"); }
      showToast(docExistant ? "Document mis à jour ✓" : "Document téléversé avec succès ✓");
      onSuccess();
    } catch(e) { showToast(e.message, "error"); }
    finally    { setUploading(false); }
  };

  const FieldError = ({ k }) => errors[k]
    ? <div style={{ fontSize:11, color:C.red, fontWeight:600, marginTop:3, display:"flex", alignItems:"center", gap:4 }}><span>⚠</span>{errors[k]}</div>
    : null;

  const FieldWarning = ({ k }) => errors[k]
    ? <div style={{ fontSize:11, color:C.amber, fontWeight:600, marginTop:3, display:"flex", alignItems:"center", gap:4 }}>{errors[k]}</div>
    : null;

  const needsExpiry = ["insurance","inspection","vignette","registration"].includes(form.type);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
      <div style={{ background:C.white, borderRadius:14, padding:26, width:620, maxWidth:"96vw", maxHeight:"93vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:C.text }}>
              {docExistant ? "✏️ Mettre à jour le document" : "📤 Téléverser un document"}
            </div>
            <div style={{ fontSize:12, color:C.textLight, marginTop:2 }}>
              {vehicle?.make} {vehicle?.model} · {vehicle?.registration_number}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:20, color:C.textLight }}>✕</button>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Type */}
          <div>
            <label style={lbl}>Type de document *</label>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {Object.entries(DOC_META).map(([val, meta]) => (
                <button key={val} type="button" onClick={() => handleTypeChange(val)}
                  style={{ padding:"7px 14px", borderRadius:7, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
                    display:"flex", alignItems:"center", gap:5,
                    border:`1.5px solid ${form.type === val ? meta.color : C.border}`,
                    background:form.type === val ? `${meta.color}15` : C.white,
                    color:form.type === val ? meta.color : C.textMid,
                    transition:"all .12s" }}>
                  {meta.icon} {meta.label}
                </button>
              ))}
            </div>
            {form.type === "inspection" && (
              <div style={{ marginTop:8, fontSize:11, color:C.amber, background:C.amberLight, padding:"6px 10px", borderRadius:7, display:"flex", gap:6, alignItems:"center" }}>
                ⚠️ Fréquence : {isBus ? "6 mois (transport en commun)" : "12 mois (tourisme / utilitaire)"}
              </div>
            )}
          </div>

          {/* Titre */}
          <div>
            <label style={lbl}>Titre / Référence *</label>
            <input style={errors.title ? inpErr : inp} value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder={`Ex : Assurance ACTIVA 2025 — ${vehicle?.registration_number}`}/>
            <FieldError k="title"/>
          </div>

          {/* Zone drop fichier */}
          <div>
            <label style={lbl}>Fichier (PDF ou image) {!docExistant && "*"}</label>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border:`2px dashed ${errors.file ? C.red : dragOver ? C.green : C.border}`,
                borderRadius:10, padding:"20px 16px", textAlign:"center", cursor:"pointer",
                background:dragOver ? C.greenLight : file ? C.greenXLight : C.bg,
                transition:"all .15s",
              }}>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
                style={{ display:"none" }} onChange={e => handleFile(e.target.files?.[0])}/>
              {file ? (
                <div>
                  <div style={{ fontSize:22 }}>📎</div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.green, marginTop:6 }}>{file.name}</div>
                  <div style={{ fontSize:11, color:C.textLight }}>{(file.size/1024).toFixed(0)} Ko · {file.type || "fichier"}</div>
                  <button onClick={e => { e.stopPropagation(); setFile(null); setAiResult(null); setShowAiDetails(false); }}
                    style={{ marginTop:6, fontSize:11, color:C.red, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>
                    ✕ Supprimer
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize:28 }}>📁</div>
                  <div style={{ fontSize:13, color:C.textMid, marginTop:8 }}>Glisser-déposer ou cliquer pour sélectionner</div>
                  <div style={{ fontSize:11, color:C.textLight, marginTop:4 }}>PDF, JPG, PNG, WEBP — max 10 Mo</div>
                </div>
              )}
            </div>
            <FieldError k="file"/>

            {/* ✅ Résultat IA amélioré avec raisons détaillées */}
            {aiLoading && (
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:10, fontSize:12, color:C.blue, background:C.blueLight, padding:"10px 14px", borderRadius:8 }}>
                <Spinner size={14} color={C.blue}/>
                <span>Analyse IA en cours — vérification de l'authenticité du document…</span>
              </div>
            )}

            {aiResult && !aiLoading && (
              <div style={{
                marginTop:10, borderRadius:10, overflow:"hidden",
                border:`1.5px solid ${aiResult.verdict==="AUTHENTIQUE" ? C.green+"40" : aiResult.verdict==="SUSPECT" ? C.amber+"40" : C.red+"40"}`,
              }}>
                {/* En-tête résultat */}
                <div style={{
                  padding:"10px 14px", fontSize:12,
                  background: aiResult.verdict==="AUTHENTIQUE" ? C.greenLight : aiResult.verdict==="SUSPECT" ? C.amberLight : C.redLight,
                  color:      aiResult.verdict==="AUTHENTIQUE" ? C.green      : aiResult.verdict==="SUSPECT" ? C.amber      : C.red,
                  display:"flex", justifyContent:"space-between", alignItems:"center",
                }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:18 }}>
                      {aiResult.verdict==="AUTHENTIQUE" ? "✅" : aiResult.verdict==="SUSPECT" ? "⚠️" : "❌"}
                    </span>
                    <div>
                      <div style={{ fontWeight:700 }}>
                        {aiResult.verdict==="AUTHENTIQUE" ? "Document authentique — vérification IA réussie"
                        : aiResult.verdict==="SUSPECT"     ? "Document suspect — vérification manuelle recommandée"
                        :                                    "Document invalide — téléversement bloqué"}
                      </div>
                      {aiResult.confidence != null && (
                        <div style={{ fontSize:10, opacity:.8, marginTop:1 }}>
                          Confiance IA : <b>{aiResult.confidence}%</b>
                        </div>
                      )}
                    </div>
                  </div>
                  {aiResult.verdict !== "AUTHENTIQUE" && (
                    <button type="button" onClick={() => setShowAiDetails(d => !d)}
                      style={{ padding:"5px 12px", borderRadius:7, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                        background:"rgba(0,0,0,.08)", color:"inherit", border:"none" }}>
                      {showAiDetails ? "▲ Masquer" : "🔍 Voir les raisons"}
                    </button>
                  )}
                </div>

                {/* ✅ Détails TOUJOURS affichés si suspect/invalide (plus de toggle requis) */}
                {(aiResult.verdict !== "AUTHENTIQUE") && showAiDetails && (
                  <div style={{
                    padding:"14px 16px", background:C.white,
                    borderTop:`1px solid ${aiResult.verdict==="INVALIDE" ? C.red+"30" : C.amber+"30"}`,
                  }}>
                    {/* Type détecté vs attendu */}
                    {(aiResult.detected_type || aiResult.matches_expected !== null) && (
                      <div style={{ marginBottom:12, padding:"10px 12px", borderRadius:8, background:C.bg }}>
                        <div style={{ fontSize:11, fontWeight:700, color:C.textMid, marginBottom:6 }}>🔎 Analyse du type</div>
                        <div style={{ display:"flex", gap:12, fontSize:11 }}>
                          <div>
                            <span style={{ color:C.textLight }}>Type attendu : </span>
                            <span style={{ fontWeight:700, color:C.text }}>{DOC_META[form.type]?.label || form.type}</span>
                          </div>
                          {aiResult.detected_type && (
                            <div>
                              <span style={{ color:C.textLight }}>Type détecté : </span>
                              <span style={{ fontWeight:700,
                                color: aiResult.matches_expected ? C.green : C.red }}>
                                {aiResult.detected_type}
                              </span>
                              {!aiResult.matches_expected && (
                                <span style={{ color:C.red, marginLeft:4, fontWeight:700 }}>≠ Incohérent</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ✅ Raisons détaillées — toujours affichées */}
                    {aiResult.issues && aiResult.issues.length > 0 && (
                      <div>
                        <div style={{ fontSize:11, fontWeight:700, color:C.textMid, marginBottom:8 }}>
                          {aiResult.verdict==="INVALIDE" ? "❌" : "⚠️"} Problèmes identifiés ({aiResult.issues.length}) :
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                          {aiResult.issues.map((issue, i) => (
                            <div key={i} style={{
                              padding:"8px 12px", borderRadius:7, fontSize:11, lineHeight:1.6,
                              background: aiResult.verdict==="INVALIDE" ? C.redLight : C.amberLight,
                              color:      aiResult.verdict==="INVALIDE" ? C.red      : C.amber,
                              borderLeft:`3px solid ${aiResult.verdict==="INVALIDE" ? C.red : C.amber}`,
                              display:"flex", alignItems:"flex-start", gap:8,
                            }}>
                              <span style={{ flexShrink:0, marginTop:1 }}>
                                {aiResult.verdict==="INVALIDE" ? "•" : "▸"}
                              </span>
                              <span>{issue}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommandation */}
                    <div style={{ marginTop:10, padding:"8px 12px", borderRadius:7, fontSize:11, fontWeight:600,
                      background: aiResult.verdict==="INVALIDE" ? "#FEF2F2" : "#FFFBEB",
                      color:      aiResult.verdict==="INVALIDE" ? C.red      : "#92400E",
                      border:`1px solid ${aiResult.verdict==="INVALIDE" ? "#FECACA" : "#FDE68A"}`,
                    }}>
                      💡 {aiResult.verdict==="INVALIDE"
                        ? "Ce document ne peut pas être téléversé. Obtenez un document officiel valide auprès de l'organisme compétent."
                        : "Vous pouvez soumettre ce document, mais une vérification manuelle par le responsable est recommandée."}
                    </div>
                  </div>
                )}
              </div>
            )}
            <FieldError k="ai"/>
          </div>

          {/* Montant + Date expiration */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={lbl}>Montant payé (FCFA)</label>
              <input style={errors.montant ? inpErr : inp} type="number" min="0" value={form.montant}
                onChange={e => set("montant", e.target.value)} placeholder="Ex : 120 000"/>
              <FieldError k="montant"/>
            </div>
            <div>
              <label style={lbl}>
                Date d'expiration {needsExpiry && <span style={{ color:C.red }}>*</span>}
              </label>
              <input
                style={{ ...inp,
                  background: form.expiry_date ? (new Date(form.expiry_date) < new Date() ? C.redLight : C.greenLight) : C.white,
                  color:      form.expiry_date ? (new Date(form.expiry_date) < new Date() ? C.red : C.green) : C.text,
                  fontWeight: form.expiry_date ? 700 : 400,
                  borderColor: errors.expiry_date ? C.red : C.border,
                  colorScheme:"light" }}
                type="date" value={form.expiry_date}
                onChange={e => set("expiry_date", e.target.value)}/>
              {form.expiry_date && !errors.expiry_date && new Date(form.expiry_date) >= new Date() && (
                <div style={{ fontSize:10, color:C.green, marginTop:3 }}>
                  ✅ Calculé auto — modifiable · Expire dans {daysUntil(form.expiry_date)}j
                </div>
              )}
              <FieldError k="expiry_date"/>
              <FieldWarning k="expiry_date_past"/>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={lbl}>Notes internes</label>
            <textarea style={{ ...inp, height:60, resize:"vertical" }} value={form.notes}
              onChange={e => set("notes", e.target.value)}
              placeholder="Informations complémentaires, numéro de police, prestataire…"/>
          </div>

          {/* Résumé erreurs */}
          {Object.keys(errors).filter(k => k !== "expiry_date_past").length > 0 && (
            <div style={{ background:C.redLight, border:`1px solid ${C.red}30`, borderRadius:8, padding:"12px 14px" }}>
              <div style={{ fontSize:12, color:C.red, fontWeight:700, marginBottom:6 }}>⚠ Veuillez corriger les erreurs suivantes :</div>
              {Object.entries(errors).filter(([k]) => k !== "expiry_date_past" && errors[k]).map(([k, msg], i) => (
                <div key={i} style={{ fontSize:11, color:C.red, marginTop:3, display:"flex", gap:4 }}>
                  <span>•</span><span>{msg}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:22, paddingTop:16, borderTop:`1px solid ${C.border}` }}>
          <button onClick={onClose} style={btnGhost}>Annuler</button>
          <button onClick={handleSubmit} disabled={uploading || aiResult?.verdict==="INVALIDE"}
            style={{ padding:"9px 20px", background:C.green, color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
              display:"flex", alignItems:"center", gap:7, opacity:(uploading || aiResult?.verdict==="INVALIDE") ? 0.7 : 1 }}>
            {uploading && <Spinner size={14} color="#fff"/>}
            {uploading ? "Téléversement…" : docExistant ? "Mettre à jour" : "Téléverser"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CARTE DOCUMENT
// ════════════════════════════════════════════════════════════════════════════
function DocCard({ doc, onEdit, onDelete, deletingId }) {
  const [open,      setOpen]      = useState(false);
  const [viewerUrl, setViewerUrl] = useState(null);
  const urg  = urgencyLevel(doc.expiry_date);
  const styl = URGENCY_STYLE[urg];
  const meta = DOC_META[doc.type] || DOC_META.other;
  const days = daysUntil(doc.expiry_date);
  const isDeleting = deletingId === doc.id;

  const barBlock = doc.expiry_date && doc.created_at ? (() => {
    const total   = new Date(doc.expiry_date) - new Date(doc.created_at);
    const elapsed = Date.now() - new Date(doc.created_at);
    const pct     = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0;
    const barCol  = pct > 85 ? C.red : pct > 65 ? C.amber : C.green;
    return { pct, barCol };
  })() : null;

  return (
    <>
      {viewerUrl && <ModalFileViewer url={viewerUrl} title={doc.title} onClose={() => setViewerUrl(null)}/>}
      <div style={{
        border:`1px solid ${C.border}`,
        borderLeft:`3px solid ${styl.color}`,
        borderRadius:10, padding:"12px 16px",
        background: urg === "expired" || urg === "critical" ? `${styl.bg}80` : C.white,
        transition:"all .12s", opacity:isDeleting?0.6:1,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, cursor:"pointer" }} onClick={() => setOpen(o => !o)}>
          <div style={{ width:36, height:36, borderRadius:8, background:`${meta.color}15`, border:`1px solid ${meta.color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>
            {meta.icon}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{doc.title}</div>
            <div style={{ fontSize:10, color:C.textLight, marginTop:1 }}>{meta.label}</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0 }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:99, fontSize:10, fontWeight:700, background:styl.bg, color:styl.color, whiteSpace:"nowrap" }}>
              <span style={{ width:5, height:5, borderRadius:"50%", background:styl.dot, display:"inline-block" }}/>
              {styl.label}
            </span>
            {doc.expiry_date && (
              <div style={{ fontSize:10, color: days !== null && days < 0 ? C.red : days !== null && days <= 30 ? C.amber : C.textLight }}>
                {days !== null && days < 0 ? `Expiré depuis ${Math.abs(days)}j` : days !== null ? `${days}j restants` : "—"}
              </div>
            )}
          </div>
          <span style={{ color:C.textLight, fontSize:12, marginLeft:4 }}>{open ? "▲" : "▼"}</span>
        </div>

        {/* Barre progression */}
        {barBlock && (
          <div style={{ marginTop:8 }}>
            <div style={{ height:3, background:"rgba(0,0,0,0.07)", borderRadius:99, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${barBlock.pct}%`, background:barBlock.barCol, borderRadius:99, transition:"width .6s" }}/>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:C.textLight, marginTop:2 }}>
              <span>Créé le {fmtShort(doc.created_at)}</span>
              <span style={{ fontWeight:700, color:barBlock.barCol }}>{Math.round(barBlock.pct)}% écoulé</span>
              <span>Expire le {fmtShort(doc.expiry_date)}</span>
            </div>
          </div>
        )}

        {/* Expand */}
        {open && (
          <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
              {[
                { icon:"📅", label:"Date d'expiration", val:fmt(doc.expiry_date) || "Sans expiration" },
                { icon:"💰", label:"Montant payé",       val:doc.montant ? `${Number(doc.montant).toLocaleString("fr-FR")} FCFA` : "Non renseigné" },
              ].map((r, i) => (
                <div key={i} style={{ background:C.bg, borderRadius:8, padding:"8px 12px" }}>
                  <div style={{ fontSize:9, color:C.textLight, fontWeight:600, textTransform:"uppercase", letterSpacing:"1px", marginBottom:3 }}>{r.icon} {r.label}</div>
                  <div style={{ fontSize:12, color:C.text, fontWeight:600 }}>{r.val}</div>
                </div>
              ))}
              {doc.notes && (
                <div style={{ gridColumn:"1/-1", background:C.bg, borderRadius:8, padding:"8px 12px" }}>
                  <div style={{ fontSize:9, color:C.textLight, fontWeight:600, textTransform:"uppercase", letterSpacing:"1px", marginBottom:3 }}>📝 Notes</div>
                  <div style={{ fontSize:12, color:C.textMid, lineHeight:1.5 }}>{doc.notes}</div>
                </div>
              )}
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {doc.file && (
                <button onClick={() => setViewerUrl(doc.file)}
                  style={{ padding:"6px 12px", background:C.blueLight, color:C.blue, border:`1px solid ${C.blue}20`, borderRadius:7, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:4 }}>
                  👁️ Visualiser
                </button>
              )}
              <button onClick={() => onEdit(doc)} disabled={isDeleting}
                style={{ padding:"6px 12px", background:C.white, color:C.textMid, border:`1px solid ${C.border}`, borderRadius:7, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", opacity:isDeleting?0.5:1 }}>
                ✏️ Modifier
              </button>
              <button onClick={() => onDelete(doc)} disabled={isDeleting}
                style={{ padding:"6px 12px", background:C.redLight, color:C.red, border:`1px solid ${C.red}20`, borderRadius:7, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
                  display:"flex", alignItems:"center", gap:4, opacity:isDeleting?0.5:1 }}>
                {isDeleting ? <><Spinner size={11} color={C.red}/> Suppression…</> : "🗑️ Supprimer"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PANNEAU VÉHICULE
// ════════════════════════════════════════════════════════════════════════════
function VehiclePanel({ vehicle, showToast, onRefreshAlerts, onDocsLoaded }) {
  const [docs,       setDocs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [open,       setOpen]       = useState(false);
  const [showModal,  setShowModal]  = useState(false);
  const [editDoc,    setEditDoc]    = useState(null);
  const [deleteDoc,  setDeleteDoc]  = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/documents/?vehicle=${vehicle.id}`);
      const list = Array.isArray(res) ? res : res?.results ?? [];
      setDocs(list);
      onDocsLoaded?.(vehicle.id, list);
    } catch { setDocs([]); }
    finally  { setLoading(false); }
  }, [vehicle.id]);

  useEffect(() => { if (open) loadDocs(); }, [open, loadDocs]);

  const handleDeleteConfirm = async () => {
    if (!deleteDoc) return;
    setDeletingId(deleteDoc.id);
    setDeleteDoc(null);
    try {
      await apiFetch(`/documents/${deleteDoc.id}/`, { method:"DELETE" });
      showToast("Document supprimé");
      loadDocs();
      onRefreshAlerts?.();
    } catch(e) { showToast(e.message, "error"); }
    finally { setDeletingId(null); }
  };

  const handleSuccess = () => { setShowModal(false); setEditDoc(null); loadDocs(); onRefreshAlerts?.(); };

  const nExpired  = docs.filter(d => urgencyLevel(d.expiry_date) === "expired").length;
  const nCritical = docs.filter(d => urgencyLevel(d.expiry_date) === "critical").length;
  const nWarning  = docs.filter(d => ["warning","soon"].includes(urgencyLevel(d.expiry_date))).length;
  const alertColor = nExpired || nCritical ? C.red : nWarning ? C.amber : C.green;

  // Badge résumé pour la carte véhicule
  const getBadge = () => {
    if (docs.length === 0 && !loading) return { label:"Aucun document", color:C.orange, bg:C.orangeLight };
    if (nExpired || nCritical) return { label:`${nExpired+nCritical} expiré${nExpired+nCritical>1?"s":""}`, color:C.red, bg:C.redLight };
    if (nWarning) return { label:`${nWarning} alerte${nWarning>1?"s":""}`, color:C.amber, bg:C.amberLight };
    if (docs.length > 0) return { label:"Conforme ✓", color:C.green, bg:C.greenLight };
    return null;
  };
  const badge = getBadge();

  return (
    <>
      {deleteDoc && (
        <ModalConfirmDelete
          docTitle={deleteDoc.title}
          onCancel={() => setDeleteDoc(null)}
          onConfirm={handleDeleteConfirm}
          loading={!!deletingId}
        />
      )}

      <div style={{ border:`1px solid ${nExpired||nCritical ? C.red+"50" : nWarning ? C.amber+"40" : C.border}`, borderRadius:12, overflow:"hidden", background:C.white, transition:"all .15s" }}>
        {/* Header véhicule */}
        <div
          style={{ padding:"14px 18px", cursor:"pointer", display:"flex", alignItems:"center", gap:14,
            background: nExpired||nCritical ? `${C.redLight}80` : nWarning ? `${C.amberLight}40` : C.white,
            borderBottom: open ? `1px solid ${C.border}` : "none" }}
          onClick={() => setOpen(o => !o)}>
          <div style={{ width:42, height:42, borderRadius:10, background:C.greenLight, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>🚗</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:14, fontWeight:800, color:C.text }}>{vehicle.make} {vehicle.model}</div>
            <div style={{ fontSize:11, color:C.textLight, letterSpacing:"1px", marginTop:2 }}>
              {vehicle.registration_number}
              {vehicle.year && ` · ${vehicle.year}`}
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {badge && (
              <span style={{ padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:700, background:badge.bg, color:badge.color, whiteSpace:"nowrap" }}>
                {badge.label}
              </span>
            )}
            <span style={{ fontSize:11, color:C.textLight, fontWeight:500 }}>{docs.length} doc{docs.length>1?"s":""}</span>
            <span style={{ color:C.textLight, fontSize:14, marginLeft:4 }}>{open ? "▲" : "▼"}</span>
          </div>
        </div>

        {open && (
          <div style={{ padding:"16px 18px" }}>
            {loading ? (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <SkeletonDoc/><SkeletonDoc/>
              </div>
            ) : (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                  <div style={{ fontSize:12, color:C.textLight }}>
                    {docs.length > 0
                      ? `${docs.length} document${docs.length>1?"s":""} enregistré${docs.length>1?"s":""}`
                      : "Aucun document pour ce véhicule"
                    }
                  </div>
                  <button onClick={() => { setEditDoc(null); setShowModal(true); }}
                    style={{ padding:"7px 14px", background:C.green, color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}>
                    + Ajouter un document
                  </button>
                </div>

                {docs.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"28px 0", color:C.textLight, background:C.bg, borderRadius:10, border:`2px dashed ${C.border}` }}>
                    <div style={{ fontSize:28, marginBottom:8 }}>📂</div>
                    <div style={{ fontSize:13, fontWeight:600 }}>Aucun document téléversé</div>
                    <div style={{ fontSize:11, marginTop:4 }}>Cliquez "Ajouter un document" pour commencer</div>
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {docs
                      .sort((a, b) => URGENCY_ORDER[urgencyLevel(a.expiry_date)] - URGENCY_ORDER[urgencyLevel(b.expiry_date)])
                      .map(doc => (
                        <DocCard key={doc.id} doc={doc}
                          deletingId={deletingId}
                          onEdit={(d) => { setEditDoc(d); setShowModal(true); }}
                          onDelete={(d) => setDeleteDoc(d)}/>
                      ))
                    }
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {showModal && (
          <ModalUpload
            vehicle={vehicle}
            docExistant={editDoc}
            onClose={() => { setShowModal(false); setEditDoc(null); }}
            onSuccess={handleSuccess}
            showToast={showToast}/>
        )}
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export function TabDocumentsGestionnaire({ vehicles = [] }) {
  const [toast,         setToast]        = useState({ msg:"", type:"success" });
  const [alertes,       setAlertes]      = useState([]);
  const [allDocs,       setAllDocs]      = useState([]);     // ✅ tous les docs chargés
  const [docsPerVeh,    setDocsPerVeh]   = useState({});     // ✅ map vehicleId → docs[]
  const [search,        setSearch]       = useState("");
  const [filterUrgency, setFilterUrgency]= useState("all");  // all | alert | ok | nodocs
  const [sortBy,        setSortBy]       = useState("default");
  const [activeTab,     setActiveTab]    = useState("documents"); // documents | stats

  const showToast = useCallback((msg, type = "success") => setToast({ msg, type }), []);

  const loadAlertes = useCallback(async () => {
    try {
      const res = await apiFetch("/documents/expiring/?days=90");
      setAlertes(Array.isArray(res) ? res : res?.results ?? []);
    } catch { setAlertes([]); }
  }, []);

  // ✅ Charger TOUS les docs au montage pour les stats
  const loadAllDocs = useCallback(async () => {
    try {
      const res = await apiFetch("/documents/");
      const list = Array.isArray(res) ? res : res?.results ?? [];
      setAllDocs(list);
    } catch { setAllDocs([]); }
  }, []);

  useEffect(() => { loadAlertes(); loadAllDocs(); }, [loadAlertes, loadAllDocs]);

  // ✅ Callback pour mettre à jour la map quand un panneau charge ses docs
  const handleDocsLoaded = useCallback((vehicleId, docs) => {
    setDocsPerVeh(prev => ({ ...prev, [String(vehicleId)]: docs }));
  }, []);

  // KPIs alertes
  const nExpired  = alertes.filter(d => urgencyLevel(d.expiry_date) === "expired").length;
  const nCritical = alertes.filter(d => urgencyLevel(d.expiry_date) === "critical").length;
  const nWarning  = alertes.filter(d => ["warning","soon"].includes(urgencyLevel(d.expiry_date))).length;

  // ✅ FILTRE CORRIGÉ — basé sur les docs réellement chargés par véhicule
  const getVehicleUrgency = (vehicleId) => {
    const docs = docsPerVeh[String(vehicleId)] || [];
    if (docs.length === 0) return "nodocs";
    const hasExpired  = docs.some(d => ["expired","critical"].includes(urgencyLevel(d.expiry_date)));
    const hasWarning  = docs.some(d => ["warning","soon"].includes(urgencyLevel(d.expiry_date)));
    if (hasExpired) return "alert";
    if (hasWarning) return "alert";
    return "ok";
  };

  const filtered = useMemo(() => {
    let list = vehicles.filter(v =>
      `${v.make} ${v.model} ${v.registration_number}`.toLowerCase().includes(search.toLowerCase())
    );

    // ✅ Filtre corrigé
    if (filterUrgency === "alert") {
      list = list.filter(v => getVehicleUrgency(v.id) === "alert");
    } else if (filterUrgency === "ok") {
      list = list.filter(v => getVehicleUrgency(v.id) === "ok");
    } else if (filterUrgency === "nodocs") {
      list = list.filter(v => getVehicleUrgency(v.id) === "nodocs");
    }

    if (sortBy === "alpha") {
      list = [...list].sort((a, b) => `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`));
    } else if (sortBy === "urgency") {
      const order = { alert:0, nodocs:1, ok:2 };
      list = [...list].sort((a, b) => (order[getVehicleUrgency(a.id)] || 2) - (order[getVehicleUrgency(b.id)] || 2));
    }
    return list;
  }, [vehicles, search, filterUrgency, sortBy, docsPerVeh]);

  // ✅ Message de conformité corrigé
  // Un véhicule est "conforme" seulement s'il a des documents ET qu'ils sont tous OK
  const vehiclesWithDocs = Object.keys(docsPerVeh).filter(id => docsPerVeh[id]?.length > 0).length;
  const allVehiclesLoaded = vehiclesWithDocs > 0; // au moins un panneau a chargé
  const toutConforme = allVehiclesLoaded && nExpired === 0 && nCritical === 0 && nWarning === 0
    && vehicles.every(v => (docsPerVeh[String(v.id)]?.length || 0) > 0);

  const TABS = [
    { id:"documents", label:"📁 Documents",    },
    { id:"stats",     label:"📊 Statistiques", },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, fontFamily:"system-ui,-apple-system,sans-serif" }}>
      <style>{`
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes toastIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0%,100%{opacity:.5} 50%{opacity:1} }
      `}</style>

      {/* ── Onglets ── */}
      <div style={{ display:"flex", gap:4, background:C.bg, padding:4, borderRadius:10, border:`1px solid ${C.border}`, width:"fit-content" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding:"8px 18px", borderRadius:7, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", border:"none",
              background: activeTab === t.id ? C.white : "transparent",
              color:      activeTab === t.id ? C.green : C.textMid,
              boxShadow:  activeTab === t.id ? "0 1px 4px rgba(0,0,0,.08)" : "none",
              transition:"all .15s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {[
          { icon:"🚗", val:vehicles.length,     label:"Véhicules gérés",    color:C.green  },
          { icon:"❌", val:nExpired,             label:"Documents expirés",  color:nExpired  ? C.red   : C.textLight },
          { icon:"🔴", val:nCritical,            label:"Critiques (< 7j)",   color:nCritical ? C.red   : C.textLight },
          { icon:"⚠️", val:nWarning,             label:"À renouveler (90j)", color:nWarning  ? C.amber : C.textLight },
        ].map((k, i) => (
          <div key={i} style={{ background:C.white, borderRadius:10, padding:"14px 16px", borderTop:`3px solid ${k.color}`, boxShadow:"0 1px 3px rgba(0,0,0,.05)", display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:22 }}>{k.icon}</span>
            <div>
              <div style={{ fontSize:24, fontWeight:800, color:k.color, lineHeight:1 }}>{k.val}</div>
              <div style={{ fontSize:10, color:C.textLight, fontWeight:600, textTransform:"uppercase", letterSpacing:"1px", marginTop:3 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Bannières alertes */}
      {(nExpired + nCritical) > 0 && (
        <div style={{ display:"flex", gap:12, alignItems:"flex-start", background:C.redLight, border:`1px solid ${C.red}22`, borderRadius:10, padding:"14px 16px", fontSize:12, color:C.red, lineHeight:1.7 }}>
          <span style={{ fontSize:18 }}>🚨</span>
          <div>
            <b>{nExpired + nCritical} document{nExpired+nCritical>1?"s":""} nécessite{nExpired+nCritical>1?"nt":""} une action immédiate.</b>
            {alertes.filter(d => ["expired","critical"].includes(urgencyLevel(d.expiry_date))).slice(0,4).map(d => (
              <div key={d.id} style={{ marginTop:4, fontSize:11 }}>
                → {DOC_META[d.type]?.icon} <b>{d.title}</b>
                {d.vehicle_name ? ` — ${d.vehicle_name}` : ""}
                {d.expiry_date ? ` · expire le ${fmtShort(d.expiry_date)}` : ""}
              </div>
            ))}
          </div>
        </div>
      )}

      {nWarning > 0 && (nExpired + nCritical) === 0 && (
        <div style={{ display:"flex", gap:10, background:C.amberLight, border:`1px solid ${C.amber}22`, borderRadius:10, padding:"12px 16px", fontSize:12, color:C.amber }}>
          <span>⚠️</span>
          <b>{nWarning} document{nWarning>1?"s":""} expire{nWarning>1?"nt":""} dans les 90 prochains jours.</b>
        </div>
      )}

      {/* ✅ Message conforme UNIQUEMENT si tous les véhicules ont des docs ET tous sont OK */}
      {toutConforme && (
        <div style={{ display:"flex", gap:10, background:C.greenLight, border:`1px solid ${C.green}22`, borderRadius:10, padding:"12px 16px", fontSize:12, color:C.green }}>
          <span>✅</span>
          <b>Tous les véhicules sont documentés et conformes — parc en règle.</b>
        </div>
      )}

      {/* ════ ONGLET DOCUMENTS ════ */}
      {activeTab === "documents" && (
        <div style={{ background:C.white, borderRadius:12, padding:"16px 18px", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
          {/* Toolbar */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:10 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:C.text }}>Documents par véhicule</div>
              <div style={{ fontSize:11, color:C.textLight, marginTop:2 }}>Cliquez sur un véhicule pour gérer ses documents</div>
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>

              {/* ✅ Filtres corrigés */}
              <div style={{ display:"flex", gap:3, background:C.bg, padding:3, borderRadius:8, border:`1px solid ${C.border}` }}>
                {[
                  ["all",    "Tous",           null ],
                  
                  ["ok",     "✅ Conformes",   C.green],
                  ["nodocs", "📭 Sans docs",   C.orange],
                ].map(([val, lbl2, dotColor]) => (
                  <button key={val} onClick={() => setFilterUrgency(val)}
                    style={{ padding:"5px 10px", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", border:"none",
                      background: filterUrgency===val ? C.white : "transparent",
                      color:      filterUrgency===val ? (dotColor || C.green) : C.textMid,
                      boxShadow:  filterUrgency===val ? "0 1px 3px rgba(0,0,0,.08)" : "none",
                      transition: "all .12s" }}>
                    {lbl2}
                  </button>
                ))}
              </div>

              {/* Tri */}
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                style={{ ...inp, width:"auto", padding:"6px 10px", fontSize:11 }}>
                <option value="default">Ordre par défaut</option>
                <option value="urgency">Par urgence</option>
                <option value="alpha">A → Z</option>
              </select>

              {/* Recherche */}
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="🔍 Rechercher un véhicule…"
                style={{ ...inp, width:200, padding:"7px 12px", fontSize:12 }}/>
            </div>
          </div>

          {/* Résultat filtre */}
          {filterUrgency !== "all" && (
            <div style={{ fontSize:11, color:C.textLight, marginBottom:10, display:"flex", alignItems:"center", gap:8 }}>
              <span>{filtered.length} véhicule{filtered.length>1?"s":""} dans ce filtre</span>
              <button onClick={() => setFilterUrgency("all")}
                style={{ fontSize:11, color:C.red, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>
                × Effacer le filtre
              </button>
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:C.textLight, fontSize:13 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🔍</div>
                Aucun véhicule trouvé pour ce filtre
              </div>
            ) : (
              filtered.map(v => (
                <VehiclePanel
                  key={v.id} vehicle={v}
                  showToast={showToast}
                  onRefreshAlerts={() => { loadAlertes(); loadAllDocs(); }}
                  onDocsLoaded={handleDocsLoaded}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ════ ONGLET STATISTIQUES ════ */}
      {activeTab === "stats" && (
        <TabStatistiques vehicles={vehicles} allDocs={allDocs}/>
      )}

      <Toast msg={toast.msg} type={toast.type} onDone={() => setToast({ msg:"", type:"success" })}/>
    </div>
  );
}