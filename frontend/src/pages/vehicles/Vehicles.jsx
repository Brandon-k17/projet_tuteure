// ─── src/vehicules/Vehicules.jsx ─────────────────────────────────────────────
// Version professionnelle — corrections architecture + nouvelles fonctionnalités
// Exclut : documents, maintenance, vignettes (gérés dans d'autres modules)

import { useState, useEffect, useRef, useCallback, useContext, createContext, useReducer } from "react";
import { apiFetch, apiUpload } from "../../utils/api";
import {
  C, S, M,
  VEHICLE_CATEGORIES, VEHICLE_TYPES, FUEL_TYPES, TRANS_TYPES,
  VEHICLE_STATUS, ASSIGNMENT_TYPES,
} from "../../constants";
import { StatusBadge, Empty, Fld, Sel } from "../../components/ui";

// ─────────────────────────────────────────────────────────────────────────────
// 0. CONSTANTES & HELPERS CENTRALISÉS
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const PAGE_SIZE = 24;

const ASGN_META = {
  POOL:         { label: "Parc commun",   color: "#1B5E37", bg: "#EAF4EE", icon: "🚗" },
  FONCTION:     { label: "Fonction",      color: "#7C3AED", bg: "#F5F3FF", icon: "🎖️" },
  BUS_SCOLAIRE: { label: "Bus scolaire",  color: "#1D4ED8", bg: "#EFF6FF", icon: "🚌" },
};

const STATUS_META = {
  DISPONIBLE:     { color: "#15803D", bg: "#EAF4EE", label: "Disponible"     },
  EN_SERVICE:     { color: "#D97706", bg: "#FFFBEB", label: "En service"     },
  EN_MAINTENANCE: { color: "#C0182A", bg: "#FDF0F1", label: "En maintenance" },
  HORS_SERVICE:   { color: "#6B7280", bg: "#F3F4F6", label: "Hors service"   },
};

const BUS_LIGNES = {
  A: { nom_trajet: "Bonamoussadi → IUC", point_depart: "Bonamoussadi" },
  B: { nom_trajet: "PK18 → IUC",         point_depart: "PK18"         },
  C: { nom_trajet: "Bonabéri → IUC",     point_depart: "Bonabéri"     },
  D: { nom_trajet: "Bepanda → IUC",      point_depart: "Bepanda"      },
  E: { nom_trajet: "Village → IUC",      point_depart: "Village"      },
};

const KM_REVISION = 10000;

const getPhotoUrl = v => {
  if (!v?.photo) return null;
  return v.photo.startsWith("http") ? v.photo : `${API_BASE}${v.photo}`;
};
const getAssignmentType = v => v?.assignment_type || "POOL";

function parseApiError(raw = "", context = "") {
  const r = raw.toLowerCase();
  if (r.includes("unique") || r.includes("already exists") || r.includes("duplicate")) {
    if (r.includes("registration_number") || r.includes("immatriculation"))
      return "Un véhicule avec ce numéro d'immatriculation existe déjà dans le système.";
    if (r.includes("internal_code") || r.includes("code interne"))
      return "Ce code interne est déjà utilisé par un autre véhicule.";
    if (r.includes("vin")) return "Ce numéro VIN est déjà enregistré pour un autre véhicule.";
    return "Ces informations sont déjà enregistrées (doublon détecté).";
  }
  if (r.includes("permission") || r.includes("403") || r.includes("unauthorized"))
    return "Vous n'avez pas les droits nécessaires pour effectuer cette action.";
  if (r.includes("required") || r.includes("blank") || r.includes("this field"))
    return "Certains champs obligatoires sont manquants ou invalides.";
  if (r.includes("network") || r.includes("failed to fetch"))
    return "Impossible de contacter le serveur. Vérifiez votre connexion.";
  if (r.includes("500") || r.includes("internal server"))
    return "Erreur interne serveur. Réessayez dans quelques instants.";
  if (context === "suppression") {
    if (r.includes("constraint") || r.includes("foreign key") || r.includes("referenced"))
      return "Ce véhicule ne peut pas être supprimé — il est lié à des réservations ou entretiens actifs.";
    return "La suppression a échoué. Ce véhicule est peut-être lié à d'autres données.";
  }
  if (raw.length > 120 || r.includes("{") || r.includes("traceback"))
    return `Erreur lors de ${context || "l'opération"}. Veuillez réessayer.`;
  return raw;
}

