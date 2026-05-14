// ─── src/reservations/Reservations.jsx ───────────────────────────────────────
import { useState, useEffect, useCallback, useMemo } from "react";
import { apiFetch } from "../../utils/api";
import { fmtDate, getCategorie } from "../../utils/api";
import { C, S, M, VEHICLE_CATEGORIES } from "../../constants";
import { Empty } from "../../components/ui";

// ── STYLES ────────────────────────────────────────────────────────────────────
const RES_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  .res-toast-container { position:fixed; top:24px; right:24px; z-index:9999; display:flex; flex-direction:column; gap:10px; pointer-events:none; }
  .res-toast { display:flex; align-items:flex-start; gap:12px; padding:13px 17px; border-radius:12px; min-width:300px; max-width:420px; box-shadow:0 8px 32px rgba(0,0,0,.18); pointer-events:all; animation:res-toast-in .3s cubic-bezier(.34,1.56,.64,1); position:relative; overflow:hidden; }
  .res-toast.removing { animation:res-toast-out .25s ease forwards; }
  .res-toast::before { content:''; position:absolute; left:0; top:0; bottom:0; width:4px; border-radius:12px 0 0 12px; }
  .res-toast.success { background:#F0FDF4; border:1px solid #BBF7D0; } .res-toast.success::before { background:#16A34A; }
  .res-toast.error   { background:#FFF1F2; border:1px solid #FECDD3; } .res-toast.error::before   { background:#E11D48; }
  .res-toast.warning { background:#FFFBEB; border:1px solid #FDE68A; } .res-toast.warning::before { background:#D97706; }
  .res-toast.info    { background:#EFF6FF; border:1px solid #BFDBFE; } .res-toast.info::before    { background:#2563EB; }
  .res-toast-icon { font-size:17px; flex-shrink:0; margin-top:1px; }
  .res-toast-content { flex:1; }
  .res-toast-title { font-size:12px; font-weight:700; margin-bottom:1px; }
  .res-toast.success .res-toast-title { color:#15803D; }
  .res-toast.error   .res-toast-title { color:#BE123C; }
  .res-toast.warning .res-toast-title { color:#92400E; }
  .res-toast.info    .res-toast-title { color:#1D4ED8; }
  .res-toast-msg  { font-size:11px; color:#4B5563; line-height:1.5; }
  .res-toast-close { background:none; border:none; cursor:pointer; font-size:13px; color:#9CA3AF; padding:0; flex-shrink:0; }
  .res-toast-progress { position:absolute; bottom:0; left:0; height:3px; animation:res-toast-progress 4.5s linear forwards; opacity:.4; }
  .res-toast.success .res-toast-progress { background:#16A34A; }
  .res-toast.error   .res-toast-progress { background:#E11D48; }
  .res-toast.warning .res-toast-progress { background:#D97706; }
  .res-toast.info    .res-toast-progress { background:#2563EB; }
  @keyframes res-toast-in  { from{opacity:0;transform:translateX(110%) scale(.95)} to{opacity:1;transform:translateX(0) scale(1)} }
  @keyframes res-toast-out { from{opacity:1;transform:translateX(0);max-height:200px} to{opacity:0;transform:translateX(110%);max-height:0} }
  @keyframes res-toast-progress { from{width:100%} to{width:0%} }

  .res-card { background:#fff; border-radius:12px; border:1.5px solid #E8EDEB; padding:14px 16px; transition:all .18s; position:relative; }
  .res-card:hover { box-shadow:0 6px 20px rgba(27,94,55,.09); border-color:#CBD5CE; }

  .res-filter-pill { padding:6px 14px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; border:none; font-family:inherit; transition:all .15s; display:flex; align-items:center; gap:6px; }

  .bus-badge { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:6px; font-size:9px; font-weight:800; background:#EFF6FF; color:#1D4ED8; letter-spacing:.5px; }

  .modal-section-title { font-size:10px; font-weight:800; color:#1B5E37; text-transform:uppercase; letter-spacing:1.2px; padding-bottom:6px; border-bottom:2px solid #EAF4EE; margin-bottom:12px; display:flex; align-items:center; gap:6px; }

  /* Badge urgent */
  .badge-urgent { display:inline-flex; align-items:center; gap:3px; padding:2px 8px; border-radius:6px; font-size:9px; font-weight:800; background:#FFF1F2; color:#BE123C; border:1px solid #FECDD3; letter-spacing:.5px; animation:pulse-urgent 2s infinite; }
  @keyframes pulse-urgent { 0%,100%{opacity:1} 50%{opacity:.7} }

  /* Badge délai */
  .badge-delay { display:inline-flex; align-items:center; gap:3px; padding:2px 8px; border-radius:6px; font-size:9px; font-weight:700; }

  /* Calendrier */
  .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; }
  .cal-day { min-height:60px; border-radius:6px; padding:4px; font-size:10px; border:1px solid #E8EDEB; background:#fff; }
  .cal-day.today { border-color:#1B5E37; background:#F0FDF4; }
  .cal-day.other-month { background:#F9FAFB; opacity:.5; }
  .cal-event { font-size:9px; padding:2px 5px; border-radius:4px; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:pointer; }

  /* Recherche */
  .res-search-input { width:100%; padding:9px 12px 9px 36px; border:1.5px solid #E2E8E5; border-radius:9px; font-size:13px; font-family:inherit; outline:none; color:#1A2820; background:#fff; transition:border-color .15s; box-sizing:border-box; }
  .res-search-input:focus { border-color:#1B5E37; }

  /* Stats cards */
  .stat-card { background:#fff; border-radius:10px; border:1.5px solid #E8EDEB; padding:12px 16px; display:flex; flex-direction:column; gap:4px; }

  /* Conflict warning */
  .conflict-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:6px; font-size:10px; font-weight:700; background:#FFF1F2; color:#BE123C; border:1px solid #FECDD3; }

  /* Mobile responsive */
  @media (max-width: 640px) {
    .res-actions-row { flex-direction:column; gap:6px; }
    .res-actions-row button { width:100%; justify-content:center; padding:10px 16px !important; font-size:13px !important; }
    .res-filter-pills { overflow-x:auto; flex-wrap:nowrap !important; padding-bottom:4px; }
    .res-stats-grid { grid-template-columns:1fr 1fr !important; }
  }

  /* Pagination */
  .res-page-btn { width:32px; height:32px; border-radius:8px; border:1.5px solid #E2E8E5; background:#fff; cursor:pointer; font-family:inherit; font-size:12px; font-weight:600; color:#4A6358; display:inline-flex; align-items:center; justify-content:center; transition:all .15s; }
  .res-page-btn:hover { border-color:#1B5E37; color:#1B5E37; }
  .res-page-btn.active { background:#1B5E37; color:#fff; border-color:#1B5E37; }
  .res-page-btn:disabled { opacity:.4; cursor:not-allowed; }

  /* Tabs vue */
  .view-tab { padding:6px 14px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; border:none; font-family:inherit; transition:all .15s; }

  /* Confirm modal */
  .confirm-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:10000; display:flex; align-items:center; justify-content:center; padding:16px; }
  .confirm-box { background:#fff; border-radius:14px; padding:24px; max-width:380px; width:100%; box-shadow:0 20px 60px rgba(0,0,0,.2); }

  @keyframes spin { to { transform:rotate(360deg); } }
`;

// ── TOAST SYSTEM ──────────────────────────────────────────────────────────────
let _rtid = 0, _setRToasts = null;
function ResToastContainer() {
  const [toasts, setToasts] = useState([]);
  _setRToasts = setToasts;
  const remove = id => {
    setToasts(t => t.map(x => x.id === id ? { ...x, removing: true } : x));
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 300);
  };
  return (
    <div className="res-toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`res-toast ${t.type}${t.removing ? " removing" : ""}`}>
          <span className="res-toast-icon">{t.icon}</span>
          <div className="res-toast-content">
            <div className="res-toast-title">{t.title}</div>
            {t.message && <div className="res-toast-msg">{t.message}</div>}
          </div>
          <button className="res-toast-close" onClick={() => remove(t.id)}>✕</button>
          <div className="res-toast-progress" />
        </div>
      ))}
    </div>
  );
}
function showResToast({ type = "info", title, message, icon }) {
  if (!_setRToasts) return;
  const id = ++_rtid;
  const icons = { success: "✅", error: "❌", warning: "⚠️", info: "ℹ️" };
  _setRToasts(t => [...t, { id, type, title, message, icon: icon || icons[type], removing: false }]);
  setTimeout(() => {
    _setRToasts(t => t.map(x => x.id === id ? { ...x, removing: true } : x));
    setTimeout(() => _setRToasts(t => t.filter(x => x.id !== id)), 300);
  }, 5000);
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
const ST_MAP = {
  EN_ATTENTE: { label: "En attente", bg: "#FFFBEB", color: "#D97706", dot: "#D97706" },
  APPROUVEE:  { label: "Approuvée",  bg: "#F0FDF4", color: "#15803D", dot: "#16A34A" },
  REJETEE:    { label: "Refusée",    bg: "#FFF1F2", color: "#BE123C", dot: "#E11D48" },
  EN_COURS:   { label: "En cours",   bg: "#EFF6FF", color: "#1D4ED8", dot: "#2563EB" },
  TERMINEE:   { label: "Terminée",   bg: "#F0FDF4", color: "#15803D", dot: "#16A34A" },
  ANNULEE:    { label: "Annulée",    bg: "#F5F5F5", color: "#888",    dot: "#BBB"    },
};

function getVehicleReco(nbPassagers) {
  const n = Number(nbPassagers) || 1;
  if (n <= 5)  return { cat: "TOURISME", icon: "🚗", label: "Tourisme / Utilitaire", qty: 1,    desc: `${n} passager${n > 1 ? "s" : ""}` };
  if (n <= 35) return { cat: "BUS",      icon: "🚌", label: "1 Bus (35 pl.)",        qty: 1,    desc: `${n} passagers` };
  const buses = Math.ceil(n / 35);
  return       { cat: "BUS",             icon: "🚌", label: `${buses} Bus`,           qty: buses, desc: `${n} passagers → ${buses} bus de 35 pl.` };
}

// ✅ FIX: extractTime unifié (minuscule corrigé partout)
const extractTime = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const h = d.getHours(), m = d.getMinutes();
  if (h === 0 && m === 0) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// Délai depuis création
const getDelayInfo = (createdAt) => {
  if (!createdAt) return null;
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60));
  if (diff < 1)  return { label: "Il y a moins d'1h",  color: "#15803D", bg: "#F0FDF4" };
  if (diff < 24) return { label: `Il y a ${diff}h`,    color: "#D97706", bg: "#FFFBEB" };
  const days = Math.floor(diff / 24);
  if (days <= 2) return { label: `${days}j d'attente`, color: "#D97706", bg: "#FFFBEB" };
  return         { label: `⚠️ ${days}j d'attente`,    color: "#BE123C", bg: "#FFF1F2" };
};

// Détecter conflits de véhicule
const detectConflicts = (reservations, targetRes) => {
  if (!targetRes?.vehicle || !targetRes?.start_date || !targetRes?.end_date) return false;
  return reservations.some(r =>
    r.id !== targetRes.id &&
    r.vehicle === targetRes.vehicle &&
    ["APPROUVEE", "EN_COURS"].includes(r.status) &&
    new Date(r.start_date) < new Date(targetRes.end_date) &&
    new Date(r.end_date) > new Date(targetRes.start_date)
  );
};

const PAGE_SIZE = 10;

// ── ENVOI NOTIFICATION EMAIL ──────────────────────────────────────────────────
async function sendEmailNotification(resId, type, extra = {}) {
  try {
    await apiFetch(`/reservations/${resId}/notify/`, {
      method: "POST",
      body: JSON.stringify({ type, ...extra }),
    });
    return true;
  } catch (e) {
    console.warn("Notification email non envoyée :", e.message);
    return false;
  }
}

// ── MODAL CONFIRMATION SANS VÉHICULE ─────────────────────────────────────────
function ModalConfirmSansVehicule({ onConfirm, onCancel }) {
  return (
    <div className="confirm-overlay" onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="confirm-box">
        <div style={{ fontSize: 32, textAlign: "center", marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#1A2820", textAlign: "center", marginBottom: 8 }}>
          Approuver sans véhicule ?
        </div>
        <div style={{ fontSize: 12, color: "#4A6358", textAlign: "center", lineHeight: 1.6, marginBottom: 20 }}>
          Aucun véhicule n'a été sélectionné. La réservation sera approuvée mais le véhicule devra être assigné manuellement plus tard.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel}
            style={{ flex: 1, padding: "10px", border: "1.5px solid #E2E8E5", borderRadius: 9, background: "#fff", color: "#4A6358", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Annuler
          </button>
          <button onClick={onConfirm}
            style={{ flex: 1, padding: "10px", border: "none", borderRadius: 9, background: "#1B5E37", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Confirmer quand même
          </button>
        </div>
      </div>
    </div>
  );
}

// ── EXPORT PDF HISTORIQUE ─────────────────────────────────────────────────────
function exportReservationsPDF(list) {
  const now = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const fmtD = d => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const stLabel = s => ST_MAP[s]?.label || s;

  const rows = list.map(r => `
    <tr>
      <td>#${r.id}</td>
      <td>${r.requester_name || "—"}</td>
      <td>${r.requester_role || "—"}</td>
      <td>${r.destination || "—"}</td>
      <td>${r.purpose || "—"}</td>
      <td>${fmtD(r.start_date)}${extractTime(r.start_date) ? " " + extractTime(r.start_date) : ""}</td>
      <td>${fmtD(r.end_date)}${extractTime(r.end_date) ? " " + extractTime(r.end_date) : ""}</td>
      <td>${r.number_of_passengers || 1}</td>
      <td>${r.vehicle_name || "Non assigné"}</td>
      <td>${r.driver_name || "Non assigné"}</td>
      <td class="st-${r.status}">${stLabel(r.status)}</td>
      <td>${r.approved_by_name || "—"}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <title>Historique Réservations — ${now}</title>
  <style>
    @page { size:A4 landscape; margin:12mm 10mm; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:Arial,sans-serif; font-size:9px; color:#1A2820; }
    .hdr { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; padding-bottom:10px; border-bottom:2px solid #1B5E37; }
    .hdr h1 { font-size:14px; font-weight:800; color:#1B5E37; }
    .hdr p  { font-size:8.5px; color:#6B7280; margin-top:3px; }
    .stats  { display:flex; gap:10px; margin-bottom:12px; }
    .stat   { padding:6px 14px; border-radius:6px; background:#EAF4EE; text-align:center; }
    .stat .n{ font-size:15px; font-weight:800; color:#1B5E37; }
    .stat .l{ font-size:8px; color:#4A6358; font-weight:600; text-transform:uppercase; letter-spacing:.8px; }
    table { width:100%; border-collapse:collapse; }
    thead tr { background:#1B5E37; color:#fff; }
    thead th { padding:5px 4px; text-align:left; font-size:8px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; }
    tbody tr:nth-child(even) { background:#F7FAF8; }
    tbody td { padding:5px 4px; border-bottom:1px solid #E8EDEB; vertical-align:middle; }
    .st-EN_ATTENTE{color:#D97706;font-weight:700} .st-APPROUVEE{color:#15803D;font-weight:700}
    .st-REJETEE{color:#BE123C;font-weight:700} .st-EN_COURS{color:#1D4ED8;font-weight:700}
    .st-TERMINEE{color:#15803D;font-weight:700} .st-ANNULEE{color:#888;font-weight:700}
    .footer { margin-top:12px; font-size:8px; color:#9CA3AF; text-align:center; border-top:1px solid #E8EDEB; padding-top:8px; }
  </style></head><body>
  <div class="hdr">
    <div><h1>📋 Historique des Réservations de Véhicules</h1>
    <p>Imprimé le ${now} · ${list.length} demande${list.length !== 1 ? "s" : ""}</p></div>
    <div style="text-align:right;font-size:8.5px;color:#6B7280">
      <div style="font-weight:700;font-size:11px;color:#1B5E37">IUC Logbessou</div>
      <div>Service des Transports</div></div>
  </div>
  <div class="stats">
    <div class="stat"><div class="n">${list.length}</div><div class="l">Total</div></div>
    <div class="stat"><div class="n">${list.filter(r => ["APPROUVEE", "TERMINEE", "EN_COURS"].includes(r.status)).length}</div><div class="l">Approuvées</div></div>
    <div class="stat"><div class="n">${list.filter(r => r.status === "REJETEE").length}</div><div class="l">Refusées</div></div>
    <div class="stat"><div class="n">${list.filter(r => r.status === "EN_ATTENTE").length}</div><div class="l">En attente</div></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Demandeur</th><th>Rôle</th><th>Destination</th><th>Motif</th>
    <th>Départ</th><th>Retour</th><th>Pass.</th><th>Véhicule</th><th>Chauffeur</th><th>Statut</th><th>Traité par</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Document généré automatiquement — Système de Gestion du Parc Automobile · IUC Logbessou</div>
  <script>window.onload=function(){window.print()};<\/script>
  </body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  let f = document.getElementById("__res_hist_pdf__");
  if (!f) {
    f = document.createElement("iframe");
    f.id = "__res_hist_pdf__";
    f.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;";
    document.body.appendChild(f);
  }
  f.src = url;
  f.onload = () => {
    try { f.contentWindow.focus(); f.contentWindow.print(); }
    catch { window.open(url, "_blank"); }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
}

// ── STATS RAPIDES ─────────────────────────────────────────────────────────────
function StatsRapides({ reservations }) {
  const now = new Date();
  const thisMonth = reservations.filter(r => {
    const d = new Date(r.created_at || r.start_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const total       = reservations.length;
  const enAttente   = reservations.filter(r => r.status === "EN_ATTENTE").length;
  const approuvees  = reservations.filter(r => ["APPROUVEE", "TERMINEE", "EN_COURS"].includes(r.status)).length;
  const tauxAppro   = total > 0 ? Math.round((approuvees / total) * 100) : 0;
  const ceMois      = thisMonth.length;
  const urgentes    = reservations.filter(r => r.priority === "URGENTE" && r.status === "EN_ATTENTE").length;

  const stats = [
    { label: "Total demandes",    value: total,       icon: "📋", color: "#1B5E37", bg: "#F0FDF4" },
    { label: "En attente",        value: enAttente,   icon: "⏳", color: "#D97706", bg: "#FFFBEB" },
    { label: "Taux d'approbation",value: `${tauxAppro}%`, icon: "✅", color: "#15803D", bg: "#DCFCE7" },
    { label: "Ce mois",           value: ceMois,      icon: "📅", color: "#1D4ED8", bg: "#EFF6FF" },
    ...(urgentes > 0 ? [{ label: "Urgentes", value: urgentes, icon: "🚨", color: "#BE123C", bg: "#FFF1F2" }] : []),
  ];

  return (
    <div className="res-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 4 }}>
      {stats.map(s => (
        <div key={s.label} className="stat-card" style={{ borderLeft: `3px solid ${s.color}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 18 }}>{s.icon}</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</span>
          </div>
          <div style={{ fontSize: 10, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".6px" }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── VUE CALENDRIER ────────────────────────────────────────────────────────────
function VueCalendrier({ reservations, onDetail }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Lundi en premier

  const days = [];
  // Jours du mois précédent
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, current: false });
  }
  // Jours du mois courant
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ date: new Date(year, month, i), current: true });
  }
  // Compléter jusqu'à 42 cases
  while (days.length < 42) {
    const d = new Date(year, month + 1, days.length - daysInMonth - startOffset + 1);
    days.push({ date: d, current: false });
  }

  const getResForDay = (date) => {
    return reservations.filter(r => {
      if (!r.start_date) return false;
      const start = new Date(r.start_date);
      const end   = r.end_date ? new Date(r.end_date) : start;
      const d     = new Date(date);
      d.setHours(0, 0, 0, 0);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return d >= start && d <= end;
    });
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthNames = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const dayNames   = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1.5px solid #E8EDEB", padding: 16 }}>
      {/* Navigation mois */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          style={{ padding: "6px 12px", border: "1.5px solid #E2E8E5", borderRadius: 8, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: "#4A6358" }}>
          ‹
        </button>
        <div style={{ fontWeight: 800, fontSize: 15, color: "#1A2820" }}>
          {monthNames[month]} {year}
        </div>
        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          style={{ padding: "6px 12px", border: "1.5px solid #E2E8E5", borderRadius: 8, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: "#4A6358" }}>
          ›
        </button>
      </div>

      {/* En-têtes jours */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
        {dayNames.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#6B7280", padding: "4px 0", textTransform: "uppercase", letterSpacing: ".6px" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grille */}
      <div className="cal-grid">
        {days.map((day, i) => {
          const dayRes  = getResForDay(day.date);
          const isToday = day.date.getTime() === today.getTime();
          return (
            <div key={i} className={`cal-day${isToday ? " today" : ""}${!day.current ? " other-month" : ""}`}>
              <div style={{ fontSize: 11, fontWeight: isToday ? 800 : 500, color: isToday ? "#1B5E37" : day.current ? "#1A2820" : "#9CA3AF" }}>
                {day.date.getDate()}
              </div>
              {dayRes.slice(0, 2).map(r => {
                const st = ST_MAP[r.status] || { color: "#888", bg: "#F5F5F5" };
                return (
                  <div key={r.id} className="cal-event"
                    onClick={() => onDetail(r)}
                    style={{ background: st.bg, color: st.color, fontWeight: 600 }}
                    title={`${r.requester_name} → ${r.destination}`}>
                    {r.requester_name?.split(" ")[0] || `#${r.id}`}
                  </div>
                );
              })}
              {dayRes.length > 2 && (
                <div style={{ fontSize: 8, color: "#6B7280", marginTop: 2 }}>+{dayRes.length - 2} autres</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Légende */}
      <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
        {Object.entries(ST_MAP).map(([key, val]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#6B7280" }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: val.dot || val.color, display: "inline-block" }} />
            {val.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MODAL DÉTAIL ──────────────────────────────────────────────────────────────
function ModalDetail({ r, onClose, onApprove, onReject, allReservations }) {
  const st      = ST_MAP[r.status] || { label: r.status, bg: "#F5F5F5", color: "#888" };
  const nb      = Number(r.number_of_passengers) || 1;
  const reco    = getVehicleReco(nb);
  const delay   = r.status === "EN_ATTENTE" ? getDelayInfo(r.created_at) : null;
  const hasConflict = detectConflicts(allReservations || [], r);

  return (
    <div style={M.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...M.modal, maxWidth: 580 }}>
        <div style={M.header}>
          <div>
            <div style={M.title}>Demande de réservation #{r.id}</div>
            <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>
              Soumise le {r.created_at ? new Date(r.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
            </div>
          </div>
          <button onClick={onClose} style={M.closeBtn}>✕</button>
        </div>

        <div style={{ padding: "20px 22px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, maxHeight: "calc(90vh - 140px)" }}>

          {/* Statut + badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ padding: "4px 14px", borderRadius: 99, fontSize: 12, fontWeight: 700, background: st.bg, color: st.color, display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.dot || st.color, display: "inline-block" }} />
              {st.label}
            </span>
            {r.priority === "URGENTE" && <span className="badge-urgent">🚨 URGENT</span>}
            {delay && <span className="badge-delay" style={{ background: delay.bg, color: delay.color }}>{delay.label}</span>}
            {hasConflict && <span className="conflict-badge">⚠️ Conflit détecté</span>}
            {r.approved_by_name && (
              <span style={{ fontSize: 11, color: C.textLight }}>— Traité par <b>{r.approved_by_name}</b></span>
            )}
          </div>

          {/* Conflit warning */}
          {hasConflict && (
            <div style={{ background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 9, padding: "10px 14px", fontSize: 12, color: "#BE123C" }}>
              ⚠️ <b>Attention :</b> Ce véhicule a déjà une réservation approuvée sur cette période. Vérifiez avant d'approuver.
            </div>
          )}

          {/* Demandeur */}
          <div style={{ background: "#F8FAFB", borderRadius: 10, padding: "14px 16px" }}>
            <div className="modal-section-title">👤 Demandeur</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                ["Nom complet",    r.requester_name || "—"],
                ["Rôle / Service", r.requester_role || "—"],
                ...(r.requester_email ? [["Email", r.requester_email]] : []),
              ].map(([lbl, val]) => (
                <div key={lbl}>
                  <div style={{ fontSize: 10, color: C.textLight, marginBottom: 2, textTransform: "uppercase", letterSpacing: ".6px" }}>{lbl}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Mission */}
          <div style={{ background: "#F8FAFB", borderRadius: 10, padding: "14px 16px" }}>
            <div className="modal-section-title">🎯 Détails de la mission</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                ["Destination", r.destination || "—"],
                ["Motif",       r.purpose || "—"],
              ].map(([lbl, val]) => (
                <div key={lbl}>
                  <div style={{ fontSize: 10, color: C.textLight, marginBottom: 2, textTransform: "uppercase", letterSpacing: ".6px" }}>{lbl}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{val}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
              <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 9, color: "#1D4ED8", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 6 }}>📅 Départ</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>
                  {r.start_date ? new Date(r.start_date).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }) : "—"}
                </div>
                {extractTime(r.start_date)
                  ? <div style={{ fontSize: 16, fontWeight: 800, color: "#1D4ED8", marginTop: 4 }}>⏰ {extractTime(r.start_date)}</div>
                  : <div style={{ fontSize: 11, color: C.textLight, marginTop: 4, fontStyle: "italic" }}>Heure non précisée</div>
                }
              </div>

              <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 9, color: C.green, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 6 }}>🏁 Retour prévu</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>
                  {r.end_date ? new Date(r.end_date).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }) : "—"}
                </div>
                {extractTime(r.end_date)
                  ? <div style={{ fontSize: 16, fontWeight: 800, color: C.green, marginTop: 4 }}>⏰ {extractTime(r.end_date)}</div>
                  : <div style={{ fontSize: 11, color: C.textLight, marginTop: 4, fontStyle: "italic" }}>Heure non précisée</div>
                }
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: C.textLight, marginBottom: 2, textTransform: "uppercase", letterSpacing: ".6px" }}>👥 Passagers</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{nb} personne{nb > 1 ? "s" : ""}</div>
              </div>
              {r.estimated_distance && (
                <div>
                  <div style={{ fontSize: 10, color: C.textLight, marginBottom: 2, textTransform: "uppercase", letterSpacing: ".6px" }}>📐 Distance estimée</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.estimated_distance} km</div>
                </div>
              )}
            </div>

            {r.notes && (
              <div style={{ marginTop: 12, padding: "10px 12px", background: "#fff", borderRadius: 8, fontSize: 12, color: C.textMid, borderLeft: `3px solid #D97706` }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#D97706", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 4 }}>📝 Notes du demandeur</div>
                {r.notes}
              </div>
            )}
          </div>

          {/* Recommandation */}
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 9, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 26 }}>{reco.icon}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#D97706" }}>Véhicule recommandé : {reco.label}</div>
              <div style={{ fontSize: 11, color: C.textLight, marginTop: 1 }}>{reco.desc}</div>
            </div>
          </div>

          {/* Assignation */}
          {(r.vehicle_name || r.driver_name) && r.status !== "EN_ATTENTE" && (
            <div style={{ background: C.greenLight, borderRadius: 9, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>✓ Assignation confirmée</div>
              {r.vehicle_name && r.vehicle_name !== "Non assigné" && (
                <div style={{ fontSize: 12, color: C.text, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 16 }}>🚗</span> <b>{r.vehicle_name}</b>
                </div>
              )}
              {r.driver_name && (
                <div style={{ fontSize: 12, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 16 }}>👤</span> <b>{r.driver_name}</b>
                </div>
              )}
            </div>
          )}

          {/* Motif refus */}
          {r.rejection_reason && (
            <div style={{ background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 9, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#BE123C", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>✕ Motif du refus</div>
              <div style={{ fontSize: 12, color: "#BE123C", lineHeight: 1.6 }}>{r.rejection_reason}</div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ padding: "14px 22px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0 }}>
          {r.status === "EN_ATTENTE" && (
            <>
              <button onClick={() => { onClose(); onReject(r.id); }}
                style={{ ...S.ghostBtn, color: C.red, borderColor: "#fca5a5" }}>✕ Refuser</button>
              <button onClick={() => { onClose(); onApprove(r); }} style={S.btn}>✓ Approuver & Assigner</button>
            </>
          )}
          {r.status !== "EN_ATTENTE" && (
            <button onClick={onClose} style={S.ghostBtn}>Fermer</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MODAL REFUS ───────────────────────────────────────────────────────────────
function ModalRefus({ resId, resData, onClose, onDone }) {
  const [reason,       setReason]       = useState("");
  const [saving,       setSaving]       = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [err,          setErr]          = useState("");

  // ✅ FIX: setSaving dans finally pour éviter le blocage en cas d'erreur
  const handleSubmit = async () => {
    if (!reason.trim()) { setErr("Veuillez indiquer un motif de refus."); return; }
    setSaving(true);
    try {
      await apiFetch(`/reservations/${resId}/reject/`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });

      setSendingEmail(true);
      const emailSent = await sendEmailNotification(resId, "REJETEE", {
        rejection_reason: reason,
        requester_name:   resData?.requester_name,
        destination:      resData?.destination,
        start_date:       resData?.start_date,
      });
      setSendingEmail(false);

      showResToast({
        type: "success",
        title: "Demande refusée",
        message: emailSent
          ? `${resData?.requester_name || "Le demandeur"} a été notifié par email du refus.`
          : "Refusée. La notification email n'a pas pu être envoyée.",
      });
      onDone();
    } catch (e) {
      setErr("Erreur : " + e.message);
    } finally {
      setSaving(false); // ✅ FIX: toujours exécuté
      setSendingEmail(false);
    }
  };

  return (
    <div style={M.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...M.modal, maxWidth: 460 }}>
        <div style={M.header}>
          <span style={M.title}>Refuser la demande</span>
          <button onClick={onClose} style={M.closeBtn}>✕</button>
        </div>
        {err && (
          <div style={{ background: "#FFF1F2", padding: "10px 16px", fontSize: 12, color: "#BE123C", borderBottom: "1px solid #FECDD3", display: "flex", gap: 8, alignItems: "center" }}>
            <span>⚠️</span> {err}
          </div>
        )}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          {resData && (
            <div style={{ background: "#F8FAFB", borderRadius: 9, padding: "10px 14px", fontSize: 12, color: C.textMid }}>
              Refus de la demande de <b>{resData.requester_name}</b> pour <b>{resData.destination}</b>
            </div>
          )}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMid, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 6, display: "block" }}>
              Motif du refus <span style={{ color: C.red }}>*</span>
            </label>
            <textarea
              autoFocus
              value={reason}
              onChange={e => { setReason(e.target.value); setErr(""); }}
              placeholder="Ex : Aucun véhicule disponible pour cette période."
              rows={4}
              style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${err ? "#E11D48" : "#E2E8E5"}`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", color: C.text, background: "#fff", boxSizing: "border-box", transition: "border-color .15s" }}
            />
          </div>
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 14px", fontSize: 11, color: "#1D4ED8", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>📧</span>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>Notification automatique</div>
              Une notification par email sera envoyée à <b>{resData?.requester_name || "le demandeur"}</b> avec le motif du refus.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={S.ghostBtn}>Annuler</button>
            <button onClick={handleSubmit} disabled={saving || sendingEmail}
              style={{ ...S.btn, background: C.red, opacity: (saving || sendingEmail) ? .7 : 1, display: "flex", alignItems: "center", gap: 6 }}>
              {saving
                ? <><span style={{ animation: "spin .8s linear infinite", display: "inline-block" }}>⟳</span> Refus en cours…</>
                : sendingEmail
                  ? <><span style={{ animation: "spin .8s linear infinite", display: "inline-block" }}>⟳</span> Envoi email…</>
                  : "✕ Confirmer le refus"
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
function ModalApprobation({ reservation, onClose, onDone, allReservations }) {
  const nb   = Number(reservation.number_of_passengers) || 1;
  const reco = getVehicleReco(nb);
 
  const [vehicles,     setVehicles]     = useState([]);
  const [drivers,      setDrivers]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedV,    setSelectedV]    = useState(null);
  const [selectedD,    setSelectedD]    = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [sendingMail,  setSendingMail]  = useState(false);
  const [filterCat,    setFilterCat]    = useState(reco.cat);
  const [error,        setError]        = useState("");
  // Conflits temps réel
  const [vehConflict,  setVehConflict]  = useState(null); // { reservation_id, requester, start, end }
  const [drvConflict,  setDrvConflict]  = useState(null);
  const [checking,     setChecking]     = useState(false);
 
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [v, d] = await Promise.all([
          apiFetch("/vehicles/?status=DISPONIBLE&assignment_type=POOL"),
          apiFetch("/auth/users/?role=CHAUFFEUR&is_active=true"),
        ]);
        setVehicles(Array.isArray(v) ? v : v?.results ?? []);
        setDrivers(Array.isArray(d)  ? d : d?.results ?? []);
      } catch (e) { setError("Impossible de charger les données : " + e.message); }
      finally     { setLoading(false); }
    })();
  }, []);
 
  // ── Vérification disponibilité en temps réel ──────────────────────────────
  useEffect(() => {
    if (!selectedV && !selectedD) { setVehConflict(null); setDrvConflict(null); return; }
    const check = async () => {
      setChecking(true);
      try {
        const params = new URLSearchParams({
          start:   reservation.start_date,
          end:     reservation.end_date,
          exclude: reservation.id,
          ...(selectedV ? { vehicle: selectedV } : {}),
          ...(selectedD ? { driver:  selectedD } : {}),
        });
        const res = await apiFetch(`/reservations/check-availability/?${params}`);
        setVehConflict(res?.data?.vehicle_conflict || null);
        setDrvConflict(res?.data?.driver_conflict  || null);
      } catch { /* silencieux */ }
      finally { setChecking(false); }
    };
    check();
  }, [selectedV, selectedD, reservation.id, reservation.start_date, reservation.end_date]);
 
  const filteredVeh = filterCat ? vehicles.filter(v => v.category === filterCat) : vehicles;
  const catCounts   = {};
  vehicles.forEach(v => { catCounts[v.category] = (catCounts[v.category] || 0) + 1; });
 
  const doApprove = async () => {
    setError(""); setSubmitting(true);
    try {
      const body = { vehicle: selectedV, driver: selectedD };
      await apiFetch(`/reservations/${reservation.id}/approve/`, {
        method: "POST",
        body:   JSON.stringify(body),
      });
 
      setSendingMail(true);
      const selVehObj = vehicles.find(v => v.id === selectedV);
      const selDrvObj = drivers.find(d  => d.id === selectedD);
      await sendEmailNotification(reservation.id, "APPROUVEE", {
        requester_name: reservation.requester_name,
        destination:    reservation.destination,
        start_date:     reservation.start_date,
        end_date:       reservation.end_date,
        vehicle_name:   selVehObj ? `${selVehObj.make} ${selVehObj.model} (${selVehObj.registration_number})` : null,
        driver_name:    selDrvObj ? (selDrvObj.full_name || `${selDrvObj.first_name} ${selDrvObj.last_name}`) : null,
      });
      setSendingMail(false);
 
      showResToast({
        type:    "success",
        title:   "Réservation approuvée ✓",
        message: `Véhicule et chauffeur assignés. Le véhicule passera "En service" au démarrage du trajet.`,
      });
      onDone();
    } catch (e) {
      setSendingMail(false);
      // Afficher le message d'erreur du backend (conflit, etc.)
      const msg = e.message || "Erreur inconnue";
      setError(msg);
      showResToast({ type: "error", title: "Approbation refusée", message: msg });
    } finally { setSubmitting(false); }
  };
 
  const handleApprove = () => {
    // Validation obligatoire côté frontend aussi
    if (!selectedV) {
      setError("⚠️ Vous devez sélectionner un véhicule pour approuver cette réservation.");
      return;
    }
    if (!selectedD) {
      setError("⚠️ Vous devez assigner un chauffeur pour approuver cette réservation.");
      return;
    }
    if (vehConflict) {
      setError(`⚠️ Ce véhicule est déjà réservé du ${vehConflict.start} au ${vehConflict.end} (${vehConflict.requester}). Choisissez un autre véhicule.`);
      return;
    }
    if (drvConflict) {
      setError(`⚠️ Ce chauffeur est déjà assigné du ${drvConflict.start} au ${drvConflict.end}. Choisissez un autre chauffeur.`);
      return;
    }
    doApprove();
  };
 
  const selVeh = vehicles.find(v => v.id === selectedV);
  const selDrv = drivers.find(d  => d.id === selectedD);
  const canApprove = selectedV && selectedD && !vehConflict && !drvConflict;
 
  return (
    <div style={M.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...M.modal, maxWidth: 700 }}>
        <div style={M.header}>
          <div>
            <div style={M.title}>Approuver la réservation #{reservation.id}</div>
            <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>
              {reservation.requester_name} · {reservation.destination} · {nb} passager{nb > 1 ? "s" : ""}
            </div>
          </div>
          <button onClick={onClose} style={M.closeBtn}>✕</button>
        </div>
 
        {/* Bannière info logique */}
        <div style={{ background: "#EFF6FF", borderBottom: "1px solid #BFDBFE", padding: "10px 16px", fontSize: 11, color: "#1D4ED8", display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
          <div>
            <b>Véhicule et chauffeur obligatoires.</b> Le véhicule restera <b>Disponible</b> jusqu'au démarrage réel du trajet par le chauffeur — il peut donc être utilisé pour d'autres réservations sur d'autres créneaux.
          </div>
        </div>
 
        {error && (
          <div style={{ background: "#FFF1F2", padding: "12px 16px", fontSize: 12, color: "#BE123C", borderBottom: "1px solid #FECDD3", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}
 
        <div style={{ overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 20, maxHeight: "calc(90vh - 200px)" }}>
 
          {/* Résumé mission */}
          <div style={{ background: "#F8FAFB", borderRadius: 10, padding: "14px 16px" }}>
            <div className="modal-section-title">📋 Résumé de la mission</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {[
                ["📍 Destination", reservation.destination || "—"],
                ["🎯 Motif",       reservation.purpose || "—"],
                ["👥 Passagers",   `${nb} pers.`],
              ].map(([lbl, val]) => (
                <div key={lbl}>
                  <div style={{ fontSize: 9, color: C.textLight, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 2 }}>{lbl}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
              <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 9, color: "#1D4ED8", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 4 }}>📅 Départ</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
                  {reservation.start_date ? new Date(reservation.start_date).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }) : "—"}
                </div>
                {extractTime(reservation.start_date)
                  ? <div style={{ fontSize: 15, fontWeight: 800, color: "#1D4ED8", marginTop: 3 }}>⏰ {extractTime(reservation.start_date)}</div>
                  : <div style={{ fontSize: 10, color: C.textLight, marginTop: 3, fontStyle: "italic" }}>Heure non précisée</div>
                }
              </div>
              <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 9, color: C.green, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 4 }}>🏁 Retour</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
                  {reservation.end_date ? new Date(reservation.end_date).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }) : "—"}
                </div>
                {extractTime(reservation.end_date)
                  ? <div style={{ fontSize: 15, fontWeight: 800, color: C.green, marginTop: 3 }}>⏰ {extractTime(reservation.end_date)}</div>
                  : <div style={{ fontSize: 10, color: C.textLight, marginTop: 3, fontStyle: "italic" }}>Heure non précisée</div>
                }
              </div>
            </div>
          </div>
 
          {/* Recommandation */}
          <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 9, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 26 }}>{reco.icon}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.amber }}>Recommandation : {reco.label}</div>
              <div style={{ fontSize: 11, color: C.textLight }}>{reco.desc}</div>
            </div>
          </div>
 
          {/* ── 1. Véhicule ── */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: selectedV && !vehConflict ? C.green : selectedV && vehConflict ? "#E11D48" : "#9CA3AF", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>1</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Choisir un véhicule <span style={{ color: "#E11D48" }}>*</span></span>
              {checking && selectedV && <span style={{ fontSize: 10, color: C.textLight }}>Vérification…</span>}
              {selectedV && !checking && !vehConflict && <span style={{ fontSize: 10, color: C.green, fontWeight: 700 }}>✓ Disponible</span>}
              {selectedV && !checking && vehConflict && <span style={{ fontSize: 10, color: "#E11D48", fontWeight: 700 }}>✗ Conflit détecté</span>}
            </div>
 
            {/* Alerte conflit véhicule */}
            {vehConflict && (
              <div style={{ marginLeft: 30, marginBottom: 10, background: "#FFF1F2", border: "1.5px solid #FECDD3", borderRadius: 9, padding: "10px 14px", fontSize: 11, color: "#BE123C" }}>
                <b>⚠️ Ce véhicule est déjà réservé :</b><br />
                📅 Du <b>{vehConflict.start}</b> au <b>{vehConflict.end}</b><br />
                👤 Pour : <b>{vehConflict.requester}</b> (réservation #{vehConflict.reservation_id})<br />
                <span style={{ color: "#D97706", marginTop: 4, display: "block" }}>→ Choisissez un autre véhicule ou vérifiez les plages horaires.</span>
              </div>
            )}
 
            <div style={{ fontSize: 11, color: C.textLight, marginBottom: 10, marginLeft: 30 }}>
              Véhicules <b>disponibles</b> · Le véhicule passera <b style={{ color: C.amber }}>"En service"</b> uniquement au <b>démarrage</b> du trajet
            </div>
 
            {/* Filtres catégorie */}
            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", marginLeft: 30 }}>
              <button onClick={() => setFilterCat("")}
                style={{ padding: "4px 11px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "none", background: filterCat === "" ? "#1A2820" : "#F4F6F5", color: filterCat === "" ? "#fff" : C.textMid, transition: "all .15s" }}>
                Tous ({vehicles.length})
              </button>
              {VEHICLE_CATEGORIES.map(([cat, label, icon]) => {
                const count  = catCounts[cat] || 0;
                const isReco = cat === reco.cat;
                const active = filterCat === cat;
                return (
                  <button key={cat} onClick={() => setFilterCat(cat)}
                    style={{ padding: "4px 11px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: `1.5px solid ${isReco ? "#D97706" : active ? C.green : "#E2E8E5"}`, background: active ? C.greenLight : isReco ? "#FFFBEB" : "#F4F6F5", color: active ? C.green : isReco ? C.amber : C.textMid, transition: "all .15s" }}>
                    {icon} {label} ({count}){isReco && <span style={{ marginLeft: 4, fontSize: 9, fontWeight: 800 }}>★</span>}
                  </button>
                );
              })}
            </div>
 
            {loading
              ? <div style={{ textAlign: "center", padding: "20px", color: C.textLight, fontSize: 12, marginLeft: 30 }}>Chargement des véhicules…</div>
              : filteredVeh.length === 0
                ? <div style={{ marginLeft: 30, padding: "12px", background: "#FFF1F2", borderRadius: 8, fontSize: 12, color: C.red, textAlign: "center" }}>Aucun véhicule disponible dans cette catégorie.</div>
                : <div style={{ marginLeft: 30, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: 200, overflowY: "auto" }}>
                    {filteredVeh.map(v => {
                      const catInfo = VEHICLE_CATEGORIES.find(([c]) => c === v.category);
                      const sel     = selectedV === v.id;
                      // Conflit local (depuis allReservations) pour affichage rapide
                      const localConflict = (allReservations || []).some(r =>
                        r.vehicle === v.id &&
                        ["APPROUVEE", "EN_COURS"].includes(r.status) &&
                        new Date(r.start_date) < new Date(reservation.end_date) &&
                        new Date(r.end_date)   > new Date(reservation.start_date)
                      );
                      return (
                        <div key={v.id} onClick={() => { setSelectedV(sel ? null : v.id); setError(""); }}
                          style={{ padding: "10px 12px", borderRadius: 8, cursor: "pointer", transition: "all .15s", border: `1.5px solid ${sel && !vehConflict ? C.green : sel && vehConflict ? "#E11D48" : localConflict ? "#FECDD3" : "#E2E8E5"}`, background: sel && !vehConflict ? C.greenLight : sel && vehConflict ? "#FFF1F2" : localConflict ? "#FFF8F8" : "#F8FAFB", display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 20 }}>{catInfo?.[2] ?? "🚗"}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{v.registration_number}</div>
                            <div style={{ fontSize: 11, color: C.textMid }}>{v.make} {v.model}</div>
                            <div style={{ fontSize: 10, color: C.textLight }}>{v.seating_capacity} pl. · {Number(v.current_mileage || 0).toLocaleString("fr-FR")} km</div>
                            {localConflict && <div style={{ fontSize: 9, color: "#D97706", fontWeight: 700, marginTop: 2 }}>⚠️ Potentiel conflit — vérifiez les horaires</div>}
                          </div>
                          {sel && !vehConflict && <span style={{ color: C.green, fontWeight: 800, fontSize: 16, flexShrink: 0 }}>✓</span>}
                          {sel && vehConflict  && <span style={{ color: "#E11D48", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>✗</span>}
                        </div>
                      );
                    })}
                  </div>
            }
          </div>
 
          {/* ── 2. Chauffeur ── */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: selectedD && !drvConflict ? C.green : selectedD && drvConflict ? "#E11D48" : "#9CA3AF", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>2</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Assigner un chauffeur <span style={{ color: "#E11D48" }}>*</span></span>
              {checking && selectedD && <span style={{ fontSize: 10, color: C.textLight }}>Vérification…</span>}
              {selectedD && !checking && !drvConflict && <span style={{ fontSize: 10, color: C.green, fontWeight: 700 }}>✓ Disponible</span>}
              {selectedD && !checking && drvConflict && <span style={{ fontSize: 10, color: "#E11D48", fontWeight: 700 }}>✗ Déjà assigné</span>}
            </div>
 
            {/* Alerte conflit chauffeur */}
            {drvConflict && (
              <div style={{ marginLeft: 30, marginBottom: 10, background: "#FFF1F2", border: "1.5px solid #FECDD3", borderRadius: 9, padding: "10px 14px", fontSize: 11, color: "#BE123C" }}>
                <b>⚠️ Ce chauffeur est déjà assigné :</b><br />
                📅 Du <b>{drvConflict.start}</b> au <b>{drvConflict.end}</b><br />
                👤 Mission : <b>{drvConflict.requester}</b> (réservation #{drvConflict.reservation_id})<br />
                <span style={{ color: "#D97706", marginTop: 4, display: "block" }}>→ Choisissez un autre chauffeur disponible sur ce créneau.</span>
              </div>
            )}
 
            {loading
              ? <div style={{ textAlign: "center", padding: "16px", color: C.textLight, fontSize: 12, marginLeft: 30 }}>Chargement…</div>
              : drivers.length === 0
                ? <div style={{ marginLeft: 30, padding: "12px 14px", background: C.amberLight, borderRadius: 8, fontSize: 12, color: C.amber }}>Aucun chauffeur enregistré.</div>
                : <div style={{ marginLeft: 30, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: 220, overflowY: "auto" }}>
                    {drivers.map(d => {
                      const profile  = d.driver_profile;
                      const drvSt    = profile?.manual_status ?? "DISPONIBLE";
                      const isAvail  = drvSt === "DISPONIBLE";
                      const isBus    = profile?.assignment_type === "BUS_SCOLAIRE";
                      const busStart = profile?.bus_slot_start ?? "05:00";
                      const busEnd   = profile?.bus_slot_end   ?? "08:30";
                      const sel      = selectedD === d.id;
                      const isConflict = sel && drvConflict;
 
                      const statusCfg = {
                        DISPONIBLE:   { label: "Disponible",   color: C.green, bg: C.greenLight },
                        EN_MISSION:   { label: "En mission",   color: C.amber, bg: C.amberLight },
                        INDISPONIBLE: { label: "Indisponible", color: C.red,   bg: C.redLight   },
                        CONGE:        { label: "En congé",     color: "#888",  bg: "#F5F5F5"    },
                      }[drvSt] || { label: drvSt, color: "#888", bg: "#F5F5F5" };
 
                      return (
                        <div key={d.id}
                          onClick={() => { if (isAvail) { setSelectedD(sel ? null : d.id); setError(""); } }}
                          style={{ padding: "10px 12px", borderRadius: 8, cursor: isAvail ? "pointer" : "not-allowed", border: `1.5px solid ${isConflict ? "#E11D48" : sel ? C.green : isAvail ? "#E2E8E5" : "#E8E8E8"}`, background: isConflict ? "#FFF1F2" : sel ? C.greenLight : isAvail ? "#F8FAFB" : "#FAFAFA", display: "flex", alignItems: "flex-start", gap: 10, opacity: isAvail ? 1 : .58, transition: "all .15s" }}>
                          <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: isAvail ? C.green : "#CCC", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>
                            {d.first_name?.[0]}{d.last_name?.[0]}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {d.full_name || `${d.first_name} ${d.last_name}`}
                            </div>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 99, fontSize: 9, fontWeight: 700, background: statusCfg.bg, color: statusCfg.color, marginTop: 3 }}>
                              <span style={{ width: 4, height: 4, borderRadius: "50%", background: statusCfg.color, display: "inline-block" }} />
                              {statusCfg.label}
                            </span>
                            {profile?.license_category && (
                              <div style={{ fontSize: 9, color: C.textLight, marginTop: 3 }}>
                                Permis {profile.license_category}{profile.years_of_experience ? ` · ${profile.years_of_experience} ans` : ""}
                              </div>
                            )}
                            {isBus && (
                              <div style={{ marginTop: 5, padding: "5px 8px", background: "#EFF6FF", borderRadius: 7, border: "1px solid #BFDBFE" }}>
                                <div style={{ fontSize: 9, fontWeight: 800, color: "#1D4ED8", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 3 }}>🚌 Bus scolaire</div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "#1D4ED8" }}>Créneau : {busStart} → {busEnd}</div>
                                <div style={{ fontSize: 9, color: "#D97706", marginTop: 3, fontWeight: 600 }}>⚠️ Disponible hors de ce créneau</div>
                              </div>
                            )}
                          </div>
                          {sel && !isConflict && <span style={{ color: C.green, fontWeight: 800, fontSize: 16, flexShrink: 0, marginTop: 2 }}>✓</span>}
                          {isConflict          && <span style={{ color: "#E11D48", fontWeight: 800, fontSize: 16, flexShrink: 0, marginTop: 2 }}>✗</span>}
                        </div>
                      );
                    })}
                  </div>
            }
            <div style={{ marginLeft: 30, marginTop: 8, fontSize: 10, color: C.textLight }}>
              💡 Seuls les chauffeurs <b>Disponibles</b> peuvent être sélectionnés. Véhicule et chauffeur sont <b>obligatoires</b>.
            </div>
          </div>
 
          {/* Récap assignation */}
          {(selVeh && selDrv) && !vehConflict && !drvConflict && (
            <div style={{ background: C.greenLight, border: "1px solid #BBF7D0", borderRadius: 9, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 8 }}>✓ Récapitulatif de l'assignation</div>
              <div style={{ fontSize: 11, color: C.text, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                🚗 <b>{selVeh.registration_number}</b> — {selVeh.make} {selVeh.model} · {selVeh.seating_capacity} pl.
                <span style={{ fontSize: 9, color: C.amber, fontWeight: 700, background: "#FFFBEB", padding: "1px 6px", borderRadius: 4 }}>Reste DISPONIBLE jusqu'au démarrage</span>
              </div>
              <div style={{ fontSize: 11, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>
                👤 <b>{selDrv.full_name || `${selDrv.first_name} ${selDrv.last_name}`}</b>
                {selDrv.driver_profile?.assignment_type === "BUS_SCOLAIRE" && (
                  <span className="bus-badge">🚌 {selDrv.driver_profile?.bus_slot_start}–{selDrv.driver_profile?.bus_slot_end}</span>
                )}
              </div>
            </div>
          )}
 
          {/* Email info */}
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 9, padding: "10px 14px", fontSize: 11, color: "#1D4ED8", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>📧</span>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>Notification automatique</div>
              Un email sera envoyé à <b>{reservation.requester_name || "le demandeur"}</b> avec le récapitulatif (véhicule, chauffeur, horaires).
            </div>
          </div>
        </div>
 
        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0, alignItems: "center" }}>
          {!selectedV && <span style={{ fontSize: 11, color: "#E11D48", flex: 1 }}>⚠️ Véhicule requis</span>}
          {selectedV && !selectedD && <span style={{ fontSize: 11, color: "#E11D48", flex: 1 }}>⚠️ Chauffeur requis</span>}
          {selectedV && selectedD && (vehConflict || drvConflict) && <span style={{ fontSize: 11, color: "#E11D48", flex: 1 }}>⚠️ Résolvez les conflits avant d'approuver</span>}
          <button onClick={onClose} style={S.ghostBtn}>Annuler</button>
          <button
            onClick={handleApprove}
            disabled={submitting || sendingMail || !canApprove}
            style={{ ...S.btn, opacity: (submitting || sendingMail || !canApprove) ? .5 : 1, display: "flex", alignItems: "center", gap: 6, minWidth: 180, cursor: !canApprove ? "not-allowed" : "pointer" }}>
            {submitting
              ? <><span style={{ animation: "spin .8s linear infinite", display: "inline-block" }}>⟳</span> Approbation…</>
              : sendingMail
                ? <><span style={{ animation: "spin .8s linear infinite", display: "inline-block" }}>⟳</span> Envoi email…</>
                : "✓ Approuver & Assigner"
            }
          </button>
        </div>
      </div>
    </div>
  );
}
 
 

// ── CARTE RÉSERVATION ─────────────────────────────────────────────────────────
function ResCard({ r, onDetail, onApprove, onReject, actioning }) {
  const st    = ST_MAP[r.status] || { label: r.status, bg: "#F5F5F5", color: "#888", dot: "#BBB" };
  const nb    = Number(r.number_of_passengers) || 1;
  const reco  = getVehicleReco(nb);
  const delay = r.status === "EN_ATTENTE" ? getDelayInfo(r.created_at) : null;

  return (
    <div className="res-card" style={{ borderLeft: `3px solid ${st.dot || st.color}`, opacity: actioning === r.id ? .6 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>

        {/* Avatar + nom */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.green, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
            {(r.requester_name || "?")[0]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {r.requester_name || "—"}
            </div>
            <div style={{ fontSize: 11, color: C.textLight, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {r.requester_role || "Personnel"}
              {/* ✅ Badge URGENT */}
              {r.priority === "URGENTE" && <span className="badge-urgent">🚨 URGENT</span>}
              {/* ✅ Compteur délai */}
              {delay && (
                <span className="badge-delay" style={{ background: delay.bg, color: delay.color, fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 5 }}>
                  {delay.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Statut */}
        <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: st.bg, color: st.color, display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: st.dot || st.color, display: "inline-block" }} />
          {st.label}
        </span>
      </div>

      {/* Infos */}
      <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 12 }}>📍</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{r.destination || "—"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 11, color: C.textMid }}>
            {r.start_date ? new Date(r.start_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "—"}
            {extractTime(r.start_date) && <b style={{ color: "#1D4ED8" }}> {extractTime(r.start_date)}</b>}
          </span>
          <span style={{ fontSize: 10, color: C.textLight }}>→</span>
          <span style={{ fontSize: 11, color: C.textMid }}>
            {r.end_date ? new Date(r.end_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "—"}
            {extractTime(r.end_date) && <b style={{ color: C.green }}> {extractTime(r.end_date)}</b>}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11 }}>{reco.icon}</span>
          <span style={{ fontSize: 11, color: C.textMid }}>{nb} pers.</span>
        </div>
        {r.vehicle_name && r.vehicle_name !== "Non assigné" && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 11 }}>🚗</span>
            <span style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>{r.vehicle_name}</span>
          </div>
        )}
      </div>

      {/* ✅ Actions mobiles améliorées */}
      <div className="res-actions-row" style={{ display: "flex", gap: 7, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => onDetail(r)}
          style={{ padding: "7px 14px", border: "1.5px solid #E2E8E5", borderRadius: 8, background: "#fff", color: C.textMid, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          🔍 Détails
        </button>
        {r.status === "EN_ATTENTE" && (
          <>
            <button disabled={actioning === r.id} onClick={() => onApprove(r)}
              style={{ padding: "7px 16px", border: "none", borderRadius: 8, background: C.greenLight, color: C.green, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: actioning === r.id ? .6 : 1 }}>
              ✓ Approuver
            </button>
            <button disabled={actioning === r.id} onClick={() => onReject(r.id, r)}
              style={{ padding: "7px 16px", border: "1.5px solid #fca5a5", borderRadius: 8, background: "#FFF1F2", color: C.red, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: actioning === r.id ? .6 : 1 }}>
              ✕ Refuser
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── RECHERCHE AVANCÉE ─────────────────────────────────────────────────────────
function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
      <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#9CA3AF", pointerEvents: "none" }}>🔍</span>
      <input
        className="res-search-input"
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || "Rechercher…"}
      />
    </div>
  );
}

function FiltresAvances({ filters, onChange, reservations }) {
  const [open, setOpen] = useState(false);

  // Extraire les demandeurs uniques
  const demandeurs = useMemo(() => {
    const names = [...new Set(reservations.map(r => r.requester_name).filter(Boolean))];
    return names.sort();
  }, [reservations]);

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ padding: "8px 14px", border: "1.5px solid #E2E8E5", borderRadius: 9, background: open ? "#F0FDF4" : "#fff", color: open ? C.green : C.textMid, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
        ⚙️ Filtres avancés
        {(filters.dateFrom || filters.dateTo || filters.demandeur) && (
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block" }} />
        )}
      </button>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "#fff", border: "1.5px solid #E8EDEB", borderRadius: 12, padding: 16, zIndex: 100, minWidth: 280, boxShadow: "0 8px 32px rgba(0,0,0,.12)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.green, textTransform: "uppercase", letterSpacing: "1px" }}>Filtres avancés</div>

          {/* Demandeur */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: C.textMid, textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4, display: "block" }}>Demandeur</label>
            <select value={filters.demandeur || ""} onChange={e => onChange({ ...filters, demandeur: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #E2E8E5", borderRadius: 8, fontSize: 12, fontFamily: "inherit", outline: "none", color: C.text, background: "#fff" }}>
              <option value="">Tous les demandeurs</option>
              {demandeurs.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {/* Date de début */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: C.textMid, textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4, display: "block" }}>Date de départ — du</label>
            <input type="date" value={filters.dateFrom || ""} onChange={e => onChange({ ...filters, dateFrom: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #E2E8E5", borderRadius: 8, fontSize: 12, fontFamily: "inherit", outline: "none", color: C.text, boxSizing: "border-box" }} />
          </div>

          {/* Date de fin */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: C.textMid, textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4, display: "block" }}>Au</label>
            <input type="date" value={filters.dateTo || ""} onChange={e => onChange({ ...filters, dateTo: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #E2E8E5", borderRadius: 8, fontSize: 12, fontFamily: "inherit", outline: "none", color: C.text, boxSizing: "border-box" }} />
          </div>

          <button onClick={() => { onChange({ demandeur: "", dateFrom: "", dateTo: "" }); setOpen(false); }}
            style={{ padding: "8px", border: "1.5px solid #E2E8E5", borderRadius: 8, background: "#F8FAFB", color: C.textMid, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Réinitialiser les filtres
          </button>
        </div>
      )}
    </div>
  );
}

// ── PAGINATION ────────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 12 }}>
      <button className="res-page-btn" disabled={page === 1} onClick={() => onChange(page - 1)}>‹</button>
      {pages.map((p, i) =>
        p === "…"
          ? <span key={i} style={{ fontSize: 12, color: C.textLight, padding: "0 4px" }}>…</span>
          : <button key={p} className={`res-page-btn${page === p ? " active" : ""}`} onClick={() => onChange(p)}>{p}</button>
      )}
      <button className="res-page-btn" disabled={page === totalPages} onClick={() => onChange(page + 1)}>›</button>
      <span style={{ fontSize: 11, color: C.textLight, marginLeft: 6 }}>Page {page}/{totalPages}</span>
    </div>
  );
}

// ── TAB RÉSERVATIONS PRINCIPAL ────────────────────────────────────────────────
export function TabReservations({ reservations, vehicles, onRefresh }) {
  const [actioning,    setActioning]    = useState(null);
  const [rejectModal,  setRejectModal]  = useState(null);
  const [approveModal, setApproveModal] = useState(null);
  const [detailModal,  setDetailModal]  = useState(null);
  const [allRes,       setAllRes]       = useState([]);
  const [filterSt,     setFilterSt]     = useState("EN_ATTENTE");
  const [loadingAll,   setLoadingAll]   = useState(false);
  const [vue,          setVue]          = useState("liste"); // "liste" | "calendrier"
  const [page,         setPage]         = useState(1);
  const [search,       setSearch]       = useState("");
  const [advFilters,   setAdvFilters]   = useState({ demandeur: "", dateFrom: "", dateTo: "" });

  const loadRes = useCallback(async () => {
    setLoadingAll(true);
    try {
      const r = await apiFetch("/reservations/");
      setAllRes(Array.isArray(r) ? r : r?.results ?? []);
    } catch { setAllRes(reservations); }
    finally  { setLoadingAll(false); }
  }, [reservations]);

  useEffect(() => { loadRes(); }, [loadRes]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [filterSt, search, advFilters]);

  const FILTERS = [
    { value: "EN_ATTENTE", label: "En attente",  color: "#D97706" },
    { value: "APPROUVEE",  label: "Approuvées",  color: C.green   },
    { value: "EN_COURS",   label: "En cours",    color: "#1D4ED8" },
    { value: "TERMINEE",   label: "Terminées",   color: "#15803D" },
    { value: "REJETEE",    label: "Refusées",    color: C.red     },
    { value: "",           label: "Toutes",      color: C.textMid },
  ];

  // ✅ Filtrage avancé combiné
  const filtered = useMemo(() => {
    let list = filterSt ? allRes.filter(r => r.status === filterSt) : allRes;

    // Recherche texte
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        (r.requester_name || "").toLowerCase().includes(q) ||
        (r.destination    || "").toLowerCase().includes(q) ||
        (r.purpose        || "").toLowerCase().includes(q) ||
        String(r.id).includes(q)
      );
    }

    // Filtre demandeur
    if (advFilters.demandeur) {
      list = list.filter(r => r.requester_name === advFilters.demandeur);
    }

    // Filtre date
    if (advFilters.dateFrom) {
      list = list.filter(r => r.start_date && new Date(r.start_date) >= new Date(advFilters.dateFrom));
    }
    if (advFilters.dateTo) {
      list = list.filter(r => r.start_date && new Date(r.start_date) <= new Date(advFilters.dateTo + "T23:59:59"));
    }

    return list;
  }, [allRes, filterSt, search, advFilters]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    if (a.status === "EN_ATTENTE" && b.status !== "EN_ATTENTE") return -1;
    if (b.status === "EN_ATTENTE" && a.status !== "EN_ATTENTE") return 1;
    // Urgentes en premier dans EN_ATTENTE
    if (a.priority === "URGENTE" && b.priority !== "URGENTE") return -1;
    if (b.priority === "URGENTE" && a.priority !== "URGENTE") return 1;
    return new Date(b.start_date || 0) - new Date(a.start_date || 0);
  }), [filtered]);

  // ✅ Pagination
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const onApprove = r => setApproveModal(r);
  const onReject  = (id, data) => setRejectModal({ id, data });
  const onDetail  = r => setDetailModal(r);

  const afterAction = async () => {
    setApproveModal(null);
    setRejectModal(null);
    setDetailModal(null);
    setActioning(null);
    await loadRes();
    onRefresh();
  };

  const showExportBtn = filterSt === "" || filterSt === "TERMINEE" || filterSt === "APPROUVEE" || filterSt === "REJETEE";

  return (
    <>
      <style>{RES_CSS}</style>
      <ResToastContainer />

      {/* Modals */}
      {detailModal && (
        <ModalDetail r={detailModal} onClose={() => setDetailModal(null)}
          onApprove={onApprove} onReject={(id) => onReject(id, detailModal)}
          allReservations={allRes} />
      )}
      {rejectModal && (
        <ModalRefus resId={rejectModal.id} resData={rejectModal.data}
          onClose={() => setRejectModal(null)} onDone={afterAction} />
      )}
      {approveModal && (
        <ModalApprobation reservation={approveModal} onClose={() => setApproveModal(null)}
          onDone={afterAction} allReservations={allRes} />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* ✅ Statistiques rapides */}
        <StatsRapides reservations={allRes} />

        {/* Barre de recherche + filtres avancés + vue */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Rechercher par nom, destination, motif, #ID…" />
          <FiltresAvances filters={advFilters} onChange={setAdvFilters} reservations={allRes} />

          {/* Sélecteur vue */}
          <div style={{ display: "flex", gap: 4, background: "#F4F6F5", borderRadius: 9, padding: 3 }}>
            <button className="view-tab"
              onClick={() => setVue("liste")}
              style={{ background: vue === "liste" ? "#fff" : "transparent", color: vue === "liste" ? C.green : C.textMid, boxShadow: vue === "liste" ? "0 1px 4px rgba(0,0,0,.08)" : "none" }}>
              ☰ Liste
            </button>
            <button className="view-tab"
              onClick={() => setVue("calendrier")}
              style={{ background: vue === "calendrier" ? "#fff" : "transparent", color: vue === "calendrier" ? C.green : C.textMid, boxShadow: vue === "calendrier" ? "0 1px 4px rgba(0,0,0,.08)" : "none" }}>
              📅 Calendrier
            </button>
          </div>
        </div>

        {/* Filtres statut + Export */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div className="res-filter-pills" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {FILTERS.map(f => {
              const cnt    = f.value ? allRes.filter(r => r.status === f.value).length : allRes.length;
              const active = filterSt === f.value;
              return (
                <button key={f.value} onClick={() => setFilterSt(f.value)}
                  className="res-filter-pill"
                  style={{ background: active ? f.color : "#F4F6F5", color: active ? "#fff" : C.textMid }}>
                  {f.label}
                  <span style={{ padding: "1px 7px", borderRadius: 99, fontSize: 10, fontWeight: 800, background: active ? "rgba(255,255,255,.25)" : f.color + "20", color: active ? "#fff" : f.color }}>
                    {cnt}
                  </span>
                </button>
              );
            })}
          </div>

          {showExportBtn && allRes.length > 0 && (
            <button
              onClick={() => exportReservationsPDF(filterSt ? allRes.filter(r => r.status === filterSt) : allRes)}
              style={{ padding: "7px 14px", background: "#FFF1F2", color: C.red, border: "1.5px solid #FECDD3", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
              🖨️ Imprimer l'historique
            </button>
          )}
        </div>

        {/* Résultat de recherche info */}
        {(search || advFilters.demandeur || advFilters.dateFrom || advFilters.dateTo) && (
          <div style={{ fontSize: 11, color: C.textLight, display: "flex", alignItems: "center", gap: 8 }}>
            <span>{sorted.length} résultat{sorted.length !== 1 ? "s" : ""} trouvé{sorted.length !== 1 ? "s" : ""}</span>
            <button onClick={() => { setSearch(""); setAdvFilters({ demandeur: "", dateFrom: "", dateTo: "" }); }}
              style={{ fontSize: 11, color: C.red, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
              × Effacer les filtres
            </button>
          </div>
        )}

        {/* Contenu */}
        {loadingAll ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: C.textLight, fontSize: 13 }}>⏳ Chargement…</div>
        ) : vue === "calendrier" ? (
          <VueCalendrier reservations={allRes} onDetail={onDetail} />
        ) : sorted.length === 0 ? (
          <Empty text="Aucune réservation dans cette catégorie" />
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {paginated.map(r => (
                <ResCard key={r.id} r={r}
                  onDetail={onDetail}
                  onApprove={onApprove}
                  onReject={onReject}
                  actioning={actioning}
                />
              ))}
            </div>

            {/* ✅ Pagination */}
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />

            {/* Info pagination */}
            {sorted.length > PAGE_SIZE && (
              <div style={{ textAlign: "center", fontSize: 11, color: C.textLight }}>
                Affichage {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} sur {sorted.length} réservations
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}