function buildEmptyForm(initial) {
  const i = initial || {};
  const str = v => (v == null ? "" : String(v));
  return {
    registration_number:  str(i.registration_number),
    internal_code:        str(i.internal_code),
    make:                 str(i.make),
    model:                str(i.model),
    year:                 i.year ?? new Date().getFullYear(),
    color:                str(i.color),
    category:             str(i.category)     || "TOURISME",
    vehicle_type:         str(i.vehicle_type) || "BERLINE",
    fuel_type:            str(i.fuel_type)    || "DIESEL",
    transmission:         str(i.transmission) || "MANUELLE",
    seating_capacity:     i.seating_capacity  ?? 5,
    fuel_tank_capacity:   str(i.fuel_tank_capacity),
    current_mileage:      str(i.current_mileage) || "0",
    status:               str(i.status)       || "DISPONIBLE",
    purchase_date:        str(i.purchase_date),
    registration_date:    str(i.registration_date),
    purchase_price:       str(i.purchase_price),
    vin_number:           str(i.vin_number),
    notes:                str(i.notes),
    assignment_type:      str(i.assignment_type) || "POOL",
    assigned_director_id: i.director_user_id  ?? null,
    assigned_director:    str(i.assigned_director),
    assigned_driver_id:   i.bus_driver         ?? null,
    bus_slot_start:       str(i.bus_slot_start) || "05:00",
    bus_slot_end:         str(i.bus_slot_end)   || "08:30",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CONTEXTE TOAST (remplace le singleton anti-pattern)
// ─────────────────────────────────────────────────────────────────────────────

const ToastContext = createContext(null);
let _toastId = 0;

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback(id => {
    setToasts(t => t.map(x => x.id === id ? { ...x, removing: true } : x));
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 300);
  }, []);

  const add = useCallback(({ type = "info", title, message }) => {
    const id = ++_toastId;
    const icons = { success: "✅", error: "❌", warning: "⚠️", info: "ℹ️" };
    setToasts(t => [...t, { id, type, title, message, icon: icons[type], removing: false }]);
    const timer = setTimeout(() => remove(id), 4500);
    return () => clearTimeout(timer);
  }, [remove]);

  return (
    <ToastContext.Provider value={add}>
      {children}
      <div
        role="region"
        aria-live="polite"
        aria-label="Notifications"
        style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none" }}
      >
        {toasts.map(t => (
          <div key={t.id} className={`veh-toast veh-toast--${t.type}${t.removing ? " veh-toast--out" : ""}`} role="alert">
            <span className="veh-toast__icon" aria-hidden="true">{t.icon}</span>
            <div className="veh-toast__body">
              <div className="veh-toast__title">{t.title}</div>
              {t.message && <div className="veh-toast__msg">{t.message}</div>}
            </div>
            <button
              className="veh-toast__close"
              onClick={() => remove(t.id)}
              aria-label="Fermer la notification"
            >✕</button>
            <div className="veh-toast__bar" aria-hidden="true" />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. HOOK DE FORMULAIRE (extrait de VehiculeModal)
// ─────────────────────────────────────────────────────────────────────────────

const DRAFT_KEY = "veh_form_draft";

function useVehicleForm(initial) {
  const [form,        setForm]        = useState(() => buildEmptyForm(initial));
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched,     setTouched]     = useState({});
  const [isDirty,     setIsDirty]     = useState(false);

  const initialSnapshot = useRef(JSON.stringify(buildEmptyForm(initial)));

  // Restauration du brouillon
  useEffect(() => {
    if (!initial) {
      try {
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) setForm(JSON.parse(draft));
      } catch { /* rien */ }
    }
  }, []);

  // Sauvegarde automatique du brouillon (mode ajout seulement)
  useEffect(() => {
    if (!initial) {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch { /* rien */ }
      setIsDirty(JSON.stringify(form) !== initialSnapshot.current);
    }
  }, [form]);

  const set    = k => e  => { setForm(f => ({ ...f, [k]: e.target.value })); setTouched(t => ({ ...t, [k]: true })); };
  const setVal = (k, v)  => { setForm(f => ({ ...f, [k]: v })); setTouched(t => ({ ...t, [k]: true })); };
  const touch  = k       => setTouched(t => ({ ...t, [k]: true }));
  const clearDraft = ()  => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* rien */ } };

  // Catégorie auto selon places (sauf affectation spéciale)
  useEffect(() => {
    if (form.assignment_type === "FONCTION" || form.assignment_type === "BUS_SCOLAIRE") return;
    const nb = parseInt(form.seating_capacity) || 1;
    setForm(f => ({ ...f, category: nb < 10 ? "TOURISME" : nb < 20 ? "UTILITAIRE" : "BUS" }));
  }, [form.seating_capacity]);

  // Statut auto pour voiture de fonction
  useEffect(() => {
    if (form.assignment_type === "FONCTION") setForm(f => ({ ...f, status: "EN_SERVICE" }));
  }, [form.assignment_type]);

  const validate = () => {
    const errs = {};
    if (!form.registration_number.trim()) errs.registration_number = "Immatriculation obligatoire.";
    if (!form.internal_code.trim())       errs.internal_code       = "Code interne obligatoire (ex: VH-001).";
    if (!form.make.trim())                errs.make                = "Marque obligatoire.";
    if (!form.model.trim())               errs.model               = "Modèle obligatoire.";
    const yr = parseInt(form.year);
    if (!yr || yr < 1990 || yr > new Date().getFullYear() + 1)
      errs.year = `Année entre 1990 et ${new Date().getFullYear() + 1}.`;
    if (!form.color.trim()) errs.color = "Couleur obligatoire.";
    const seats = parseInt(form.seating_capacity);
    if (!seats || seats < 1 || seats > 100) errs.seating_capacity = "Places : entre 1 et 100.";
    if (!form.fuel_tank_capacity || isNaN(Number(form.fuel_tank_capacity)) || Number(form.fuel_tank_capacity) <= 0)
      errs.fuel_tank_capacity = "Capacité réservoir obligatoire (litres).";
    if (form.vin_number?.trim()) {
      const vin = form.vin_number.trim();
      if (vin.length < 17)                            errs.vin_number = `VIN incomplet : ${vin.length}/17 caractères.`;
      else if (vin.length > 17)                       errs.vin_number = `VIN trop long : ${vin.length} caractères.`;
      else if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin))  errs.vin_number = "VIN contient des caractères non autorisés (I, O, Q interdits).";
    }
    if (form.assignment_type === "FONCTION" && !form.assigned_director_id)
      errs.assigned_director_id = "Directeur requis pour une voiture de fonction.";
    return errs;
  };

  const touchAll = () => {
    const keys = ["registration_number","internal_code","make","model","year","color","seating_capacity","fuel_tank_capacity","vin_number","assigned_director_id"];
    setTouched(Object.fromEntries(keys.map(k => [k, true])));
  };

  const buildPayload = () => {
    const clean = { ...form };
    ["purchase_date","registration_date","purchase_price","vin_number"].forEach(k => {
      if (clean[k] === "") delete clean[k];
    });
    delete clean.assigned_director_id;
    delete clean.assigned_driver_id;
    if (clean.assignment_type === "POOL") {
      delete clean.assigned_director; delete clean.director_user_id;
      delete clean.bus_driver; delete clean.bus_slot_start; delete clean.bus_slot_end;
    }
    if (clean.assignment_type === "FONCTION") {
      if (form.assigned_director_id) clean.director_user_id = form.assigned_director_id;
      clean.category = "TOURISME";
      clean.vehicle_type = ["BERLINE","SUV","BREAK","MONOSPACE"].includes(clean.vehicle_type) ? clean.vehicle_type : "BERLINE";
      delete clean.bus_driver; delete clean.bus_slot_start; delete clean.bus_slot_end; delete clean.assigned_director;
    }
    if (clean.assignment_type === "BUS_SCOLAIRE") {
      if (form.assigned_driver_id) clean.bus_driver = form.assigned_driver_id;
      clean.category = "BUS";
      clean.vehicle_type = ["BERLINE","SUV","BREAK"].includes(clean.vehicle_type) ? "MINIBUS" : clean.vehicle_type;
      delete clean.director_user_id; delete clean.assigned_director;
    }
    return clean;
  };

  return {
    form, setForm, set, setVal, touch,
    fieldErrors, setFieldErrors, touched, isDirty,
    validate, touchAll, buildPayload, clearDraft,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. EXPORT PDF
// ─────────────────────────────────────────────────────────────────────────────

function exportPDF(vehicles) {
  const fuelLabel   = k => FUEL_TYPES.find(([x]) => x === k)?.[1] || k;
  const catLabel    = k => VEHICLE_CATEGORIES.find(([x]) => x === k)?.[1] || k;
  const asgnLabel   = k => ASGN_META[k]?.label || k;
  const statusLabel = k => STATUS_META[k]?.label || k;

  const rows = vehicles.map(v => `
    <tr class="${v.status === "HORS_SERVICE" ? "hs" : ""}">
      <td>${v.registration_number}</td>
      <td>${v.internal_code || "-"}</td>
      <td>${v.make} ${v.model}</td>
      <td>${v.year}</td>
      <td>${catLabel(v.category)}</td>
      <td>${fuelLabel(v.fuel_type)}</td>
      <td>${v.seating_capacity} pl.</td>
      <td>${Number(v.current_mileage || 0).toLocaleString("fr-FR")} km</td>
      <td>${asgnLabel(getAssignmentType(v))}</td>
      <td class="status-${v.status}">${statusLabel(v.status)}</td>
      <td>${v.assigned_director || "-"}</td>
    </tr>`).join("");

  const now = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <title>Parc Automobile — ${now}</title>
  <style>
    @page { size: A4 landscape; margin: 15mm 12mm; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:Arial,sans-serif; font-size:10px; color:#1A2820; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; padding-bottom:12px; border-bottom:2px solid #1B5E37; }
    .header h1 { font-size:16px; font-weight:800; color:#1B5E37; }
    .header p  { font-size:10px; color:#6B7280; margin-top:3px; }
    .stats { display:flex; gap:12px; margin-bottom:16px; }
    .stat { padding:8px 14px; border-radius:6px; background:#EAF4EE; }
    .stat .n { font-size:18px; font-weight:800; color:#1B5E37; }
    .stat .l { font-size:9px; color:#4A6358; font-weight:600; text-transform:uppercase; letter-spacing:.8px; }
    table { width:100%; border-collapse:collapse; }
    thead tr { background:#1B5E37; color:#fff; }
    thead th { padding:7px 5px; text-align:left; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; }
    tbody tr:nth-child(even) { background:#F7FAF8; }
    tbody tr.hs { background:#F3F4F6 !important; color:#9CA3AF; }
    tbody td { padding:6px 5px; border-bottom:1px solid #E8EDEB; vertical-align:middle; }
    .status-DISPONIBLE     { color:#15803D; font-weight:700; }
    .status-EN_SERVICE     { color:#D97706; font-weight:700; }
    .status-EN_MAINTENANCE { color:#C0182A; font-weight:700; }
    .status-HORS_SERVICE   { color:#6B7280; font-weight:700; }
    .footer { margin-top:14px; font-size:9px; color:#9CA3AF; text-align:center; }
  </style></head><body>
  <div class="header">
    <div><h1>🚗 Parc Automobile — État du Parc</h1><p>Exporté le ${now} · ${vehicles.length} véhicule${vehicles.length !== 1 ? "s" : ""}</p></div>
    <div style="text-align:right;font-size:9px;color:#6B7280"><div style="font-weight:700;font-size:12px;color:#1B5E37">IUC Logbessou</div><div>Service des Transports</div></div>
  </div>
  <div class="stats">
    <div class="stat"><div class="n">${vehicles.filter(v => v.status === "DISPONIBLE").length}</div><div class="l">Disponibles</div></div>
    <div class="stat" style="background:#FFFBEB"><div class="n" style="color:#D97706">${vehicles.filter(v => v.status === "EN_SERVICE").length}</div><div class="l" style="color:#92400E">En service</div></div>
    <div class="stat" style="background:#FFF1F2"><div class="n" style="color:#C0182A">${vehicles.filter(v => v.status === "EN_MAINTENANCE").length}</div><div class="l" style="color:#9F1239">Maintenance</div></div>
    <div class="stat" style="background:#F3F4F6"><div class="n" style="color:#6B7280">${vehicles.filter(v => v.status === "HORS_SERVICE").length}</div><div class="l" style="color:#4B5563">Hors service</div></div>
  </div>
  <table>
    <thead><tr><th>Immatriculation</th><th>Code</th><th>Marque / Modèle</th><th>Année</th><th>Catégorie</th><th>Carburant</th><th>Places</th><th>Kilométrage</th><th>Affectation</th><th>Statut</th><th>Directeur / Resp.</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Document généré automatiquement — Système de Gestion du Parc Automobile · IUC Logbessou</div>
  <script>window.onload = function(){ window.print(); };<\/script>
  </body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  let iframe = document.getElementById("__pdf_frame__");
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "__pdf_frame__";
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;";
    document.body.appendChild(iframe);
  }
  iframe.src = url;
  iframe.onload = () => {
    try { iframe.contentWindow.focus(); iframe.contentWindow.print(); }
    catch { alert("Votre navigateur a bloqué l'impression. Autorisez les popups."); }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. EXPORT EXCEL (SheetJS via CDN — import dynamique)
// ─────────────────────────────────────────────────────────────────────────────

async function exportExcel(vehicles) {
  // Import dynamique pour ne pas alourdir le bundle si pas utilisé
  const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs");

  const fuelLabel   = k => FUEL_TYPES.find(([x]) => x === k)?.[1] || k;
  const catLabel    = k => VEHICLE_CATEGORIES.find(([x]) => x === k)?.[1] || k;
  const statusLabel = k => STATUS_META[k]?.label || k;
  const asgnLabel   = k => ASGN_META[k]?.label || k;

  const rows = vehicles.map(v => ({
    "Immatriculation":       v.registration_number,
    "Code interne":          v.internal_code || "",
    "Marque":                v.make,
    "Modèle":                v.model,
    "Année":                 v.year,
    "Couleur":               v.color,
    "Catégorie":             catLabel(v.category),
    "Type":                  v.vehicle_type,
    "Carburant":             fuelLabel(v.fuel_type),
    "Transmission":          v.transmission,
    "Places":                v.seating_capacity,
    "Réservoir (L)":         v.fuel_tank_capacity,
    "Kilométrage (km)":      Number(v.current_mileage || 0),
    "Affectation":           asgnLabel(getAssignmentType(v)),
    "Statut":                statusLabel(v.status),
    "Directeur assigné":     v.assigned_director || "",
    "Date achat":            v.purchase_date || "",
    "Prix achat (FCFA)":     v.purchase_price || "",
    "N° VIN":                v.vin_number || "",
    "Notes":                 v.notes || "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Véhicules");

  // Largeurs colonnes
  ws["!cols"] = [14,12,12,14,8,10,12,12,10,12,8,12,16,14,14,18,12,16,20,30].map(w => ({ wch: w }));

  const now = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `parc_automobile_${now}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CONFIRM DIALOG (accessible)
// ─────────────────────────────────────────────────────────────────────────────

function ConfirmDialog({ icon = "🗑️", title, message, confirmLabel = "Confirmer", confirmColor = "#C0182A", confirmBg = "#FDF0F1", onConfirm, onCancel, loading }) {
  const dialogRef = useRef(null);

  // Focus trap
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll("button:not([disabled])");
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    first?.focus();
    const trap = e => {
      if (e.key === "Tab") {
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, []);

  return (
    <div
      className="veh-overlay"
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
      aria-modal="true"
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        className="veh-confirm-box"
      >
        <div style={{ fontSize: 36, textAlign: "center", marginBottom: 12 }} aria-hidden="true">{icon}</div>
        <div id="confirm-title" style={{ fontSize: 17, fontWeight: 800, color: "#1A2820", textAlign: "center", marginBottom: 8 }}>{title}</div>
        <div id="confirm-desc" style={{ fontSize: 13, color: "#4A6358", textAlign: "center", lineHeight: 1.6, marginBottom: 24 }}>{message}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onCancel} className="veh-btn-ghost" style={{ padding: "10px 22px" }}>Annuler</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{ padding: "10px 22px", border: "none", borderRadius: 9, background: confirmBg, color: confirmColor, fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: loading ? .7 : 1, display: "flex", alignItems: "center", gap: 6 }}
          >
            {loading ? <><span style={{ animation: "veh-spin .8s linear infinite", display: "inline-block" }}>⟳</span> Suppression…</> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. SKELETON CARD
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="veh-card veh-card--skeleton" aria-hidden="true">
      <div className="veh-skel veh-skel--img" />
      <div style={{ padding: "14px 16px 16px" }}>
        <div className="veh-skel" style={{ height: 16, width: "70%", marginBottom: 8 }} />
        <div className="veh-skel" style={{ height: 12, width: "50%", marginBottom: 12 }} />
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          <div className="veh-skel" style={{ height: 20, width: 60 }} />
          <div className="veh-skel" style={{ height: 20, width: 50 }} />
        </div>
        <div className="veh-skel" style={{ height: 4, width: "100%", marginBottom: 8 }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. CARTE VÉHICULE
// ─────────────────────────────────────────────────────────────────────────────

function VehicleCard({ v, onEdit, onDelete, onPhotoView, onDetail, deleting }) {
  const photoUrl   = getPhotoUrl(v);
  const catInfo    = VEHICLE_CATEGORIES.find(([c]) => c === v.category);
  const asgnMeta   = ASGN_META[getAssignmentType(v)] || ASGN_META.POOL;
  const statusMeta = STATUS_META[v.status] || STATUS_META.DISPONIBLE;
  const isHS       = v.status === "HORS_SERVICE";

  const kmDepuis   = v.km_since_maintenance ?? (Number(v.current_mileage || 0) % KM_REVISION);
  const pctUsure   = Math.min(Math.round(kmDepuis / KM_REVISION * 100), 100);
  const kmRestants = Math.max(KM_REVISION - kmDepuis, 0);
  const barColor   = pctUsure >= 90 ? "#DC2626" : pctUsure >= 70 ? "#D97706" : pctUsure >= 40 ? "#2563EB" : "#16A34A";

  return (
    <article
      className={`veh-card${isHS ? " veh-card--hs" : ""}`}
      aria-label={`${v.make} ${v.model} — ${v.registration_number}`}
    >
      {/* Zone image */}
      <div className="veh-card__imgwrap">
        {photoUrl
          ? <img
              className="veh-card__img"
              src={photoUrl}
              alt={`Photo de ${v.make} ${v.model}`}
              onClick={() => !isHS && onPhotoView(photoUrl)}
              style={{ cursor: isHS ? "default" : "zoom-in" }}
            />
          : <div className="veh-card__placeholder" aria-hidden="true">
              {catInfo?.[2] ?? "🚗"}
            </div>
        }
        <div
          className="veh-card__badge-asgn"
          style={{ background: `${asgnMeta.bg}dd`, color: asgnMeta.color, border: `1px solid ${asgnMeta.color}22` }}
          aria-label={`Affectation : ${asgnMeta.label}`}
        >
          <span aria-hidden="true">{asgnMeta.icon}</span> {asgnMeta.label}
        </div>
        {isHS && <div className="veh-card__hs-ribbon">Hors service</div>}
      </div>

      {/* Corps */}
      <div className="veh-card__body">
        <div className="veh-card__title">{v.make} {v.model}</div>
        <div className="veh-card__sub">{v.registration_number} · {v.year}</div>

        <div className="veh-card__tags" aria-label="Caractéristiques">
          <span
            className="veh-card__tag"
            style={{ background: statusMeta.bg, color: statusMeta.color }}
            aria-label={`Statut : ${statusMeta.label}`}
          >{statusMeta.label}</span>
          <span className="veh-card__tag" style={{ background: "#F4F6F5", color: "#4A6358" }}>
            {FUEL_TYPES.find(([k]) => k === v.fuel_type)?.[1] || v.fuel_type}
          </span>
          <span className="veh-card__tag" style={{ background: "#F4F6F5", color: "#4A6358" }}>
            {v.seating_capacity} pl.
          </span>
        </div>

        {/* Barre usure */}
        <div className="veh-card__footer">
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
              <div className="veh-card__km">
                {Number(v.current_mileage || 0).toLocaleString("fr-FR")}
                <span> km</span>
              </div>
              {!isHS && (
                <div style={{ fontSize: 10, color: barColor, fontWeight: 700 }}>
                  {pctUsure >= 90
                    ? "⚠️ Révision urgente"
                    : `${kmRestants.toLocaleString("fr-FR")} km avant révision`}
                </div>
              )}
            </div>
            {!isHS && (
              <div
                role="progressbar"
                aria-valuenow={pctUsure}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Usure depuis dernière révision : ${pctUsure}%`}
                style={{ height: 4, background: "#F0F4F2", borderRadius: 99, overflow: "hidden" }}
              >
                <div style={{
                  height: "100%", width: `${pctUsure}%`, borderRadius: 99,
                  background: pctUsure >= 90
                    ? "linear-gradient(90deg,#F87171,#DC2626)"
                    : pctUsure >= 70
                    ? "linear-gradient(90deg,#FCD34D,#D97706)"
                    : pctUsure >= 40
                    ? "linear-gradient(90deg,#60A5FA,#2563EB)"
                    : "linear-gradient(90deg,#4ADE80,#16A34A)",
                  transition: "width .6s ease",
                }} />
              </div>
            )}
          </div>
        </div>

        {/* Alertes échéances */}
        {v._alerts?.length > 0 && (
          <div className="veh-card__alerts" aria-label="Alertes">
            {v._alerts.slice(0, 2).map((a, i) => (
              <div key={i} className={`veh-card__alert veh-card__alert--${a.level}`}>
                <span aria-hidden="true">{a.level === "danger" ? "🔴" : "🟡"}</span> {a.label}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="veh-card__actions">
          <button
            className="veh-card__btn veh-card__btn--detail"
            onClick={e => { e.stopPropagation(); onDetail(v); }}
            aria-label={`Voir la fiche de ${v.make} ${v.model}`}
          >📋 Fiche</button>
          <button
            className="veh-card__btn veh-card__btn--edit"
            onClick={e => { e.stopPropagation(); onEdit(v); }}
            aria-label={`Modifier ${v.make} ${v.model}`}
          >✏️ Modifier</button>
          <button
            className="veh-card__btn veh-card__btn--delete"
            disabled={deleting === v.id}
            onClick={e => { e.stopPropagation(); onDelete(v); }}
            aria-label={`Supprimer ${v.make} ${v.model}`}
          >
            {deleting === v.id ? "⟳" : "🗑️"}
          </button>
        </div>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. FICHE DÉTAIL VÉHICULE (modal)
// ─────────────────────────────────────────────────────────────────────────────

function VehicleDetailModal({ v, onClose, onEdit }) {
  const photoUrl   = getPhotoUrl(v);
  const catInfo    = VEHICLE_CATEGORIES.find(([c]) => c === v.category);
  const asgnMeta   = ASGN_META[getAssignmentType(v)] || ASGN_META.POOL;
  const statusMeta = STATUS_META[v.status] || STATUS_META.DISPONIBLE;

  // Raccourci clavier
  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const kmDepuis   = v.km_since_maintenance ?? (Number(v.current_mileage || 0) % KM_REVISION);
  const pctUsure   = Math.min(Math.round(kmDepuis / KM_REVISION * 100), 100);
  const barColor   = pctUsure >= 90 ? "#DC2626" : pctUsure >= 70 ? "#D97706" : pctUsure >= 40 ? "#2563EB" : "#16A34A";

  const Stat = ({ label, value, accent }) => (
    <div style={{ background: "#F7FAF8", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 10, color: "#8EA99A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: accent || "#1A2820" }}>{value || "—"}</div>
    </div>
  );

  return (
    <div
      className="veh-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      aria-modal="true"
    >
      <div
        role="dialog"
        aria-labelledby="detail-title"
        style={{ background: "#fff", borderRadius: 20, width: "min(820px, 95vw)", maxHeight: "90vh", overflowY: "auto", position: "relative" }}
      >
        {/* Header avec photo */}
        <div style={{ position: "relative", height: 200, background: "#EAF4EE", borderRadius: "20px 20px 0 0", overflow: "hidden" }}>
          {photoUrl
            ? <img src={photoUrl} alt={`${v.make} ${v.model}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80 }}>{catInfo?.[2] ?? "🚗"}</div>
          }
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,.6))" }} />
          <div style={{ position: "absolute", bottom: 16, left: 20, right: 60 }}>
            <div id="detail-title" style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-.5px" }}>{v.make} {v.model}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.8)", marginTop: 2 }}>{v.registration_number} · {v.year}</div>
          </div>
          <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 8 }}>
            <span style={{ padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: statusMeta.bg, color: statusMeta.color }}>{statusMeta.label}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer la fiche"
            style={{ position: "absolute", top: 12, right: 12, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,.5)", color: "#fff", border: "none", fontSize: 16, cursor: "pointer", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}
          >✕</button>
        </div>

        <div style={{ padding: "24px 28px" }}>

          {/* Alertes */}
          {v._alerts?.length > 0 && (
            <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {v._alerts.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: a.level === "danger" ? "#FDF0F1" : "#FFFBEB", border: `1px solid ${a.level === "danger" ? "#FECDD3" : "#FDE68A"}` }}>
                  <span style={{ fontSize: 16 }}>{a.level === "danger" ? "🔴" : "🟡"}</span>
                  <div style={{ fontSize: 12, fontWeight: 700, color: a.level === "danger" ? "#BE123C" : "#92400E" }}>{a.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Affectation */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: asgnMeta.bg, border: `1px solid ${asgnMeta.color}22`, marginBottom: 20 }}>
            <span style={{ fontSize: 20 }}>{asgnMeta.icon}</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: asgnMeta.color, textTransform: "uppercase", letterSpacing: "1px" }}>{asgnMeta.label}</div>
              {v.assigned_director && <div style={{ fontSize: 12, color: "#4A6358", marginTop: 2 }}>Assigné à : {v.assigned_director}</div>}
            </div>
          </div>

          {/* Barre usure kilométrique */}
          <div style={{ marginBottom: 20, padding: "14px 16px", background: "#F7FAF8", borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#4A6358" }}>Usure depuis révision</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>{pctUsure}%</span>
            </div>
            <div style={{ height: 8, background: "#E8EDEB", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pctUsure}%`, borderRadius: 99, background: barColor, transition: "width .6s ease" }} />
            </div>
            <div style={{ fontSize: 11, color: "#8EA99A", marginTop: 6 }}>
              {Number(kmDepuis).toLocaleString("fr-FR")} km parcourus · {Math.max(KM_REVISION - kmDepuis, 0).toLocaleString("fr-FR")} km avant prochaine révision
            </div>
          </div>

          {/* Grille de statistiques */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 20 }}>
            <Stat label="Kilométrage"      value={`${Number(v.current_mileage || 0).toLocaleString("fr-FR")} km`} />
            <Stat label="Carburant"        value={FUEL_TYPES.find(([k]) => k === v.fuel_type)?.[1] || v.fuel_type} />
            <Stat label="Transmission"     value={v.transmission} />
            <Stat label="Places"           value={`${v.seating_capacity} places`} />
            <Stat label="Réservoir"        value={v.fuel_tank_capacity ? `${v.fuel_tank_capacity} L` : null} />
            <Stat label="Couleur"          value={v.color} />
            <Stat label="Type"             value={v.vehicle_type} />
            {v.purchase_date && <Stat label="Date d'achat" value={new Date(v.purchase_date).toLocaleDateString("fr-FR")} />}
            {v.purchase_price && <Stat label="Prix d'achat" value={`${Number(v.purchase_price).toLocaleString("fr-FR")} FCFA`} />}
            {v.vin_number && <Stat label="N° VIN" value={v.vin_number} />}
          </div>

          {/* Notes */}
          {v.notes && (
            <div style={{ padding: "14px 16px", background: "#FFFBEB", borderRadius: 10, border: "1px solid #FDE68A", marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#92400E", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>📝 Notes</div>
              <div style={{ fontSize: 13, color: "#1A2820", lineHeight: 1.6 }}>{v.notes}</div>
            </div>
          )}

          {/* Action */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 16, borderTop: "1px solid #E8EDEB" }}>
            <button onClick={onClose} className="veh-btn-ghost">Fermer</button>
            <button onClick={() => { onClose(); onEdit(v); }} style={{ ...S.btn, display: "flex", alignItems: "center", gap: 6 }}>✏️ Modifier ce véhicule</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. ICÔNES SVG
// ─────────────────────────────────────────────────────────────────────────────

const IconGrid = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
);

const IconList = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

const IconSort = ({ dir }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    {dir === "asc"  && <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="6 11 12 5 18 11"/></>}
    {dir === "desc" && <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="6 13 12 19 18 13"/></>}
    {!dir           && <><polyline points="6 9 12 4 18 9"/><polyline points="6 15 12 20 18 15"/></>}
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// 10. CALCUL DES ALERTES D'ÉCHÉANCES
// ─────────────────────────────────────────────────────────────────────────────

function computeAlerts(v) {
  const alerts = [];
  const today  = new Date();
  const diffDays = dateStr => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return Math.ceil((d - today) / (1000 * 60 * 60 * 24));
  };

  const checks = [
    { key: "insurance_expiry",  label: "Assurance"          },
    { key: "technical_control", label: "Contrôle technique" },
    { key: "vignette_expiry",   label: "Vignette"           },
  ];

  checks.forEach(({ key, label }) => {
    const d = diffDays(v[key]);
    if (d === null) return;
    if (d < 0)      alerts.push({ label: `${label} expirée`, level: "danger" });
    else if (d <= 7) alerts.push({ label: `${label} expire dans ${d} j`, level: "danger" });
    else if (d <= 30) alerts.push({ label: `${label} expire dans ${d} j`, level: "warning" });
  });

  const kmDepuis = v.km_since_maintenance ?? (Number(v.current_mileage || 0) % KM_REVISION);
  const pct = Math.round(kmDepuis / KM_REVISION * 100);
  if (pct >= 95) alerts.push({ label: "Révision dépassée", level: "danger" });
  else if (pct >= 80) alerts.push({ label: `Révision dans ${(KM_REVISION - kmDepuis).toLocaleString("fr-FR")} km`, level: "warning" });

  return alerts;
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. CSS EMBARQUÉ (module-scoped, BEM, dark-mode ready)
// ─────────────────────────────────────────────────────────────────────────────

const VEHICLES_CSS = `
  @keyframes veh-spin     { to { transform: rotate(360deg); } }
  @keyframes veh-toast-in { from{opacity:0;transform:translateX(100%) scale(.9)} to{opacity:1;transform:translateX(0) scale(1)} }
  @keyframes veh-toast-out{ from{opacity:1;transform:translateX(0) scale(1);max-height:200px} to{opacity:0;transform:translateX(60px) scale(.9);max-height:0} }
  @keyframes veh-shimmer  { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes veh-slide-up { from{opacity:0;transform:translateY(20px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes veh-fade-in  { from{opacity:0} to{opacity:1} }

  /* ── OVERLAY ── */
  .veh-overlay {
    position:fixed; inset:0; background:rgba(0,0,0,.55);
    backdrop-filter:blur(4px); z-index:8000;
    display:flex; align-items:center; justify-content:center;
    animation:veh-fade-in .15s ease;
  }
  .veh-confirm-box {
    background:#fff; border-radius:16px; padding:28px 32px;
    max-width:420px; width:90%;
    box-shadow:0 24px 60px rgba(0,0,0,.25);
    animation:veh-slide-up .2s cubic-bezier(.34,1.56,.64,1);
  }

  /* ── TOASTS ── */
  .veh-toast {
    display:flex; align-items:flex-start; gap:12px; padding:14px 18px;
    border-radius:12px; min-width:300px; max-width:420px;
    box-shadow:0 8px 32px rgba(0,0,0,.18); pointer-events:all;
    animation:veh-toast-in .3s cubic-bezier(.34,1.56,.64,1) forwards;
    position:relative; overflow:hidden;
  }
  .veh-toast--out { animation:veh-toast-out .25s ease forwards; }
  .veh-toast::before { content:''; position:absolute; left:0; top:0; bottom:0; width:4px; border-radius:12px 0 0 12px; }
  .veh-toast--success { background:#F0FDF4; border:1px solid #BBF7D0; } .veh-toast--success::before { background:#16A34A; }
  .veh-toast--error   { background:#FFF1F2; border:1px solid #FECDD3; } .veh-toast--error::before   { background:#E11D48; }
  .veh-toast--warning { background:#FFFBEB; border:1px solid #FDE68A; } .veh-toast--warning::before { background:#D97706; }
  .veh-toast--info    { background:#EFF6FF; border:1px solid #BFDBFE; } .veh-toast--info::before    { background:#2563EB; }
  .veh-toast__icon  { font-size:18px; flex-shrink:0; margin-top:1px; }
  .veh-toast__body  { flex:1; }
  .veh-toast__title { font-size:13px; font-weight:700; margin-bottom:2px; }
  .veh-toast--success .veh-toast__title { color:#15803D; }
  .veh-toast--error   .veh-toast__title { color:#BE123C; }
  .veh-toast--warning .veh-toast__title { color:#92400E; }
  .veh-toast--info    .veh-toast__title { color:#1D4ED8; }
  .veh-toast__msg   { font-size:12px; color:#4B5563; line-height:1.5; }
  .veh-toast__close { background:none; border:none; cursor:pointer; font-size:14px; color:#9CA3AF; padding:0; flex-shrink:0; }
  .veh-toast__bar   { position:absolute; bottom:0; left:0; height:3px; width:100%; animation:veh-toast-out 4.5s linear forwards; opacity:.4; }
  .veh-toast--success .veh-toast__bar { background:#16A34A; }
  .veh-toast--error   .veh-toast__bar { background:#E11D48; }
  .veh-toast--warning .veh-toast__bar { background:#D97706; }
  .veh-toast--info    .veh-toast__bar { background:#2563EB; }

  /* ── CARTES ── */
  .veh-card {
    background:#fff; border-radius:16px; overflow:hidden;
    border:1.5px solid #E8EDEB;
    transition:transform .22s cubic-bezier(.4,0,.2,1), box-shadow .22s, border-color .22s;
    position:relative; display:flex; flex-direction:column;
  }
  .veh-card:not(.veh-card--hs):hover { transform:translateY(-4px); box-shadow:0 16px 40px rgba(27,94,55,.13); border-color:#1B5E37; }
  .veh-card--hs { opacity:.72; filter:grayscale(55%); border-color:#CBD5CE !important; background:#F7F9F8; }
  .veh-card--hs:hover { transform:none !important; box-shadow:none !important; border-color:#9EAF9F !important; }

  /* Skeleton */
  .veh-card--skeleton { pointer-events:none; }
  .veh-skel {
    border-radius:6px;
    background: linear-gradient(90deg, #E8EDEB 25%, #F4F6F5 50%, #E8EDEB 75%);
    background-size:200% 100%;
    animation:veh-shimmer 1.4s ease infinite;
  }
  .veh-skel--img { height:160px; border-radius:0; }

  .veh-card__imgwrap { overflow:hidden; position:relative; height:160px; flex-shrink:0; }
  .veh-card__img     { width:100%; height:160px; object-fit:cover; display:block; transition:transform .3s ease; }
  .veh-card:not(.veh-card--hs):hover .veh-card__img { transform:scale(1.04); }
  .veh-card__placeholder {
    width:100%; height:160px; display:flex; align-items:center; justify-content:center;
    background:linear-gradient(135deg,#EAF4EE 0%,#F4F6F5 100%); font-size:52px;
  }
  .veh-card__badge-asgn {
    position:absolute; top:10px; left:10px; padding:3px 9px; border-radius:99px;
    font-size:10px; font-weight:700; backdrop-filter:blur(8px);
    display:flex; align-items:center; gap:4px;
  }
  .veh-card__hs-ribbon {
    position:absolute; bottom:10px; left:50%; transform:translateX(-50%);
    background:#6B7280; color:#fff; font-size:9px; font-weight:800;
    letter-spacing:1.5px; text-transform:uppercase;
    padding:3px 12px; border-radius:99px; white-space:nowrap;
  }

  .veh-card__body   { padding:14px 16px 16px; flex:1; display:flex; flex-direction:column; }
  .veh-card__title  { font-size:15px; font-weight:800; color:#1A2820; letter-spacing:-.3px; margin-bottom:2px; }
  .veh-card--hs .veh-card__title { color:#6B7280; }
  .veh-card__sub    { font-size:11px; color:#8EA99A; margin-bottom:10px; font-weight:500; }
  .veh-card__tags   { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px; }
  .veh-card__tag    { padding:3px 9px; border-radius:6px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; }
  .veh-card__footer { margin-top:auto; padding-top:10px; }
  .veh-card__km     { font-size:12px; color:#4A6358; font-weight:600; }
  .veh-card__km span{ font-size:10px; color:#8EA99A; font-weight:400; }

  .veh-card__alerts { display:flex; flex-direction:column; gap:4px; margin-top:8px; }
  .veh-card__alert  { display:flex; align-items:center; gap:5px; font-size:10px; font-weight:700; padding:4px 8px; border-radius:6px; }
  .veh-card__alert--danger  { background:#FDF0F1; color:#BE123C; }
  .veh-card__alert--warning { background:#FFFBEB; color:#92400E; }

  .veh-card__actions { display:flex; gap:6px; margin-top:10px; opacity:0; transition:opacity .18s; }
  .veh-card:hover .veh-card__actions { opacity:1; }
  .veh-card__btn  { padding:5px 10px; border:none; border-radius:7px; font-size:11px; font-weight:700; cursor:pointer; font-family:inherit; transition:all .12s; flex:1; }
  .veh-card__btn--detail { background:#F0FDF4; color:#15803D; }
  .veh-card__btn--edit   { background:#EFF6FF; color:#1D4ED8; }
  .veh-card__btn--delete { background:#FDF0F1; color:#C0182A; }

  /* ── TABLEAU ── */
  .tr-row-veh:hover td { background:#FAFBFA; }
  .tr-row-veh td { transition:background .12s; }
  .tr-hors-service td { background:#F7F9F8 !important; color:#9CA3AF; }
  .tr-hors-service td b, .tr-hors-service td span { color:#9CA3AF !important; }

  /* En-têtes triables */
  .veh-th-sort { cursor:pointer; user-select:none; white-space:nowrap; }
  .veh-th-sort:hover { color:#1B5E37; background:#F0FDF4; }

  /* ── STAT CARDS ── */
  .veh-stat-card {
    padding:14px 18px; border-radius:12px; cursor:pointer;
    transition:all .18s; flex:1; min-width:150px;
  }
  .veh-stat-card:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(0,0,0,.08); }

  /* ── TOGGLE VUE ── */
  .veh-view-btn {
    width:36px; height:36px; border-radius:9px; border:1.5px solid #E2E8E5;
    background:#fff; display:flex; align-items:center; justify-content:center;
    cursor:pointer; transition:all .15s; color:#8EA99A;
  }
  .veh-view-btn--active { background:#1B5E37; border-color:#1B5E37; color:#fff; }
  .veh-view-btn:not(.veh-view-btn--active):hover { background:#EAF4EE; color:#1B5E37; border-color:#1B5E37; }

  /* ── BOUTONS EXPORT ── */
  .veh-export-btn {
    display:flex; align-items:center; gap:6px;
    padding:7px 14px; border-radius:8px; font-size:12px; font-weight:700;
    cursor:pointer; font-family:inherit; border:1.5px solid; transition:all .15s;
  }
  .veh-export-btn:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(0,0,0,.1); }
  .veh-export-btn--pdf   { background:#F0FDF4; color:#15803D; border-color:#BBF7D0; }
  .veh-export-btn--excel { background:#F0FDF4; color:#15803D; border-color:#BBF7D0; }

  /* ── BOUTON GHOST ── */
  .veh-btn-ghost {
    padding:8px 16px; border:1.5px solid #E2E8E5; border-radius:9px;
    background:#fff; color:#4A6358; font-size:13px; font-weight:700;
    cursor:pointer; font-family:inherit; transition:all .12s;
  }
  .veh-btn-ghost:hover { background:#F4F6F5; border-color:#CBD5CE; }

  /* ── FORMULAIRE ── */
  .veh-field-err { font-size:10px; color:#E11D48; font-weight:600; margin-top:3px; display:flex; align-items:center; gap:3px; }
  .veh-notes-textarea {
    width:100%; resize:vertical; font-family:inherit; font-size:12px;
    padding:10px 12px; border:1.5px solid #E2E8E5; border-radius:7px;
    color:#1A2820; background:#fff; min-height:88px; line-height:1.6;
    outline:none; box-sizing:border-box; transition:border-color .15s, box-shadow .15s;
  }
  .veh-notes-textarea:focus { border-color:#1B5E37; box-shadow:0 0 0 3px rgba(27,94,55,.1); }
  .veh-notes-textarea::placeholder { color:#B0BDB8; }

  /* ── PAGINATION ── */
  .veh-page-btn {
    width:34px; height:34px; border-radius:8px; border:1.5px solid #E2E8E5;
    background:#fff; color:#4A6358; font-size:13px; font-weight:700;
    cursor:pointer; display:flex; align-items:center; justify-content:center;
    transition:all .12s; font-family:inherit;
  }
  .veh-page-btn:hover:not(:disabled) { background:#EAF4EE; border-color:#1B5E37; color:#1B5E37; }
  .veh-page-btn--active { background:#1B5E37; border-color:#1B5E37; color:#fff; }
  .veh-page-btn:disabled { opacity:.4; cursor:not-allowed; }

  /* ── DATE / TIME ── */
  input[type="date"], input[type="time"] { color-scheme:light; color:#1A2820 !important; background:#fff !important; }
  input[type="date"]::-webkit-calendar-picker-indicator,
  input[type="time"]::-webkit-calendar-picker-indicator { filter:invert(25%) sepia(40%) saturate(400%) hue-rotate(120deg); cursor:pointer; opacity:.8; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// 12. TAB VEHICULES (composant principal)
// ─────────────────────────────────────────────────────────────────────────────

export function TabVehicules({ vehicles: rawVehicles, onRefresh, loading: externalLoading }) {
  const toast = useToast();

  // ── État ──
  const [search,     setSearch]     = useState("");
  const [filterSt,   setFilterSt]   = useState("");
  const [filterCat,  setFilterCat]  = useState("");
  const [filterAsgn, setFilterAsgn] = useState("");
  const [showForm,   setShowForm]   = useState(false);
  const [editVeh,    setEditVeh]    = useState(null);
  const [detailVeh,  setDetailVeh]  = useState(null);
  const [deleting,   setDeleting]   = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [formErr,    setFormErr]    = useState("");
  const [photoView,  setPhotoView]  = useState(null);
  const [directors,  setDirectors]  = useState([]);
  const [viewMode,   setViewMode]   = useState("grid");
  const [confirmDel, setConfirmDel] = useState(null);
  const [page,       setPage]       = useState(1);
  const [exportingXlsx, setExportingXlsx] = useState(false);

  // Tri tableau
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  // ── Chargement directors ──
  useEffect(() => {
    apiFetch("/auth/users/?role=PERSONNEL&personnel_type=DIRECTEUR")
      .then(r => setDirectors(Array.isArray(r) ? r : r?.results ?? []))
      .catch(() => {});
  }, []);

  // ── Raccourcis clavier globaux ──
  useEffect(() => {
    const handler = e => {
      if (e.key === "Escape" && !showForm && !detailVeh && !confirmDel && !photoView) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        document.getElementById("veh-search")?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showForm, detailVeh, confirmDel, photoView]);

  // ── Enrichissement avec alertes ──
  const vehicles = (rawVehicles || []).map(v => ({ ...v, _alerts: computeAlerts(v) }));

  // ── Filtrage ──
  const filtered = vehicles.filter(v => {
    const q  = search.toLowerCase();
    const ms = !q || [v.registration_number, v.make, v.model, v.internal_code, v.assigned_director]
      .some(x => (x || "").toLowerCase().includes(q));
    return ms
      && (!filterSt   || v.status === filterSt)
      && (!filterCat  || v.category === filterCat)
      && (!filterAsgn || getAssignmentType(v) === filterAsgn);
  });

  // ── Tri ──
  const sorted = [...filtered].sort((a, b) => {
    if (!sortKey) return 0;
    let va = a[sortKey]; let vb = b[sortKey];
    if (typeof va === "string") va = va.toLowerCase();
    if (typeof vb === "string") vb = vb.toLowerCase();
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1  : -1;
    return 0;
  });

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSort = key => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };

  // Reset page sur filtre
  useEffect(() => { setPage(1); }, [search, filterSt, filterCat, filterAsgn]);

  // ── Actions formulaire ──
  const openAdd  = () => { setEditVeh(null); setShowForm(true); setFormErr(""); };
  const openEdit = v  => { setEditVeh(v);   setShowForm(true); setFormErr(""); };
  const closeForm = () => { setShowForm(false); setEditVeh(null); setFormErr(""); };

  const handleSave = async (data, photoFile, busRoute) => {
    setSaving(true); setFormErr("");
    try {
      let saved;
      if (editVeh) { saved = await apiFetch(`/vehicles/${editVeh.id}/`, { method: "PATCH", body: JSON.stringify(data) }); }
      else         { saved = await apiFetch("/vehicles/", { method: "POST",  body: JSON.stringify(data) }); }

      if (photoFile && saved?.id) {
        const fd = new FormData(); fd.append("photo", photoFile);
        await apiUpload(`/vehicles/${saved.id}/`, fd, "PATCH");
      }
      if (data.assignment_type === "BUS_SCOLAIRE" && busRoute?.nom_trajet && saved?.id) {
        try { await apiFetch("/vehicles/bus-routes/", { method: "POST", body: JSON.stringify({ ...busRoute, vehicle: saved.id }) }); }
        catch (e) { console.warn("Bus route non créée :", e.message); }
      }
      closeForm();
      await onRefresh();
      toast({ type: "success", title: editVeh ? "Véhicule modifié ✓" : "Véhicule ajouté ✓", message: `${data.make} ${data.model} (${data.registration_number}) a été ${editVeh ? "mis à jour" : "ajouté au parc"}.` });
    } catch (e) {
      const msg = parseApiError(e.message || e.toString(), editVeh ? "modification" : "ajout");
      setFormErr(msg);
      toast({ type: "error", title: "Erreur lors de l'enregistrement", message: msg });
    } finally { setSaving(false); }
  };

  const handleDeleteRequest = v => setConfirmDel({ id: v.id, make: v.make, model: v.model, plate: v.registration_number });

  const handleDeleteConfirm = async () => {
    if (!confirmDel) return;
    setDeleting(confirmDel.id);
    try {
      await apiFetch(`/vehicles/${confirmDel.id}/`, { method: "DELETE" });
      setConfirmDel(null);
      await onRefresh();
      toast({ type: "success", title: "Véhicule supprimé", message: `${confirmDel.make} ${confirmDel.model} (${confirmDel.plate}) a été retiré du parc.` });
    } catch (e) {
      const msg = parseApiError(e.message || e.toString(), "suppression");
      setConfirmDel(null);
      toast({ type: "error", title: "Impossible de supprimer ce véhicule", message: msg });
    } finally { setDeleting(null); }
  };

  const handleExcelExport = async () => {
    setExportingXlsx(true);
    try { await exportExcel(filtered); }
    catch (e) { toast({ type: "error", title: "Export Excel échoué", message: e.message }); }
    finally { setExportingXlsx(false); }
  };

  // ── Statistiques ──
  const pool        = vehicles.filter(v => getAssignmentType(v) === "POOL");
  const fonction    = vehicles.filter(v => getAssignmentType(v) === "FONCTION");
  const busScolaire = vehicles.filter(v => getAssignmentType(v) === "BUS_SCOLAIRE");
  const alertCount  = vehicles.filter(v => v._alerts?.some(a => a.level === "danger")).length;

  // ── Colonnes tableau ──
  const TABLE_COLS = [
    { key: null,                label: "Photo",          sortable: false },
    { key: "registration_number", label: "Immatriculation", sortable: true  },
    { key: "internal_code",     label: "Code",           sortable: true  },
    { key: "assignment_type",   label: "Affectation",    sortable: true  },
    { key: "category",          label: "Catégorie",      sortable: true  },
    { key: "make",              label: "Marque / Modèle",sortable: true  },
    { key: "fuel_type",         label: "Carburant",      sortable: true  },
    { key: "seating_capacity",  label: "Places",         sortable: true  },
    { key: "current_mileage",   label: "Kilométrage",    sortable: true  },
    { key: "status",            label: "Statut",         sortable: true  },
    { key: null,                label: "Actions",        sortable: false },
  ];

  return (
    <>
      <style>{VEHICLES_CSS}</style>

      {/* ── MODALS ── */}
      {confirmDel && (
        <ConfirmDialog
          title="Supprimer ce véhicule ?"
          message={<span>Vous êtes sur le point de supprimer <b>{confirmDel.make} {confirmDel.model}</b> ({confirmDel.plate}).<br/>Cette action est <b>irréversible</b>.</span>}
          confirmLabel="Oui, supprimer définitivement"
          loading={deleting === confirmDel.id}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {photoView && (
        <div
          className="veh-overlay"
          onClick={() => setPhotoView(null)}
          role="dialog"
          aria-label="Vue agrandie de la photo"
          aria-modal="true"
        >
          <div style={{ position: "relative" }}>
            <img src={photoView} alt="Photo du véhicule" style={{ maxWidth: "80vw", maxHeight: "80vh", borderRadius: 16, objectFit: "contain", display: "block", boxShadow: "0 24px 80px rgba(0,0,0,.5)" }} />
            <button
              onClick={() => setPhotoView(null)}
              aria-label="Fermer la photo"
              style={{ position: "absolute", top: -14, right: -14, width: 34, height: 34, borderRadius: "50%", background: "#C0182A", color: "#fff", border: "none", fontSize: 16, cursor: "pointer", fontWeight: 800 }}
            >✕</button>
          </div>
        </div>
      )}

      {showForm && (
        <VehiculeModal
          initial={editVeh}
          directors={directors}
          onSave={handleSave}
          onClose={closeForm}
          saving={saving}
          error={formErr}
        />
      )}

      {detailVeh && (
        <VehicleDetailModal
          v={detailVeh}
          onClose={() => setDetailVeh(null)}
          onEdit={v => { setDetailVeh(null); openEdit(v); }}
        />
      )}

      <div style={S.section}>

        {/* ── BANNIÈRE ALERTES GLOBALES ── */}
        {alertCount > 0 && (
          <div
            role="alert"
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#FDF0F1", border: "1.5px solid #FECDD3", borderRadius: 12, marginBottom: 16 }}
          >
            <span style={{ fontSize: 20 }}>🔴</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#BE123C" }}>
                {alertCount} véhicule{alertCount > 1 ? "s" : ""} nécessite{alertCount > 1 ? "nt" : ""} une attention urgente
              </div>
              <div style={{ fontSize: 11, color: "#9F1239", marginTop: 2 }}>
                Assurance expirée, contrôle technique dépassé ou révision urgente.
              </div>
            </div>
          </div>
        )}

        {/* ── STAT CARDS ── */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }} role="list" aria-label="Statistiques du parc">
          {[
            { id: "POOL", icon: "🚗", label: "Parc commun", count: pool.filter(v => v.status === "DISPONIBLE").length, total: pool.length, sub: "disponibles", color: "#1B5E37", bg: "#EAF4EE" },
            { id: "FONCTION", icon: "🎖️", label: "Voitures de fonction", count: fonction.length, total: null, sub: "assignées", color: "#7C3AED", bg: "#F5F3FF" },
            { id: "BUS_SCOLAIRE", icon: "🚌", label: "Bus scolaires", count: busScolaire.length, total: null, sub: "ramassage matin", color: "#1D4ED8", bg: "#EFF6FF" },
          ].map(card => (
            <div
              key={card.id}
              className="veh-stat-card"
              role="listitem"
              tabIndex={0}
              aria-label={`${card.label} : ${card.count}${card.total !== null ? "/" + card.total : ""} ${card.sub}`}
              aria-pressed={filterAsgn === card.id}
              onClick={() => setFilterAsgn(filterAsgn === card.id ? "" : card.id)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFilterAsgn(filterAsgn === card.id ? "" : card.id); } }}
              style={{ background: filterAsgn === card.id ? card.bg : "#fff", border: `1.5px solid ${filterAsgn === card.id ? card.color : "#E8EDEB"}` }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: card.color, textTransform: "uppercase", letterSpacing: "1px" }}>
                  <span aria-hidden="true">{card.icon}</span> {card.label}
                </div>
                {filterAsgn === card.id && (
                  <button
                    onClick={e => { e.stopPropagation(); setFilterAsgn(""); }}
                    aria-label="Supprimer le filtre"
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: card.color, fontWeight: 800 }}
                  >✕</button>
                )}
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#1A2820", lineHeight: 1 }}>
                {card.count}
                {card.total !== null && <span style={{ fontSize: 13, color: "#8EA99A", fontWeight: 500 }}>/{card.total}</span>}
              </div>
              <div style={{ fontSize: 10, color: card.color, fontWeight: 600, marginTop: 4 }}>{card.sub}</div>
            </div>
          ))}

          {VEHICLE_CATEGORIES.map(([cat, label, icon]) => {
            const t = vehicles.filter(v => v.category === cat).length;
            const d = vehicles.filter(v => v.category === cat && v.status === "DISPONIBLE").length;
            return (
              <div
                key={cat}
                className="veh-stat-card"
                role="listitem"
                tabIndex={0}
                aria-label={`${label} : ${d}/${t} disponibles`}
                aria-pressed={filterCat === cat}
                onClick={() => { setFilterCat(filterCat === cat ? "" : cat); setFilterAsgn(""); }}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFilterCat(filterCat === cat ? "" : cat); setFilterAsgn(""); } }}
                style={{ background: filterCat === cat ? "#EAF4EE" : "#fff", border: `1.5px solid ${filterCat === cat ? "#1B5E37" : "#E8EDEB"}` }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: "#8EA99A", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>
                  <span aria-hidden="true">{icon}</span> {label}
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#1A2820", lineHeight: 1 }}>
                  {d}<span style={{ fontSize: 12, color: "#8EA99A", fontWeight: 500 }}>/{t}</span>
                </div>
                <div style={{ fontSize: 10, color: "#1B5E37", fontWeight: 600, marginTop: 4 }}>disponibles</div>
              </div>
            );
          })}
        </div>

        {/* ── BARRE FILTRES ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {/* Recherche */}
            <div style={{ position: "relative" }}>
              <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#8EA99A" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                id="veh-search"
                placeholder="Rechercher… (Ctrl+F)"
                value={search}
                onChange={e => setSearch(e.target.value)}
                aria-label="Rechercher un véhicule"
                style={{ ...S.search, paddingLeft: 32, width: 220 }}
              />
            </div>

            {/* Filtre statut */}
            <select
              value={filterSt}
              onChange={e => setFilterSt(e.target.value)}
              aria-label="Filtrer par statut"
              style={{ ...S.search, width: 145 }}
            >
              <option value="">Tous statuts</option>
              {VEHICLE_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>

            {/* Filtre affectation actif */}
            {filterAsgn && (() => {
              const m = ASGN_META[filterAsgn];
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: m.bg, color: m.color }}>
                  <span aria-hidden="true">{m.icon}</span> {m.label}
                  <button
                    onClick={() => setFilterAsgn("")}
                    aria-label={`Supprimer le filtre ${m.label}`}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "inherit", fontWeight: 800, padding: "0 0 0 4px" }}
                  >✕</button>
                </div>
              );
            })()}

            <span style={{ fontSize: 12, color: "#8EA99A", fontWeight: 500 }} aria-live="polite" aria-atomic="true">
              {filtered.length} véhicule{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {/* Export PDF */}
            <button
              className="veh-export-btn veh-export-btn--pdf"
              onClick={() => exportPDF(filtered)}
              aria-label="Exporter la liste en PDF"
            >📄 PDF</button>

            {/* Export Excel */}
            <button
              className="veh-export-btn veh-export-btn--excel"
              onClick={handleExcelExport}
              disabled={exportingXlsx}
              aria-label="Exporter la liste en Excel"
            >
              {exportingXlsx ? "⟳" : "📊"} Excel
            </button>

            {/* Toggle vue */}
            <div style={{ display: "flex", gap: 4, background: "#F4F6F5", padding: 3, borderRadius: 10 }} role="group" aria-label="Mode d'affichage">
              <button
                className={`veh-view-btn${viewMode === "grid" ? " veh-view-btn--active" : ""}`}
                onClick={() => setViewMode("grid")}
                aria-label="Vue grille"
                aria-pressed={viewMode === "grid"}
              ><IconGrid /></button>
              <button
                className={`veh-view-btn${viewMode === "table" ? " veh-view-btn--active" : ""}`}
                onClick={() => setViewMode("table")}
                aria-label="Vue liste"
                aria-pressed={viewMode === "table"}
              ><IconList /></button>
            </div>

            <button onClick={openAdd} style={S.btn} aria-label="Ajouter un nouveau véhicule">
              <span aria-hidden="true" style={{ fontSize: 16, marginRight: 4 }}>+</span> Ajouter un véhicule
            </button>
          </div>
        </div>

        {/* ── CONTENU ── */}
        {externalLoading
          ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )
          : filtered.length === 0
            ? <Empty text="Aucun véhicule trouvé" />
            : (
              <>
                {viewMode === "grid" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
                    {paginated.map(v => (
                      <VehicleCard
                        key={v.id} v={v}
                        onEdit={openEdit}
                        onDelete={handleDeleteRequest}
                        onPhotoView={setPhotoView}
                        onDetail={setDetailVeh}
                        deleting={deleting}
                      />
                    ))}
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={S.table} aria-label="Liste des véhicules">
                      <thead>
                        <tr>
                          {TABLE_COLS.map(col => (
                            <th
                              key={col.label}
                              style={S.th}
                              className={col.sortable ? "veh-th-sort" : ""}
                              onClick={col.sortable ? () => handleSort(col.key) : undefined}
                              aria-sort={col.sortable && sortKey === col.key ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                              scope="col"
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                {col.label}
                                {col.sortable && <IconSort dir={sortKey === col.key ? sortDir : null} />}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.map(v => {
                          const photoUrl = getPhotoUrl(v);
                          const catInfo  = VEHICLE_CATEGORIES.find(([c]) => c === v.category);
                          const asgnMeta = ASGN_META[getAssignmentType(v)] || ASGN_META.POOL;
                          const isHS     = v.status === "HORS_SERVICE";
                          return (
                            <tr key={v.id} className={`tr-row-veh${isHS ? " tr-hors-service" : ""}`}>
                              <td style={S.td}>
                                {photoUrl
                                  ? <img src={photoUrl} alt="" onClick={() => setPhotoView(photoUrl)} style={{ width: 52, height: 38, objectFit: "cover", borderRadius: 8, cursor: "pointer", border: `1px solid ${C.border}`, filter: isHS ? "grayscale(80%)" : "" }} />
                                  : <div style={{ width: 52, height: 38, borderRadius: 8, background: isHS ? "#E5E7EB" : "#EAF4EE", border: `1px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, opacity: isHS ? .5 : 1 }} aria-hidden="true">{catInfo?.[2] ?? "🚗"}</div>
                                }
                              </td>
                              <td style={S.td}><b style={{ color: isHS ? "#9CA3AF" : C.text, fontSize: 13 }}>{v.registration_number}</b></td>
                              <td style={S.td}><span style={{ ...S.typeBadge, opacity: isHS ? .6 : 1 }}>{v.internal_code}</span></td>
                              <td style={S.td}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: isHS ? "#F3F4F6" : asgnMeta.bg, color: isHS ? "#9CA3AF" : asgnMeta.color }}>
                                  <span aria-hidden="true">{isHS ? "🚫" : asgnMeta.icon}</span> {isHS ? "Immobilisé" : asgnMeta.label}
                                </span>
                                {v.assigned_director && <div style={{ fontSize: 10, color: C.textLight, marginTop: 2 }}>{v.assigned_director}</div>}
                              </td>
                              <td style={S.td}>
                                <span aria-hidden="true" style={{ fontSize: 16, opacity: isHS ? .4 : 1 }}>{catInfo?.[2]}</span>
                                <span style={{ fontSize: 11, color: isHS ? "#9CA3AF" : C.textMid, marginLeft: 4 }}>{catInfo?.[1] ?? v.category}</span>
                              </td>
                              <td style={S.td}>
                                <div style={{ fontWeight: 600, color: isHS ? "#9CA3AF" : C.text }}>{v.make} {v.model}</div>
                                <div style={{ fontSize: 10, color: C.textLight }}>{v.year} · {v.color}</div>
                              </td>
                              <td style={S.td}><span style={{ fontSize: 11, color: C.textMid }}>{FUEL_TYPES.find(([k]) => k === v.fuel_type)?.[1] || v.fuel_type}</span></td>
                              <td style={S.td}>{v.seating_capacity} pl.</td>
                              <td style={S.td}>
                                <span style={{ fontWeight: 600, color: isHS ? "#9CA3AF" : "inherit" }}>{Number(v.current_mileage || 0).toLocaleString("fr-FR")}</span>
                                <span style={{ fontSize: 10, color: C.textLight }}> km</span>
                                {v._alerts?.length > 0 && !isHS && <div style={{ fontSize: 9, color: "#C0182A", fontWeight: 700, marginTop: 2 }}>⚠️ {v._alerts.length} alerte{v._alerts.length > 1 ? "s" : ""}</div>}
                              </td>
                              <td style={S.td}>
                                {isHS
                                  ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: "#F3F4F6", color: "#6B7280" }}><span aria-hidden="true">🚫</span> Hors service</span>
                                  : <StatusBadge status={v.status} />
                                }
                              </td>
                              <td style={S.td}>
                                <div style={{ display: "flex", gap: 5 }}>
                                  <button onClick={() => setDetailVeh(v)} aria-label={`Fiche de ${v.make} ${v.model}`} style={{ padding: "4px 9px", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "#F0FDF4", color: "#15803D", fontFamily: "inherit" }}>📋</button>
                                  {photoUrl && <button onClick={() => setPhotoView(photoUrl)} aria-label="Voir la photo" style={{ padding: "4px 9px", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "#EAF4EE", color: C.green, fontFamily: "inherit" }}>👁</button>}
                                  <button onClick={() => openEdit(v)} aria-label={`Modifier ${v.make} ${v.model}`} style={{ padding: "4px 9px", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "#EFF6FF", color: C.blue, fontFamily: "inherit" }}>Modifier</button>
                                  <button onClick={() => handleDeleteRequest(v)} disabled={deleting === v.id} aria-label={`Supprimer ${v.make} ${v.model}`} style={{ padding: "4px 9px", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "#FDF0F1", color: C.red, fontFamily: "inherit", opacity: deleting === v.id ? .6 : 1 }}>
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
                )}

                {/* ── PAGINATION ── */}
                {totalPages > 1 && (
                  <nav aria-label="Pagination" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 20 }}>
                    <button
                      className="veh-page-btn"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      aria-label="Page précédente"
                    >‹</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                      .reduce((acc, p, i, arr) => {
                        if (i > 0 && p - arr[i - 1] > 1) acc.push("...");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === "..." ? (
                          <span key={`ellipsis-${i}`} style={{ fontSize: 13, color: "#8EA99A", padding: "0 4px" }}>…</span>
                        ) : (
                          <button
                            key={p}
                            className={`veh-page-btn${safePage === p ? " veh-page-btn--active" : ""}`}
                            onClick={() => setPage(p)}
                            aria-label={`Page ${p}`}
                            aria-current={safePage === p ? "page" : undefined}
                          >{p}</button>
                        )
                      )
                    }
                    <button
                      className="veh-page-btn"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      aria-label="Page suivante"
                    >›</button>
                    <span style={{ fontSize: 12, color: "#8EA99A", marginLeft: 4 }}>
                      {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} / {filtered.length}
                    </span>
                  </nav>
                )}
              </>
            )
        }
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. MODAL VÉHICULE (formulaire — refactorisé avec useVehicleForm)
// ─────────────────────────────────────────────────────────────────────────────

export function VehiculeModal({ initial, onSave, onClose, saving, error, directors }) {
  const toast   = useToast();
  const isEdit  = !!initial;
  const fileRef = useRef(null);

  const {
    form, setForm, set, setVal, touch,
    fieldErrors, setFieldErrors, touched, isDirty,
    validate, touchAll, buildPayload, clearDraft,
  } = useVehicleForm(initial);

  const [busLigne,      setBusLigne]      = useState(initial?.bus_route?.ligne || "A");
  const [busChauffeurs, setBusChauffeurs] = useState([]);
  const [photoFile,    setPhotoFile]      = useState(null);
  const [photoPreview, setPhotoPreview]   = useState(
    initial?.photo ? (initial.photo.startsWith("http") ? initial.photo : `${API_BASE}${initial.photo}`) : null
  );
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  useEffect(() => {
    if (!initial) {
      try {
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) { const d = JSON.parse(draft); if (d.make || d.registration_number) setShowDraftBanner(true); }
      } catch { /* rien */ }
    }
  }, []);

  useEffect(() => {
    apiFetch("/auth/users/?role=CHAUFFEUR")
      .then(r => {
        const all = Array.isArray(r) ? r : r?.results ?? [];
        setBusChauffeurs(all.filter(u => u.driver_profile?.assignment_type === "BUS_SCOLAIRE"));
      })
      .catch(() => {});
  }, []);

  // Raccourci Escape avec confirmation si modifié
  useEffect(() => {
    const handler = e => {
      if (e.key === "Escape") {
        if (isDirty && !window.confirm("Des modifications non enregistrées seront perdues. Fermer quand même ?")) return;
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSubmitRef.current?.(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isDirty]);

  const handlePhotoChange = e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ type: "warning", title: "Fichier trop volumineux", message: "La photo ne doit pas dépasser 5 Mo." });
      return;
    }
    setPhotoFile(file);
    const r = new FileReader(); r.onload = ev => setPhotoPreview(ev.target.result); r.readAsDataURL(file);
  };

  const handleClose = () => {
    if (isDirty && !window.confirm("Des modifications non enregistrées seront perdues. Fermer quand même ?")) return;
    onClose();
  };

  const handleSubmit = e => {
    e?.preventDefault();
    touchAll();
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast({ type: "warning", title: "Formulaire incomplet", message: `${Object.keys(errs).length} erreur(s) à corriger.` });
      return;
    }
    const clean = buildPayload();
    const routePayload = clean.assignment_type === "BUS_SCOLAIRE" ? {
      ligne: busLigne, nom_trajet: BUS_LIGNES[busLigne].nom_trajet,
      point_depart: BUS_LIGNES[busLigne].point_depart, point_arrivee: "IUC Logbessou",
      nb_tours: 2, jours_service: ["LUN","MAR","MER","JEU","VEN"], arrets: [],
    } : null;
    clearDraft();
    onSave(clean, photoFile, routePayload);
  };

  // Ref pour raccourci Ctrl+S
  const handleSubmitRef = useRef(handleSubmit);
  useEffect(() => { handleSubmitRef.current = handleSubmit; }, [handleSubmit]);

  const isFonction    = form.assignment_type === "FONCTION";
  const isBusScolaire = form.assignment_type === "BUS_SCOLAIRE";
  const isHorsService = form.status === "HORS_SERVICE";

  const inp = (key, extra = {}) => ({
    padding: "8px 12px",
    border: `1.5px solid ${touched[key] && fieldErrors[key] ? "#E11D48" : "#E2E8E5"}`,
    borderRadius: 7, fontSize: 12, fontFamily: "inherit", color: "#1A2820",
    background: touched[key] && fieldErrors[key] ? "#FFF8F8" : "#fff",
    width: "100%", outline: "none", boxSizing: "border-box", transition: "border-color .15s", ...extra,
  });
  const lbl = { fontSize: 10, fontWeight: 700, color: "#4A6358", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4, display: "block" };
  const ErrMsg = ({ field }) => touched[field] && fieldErrors[field]
    ? <div className="veh-field-err" role="alert"><span aria-hidden="true">⚠</span>{fieldErrors[field]}</div>
    : null;

  return (
    <div
      className="veh-overlay"
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
      aria-modal="true"
    >
      <div
        role="dialog"
        aria-labelledby="modal-title"
        style={M.modal}
      >
        {/* Header */}
        <div style={M.header}>
          <span id="modal-title" style={M.title}>
            {isEdit ? `Modifier — ${initial.registration_number}` : "Ajouter un véhicule"}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isDirty && !isEdit && (
              <span style={{ fontSize: 11, color: "#D97706", fontWeight: 600, background: "#FFFBEB", padding: "3px 8px", borderRadius: 6 }}>
                ● Brouillon en cours
              </span>
            )}
            <button onClick={handleClose} aria-label="Fermer le formulaire" style={M.closeBtn}>✕</button>
          </div>
        </div>

        {/* Bannière restauration brouillon */}
        {showDraftBanner && !isEdit && (
          <div style={{ background: "#FFFBEB", borderBottom: "1px solid #FDE68A", padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#92400E", fontWeight: 600 }}>📝 Un brouillon non enregistré a été restauré.</span>
            <button onClick={() => { clearDraft(); setForm(buildEmptyForm(null)); setShowDraftBanner(false); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#92400E", fontWeight: 700, textDecoration: "underline" }}>Effacer le brouillon</button>
          </div>
        )}

        {/* Bannière hors service */}
        {isEdit && isHorsService && (
          <div style={{ background: "#F3F4F6", borderBottom: "2px solid #9CA3AF", padding: "10px 16px", display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 20 }} aria-hidden="true">🚫</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#374151" }}>Ce véhicule est actuellement HORS SERVICE</div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>Changez le statut pour le remettre en service.</div>
            </div>
          </div>
        )}

        {/* Erreur API */}
        {error && (
          <div role="alert" style={{ background: "#FFF1F2", borderBottom: "1px solid #FECDD3", padding: "10px 16px", display: "flex", gap: 8, fontSize: 12, color: "#BE123C", alignItems: "flex-start" }}>
            <span aria-hidden="true" style={{ fontSize: 16 }}>⚠️</span>
            <div><b>Erreur :</b> {error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate style={M.body}>

          {/* ── PHOTO ── */}
          <div style={M.secTitle}>Photo du véhicule</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{ width: 120, height: 80, borderRadius: 10, overflow: "hidden", border: "1.5px dashed #E2E8E5", background: "#F4F6F5", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Cliquer pour choisir une photo"
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
            >
              {photoPreview
                ? <img src={photoPreview} alt="Aperçu de la photo" style={{ width: "100%", height: "100%", objectFit: "cover", filter: isHorsService ? "grayscale(60%)" : "" }} />
                : <div style={{ textAlign: "center", color: "#8EA99A" }}><div style={{ fontSize: 28 }} aria-hidden="true">📷</div><div style={{ fontSize: 10, marginTop: 4 }}>Cliquer</div></div>
              }
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button type="button" onClick={() => fileRef.current?.click()} style={{ ...S.btn, fontSize: 11, padding: "6px 14px" }}>{photoPreview ? "Changer" : "Téléverser"}</button>
              {photoPreview && (
                <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} className="veh-btn-ghost" style={{ fontSize: 11, padding: "6px 14px", color: "#C0182A", borderColor: "#fca5a5" }}>Supprimer</button>
              )}
              <div style={{ fontSize: 10, color: "#8EA99A" }}>JPG, PNG · max 5 Mo</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} aria-label="Choisir une photo de véhicule" />
          </div>

          {/* ── AFFECTATION ── */}
          <div style={M.secTitle}>Type d'affectation</div>
          <div style={{ display: "flex", gap: 10 }} role="group" aria-label="Type d'affectation">
            {[
              { val: "POOL",         icon: "🚗", label: "Parc commun",       desc: "Réservable pour les réservations" },
              { val: "FONCTION",     icon: "🎖️", label: "Voiture de fonction", desc: "Tourisme — assignée à un directeur" },
              { val: "BUS_SCOLAIRE", icon: "🚌", label: "Bus scolaire",       desc: "Bus — ramassage matin assigné" },
            ].map(({ val, icon, label, desc }) => (
              <button
                key={val}
                type="button"
                aria-pressed={form.assignment_type === val}
                onClick={() => setForm(f => ({
                  ...f,
                  assignment_type: val,
                  category:     val === "FONCTION" ? "TOURISME" : val === "BUS_SCOLAIRE" ? "BUS" : f.category,
                  vehicle_type: val === "FONCTION" ? "BERLINE"  : val === "BUS_SCOLAIRE" ? "MINIBUS" : f.vehicle_type,
                }))}
                style={{ flex: 1, padding: "12px 8px", borderRadius: 10, cursor: "pointer", border: `2px solid ${form.assignment_type === val ? val === "FONCTION" ? C.purple : val === "BUS_SCOLAIRE" ? C.blue : C.green : C.border}`, background: form.assignment_type === val ? val === "FONCTION" ? C.purpleLight : val === "BUS_SCOLAIRE" ? C.blueLight : C.greenLight : C.bg, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, transition: "all .15s" }}
              >
                <span style={{ fontSize: 24 }} aria-hidden="true">{icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: form.assignment_type === val ? val === "FONCTION" ? C.purple : val === "BUS_SCOLAIRE" ? C.blue : C.green : C.textMid }}>{label}</span>
                <span style={{ fontSize: 10, color: C.textLight, textAlign: "center", lineHeight: 1.3 }}>{desc}</span>
              </button>
            ))}
          </div>

          {/* ── VOITURE DE FONCTION ── */}
          {isFonction && (
            <div style={{ background: C.purpleLight, border: `1.5px solid ${C.purple}30`, borderRadius: 9, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
              <div style={{ fontSize: 11, color: C.purple, fontWeight: 700 }}>🎖️ Voiture de fonction — assignée à un directeur de l'institution.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textMid, textTransform: "uppercase", letterSpacing: "0.8px" }} htmlFor="sel-director">
                  Directeur assigné <span style={{ color: "#E11D48" }} aria-label="Obligatoire">*</span>
                </label>
                <select
                  id="sel-director"
                  required
                  value={form.assigned_director_id || ""}
                  onChange={e => {
                    const id  = e.target.value;
                    const dir = directors.find(d => String(d.id) === id);
                    setVal("assigned_director_id", id || null);
                    setVal("assigned_director", dir ? `${dir.first_name} ${dir.last_name}` : "");
                  }}
                  aria-required="true"
                  style={inp("assigned_director_id")}
                >
                  <option value="">— Choisir un directeur —</option>
                  {directors
                    .filter(d => d.personnel_type === "DIRECTEUR")
                    .filter(d => !d.assigned_vehicle || (initial && d.assigned_vehicle?.id === initial.id))
                    .map(d => <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>)
                  }
                </select>
                <ErrMsg field="assigned_director_id" />
              </div>
              {form.assigned_director && <div style={{ fontSize: 11, color: C.purple, fontWeight: 600 }}>✓ Assigné à : {form.assigned_director}</div>}
            </div>
          )}

          {/* ── BUS SCOLAIRE ── */}
          {isBusScolaire && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
              <div style={{ background: C.blueLight, border: `1.5px solid ${C.blue}30`, borderRadius: 9, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 11, color: C.blue, fontWeight: 700 }}>🚌 Bus scolaire — dédié au ramassage du matin.</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label htmlFor="sel-chauffeur" style={{ fontSize: 11, fontWeight: 700, color: C.textMid, textTransform: "uppercase", letterSpacing: "0.8px" }}>Chauffeur bus assigné</label>
                  {busChauffeurs.length === 0
                    ? <div style={{ fontSize: 11, color: C.amber, background: C.amberLight, borderRadius: 7, padding: "8px 12px" }}>Aucun chauffeur de type "Bus scolaire" enregistré.</div>
                    : (
                      <select
                        id="sel-chauffeur"
                        value={form.assigned_driver_id || ""}
                        onChange={e => setVal("assigned_driver_id", e.target.value || null)}
                        style={inp("assigned_driver_id")}
                      >
                        <option value="">— Aucun chauffeur —</option>
                        {busChauffeurs
                          .filter(c => !c.driver_profile?.assigned_vehicle_info || (initial && c.driver_profile?.assigned_vehicle_info?.id === initial.id))
                          .map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)
                        }
                      </select>
                    )
                  }
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label htmlFor="bus-start" style={lbl}>Début créneau</label>
                    <input id="bus-start" type="time" value={form.bus_slot_start} onChange={set("bus_slot_start")} style={inp("bus_slot_start")} />
                  </div>
                  <div>
                    <label htmlFor="bus-end" style={lbl}>Fin créneau</label>
                    <input id="bus-end" type="time" value={form.bus_slot_end} onChange={set("bus_slot_end")} style={inp("bus_slot_end")} />
                  </div>
                </div>
              </div>

              {/* Sélection ligne */}
              <div style={{ border: `1.5px solid ${C.amber}`, borderRadius: 10, padding: 16, background: C.amberLight }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.amber, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 14 }}>🚌 Trajet de ramassage</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }} role="group" aria-label="Choix de la ligne">
                  {Object.entries(BUS_LIGNES).map(([ligne, info]) => (
                    <button
                      key={ligne}
                      type="button"
                      aria-pressed={busLigne === ligne}
                      onClick={() => setBusLigne(ligne)}
                      style={{ flex: 1, padding: "10px 6px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", textAlign: "center", border: `2px solid ${busLigne === ligne ? C.amber : C.border}`, background: busLigne === ligne ? "#FEF3C7" : "#fff", color: busLigne === ligne ? C.amber : C.textMid, transition: "all .15s" }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 800 }}>Ligne {ligne}</div>
                      <div style={{ fontSize: 9, marginTop: 3, lineHeight: 1.3, color: busLigne === ligne ? C.amber : C.textLight }}>{info.point_depart}</div>
                    </button>
                  ))}
                </div>
                <div style={{ background: "#fff", borderRadius: 8, padding: "12px 14px", border: `1px solid ${C.amber}30` }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[
                      { l: "Trajet",     v: BUS_LIGNES[busLigne].nom_trajet },
                      { l: "Arrivée",    v: "IUC Logbessou" },
                      { l: "Tours / jour", v: "2 tours" },
                      { l: "Jours",      v: "Lun → Ven" },
                    ].map(({ l, v }) => (
                      <div key={l}>
                        <div style={{ fontSize: 10, color: C.textLight, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 3 }}>{l}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── CATÉGORIE ── */}
          <div style={M.secTitle}>Catégorie du véhicule</div>
          <div style={{ display: "flex", gap: 10 }} role="group" aria-label="Catégorie du véhicule">
            {VEHICLE_CATEGORIES.map(([cat, label, icon]) => {
              const blocked = (isFonction && cat !== "TOURISME") || (isBusScolaire && cat !== "BUS");
              return (
                <button
                  key={cat}
                  type="button"
                  disabled={blocked}
                  aria-pressed={form.category === cat}
                  aria-disabled={blocked}
                  onClick={() => !blocked && setForm(f => ({ ...f, category: cat }))}
                  style={{ flex: 1, padding: "14px 10px", borderRadius: 10, cursor: blocked ? "not-allowed" : "pointer", border: `2px solid ${form.category === cat ? C.green : blocked ? "#E8E8E8" : C.border}`, background: form.category === cat ? C.greenLight : blocked ? "#F5F5F5" : C.bg, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transition: "all .15s", opacity: blocked ? .4 : 1 }}
                >
                  <span style={{ fontSize: 28 }} aria-hidden="true">{icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: form.category === cat ? C.green : blocked ? "#BBB" : C.textMid }}>{label}</span>
                </button>
              );
            })}
          </div>

          {/* ── IDENTIFICATION ── */}
          <div style={M.secTitle}>Identification</div>
          <div style={M.grid2}>
            <div>
              <label htmlFor="f-reg" style={lbl}>Immatriculation <span style={{ color: "#E11D48" }} aria-label="Obligatoire">*</span></label>
              <input id="f-reg" value={form.registration_number} onChange={set("registration_number")} onBlur={() => touch("registration_number")} placeholder="Ex: LT 001 07" style={inp("registration_number")} aria-required="true" aria-describedby={fieldErrors.registration_number ? "err-reg" : undefined} />
              <ErrMsg field="registration_number" />
            </div>
            <div>
              <label htmlFor="f-code" style={lbl}>Code interne <span style={{ color: "#E11D48" }} aria-label="Obligatoire">*</span></label>
              <input id="f-code" value={form.internal_code} onChange={set("internal_code")} onBlur={() => touch("internal_code")} placeholder="Ex: VH-001" style={inp("internal_code")} aria-required="true" />
              <ErrMsg field="internal_code" />
            </div>
          </div>

          {/* ── CARACTÉRISTIQUES ── */}
          <div style={M.secTitle}>Caractéristiques</div>
          <div style={M.grid2}>
            <div>
              <label htmlFor="f-make" style={lbl}>Marque <span style={{ color: "#E11D48" }} aria-label="Obligatoire">*</span></label>
              <input id="f-make" value={form.make} onChange={set("make")} onBlur={() => touch("make")} placeholder="Toyota" style={inp("make")} aria-required="true" />
              <ErrMsg field="make" />
            </div>
            <div>
              <label htmlFor="f-model" style={lbl}>Modèle <span style={{ color: "#E11D48" }} aria-label="Obligatoire">*</span></label>
              <input id="f-model" value={form.model} onChange={set("model")} onBlur={() => touch("model")} placeholder="Corolla" style={inp("model")} aria-required="true" />
              <ErrMsg field="model" />
            </div>
            <div>
              <label htmlFor="f-year" style={lbl}>Année <span style={{ color: "#E11D48" }} aria-label="Obligatoire">*</span></label>
              <input id="f-year" type="number" value={form.year} onChange={set("year")} onBlur={() => touch("year")} min="1990" max={new Date().getFullYear() + 1} style={inp("year")} aria-required="true" />
              <ErrMsg field="year" />
            </div>
            <div>
              <label htmlFor="f-color" style={lbl}>Couleur <span style={{ color: "#E11D48" }} aria-label="Obligatoire">*</span></label>
              <input id="f-color" value={form.color} onChange={set("color")} onBlur={() => touch("color")} placeholder="Blanc" style={inp("color")} aria-required="true" />
              <ErrMsg field="color" />
            </div>
          </div>
          <div style={M.grid3}>
            <div>
              <label htmlFor="f-type" style={lbl}>Type</label>
              <select id="f-type" value={form.vehicle_type} onChange={set("vehicle_type")} style={inp("vehicle_type")}>
                {VEHICLE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="f-fuel" style={lbl}>Carburant</label>
              <select id="f-fuel" value={form.fuel_type} onChange={set("fuel_type")} style={inp("fuel_type")}>
                {FUEL_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="f-trans" style={lbl}>Transmission</label>
              <select id="f-trans" value={form.transmission} onChange={set("transmission")} style={inp("transmission")}>
                {TRANS_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* ── CAPACITÉS & KILOMÉTRAGE ── */}
          <div style={M.secTitle}>Capacités & Kilométrage</div>
          <div style={M.grid3}>
            <div>
              <label htmlFor="f-seats" style={lbl}>Nb places <span style={{ color: "#E11D48" }} aria-label="Obligatoire">*</span></label>
              <input id="f-seats" type="number" value={form.seating_capacity} onChange={set("seating_capacity")} onBlur={() => touch("seating_capacity")} min="1" max="100" style={inp("seating_capacity")} aria-required="true" />
              <ErrMsg field="seating_capacity" />
            </div>
            <div>
              <label htmlFor="f-tank" style={lbl}>Réservoir (L) <span style={{ color: "#E11D48" }} aria-label="Obligatoire">*</span></label>
              <input id="f-tank" type="number" value={form.fuel_tank_capacity} onChange={set("fuel_tank_capacity")} onBlur={() => touch("fuel_tank_capacity")} step="0.5" min="1" placeholder="60" style={inp("fuel_tank_capacity")} aria-required="true" />
              <ErrMsg field="fuel_tank_capacity" />
            </div>
            <div>
              <label htmlFor="f-km" style={lbl}>Kilométrage actuel</label>
              <input id="f-km" type="number" value={form.current_mileage} onChange={set("current_mileage")} step="1" min="0" style={inp("current_mileage")} />
            </div>
          </div>

          {/* ── STATUT & DATES ── */}
          <div style={M.secTitle}>Statut & Dates</div>

          {isFonction && (
            <div style={{ fontSize: 11, color: C.purple, background: C.purpleLight, borderRadius: 7, padding: "8px 12px", marginBottom: 8 }}>
              🎖️ Statut automatiquement défini sur <b>En service</b> pour un véhicule de fonction.
            </div>
          )}

          <div style={{ background: "#F3F4F6", border: "1.5px solid #E5E7EB", borderRadius: 8, padding: "10px 14px", marginBottom: 10, fontSize: 11, color: "#4B5563", lineHeight: 1.6 }}>
            <b style={{ color: "#374151" }}>ℹ️ À propos du statut :</b><br />
            • <b>Disponible</b> — peut être réservé · <b>En service</b> — en mission · <b>En maintenance</b> — chez le mécanicien<br />
            • <b>Hors service</b> — immobilisé définitivement. Le véhicule <b>reste en base</b> pour l'historique mais n'est plus réservable.
          </div>

          <div style={M.grid2}>
            <div>
              <label htmlFor="f-status" style={lbl}>Statut</label>
              <select
                id="f-status"
                value={form.status}
                onChange={set("status")}
                style={{ ...inp("status"), borderColor: isHorsService ? "#6B7280" : "#E2E8E5", background: isHorsService ? "#F3F4F6" : "#fff" }}
              >
                {(isFonction
                  ? [["EN_SERVICE","En service"],["EN_MAINTENANCE","En maintenance"],["HORS_SERVICE","Hors service"]]
                  : VEHICLE_STATUS
                ).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {isHorsService && <div style={{ fontSize: 10, color: "#6B7280", fontWeight: 600, marginTop: 3 }}>🚫 Ce véhicule ne sera plus disponible à la réservation.</div>}
            </div>
            <div>
              <label htmlFor="f-vin" style={lbl}>
                N° VIN
                <span style={{ fontSize: 9, color: (form.vin_number || "").trim().length === 17 ? "#16A34A" : (form.vin_number || "").trim().length > 0 ? "#E11D48" : "#8EA99A", fontWeight: 500, marginLeft: 6, textTransform: "none", letterSpacing: 0 }}>
                  {(form.vin_number || "").trim().length}/17
                </span>
              </label>
              <input
                id="f-vin"
                value={form.vin_number || ""}
                onChange={set("vin_number")}
                onBlur={() => touch("vin_number")}
                placeholder="Ex: 1HGBH41JXMN109186"
                maxLength={17}
                style={{ ...inp("vin_number"), borderColor: touched.vin_number && fieldErrors.vin_number ? "#E11D48" : (form.vin_number || "").trim().length === 17 ? "#16A34A" : "#E2E8E5" }}
                aria-describedby="vin-hint"
              />
              <ErrMsg field="vin_number" />
              <div id="vin-hint" style={{ fontSize: 10, color: "#8EA99A", marginTop: 2 }}>17 caractères (I, O, Q interdits)</div>
            </div>
            <div>
              <label htmlFor="f-pdate" style={lbl}>Date d'achat</label>
              <input id="f-pdate" type="date" value={form.purchase_date || ""} onChange={set("purchase_date")} style={inp("purchase_date")} />
            </div>
            <div>
              <label htmlFor="f-rdate" style={lbl}>Date d'immatriculation</label>
              <input id="f-rdate" type="date" value={form.registration_date || ""} onChange={set("registration_date")} style={inp("registration_date")} />
            </div>
            <div>
              <label htmlFor="f-price" style={lbl}>Prix d'achat (FCFA)</label>
              <input id="f-price" type="number" value={form.purchase_price || ""} onChange={set("purchase_price")} step="1000" min="0" placeholder="Ex: 12 500 000" style={inp("purchase_price")} />
            </div>
          </div>

          {/* ── NOTES ── */}
          <div style={M.secTitle}>Notes</div>
          <label htmlFor="f-notes" style={{ ...lbl, display: "none" }}>Notes et remarques</label>
          <textarea
            id="f-notes"
            className="veh-notes-textarea"
            value={form.notes || ""}
            rows={3}
            placeholder="Remarques, équipements spéciaux, historique particulier, raison de mise hors service…"
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            aria-label="Notes et remarques sur le véhicule"
          />

          {/* ── Résumé erreurs ── */}
          {Object.keys(fieldErrors).length > 0 && (
            <div role="alert" style={{ background: "#FFF8F8", border: "1.5px solid #FECDD3", borderRadius: 9, padding: "12px 14px", marginTop: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#BE123C", marginBottom: 6 }}>⚠️ Corrigez les erreurs suivantes :</div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {Object.values(fieldErrors).map((msg, i) => (
                  <li key={i} style={{ fontSize: 11, color: "#BE123C", marginBottom: 2 }}>{msg}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ── ACTIONS ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: "#8EA99A" }}>
              <kbd style={{ background: "#F3F4F6", border: "1px solid #E2E8E5", borderRadius: 4, padding: "2px 6px", fontSize: 10 }}>Ctrl+S</kbd> pour sauvegarder ·{" "}
              <kbd style={{ background: "#F3F4F6", border: "1px solid #E2E8E5", borderRadius: 4, padding: "2px 6px", fontSize: 10 }}>Échap</kbd> pour fermer
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={handleClose} className="veh-btn-ghost">Annuler</button>
              <button
                type="submit"
                disabled={saving}
                style={{ ...S.btn, opacity: saving ? .7 : 1, display: "flex", alignItems: "center", gap: 6, background: isHorsService ? "#6B7280" : undefined }}
                aria-busy={saving}
              >
                {saving
                  ? <><span style={{ animation: "veh-spin .8s linear infinite", display: "inline-block" }} aria-hidden="true">⟳</span> Enregistrement…</>
                  : isEdit ? "Enregistrer les modifications" : "Ajouter"
                }
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. EXPORT : wrapper avec ToastProvider
// ─────────────────────────────────────────────────────────────────────────────
// Envelopper TabVehicules dans ToastProvider au niveau de l'app ou ici :

export function VehiculesModule(props) {
  return (
    <ToastProvider>
      <TabVehicules {...props} />
    </ToastProvider>
  );
}