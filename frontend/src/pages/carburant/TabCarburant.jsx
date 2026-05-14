// ─── pages/carburant/TabCarburant.jsx ────────────────────────────────────────
// Module Carburant DRIVEPARC — Partenariat BOCOM
// Version 3.0 — Refonte complète avec corrections
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from "react";

const API_BASE = "http://localhost:8000/api/v1/fuel";

async function api(path, opts = {}) {
  const tok = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${tok}`,
      ...(opts.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...opts.headers,
    },
  });
  if (res.status === 204) return null;
  const json = await res.json();
  if (!res.ok) {
    const msg =
      json?.detail ||
      json?.message ||
      json?.non_field_errors?.[0] ||
      Object.values(json || {}).flat().filter(Boolean)[0] ||
      `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return json?.data ?? json;
}

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  green: "#1B5E37",    greenMid: "#2D7A4F",   greenLight: "#EAF4EE",  greenXLight: "#F2FAF5",
  red: "#C0182A",      redLight: "#FDF0F1",
  white: "#FFFFFF",    bg: "#F4F6F5",
  border: "#E2E8E5",   text: "#1A2820",       textMid: "#4A6358",     textLight: "#8EA99A",
  amber: "#D97706",    amberLight: "#FFFBEB",
  blue: "#1D4ED8",     blueLight: "#EFF6FF",
  navy: "#1E3A5F",     navyLight: "#EFF4FB",
  orange: "#EA580C",   orangeLight: "#FFF7ED",
  purple: "#7C3AED",   purpleLight: "#F5F3FF",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtMoney  = (n) => Number(n || 0).toLocaleString("fr-FR") + " FCFA";
const fmtNum    = (n) => Number(n || 0).toLocaleString("fr-FR");
const fmtDate   = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtDT     = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const fmtPct    = (p) => `${(+p || 0).toFixed(1)}%`;

const cardColor = (cat) => ({
  BUS_SCOLAIRE:  { bg: "#1B5E37", accent: "#4ade80", label: "SCOLAIRE" },
  BUS_ORDINAIRE: { bg: "#1D4ED8", accent: "#93c5fd", label: "TRANSPORT" },
  UTILITAIRE:    { bg: "#374151", accent: "#9ca3af", label: "TOURISME" },
  FONCTION:      { bg: "#6D28D9", accent: "#c4b5fd", label: "FONCTION" },
}[cat] || { bg: "#374151", accent: "#9ca3af", label: cat });

// ── Styles communs ────────────────────────────────────────────────────────────
const inp = {
  padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 8,
  fontSize: 13, fontFamily: "inherit", color: C.text, background: C.white,
  width: "100%", outline: "none", transition: "border-color .15s",
};
const inpErr = { ...inp, borderColor: C.red, background: C.redLight };
const lbl = {
  fontSize: 10, fontWeight: 700, color: C.textMid, textTransform: "uppercase",
  letterSpacing: "1px", marginBottom: 5, display: "block",
};
const btn = (color = C.green) => ({
  padding: "9px 20px", background: color, color: "#fff", border: "none",
  borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
  fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7,
});
const ghostBtn = {
  padding: "9px 16px", background: "transparent", color: C.textMid,
  border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13,
  fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
};

// ── Stations BOCOM ────────────────────────────────────────────────────────────
const BOCOM_STATIONS = {
  "Douala":     ["BOCOM Bonabéri","BOCOM Akwa","BOCOM Deido","BOCOM Ndokotti","BOCOM Bassa","BOCOM Logbessou","BOCOM Bonamoussadi","BOCOM PK8","BOCOM PK12","BOCOM PK14","BOCOM Makepe","BOCOM Bonanjo"],
  "Yaoundé":    ["BOCOM Bastos","BOCOM Mvog-Ada","BOCOM Melen","BOCOM Nsimeyong","BOCOM Biyem-Assi","BOCOM Essos","BOCOM Mendong","BOCOM Nlongkak"],
  "Bafoussam":  ["BOCOM Centre Bafoussam","BOCOM Bafoussam Marché"],
  "Garoua":     ["BOCOM Garoua Centre","BOCOM Garoua Nord"],
  "Buea":       ["BOCOM Buea Town","BOCOM Molyko"],
  "Ngaoundéré": ["BOCOM Ngaoundéré Centre","BOCOM Ngaoundéré Gare"],
  "Maroua":     ["BOCOM Maroua Centre","BOCOM Maroua Sud"],
  "Limbe":      ["BOCOM Limbe Centre","BOCOM Limbe Beach"],
  "Autre ville": [],
};

const QUOTAS = { BUS_SCOLAIRE: 185000, BUS_ORDINAIRE: 125000, UTILITAIRE: 100000, FONCTION: 150000 };
const MOIS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANTS PARTAGÉS
// ═══════════════════════════════════════════════════════════════════════════════

function Toast({ msg, type, onDone }) {
  useEffect(() => {
    if (msg) { const t = setTimeout(onDone, 4000); return () => clearTimeout(t); }
  }, [msg]);
  if (!msg) return null;
  const isErr = type === "error";
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: isErr ? C.red : C.green, color: "#fff",
      borderRadius: 12, padding: "12px 18px", fontSize: 13, fontWeight: 600,
      display: "flex", alignItems: "center", gap: 10,
      boxShadow: "0 8px 32px rgba(0,0,0,.25)", maxWidth: 420, animation: "slideUp .2s ease",
    }}>
      <span style={{ fontSize: 16 }}>{isErr ? "✕" : "✓"}</span>
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onDone} style={{ background: "none", border: "none", color: "rgba(255,255,255,.7)", cursor: "pointer", fontSize: 16, padding: 0 }}>✕</button>
    </div>
  );
}

const Spinner = ({ size = 20, color = C.green }) => (
  <div style={{ width: size, height: size, border: `2px solid ${color}30`, borderTopColor: color, borderRadius: "50%", animation: "spin .7s linear infinite", flexShrink: 0 }} />
);

function ThresholdBadge({ pct }) {
  if (pct < 80) return null;
  const crit = pct >= 100;
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 99,
      background: crit ? C.red : C.amber, color: "#fff",
      animation: crit ? "pulse 1.5s ease-in-out infinite" : "none",
    }}>
      {crit ? "ÉPUISÉ" : "⚠ " + Math.round(pct) + "%"}
    </span>
  );
}

function ProgressBar({ pct, height = 6 }) {
  const p = Math.min(100, pct || 0);
  const color = p >= 100 ? C.red : p >= 80 ? C.amber : C.green;
  return (
    <div style={{ height, background: "#E8EDE9", borderRadius: 99, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${p}%`, background: color, borderRadius: 99, transition: "width .6s ease" }} />
    </div>
  );
}

const STATUS_CFG = {
  EN_ATTENTE: { label: "En attente", color: C.amber, bg: C.amberLight },
  VALIDE:     { label: "Validé",     color: C.green, bg: C.greenLight },
  REJETE:     { label: "Rejeté",     color: C.red,   bg: C.redLight   },
};
function StatusPill({ status }) {
  const s = STATUS_CFG[status] || { label: status, color: C.textLight, bg: C.bg };
  return (
    <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: s.bg, color: s.color, display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.color }} />
      {s.label}
    </span>
  );
}

// ── Champ avec erreur ─────────────────────────────────────────────────────────
function FieldError({ error }) {
  if (!error) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, fontSize: 11, color: C.red, fontWeight: 600 }}>
      <span>⚠</span> {error}
    </div>
  );
}

// ── Viewer de reçu (modal interne) ────────────────────────────────────────────
function ModalReceiptViewer({ url, onClose }) {
  const isImage = url && /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url);
  const isPdf   = url && /\.pdf(\?.*)?$/i.test(url);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 2000,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: C.white, borderRadius: 16, overflow: "hidden",
        boxShadow: "0 24px 80px rgba(0,0,0,.4)",
        width: isImage ? "auto" : "80vw",
        maxWidth: "92vw", maxHeight: "92vh",
        display: "flex", flexDirection: "column",
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: "14px 20px", borderBottom: `1px solid ${C.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: C.bg, flexShrink: 0,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>🧾 Reçu BOCOM</div>
          <div style={{ display: "flex", gap: 8 }}>
            <a href={url} download target="_blank" rel="noreferrer"
              style={{ ...ghostBtn, fontSize: 11, padding: "5px 12px", textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
              ⬇ Télécharger
            </a>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: C.textLight, lineHeight: 1 }}>✕</button>
          </div>
        </div>

        {/* Contenu */}
        <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, minHeight: 300 }}>
          {isImage ? (
            <img src={url} alt="Reçu" style={{ maxWidth: "75vw", maxHeight: "75vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,.15)" }} />
          ) : isPdf ? (
            <iframe src={url} title="Reçu PDF" style={{ width: "76vw", height: "76vh", border: "none", borderRadius: 8 }} />
          ) : (
            <div style={{ textAlign: "center", color: C.textLight }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
              <div style={{ fontSize: 13 }}>Aperçu non disponible pour ce format.</div>
              <a href={url} target="_blank" rel="noreferrer" style={{ color: C.blue, fontSize: 12, marginTop: 8, display: "block" }}>Ouvrir dans un nouvel onglet</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Confirmation suppression ──────────────────────────────────────────────────
function ModalConfirmDelete({ label, onClose, onConfirm, loading }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 1300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.white, borderRadius: 14, padding: 26, width: 420, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ fontSize: 32, textAlign: "center", marginBottom: 12 }}>🗑️</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, textAlign: "center", marginBottom: 8 }}>Supprimer cette carte ?</div>
        <div style={{ fontSize: 12, color: C.textLight, textAlign: "center", marginBottom: 20, lineHeight: 1.6 }}>
          La carte <strong style={{ color: C.text }}>{label}</strong> sera définitivement supprimée.<br/>
          Cette action est irréversible.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={ghostBtn}>Annuler</button>
          <button onClick={onConfirm} disabled={loading}
            style={{ ...btn(C.red), opacity: loading ? 0.6 : 1 }}>
            {loading ? <Spinner size={14} color="#fff" /> : null}
            {loading ? "Suppression…" : "Supprimer définitivement"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Rejet ───────────────────────────────────────────────────────────────
function ModalRejet({ onClose, onConfirm, loading }) {
  const [reason, setReason] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.white, borderRadius: 14, padding: 24, width: 460, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>Motif du rejet</div>
        <div style={{ fontSize: 12, color: C.textLight, marginBottom: 16 }}>Ce motif sera visible par le chauffeur dans son historique.</div>
        <textarea autoFocus value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Expliquez pourquoi cette saisie est rejetée…" rows={4}
          style={{ ...inp, resize: "vertical", lineHeight: 1.5 }} />
        {!reason.trim() && reason.length > 0 && <FieldError error="Le motif ne peut pas être vide." />}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
          <button onClick={onClose} style={ghostBtn}>Annuler</button>
          <button onClick={() => reason.trim() && onConfirm(reason.trim())} disabled={loading || !reason.trim()}
            style={{ ...btn(C.red), opacity: loading || !reason.trim() ? 0.6 : 1 }}>
            {loading ? <Spinner size={14} color="#fff" /> : null}
            {loading ? "Envoi…" : "Confirmer le rejet"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CARTE MAGNÉTIQUE VISUELLE
// ════════════════════════════════════════════════════════════════════════════
function CardVisual({ card, selected, onClick }) {
  const [flipped, setFlipped] = useState(false);
  const col = cardColor(card.category);
  const pct = Math.min(100, card.usage_pct || 0);
  const balColor = pct >= 100 ? "#f87171" : pct >= 80 ? "#fbbf24" : col.accent;

  return (
    <div onClick={onClick} style={{ perspective: 1000, cursor: "pointer", minWidth: 270 }}>
      <div style={{
        position: "relative", transformStyle: "preserve-3d", transition: "transform .5s ease",
        transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)", height: 180,
      }}>
        {/* RECTO */}
        <div style={{
          position: "absolute", inset: 0, backfaceVisibility: "hidden",
          background: `linear-gradient(135deg, ${col.bg} 0%, ${col.bg}cc 100%)`,
          borderRadius: 16, padding: "18px 20px",
          border: `2px solid ${selected ? col.accent : "transparent"}`,
          boxShadow: selected ? `0 8px 28px ${col.bg}50` : "0 2px 10px rgba(0,0,0,.15)",
          overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 110, height: 110, borderRadius: "50%", background: "rgba(255,255,255,.06)" }} />
          <div style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,.04)" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "1px" }}>BOCOM</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <ThresholdBadge pct={pct} />
              <span style={{ fontSize: 9, fontWeight: 800, background: "rgba(255,255,255,.15)", color: "rgba(255,255,255,.9)", padding: "3px 8px", borderRadius: 99, letterSpacing: "1.5px" }}>{col.label}</span>
            </div>
          </div>
          <div style={{ width: 36, height: 26, borderRadius: 5, background: "linear-gradient(135deg,#f59e0b,#d97706)", marginBottom: 12 }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.9)", letterSpacing: "2.5px", marginBottom: 12, fontFamily: "'Courier New',monospace" }}>
            {card.card_number_masked || card.card_number}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,.5)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 2 }}>Véhicule</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{card.vehicle_info?.make} {card.vehicle_info?.model}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.6)", letterSpacing: "1px" }}>{card.vehicle_info?.registration_number}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,.5)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 2 }}>Solde</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: balColor }}>{fmtNum(card.current_balance)} F</div>
            </div>
          </div>
          <div style={{ marginTop: 10, height: 3, background: "rgba(255,255,255,.15)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: balColor, borderRadius: 99, transition: "width .5s" }} />
          </div>
          <button onClick={e => { e.stopPropagation(); setFlipped(true); }}
            style={{ position: "absolute", bottom: 12, right: 12, background: "rgba(255,255,255,.15)", border: "none", color: "rgba(255,255,255,.7)", borderRadius: 6, padding: "3px 8px", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
            ↩ Verso
          </button>
        </div>

        {/* VERSO */}
        <div style={{
          position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)",
          background: `linear-gradient(135deg, ${col.bg}ee 0%, ${col.bg}aa 100%)`,
          borderRadius: 16, padding: "18px 20px", overflow: "hidden",
        }}>
          <div style={{ height: 28, background: "#1a1a1a", marginBottom: 14, borderRadius: 4 }} />
          <div style={{ background: "rgba(255,255,255,.1)", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Quota mensuel</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{fmtMoney(card.monthly_quota)}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ background: "rgba(255,255,255,.08)", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,.4)", marginBottom: 2 }}>Consommé</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24" }}>{fmtMoney(card.monthly_quota - (card.current_balance || 0))}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,.08)", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,.4)", marginBottom: 2 }}>Utilisation</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{fmtPct(pct)}</div>
            </div>
          </div>
          {card.vehicle_info?.assigned_driver && (
            <div style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,.7)" }}>👤 {card.vehicle_info.assigned_driver}</div>
          )}
          <button onClick={e => { e.stopPropagation(); setFlipped(false); }}
            style={{ position: "absolute", bottom: 12, right: 12, background: "rgba(255,255,255,.15)", border: "none", color: "rgba(255,255,255,.7)", borderRadius: 6, padding: "3px 8px", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
            ↪ Recto
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL CRÉER / MODIFIER CARTE — réseau BOCOM uniquement, validation stricte
// ════════════════════════════════════════════════════════════════════════════
function ModalCarteForm({ editCard, onClose, onSuccess, showToast }) {
  const isEdit = !!editCard;
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState({
    vehicle:      editCard?.vehicle?.id || editCard?.vehicle || "",
    card_number:  editCard?.card_number || "",
    card_network: "BOCOM",
    category:     editCard?.category || "BUS_SCOLAIRE",
    notes:        editCard?.notes || "",
  });
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState({});
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); };

  useEffect(() => {
    fetch("http://localhost:8000/api/v1/vehicles/", { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` } })
      .then(r => r.json())
      .then(d => setVehicles(Array.isArray(d) ? d : d?.results ?? []))
      .catch(() => setVehicles([]));
  }, []);

  // Validation du numéro de carte BOCOM : exactement 16-19 chiffres, pas d'espaces
  const validateCardNumber = (n) => {
    if (!n.trim()) return "Le numéro de carte est obligatoire.";
    if (!/^\d+$/.test(n.trim())) return "Le numéro de carte ne doit contenir que des chiffres (sans espaces ni tirets).";
    if (n.trim().length !== 19) return `Numéro invalide — ${n.trim().length} chiffre(s) saisi(s) sur 19 requis.`;
    return "";
  };

  const validate = () => {
    const e = {};
    if (!form.vehicle)          e.vehicle     = "Veuillez sélectionner un véhicule.";
    const cardErr = validateCardNumber(form.card_number);
    if (cardErr)                e.card_number = cardErr;
    if (!form.category)         e.category    = "Veuillez choisir une catégorie.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const tok = localStorage.getItem("access_token");
      const body = { ...form, card_number: form.card_number.trim() };
      const url    = isEdit ? `${API_BASE}/cards/${editCard.id}/` : `${API_BASE}/cards/`;
      const method = isEdit ? "PUT" : "POST";
      const res  = await fetch(url, {
        method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        // Mapper les erreurs DRF vers les champs
        const fieldErrs = {};
        if (json?.vehicle)     fieldErrs.vehicle     = json.vehicle[0];
        if (json?.card_number) fieldErrs.card_number = json.card_number[0];
        if (json?.category)    fieldErrs.category    = json.category[0];
        if (Object.keys(fieldErrs).length) { setErrors(fieldErrs); setSaving(false); return; }
        throw new Error(json?.detail || json?.message || Object.values(json).flat()[0] || "Erreur");
      }
      showToast(isEdit ? "Carte mise à jour ✓" : "Carte créée avec succès ✓");
      onSuccess();
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const CATS = [
    ["BUS_SCOLAIRE",  "🚌 Bus scolaire",        185000],
    ["BUS_ORDINAIRE", "🚌 Bus ordinaire",        125000],
    ["UTILITAIRE",    "🚗 Utilitaire / Tourisme", 100000],
    ["FONCTION",      "🎖️ Véhicule de fonction", 150000],
  ];

  const cardNumRaw = form.card_number.replace(/\D/g, "");
  const cardNumDisplay = cardNumRaw.replace(/(.{4})/g, "$1 ").trim();

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}>
      <div style={{ background: C.white, borderRadius: 16, padding: 28, width: 560, maxWidth: "95vw", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{isEdit ? "Modifier la carte" : "Créer une carte carburant"}</div>
            <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>Partenariat BOCOM — réseau exclusif</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: C.textLight }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Réseau BOCOM — non modifiable */}
          <div>
            <label style={lbl}>Réseau</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: C.greenLight, borderRadius: 8, border: `1.5px solid ${C.green}30` }}>
              <div style={{ width: 28, height: 28, background: C.green, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", fontWeight: 800 }}>B</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>BOCOM</div>
                <div style={{ fontSize: 10, color: C.textMid }}>Réseau partenaire exclusif DRIVEPARC</div>
              </div>
              <div style={{ marginLeft: "auto", fontSize: 10, color: C.green, fontWeight: 700, background: C.white, padding: "2px 8px", borderRadius: 99, border: `1px solid ${C.green}30` }}>✓ Partenaire officiel</div>
            </div>
          </div>

          {/* Véhicule */}
          <div>
            <label style={lbl}>Véhicule *</label>
            <select style={errors.vehicle ? inpErr : inp} value={form.vehicle}
              onChange={e => {
                const v = vehicles.find(v => String(v.id) === e.target.value);
                set("vehicle", e.target.value);
                if (v) {
                  const cat = v.assignment_type === "BUS_SCOLAIRE" ? "BUS_SCOLAIRE"
                    : v.vehicle_type === "BUS" ? "BUS_ORDINAIRE"
                    : v.assignment_type === "FONCTION" ? "FONCTION" : "UTILITAIRE";
                  set("category", cat);
                }
              }}>
              <option value="">— Sélectionner un véhicule —</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} · {v.registration_number}</option>)}
            </select>
            <FieldError error={errors.vehicle} />
          </div>

          {/* Numéro de carte */}
          <div>
            <label style={lbl}>Numéro de carte BOCOM *</label>
            <input
              style={errors.card_number ? inpErr : inp}
              value={form.card_number}
              onChange={e => set("card_number", e.target.value.replace(/\D/g, "").slice(0, 19))}
              placeholder="Ex : 5288123412341234"
              maxLength={19}
              inputMode="numeric"
            />
            {/* Prévisualisation formatée */}
            {cardNumRaw.length >= 4 && !errors.card_number && (
              <div style={{ marginTop: 5, fontSize: 12, color: C.green, fontFamily: "'Courier New',monospace", fontWeight: 700, letterSpacing: "2px" }}>
                ✓ {cardNumDisplay}
                <span style={{ fontSize: 10, color: C.textLight, fontFamily: "inherit", letterSpacing: "normal", fontWeight: 400, marginLeft: 8 }}>
                  ({cardNumRaw.length} chiffres)
                </span>
              </div>
            )}
            <FieldError error={errors.card_number} />
            <div style={{ fontSize: 10, color: C.textLight, marginTop: 3 }}>Exactement 19 chiffres — numéro figurant sur la carte physique BOCOM</div>
          </div>

          {/* Catégorie */}
          <div>
            <label style={lbl}>Catégorie *</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {CATS.map(([val, label, quota]) => (
                <button key={val} type="button" onClick={() => set("category", val)}
                  style={{
                    padding: "10px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                    border: `1.5px solid ${form.category === val ? C.green : C.border}`,
                    background: form.category === val ? C.greenLight : C.white,
                    color: form.category === val ? C.green : C.textMid,
                    transition: "all .12s",
                  }}>
                  <div style={{ fontWeight: 700 }}>{label}</div>
                  <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>Quota : {Number(quota).toLocaleString("fr-FR")} FCFA/mois</div>
                </button>
              ))}
            </div>
            <FieldError error={errors.category} />
          </div>

          {/* Quota calculé */}
          <div style={{ background: C.greenLight, borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: C.textMid }}>💳 Quota mensuel automatique</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.green }}>{(QUOTAS[form.category] || 0).toLocaleString("fr-FR")} FCFA</span>
          </div>

          {/* Notes */}
          <div>
            <label style={lbl}>Notes (optionnel)</label>
            <input style={inp} value={form.notes} onChange={e => set("notes", e.target.value)}
              placeholder="Ex : Carte créée suite à commande BOCOM du 12/04/2026" />
          </div>
        </div>

        {/* Résumé erreurs global */}
        {Object.keys(errors).length > 0 && (
          <div style={{ marginTop: 16, background: C.redLight, border: `1px solid ${C.red}30`, borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontSize: 12, color: C.red, fontWeight: 700, marginBottom: 4 }}>⚠ Veuillez corriger les erreurs suivantes :</div>
            {Object.values(errors).filter(Boolean).map((e, i) => (
              <div key={i} style={{ fontSize: 11, color: C.red, marginTop: 2 }}>• {e}</div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
          <button onClick={onClose} style={ghostBtn}>Annuler</button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ ...btn(C.green), opacity: saving ? 0.7 : 1 }}>
            {saving ? <Spinner size={14} color="#fff" /> : null}
            {saving ? (isEdit ? "Mise à jour…" : "Création…") : (isEdit ? "✓ Enregistrer" : "Créer la carte")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STATISTIQUES — vrais graphes SVG inline
// ════════════════════════════════════════════════════════════════════════════
function StatsView({ dashboard, cards, transactions, printPDF }) {
  const now        = new Date();
  const alertCards = cards.filter(c => (c.usage_pct || 0) >= 80);

  // ────────────────────────────────────────────────────────────────────────
  // Calcul des métriques DIRECTEMENT depuis cards + transactions
  // (indépendant de dashboard — toujours disponible)
  // ────────────────────────────────────────────────────────────────────────
  const budgetTotal    = cards.reduce((s, c) => s + (c.monthly_quota || 0), 0);
  const consumed       = cards.reduce((s, c) => s + ((c.monthly_quota || 0) - (c.current_balance || 0)), 0);
  const usagePct       = budgetTotal > 0 ? (consumed / budgetTotal) * 100 : 0;
  const txValidees     = transactions.filter(t => t.status === "VALIDE");
  const txAttente      = transactions.filter(t => t.status === "EN_ATTENTE");
  const txRejetees     = transactions.filter(t => t.status === "REJETE");
  const totalLitres    = transactions.reduce((s, t) => s + (parseFloat(t.quantity_liters) || 0), 0);
  const avgTx          = txValidees.length > 0
    ? Math.round(txValidees.reduce((s, t) => s + (parseFloat(t.total_amount) || 0), 0) / txValidees.length)
    : 0;

  // Litres & montants par type
  const byTypeCalc = ["RAMASSAGE", "MISSION"].map(type => {
    const sub = transactions.filter(t => t.transaction_type === type);
    return {
      type,
      label: type === "RAMASSAGE" ? "Ramassage" : "Mission",
      total: sub.reduce((s, t) => s + (parseFloat(t.total_amount) || 0), 0),
      litres: sub.reduce((s, t) => s + (parseFloat(t.quantity_liters) || 0), 0),
      count: sub.length,
    };
  }).filter(x => x.count > 0);

  // Groupes par catégorie depuis cards
  const catColors = { BUS_SCOLAIRE: C.green, BUS_ORDINAIRE: C.blue, UTILITAIRE: C.textMid, FONCTION: C.purple };
  const catLabels = { BUS_SCOLAIRE: "Bus scolaire", BUS_ORDINAIRE: "Bus ordinaire", UTILITAIRE: "Utilitaire", FONCTION: "Fonction" };
  const catGroups = Object.entries(
    cards.reduce((acc, c) => {
      const k = c.category || "AUTRE";
      if (!acc[k]) acc[k] = { consumed: 0, quota: 0, count: 0 };
      acc[k].consumed += (c.monthly_quota - (c.current_balance || 0));
      acc[k].quota    += c.monthly_quota;
      acc[k].count    += 1;
      return acc;
    }, {})
  ).map(([cat, d]) => ({ cat, ...d, pct: d.quota > 0 ? (d.consumed / d.quota) * 100 : 0 }))
   .sort((a, b) => b.consumed - a.consumed);

  // Top 5 véhicules depuis transactions
  const vehicleMap = transactions.reduce((acc, t) => {
    const key = t.vehicle_name || "Inconnu";
    if (!acc[key]) acc[key] = { label: key, total: 0, litres: 0, count: 0 };
    acc[key].total  += parseFloat(t.total_amount) || 0;
    acc[key].litres += parseFloat(t.quantity_liters) || 0;
    acc[key].count  += 1;
    return acc;
  }, {});
  const top5 = Object.values(vehicleMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // ── Composants graphiques ────────────────────────────────────────────────

  function BarChart({ data, labelKey, valueKey, height = 130, formatVal, colors }) {
    if (!data || data.length === 0)
      return <div style={{ textAlign: "center", color: C.textLight, padding: "20px 0", fontSize: 12 }}>Aucune donnée</div>;
    const maxVal = Math.max(...data.map(d => parseFloat(d[valueKey]) || 0), 1);
    const palette = colors || [C.green, C.blue, C.amber, C.orange, C.purple, C.greenMid];
    const barW = Math.max(32, Math.floor(440 / data.length) - 12);
    const svgW = data.length * (barW + 12) + 8;
    return (
      <div style={{ overflowX: "auto" }}>
        <svg width={svgW} height={height + 48} style={{ display: "block" }}>
          {[0.25, 0.5, 0.75, 1].map((f, i) => {
            const y = Math.round(height - f * height);
            return <line key={i} x1={0} y1={y} x2={svgW} y2={y} stroke={C.border} strokeWidth={1} strokeDasharray="3,3" />;
          })}
          {data.map((d, i) => {
            const val  = parseFloat(d[valueKey]) || 0;
            const barH = Math.max(2, Math.round((val / maxVal) * height));
            const x    = i * (barW + 12) + 6;
            const col  = palette[i % palette.length];
            const labelStr = formatVal ? formatVal(val) : fmtNum(Math.round(val));
            return (
              <g key={i}>
                <rect x={x} y={0} width={barW} height={height} rx={6} fill={C.bg} />
                <rect x={x} y={height - barH} width={barW} height={barH} rx={6} fill={col} opacity={0.88} />
                <text
                  x={x + barW / 2}
                  y={barH > 20 ? height - barH + 14 : height - barH - 5}
                  textAnchor="middle" fontSize={9} fontWeight={700}
                  fill={barH > 20 ? "#fff" : col}>
                  {labelStr}
                </text>
                <text x={x + barW / 2} y={height + 16} textAnchor="middle" fontSize={9} fill={C.textMid} fontWeight={600}>
                  {(d[labelKey] || "").toString().slice(0, 9)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  function DonutChart({ segments, size = 120, centerLabel, centerSub }) {
    const nonEmpty = segments.filter(s => s.value > 0);
    if (!nonEmpty.length)
      return (
        <div style={{ width: size, height: size, borderRadius: "50%", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 10, color: C.textLight }}>
          Aucune donnée
        </div>
      );
    const total = nonEmpty.reduce((s, seg) => s + seg.value, 0);
    const r = size / 2 - 12, cx = size / 2, cy = size / 2;
    let angle = -Math.PI / 2;
    const arcs = nonEmpty.map(seg => {
      const start = angle;
      const sweep = (seg.value / total) * 2 * Math.PI;
      angle += sweep;
      const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(angle), y2 = cy + r * Math.sin(angle);
      return { ...seg, d: `M${cx} ${cy}L${x1} ${y1}A${r} ${r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${x2} ${y2}Z` };
    });
    return (
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        {arcs.map((a, i) => <path key={i} d={a.d} fill={a.color} opacity={0.9} />)}
        <circle cx={cx} cy={cy} r={r * 0.52} fill={C.white} />
        {centerLabel
          ? <><text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill={C.text}>{centerLabel}</text>
              <text x={cx} y={cy + 16} textAnchor="middle" fontSize={8} fill={C.textLight}>{centerSub}</text></>
          : <><text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill={C.text}>{Math.round(total / 1000)}k</text>
              <text x={cx} y={cy + 16} textAnchor="middle" fontSize={8} fill={C.textLight}>FCFA</text></>
        }
      </svg>
    );
  }

  function GaugeChart({ pct, size = 140 }) {
    const r = size / 2 - 14, cx = size / 2, cy = size * 0.66;
    const circ = Math.PI * r;
    const p = Math.min(100, Math.max(0, pct || 0));
    const color = p >= 100 ? C.red : p >= 80 ? C.amber : C.green;
    const dashOffset = circ - (p / 100) * circ;
    const needleAngle = -Math.PI + (p / 100) * Math.PI;
    const nx = cx + r * 0.7 * Math.cos(needleAngle);
    const ny = cy + r * 0.7 * Math.sin(needleAngle);
    return (
      <svg width={size} height={size * 0.72} viewBox={`0 0 ${size} ${size * 0.72}`} style={{ flexShrink: 0 }}>
        <path d={`M${14} ${cy} A${r} ${r} 0 0 1 ${size - 14} ${cy}`} fill="none" stroke="#E8EDE9" strokeWidth={13} strokeLinecap="round" />
        <path d={`M${14} ${cy} A${r} ${r} 0 0 1 ${size - 14} ${cy}`} fill="none" stroke={color} strokeWidth={13} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={dashOffset} style={{ transition: "stroke-dashoffset .8s ease" }} />
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={5} fill={color} />
        <text x={cx} y={cy - 14} textAnchor="middle" fontSize={18} fontWeight={800} fill={color}>{Math.round(p)}%</text>
        <text x={cx} y={cy + 2} textAnchor="middle" fontSize={8} fill={C.textLight}>du budget utilisé</text>
        <text x={15} y={cy + 16} textAnchor="middle" fontSize={8} fill={C.textLight}>0%</text>
        <text x={size - 15} y={cy + 16} textAnchor="middle" fontSize={8} fill={C.textLight}>100%</text>
      </svg>
    );
  }

  function StackedBar({ consumed, quota, label, color }) {
    const pct = quota > 0 ? Math.min(100, (consumed / quota) * 100) : 0;
    const col = pct >= 100 ? C.red : pct >= 80 ? C.amber : color;
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
          <span style={{ fontWeight: 700, color: C.text }}>{label}</span>
          <span style={{ fontWeight: 800, color: col }}>{fmtPct(pct)}</span>
        </div>
        <div style={{ position: "relative", height: 9, background: C.bg, borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: col, borderRadius: 99, transition: "width .6s ease" }} />
          <div style={{ position: "absolute", left: "80%", top: 0, height: "100%", width: 2, background: `${C.amber}70` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.textLight, marginTop: 3 }}>
          <span>{fmtMoney(Math.round(consumed))}</span><span>/ {fmtMoney(Math.round(quota))}</span>
        </div>
      </div>
    );
  }

  // ── Rendu ────────────────────────────────────────────────────────────────
  if (cards.length === 0) return (
    <div style={{ background: C.white, borderRadius: 12, padding: "60px 20px", textAlign: "center", border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Aucune donnée disponible</div>
      <div style={{ fontSize: 12, color: C.textLight, marginTop: 6 }}>Créez des cartes et enregistrez des transactions pour voir les statistiques.</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── KPIs 4 blocs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {[
          { label: "Taux utilisation",    val: fmtPct(usagePct),                    color: usagePct > 85 ? C.red : C.green, icon: "📊", sub: `${fmtMoney(Math.round(consumed))} consommés` },
          { label: "Coût moyen / carte",  val: cards.length > 0 ? fmtMoney(Math.round(consumed / cards.length)) : "—", color: C.amber, icon: "💳", sub: `${cards.length} carte${cards.length > 1 ? "s" : ""}` },
          { label: "Volume total",        val: `${totalLitres.toFixed(0)} L`,        color: C.blue,   icon: "⛽", sub: `${transactions.length} saisie${transactions.length > 1 ? "s" : ""}` },
          { label: "Coût moyen / saisie", val: avgTx > 0 ? fmtMoney(avgTx) : "—",   color: C.purple, icon: "🧾", sub: `${txValidees.length} validée${txValidees.length > 1 ? "s" : ""}` },
        ].map((k, i) => (
          <div key={i} style={{ background: C.white, borderRadius: 12, padding: "12px 14px", border: `1px solid ${C.border}`, borderTop: `3px solid ${k.color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "1px" }}>{k.label}</span>
              <span style={{ fontSize: 14 }}>{k.icon}</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 9, color: C.textLight, marginTop: 3 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Gauge budget + Donut type ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.text, marginBottom: 12 }}>📈 Utilisation du budget mensuel</div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <GaugeChart pct={usagePct} size={140} />
            <div>
              {[
                { label: "Budget total", val: fmtMoney(budgetTotal),            color: C.blue  },
                { label: "Consommé",     val: fmtMoney(Math.round(consumed)),   color: C.amber },
                { label: "Restant",      val: fmtMoney(Math.round(budgetTotal - consumed)), color: C.green },
              ].map((f, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: C.textLight, textTransform: "uppercase", letterSpacing: "1px" }}>{f.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: f.color }}>{f.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.text, marginBottom: 12 }}>🥧 Répartition par type de trajet</div>
          {byTypeCalc.length === 0 ? (
            <div style={{ textAlign: "center", color: C.textLight, padding: "30px 0", fontSize: 12 }}>Aucune transaction enregistrée</div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <DonutChart
                segments={byTypeCalc.map(x => ({ label: x.label, value: x.total, color: x.type === "RAMASSAGE" ? C.green : C.blue }))}
                size={120}
              />
              <div style={{ flex: 1 }}>
                {byTypeCalc.map((s, i) => {
                  const totalAll = byTypeCalc.reduce((a, x) => a + x.total, 0);
                  const pct = totalAll > 0 ? (s.total / totalAll) * 100 : 0;
                  const col = s.type === "RAMASSAGE" ? C.green : C.blue;
                  return (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 600, color: C.text }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: col, display: "inline-block" }} />
                          {s.label}
                        </span>
                        <span style={{ fontWeight: 800, color: col }}>{fmtPct(pct)}</span>
                      </div>
                      <ProgressBar pct={pct} height={5} />
                      <div style={{ fontSize: 9, color: C.textLight, marginTop: 2 }}>
                        {fmtMoney(Math.round(s.total))} · {s.litres.toFixed(1)}L · {s.count} saisie{s.count > 1 ? "s" : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── BarChart + StackedBar catégories ── */}
      <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.text, marginBottom: 4 }}>📊 Consommation par catégorie de flotte</div>
        <div style={{ fontSize: 11, color: C.textLight, marginBottom: 16 }}>Montant consommé ce mois et taux d'utilisation du quota</div>
        <BarChart
          data={catGroups.map(g => ({ label: catLabels[g.cat] || g.cat, total: g.consumed }))}
          labelKey="label" valueKey="total" height={120}
          colors={catGroups.map(g => catColors[g.cat] || C.textMid)}
          formatVal={v => v > 999 ? `${Math.round(v / 1000)}k` : Math.round(v).toString()}
        />
        <div style={{ marginTop: 18, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
          {catGroups.map((g, i) => (
            <StackedBar key={i}
              consumed={g.consumed} quota={g.quota}
              label={`${catLabels[g.cat] || g.cat} (${g.count} carte${g.count > 1 ? "s" : ""})`}
              color={catColors[g.cat] || C.textMid}
            />
          ))}
        </div>
      </div>

      {/* ── Donut statut + BarChart litres ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.text, marginBottom: 12 }}>📋 Statut des saisies ({transactions.length})</div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <DonutChart
              segments={[
                { label: "Validées",   value: txValidees.length,  color: C.green },
                { label: "En attente", value: txAttente.length,   color: C.amber },
                { label: "Rejetées",   value: txRejetees.length,  color: C.red   },
              ]}
              size={120}
              centerLabel={transactions.length.toString()}
              centerSub="total"
            />
            <div style={{ flex: 1 }}>
              {[
                { label: "Validées",   count: txValidees.length,  color: C.green },
                { label: "En attente", count: txAttente.length,   color: C.amber },
                { label: "Rejetées",   count: txRejetees.length,  color: C.red   },
              ].map((s, i) => {
                const pct = transactions.length > 0 ? (s.count / transactions.length) * 100 : 0;
                return (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 600, color: C.text }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: "inline-block" }} />
                        {s.label}
                      </span>
                      <span style={{ fontWeight: 800, color: s.color }}>{s.count}</span>
                    </div>
                    <ProgressBar pct={pct} height={5} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.text, marginBottom: 4 }}>⛽ Volume en litres par type</div>
          <div style={{ fontSize: 11, color: C.textLight, marginBottom: 16 }}>Total : {totalLitres.toFixed(1)} L</div>
          {byTypeCalc.length === 0 ? (
            <div style={{ textAlign: "center", color: C.textLight, padding: "30px 0", fontSize: 12 }}>Aucune donnée</div>
          ) : (
            <BarChart
              data={byTypeCalc.map(x => ({ label: x.label, litres: x.litres }))}
              labelKey="label" valueKey="litres" height={110}
              colors={[C.green, C.blue]}
              formatVal={v => `${Number(v).toFixed(0)}L`}
            />
          )}
        </div>
      </div>

      {/* ── Top 5 véhicules ── */}
      <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.text, marginBottom: 4 }}>🏆 Top 5 véhicules consommateurs</div>
        <div style={{ fontSize: 11, color: C.textLight, marginBottom: 16 }}>Calculé sur les {transactions.length} saisie{transactions.length > 1 ? "s" : ""} chargées</div>
        {top5.length === 0 ? (
          <div style={{ textAlign: "center", color: C.textLight, padding: "16px 0", fontSize: 12 }}>Aucune donnée</div>
        ) : (
          <>
            <BarChart
              data={top5.map(x => ({ label: x.label.slice(0, 9), total: x.total }))}
              labelKey="label" valueKey="total" height={120}
              colors={[C.green, C.greenMid, C.blue, C.amber, C.orange]}
              formatVal={v => `${Math.round(v / 1000)}k`}
            />
            <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {top5.map((item, i) => {
                const pct2 = consumed > 0 ? (item.total / consumed) * 100 : 0;
                const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{medals[i]}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
                        <span style={{ fontWeight: 800, color: C.amber, flexShrink: 0, marginLeft: 8 }}>{fmtMoney(Math.round(item.total))}</span>
                      </div>
                      <ProgressBar pct={pct2} height={6} />
                      <div style={{ fontSize: 9, color: C.textLight, marginTop: 2 }}>
                        {item.litres.toFixed(1)}L · {item.count} saisie{item.count > 1 ? "s" : ""} · {fmtPct(pct2)} du total
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Cartes en alerte ── */}
      {alertCards.length > 0 && (
        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <span>⚠️</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: C.text }}>Cartes à surveiller</span>
            <span style={{ fontSize: 10, color: C.amber, background: C.amberLight, padding: "1px 7px", borderRadius: 99, fontWeight: 700 }}>{alertCards.length}</span>
          </div>
          {alertCards.map((c, i) => (
            <div key={i} style={{ padding: "10px 18px", borderBottom: i < alertCards.length - 1 ? `1px solid ${C.border}` : "none", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                  {c.vehicle_info?.make} {c.vehicle_info?.model} · {c.vehicle_info?.registration_number}
                </div>
                <ProgressBar pct={c.usage_pct} height={6} />
              </div>
              <ThresholdBadge pct={c.usage_pct} />
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>{fmtMoney(c.current_balance)}</div>
                <div style={{ fontSize: 9, color: C.textLight }}>restant</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Export ── */}
      <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Rapport mensuel complet</div>
          <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>Toutes les transactions · {MOIS[now.getMonth()]} {now.getFullYear()}</div>
        </div>
        <button onClick={printPDF} style={{ ...btn(C.green), fontSize: 12 }}>🖨️ Générer le rapport PDF</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PDF Print
// ════════════════════════════════════════════════════════════════════════════
function printTransactionsPDF(transactions, filterLabel, period) {
  const rows = transactions.map(t => {
    const s = STATUS_CFG[t.status] || { label: t.status };
    return `<tr>
      <td>${fmtDT(t.transaction_date)}</td>
      <td>${t.driver_name || "—"}</td>
      <td>${t.vehicle_name || "—"}</td>
      <td>${t.transaction_type === "RAMASSAGE" ? "Ramassage" : "Mission"}</td>
      <td>${t.gas_station || "—"}</td>
      <td style="text-align:right">${t.quantity_liters}L</td>
      <td style="text-align:right">${fmtNum(t.unit_price)} F</td>
      <td style="text-align:right;font-weight:700">${fmtNum(t.total_amount)} F</td>
      <td style="color:${s.color || '#888'};font-weight:700">${s.label}</td>
    </tr>`;
  }).join("");

  const totalL = transactions.reduce((s, t) => s + (parseFloat(t.quantity_liters) || 0), 0);
  const totalF = transactions.reduce((s, t) => s + (parseFloat(t.total_amount) || 0), 0);

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
<title>Rapport carburant — ${filterLabel}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0} body{font-family:sans-serif;font-size:11px;color:#1a1a1a;padding:36px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;border-bottom:2px solid #1a1a1a;padding-bottom:16px}
  .logo{font-size:18px;font-weight:700}.logo span{color:#1B5E37}
  h1{font-size:15px;font-weight:700;margin-bottom:4px}.meta{color:#888;font-size:10px}
  .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
  .kpi{background:#f9fafb;border-radius:8px;padding:12px 14px;border-left:3px solid #1B5E37}
  .kpi-val{font-size:17px;font-weight:700;color:#1B5E37}.kpi-lbl{font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.8px;margin-top:2px}
  table{width:100%;border-collapse:collapse}
  th{background:#f9fafb;font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:#6b7280;font-weight:700;padding:8px 10px;text-align:left;border-bottom:1px solid #e5e7eb}
  td{padding:7px 10px;border-bottom:1px solid #f3f4f6;color:#374151}
  .tfoot td{background:#f9fafb;font-weight:700;border-top:2px solid #e5e7eb}
  .footer{margin-top:28px;padding-top:12px;border-top:1px solid #eee;display:flex;justify-content:space-between;color:#aaa;font-size:9px}
</style></head><body>
<div class="header"><div><div class="logo">Parc<span>Auto</span> · BOCOM</div></div></div>
<h1>Rapport carburant — ${filterLabel}</h1>
<div class="meta" style="margin-bottom:20px">${transactions.length} transaction(s) · ${period}</div>
<div class="kpis">
  <div class="kpi"><div class="kpi-val">${totalL.toFixed(1)} L</div><div class="kpi-lbl">Total carburant</div></div>
  <div class="kpi"><div class="kpi-val">${fmtNum(Math.round(totalF))} FCFA</div><div class="kpi-lbl">Montant total</div></div>
  <div class="kpi"><div class="kpi-val">${transactions.length}</div><div class="kpi-lbl">Transactions</div></div>
</div>
<table>
  <thead><tr><th>Date</th><th>Chauffeur</th><th>Véhicule</th><th>Type</th><th>Station</th><th style="text-align:right">Litres</th><th style="text-align:right">Prix/L</th><th style="text-align:right">Montant</th><th>Statut</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr><td colspan="5">Total</td><td style="text-align:right">${totalL.toFixed(1)}L</td><td></td><td style="text-align:right">${fmtNum(Math.round(totalF))} F</td><td></td></tr></tfoot>
</table>
<div class="footer"><span>ParcAuto BOCOM</span><span>${transactions.length} transaction(s)</span></div>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("Autorisez les pop-ups pour imprimer."); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 600);
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL TRANSACTION CHAUFFEUR
// ════════════════════════════════════════════════════════════════════════════
function ModalTransaction({ card, reservations, onClose, onSuccess, showToast }) {
  const [form, setForm] = useState({
    transaction_type: card?.category === "BUS_SCOLAIRE" ? "RAMASSAGE" : "MISSION",
    transaction_date: new Date().toISOString().slice(0, 16),
    ville: "Douala", station: "", station_libre: "",
    quantity_liters: "", unit_price: "650", notes: "",
    reservation: "",
  });
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState({});
  const fileRef = useRef();
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); };

  const stationsVille  = BOCOM_STATIONS[form.ville] || [];
  const isAutreVille   = form.ville === "Autre ville" || stationsVille.length === 0;
  const stationFinale  = isAutreVille
    ? (form.station_libre.trim() ? `BOCOM ${form.station_libre.trim()}` : "")
    : form.station;

  const qty        = parseFloat(form.quantity_liters) || 0;
  const price      = parseFloat(form.unit_price) || 0;
  const total      = qty * price;
  const solde      = parseFloat(card?.current_balance || 0);
  const overBudget = total > 0 && total > solde;

  const handleFileChange = (f) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { showToast("Fichier trop volumineux (max 5 Mo)", "error"); return; }
    setFile(f);
    setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  };

  const validate = () => {
    const e = {};
    if (!form.quantity_liters || parseFloat(form.quantity_liters) <= 0) e.qty      = "Quantité en litres obligatoire (doit être > 0).";
    if (!form.unit_price      || parseFloat(form.unit_price)      <= 0) e.price    = "Prix par litre obligatoire (doit être > 0).";
    if (!stationFinale)                                                  e.station  = "Veuillez sélectionner ou saisir la station BOCOM.";
    if (form.transaction_type === "MISSION" && !form.reservation)        e.reservation = "Veuillez lier une mission pour ce type de consommation.";
    if (overBudget)                                                       e.budget  = `Le montant (${fmtMoney(Math.round(total))}) dépasse le solde disponible (${fmtMoney(solde)}).`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("transaction_type", form.transaction_type);
      fd.append("transaction_date", form.transaction_date);
      fd.append("gas_station",      stationFinale);
      fd.append("quantity_liters",  form.quantity_liters);
      fd.append("unit_price",       form.unit_price);
      fd.append("notes",            form.notes);
      if (form.reservation) fd.append("reservation", form.reservation);
      if (file)             fd.append("receipt_photo", file);

      const tok = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/transactions/`, {
        method: "POST", headers: { Authorization: `Bearer ${tok}` }, body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || json?.message || Object.values(json).flat()[0] || "Erreur");
      showToast("Saisie enregistrée — en attente de validation ✓");
      onSuccess();
    } catch (e) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: C.white, borderRadius: 16, width: 600, maxWidth: "96vw", maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Saisir une consommation</div>
              <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>
                BOCOM · {card?.vehicle_info?.make} {card?.vehicle_info?.model} · {card?.vehicle_info?.registration_number}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: C.textLight }}>✕</button>
          </div>
        </div>

        <div style={{ padding: "10px 24px", background: overBudget ? C.redLight : C.greenLight, flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: overBudget ? C.red : C.textMid, fontWeight: 600 }}>
            {overBudget ? "⚠ Montant supérieur au solde disponible" : "💳 Solde disponible"}
          </span>
          <span style={{ fontSize: 16, fontWeight: 800, color: overBudget ? C.red : C.green }}>{fmtMoney(solde)}</span>
        </div>

        <div style={{ overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>

          {/* Type */}
          <div>
            <label style={lbl}>Type de consommation *</label>
            <div style={{ display: "flex", gap: 10 }}>
              {[
                ["RAMASSAGE", "🚌", "Ramassage scolaire"],
                ["MISSION",   "🗺️", "Mission assignée"],
              ].map(([val, icon, label]) => (
                <button key={val} type="button" onClick={() => set("transaction_type", val)}
                  style={{ flex: 1, padding: "11px 14px", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                    border: `2px solid ${form.transaction_type === val ? C.green : C.border}`,
                    background: form.transaction_type === val ? C.greenLight : C.white }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: form.transaction_type === val ? C.green : C.text }}>{label}</div>
                </button>
              ))}
            </div>
          </div>

          {form.transaction_type === "MISSION" && (
            <div>
              <label style={lbl}>Mission liée *</label>
              <select style={errors.reservation ? inpErr : inp} value={form.reservation} onChange={e => set("reservation", e.target.value)}>
                <option value="">— Sélectionner la réservation —</option>
                {(reservations || []).map(r => (
                  <option key={r.id} value={r.id}>{r.requester_name} → {r.destination} · {r.start_date ? new Date(r.start_date).toLocaleDateString("fr-FR") : "—"}</option>
                ))}
              </select>
              <FieldError error={errors.reservation} />
            </div>
          )}

          <div>
            <label style={lbl}>Date et heure *</label>
            <input style={inp} type="datetime-local" value={form.transaction_date} onChange={e => set("transaction_date", e.target.value)} />
          </div>

          {/* Station */}
          <div>
            <label style={lbl}>Station BOCOM *</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: C.textLight, marginBottom: 4 }}>Ville</div>
                <select style={inp} value={form.ville} onChange={e => { set("ville", e.target.value); set("station", ""); set("station_libre", ""); }}>
                  {Object.keys(BOCOM_STATIONS).map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.textLight, marginBottom: 4 }}>Station</div>
                {isAutreVille ? (
                  <div style={{ display: "flex" }}>
                    <div style={{ padding: "9px 12px", background: "#F0F0F0", borderRadius: "8px 0 0 8px", fontSize: 12, fontWeight: 700, color: C.textMid, border: `1.5px solid ${C.border}`, borderRight: "none", whiteSpace: "nowrap" }}>BOCOM</div>
                    <input style={{ ...inp, borderRadius: "0 8px 8px 0" }} value={form.station_libre} onChange={e => set("station_libre", e.target.value)} placeholder="Nom de la station…" />
                  </div>
                ) : (
                  <select style={errors.station ? inpErr : inp} value={form.station} onChange={e => set("station", e.target.value)}>
                    <option value="">— Choisir —</option>
                    {stationsVille.map(s => <option key={s}>{s}</option>)}
                  </select>
                )}
              </div>
            </div>
            {stationFinale && <div style={{ fontSize: 11, color: C.green, fontWeight: 600, marginTop: 5 }}>✓ {stationFinale}</div>}
            <FieldError error={errors.station} />
          </div>

          {/* Quantité + Prix */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Litres *</label>
              <input style={errors.qty ? inpErr : inp} type="number" step="0.1" min="0" value={form.quantity_liters} onChange={e => set("quantity_liters", e.target.value)} placeholder="Ex : 85" />
              <FieldError error={errors.qty} />
            </div>
            <div>
              <label style={lbl}>Prix / litre (FCFA) *</label>
              <input style={errors.price ? inpErr : inp} type="number" value={form.unit_price} onChange={e => set("unit_price", e.target.value)} placeholder="650" />
              <FieldError error={errors.price} />
            </div>
            <div>
              <label style={lbl}>Total calculé</label>
              <div style={{ padding: "9px 12px", borderRadius: 8, background: overBudget ? C.redLight : C.greenLight, fontSize: 14, fontWeight: 800, color: overBudget ? C.red : C.green, border: `1.5px solid ${overBudget ? C.red : C.green}20` }}>
                {total > 0 ? fmtMoney(Math.round(total)) : "—"}
              </div>
              <FieldError error={errors.budget} />
            </div>
          </div>

          {/* Reçu */}
          <div>
            <label style={lbl}>Reçu BOCOM</label>
            <div onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${file ? C.green : C.border}`, borderRadius: 10, padding: 14, cursor: "pointer", background: file ? C.greenLight : C.bg, display: "flex", alignItems: "center", gap: 14 }}>
              <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={e => handleFileChange(e.target.files?.[0])} />
              {preview ? <img src={preview} alt="aperçu" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8 }} /> : <div style={{ fontSize: 28 }}>{file ? "📄" : "🧾"}</div>}
              {file ? (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>{file.name}</div>
                  <button onClick={e => { e.stopPropagation(); setFile(null); setPreview(null); }}
                    style={{ marginTop: 4, fontSize: 10, color: C.red, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>✕ Supprimer</button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 12, color: C.textMid, fontWeight: 600 }}>Photo ou scan du reçu BOCOM</div>
                  <div style={{ fontSize: 11, color: C.textLight }}>JPG, PNG, PDF — max 5 Mo</div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label style={lbl}>Notes (optionnel)</label>
            <input style={inp} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Informations complémentaires…" />
          </div>
        </div>

        <div style={{ padding: "14px 24px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={onClose} style={ghostBtn}>Annuler</button>
          <button onClick={handleSubmit} disabled={saving} style={{ ...btn(C.green), opacity: saving ? 0.7 : 1, minWidth: 160 }}>
            {saving ? <Spinner size={14} color="#fff" /> : null}
            {saving ? "Enregistrement…" : "⛽ Soumettre la saisie"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VUE CHAUFFEUR
// ════════════════════════════════════════════════════════════════════════════
function VueChauffeur({ reservations }) {
  const [card,         setCard]         = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showModal,    setShowModal]    = useState(false);
  const [receiptUrl,   setReceiptUrl]   = useState(null);
  const [toast,        setToast]        = useState({ msg: "", type: "success" });
  const [page,         setPage]         = useState(1);
  const PAGE_SIZE = 10;

  const showToast = (msg, type = "success") => setToast({ msg, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, t] = await Promise.all([
        api("/cards/my-card/").catch(() => null),
        api(`/transactions/?page=${page}&page_size=${PAGE_SIZE}`).catch(() => []),
      ]);
      setCard(c);
      setTransactions(Array.isArray(t) ? t : t?.results ?? []);
    } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner size={28} /></div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Toast msg={toast.msg} type={toast.type} onDone={() => setToast({ msg: "" })} />
      {receiptUrl && <ModalReceiptViewer url={receiptUrl} onClose={() => setReceiptUrl(null)} />}

      {!card ? (
        <div style={{ background: C.white, borderRadius: 12, padding: "40px 20px", textAlign: "center", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💳</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Aucune carte carburant assignée</div>
          <div style={{ fontSize: 12, color: C.textLight, marginTop: 6 }}>Contactez le gestionnaire du parc automobile.</div>
        </div>
      ) : (
        <>
          {(card.usage_pct || 0) >= 80 && (
            <div style={{ background: (card.usage_pct || 0) >= 100 ? C.redLight : C.amberLight, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, border: `1px solid ${(card.usage_pct || 0) >= 100 ? C.red : C.amber}30` }}>
              <span style={{ fontSize: 20 }}>{(card.usage_pct || 0) >= 100 ? "🔴" : "⚠️"}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: (card.usage_pct || 0) >= 100 ? C.red : C.amber }}>
                  {(card.usage_pct || 0) >= 100 ? "Solde épuisé — carte inactive" : `Budget presque épuisé (${fmtPct(card.usage_pct)} utilisé)`}
                </div>
                <div style={{ fontSize: 11, color: C.textMid }}>Contactez le gestionnaire pour un rechargement.</div>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start" }}>
            <CardVisual card={card} selected={false} onClick={() => {}} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Budget mensuel",   val: fmtMoney(card.monthly_quota),                                    color: C.blue  },
                { label: "Consommé ce mois", val: fmtMoney(card.monthly_quota - (card.current_balance || 0)),      color: C.amber },
                { label: "Solde restant",    val: fmtMoney(card.current_balance),                                  color: C.green },
              ].map((s, i) => (
                <div key={i} style={{ background: C.white, borderRadius: 10, padding: "12px 16px", border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 10, color: C.textLight, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: C.white, borderRadius: 10, padding: "12px 16px", border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
              <span style={{ color: C.textMid, fontWeight: 600 }}>Utilisation du budget mensuel</span>
              <span style={{ fontWeight: 700, color: (card.usage_pct || 0) >= 100 ? C.red : (card.usage_pct || 0) >= 80 ? C.amber : C.green }}>{fmtPct(card.usage_pct)}</span>
            </div>
            <ProgressBar pct={card.usage_pct} height={8} />
          </div>

          <button onClick={() => setShowModal(true)} disabled={(card.usage_pct || 0) >= 100}
            style={{ ...btn(C.green), justifyContent: "center", padding: "13px 24px", fontSize: 14, opacity: (card.usage_pct || 0) >= 100 ? 0.5 : 1 }}>
            ⛽ Saisir une consommation carburant
          </button>

          {/* Historique */}
          <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>Mes saisies carburant</div>
              <button onClick={() => printTransactionsPDF(transactions, "Mes saisies", "Historique personnel")}
                style={{ ...ghostBtn, fontSize: 11, padding: "5px 12px", display: "flex", alignItems: "center", gap: 5 }}>🖨️ Imprimer</button>
            </div>
            {transactions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 0", color: C.textLight, fontSize: 13 }}>Aucune saisie enregistrée</div>
            ) : transactions.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", borderBottom: i < transactions.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: C.amberLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>⛽</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{t.quantity_liters}L · {fmtMoney(t.total_amount)}</div>
                  <div style={{ fontSize: 11, color: C.textLight, marginTop: 1 }}>{fmtDate(t.transaction_date)} · {t.gas_station || "—"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <StatusPill status={t.status} />
                  {t.status === "REJETE" && t.rejection_reason && (
                    <div style={{ fontSize: 10, color: C.red, marginTop: 4, maxWidth: 180 }}>{t.rejection_reason}</div>
                  )}
                  {t.receipt_photo_url && (
                    <button onClick={() => setReceiptUrl(t.receipt_photo_url)}
                      style={{ fontSize: 10, color: C.blue, background: "none", border: `1px solid ${C.blue}30`, borderRadius: 5, padding: "2px 7px", cursor: "pointer", marginTop: 4, fontFamily: "inherit" }}>
                      🧾 Voir reçu
                    </button>
                  )}
                </div>
              </div>
            ))}
            {transactions.length === PAGE_SIZE && (
              <div style={{ padding: "10px 18px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, justifyContent: "center" }}>
                {page > 1 && <button onClick={() => setPage(p => p - 1)} style={{ ...ghostBtn, fontSize: 11, padding: "5px 12px" }}>← Précédent</button>}
                <span style={{ fontSize: 11, color: C.textMid, padding: "5px 0" }}>Page {page}</span>
                <button onClick={() => setPage(p => p + 1)} style={{ ...ghostBtn, fontSize: 11, padding: "5px 12px" }}>Suivant →</button>
              </div>
            )}
          </div>
        </>
      )}

      {showModal && card && (
        <ModalTransaction card={card} reservations={reservations || []} onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); load(); }} showToast={showToast} />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VUE GESTIONNAIRE
// ════════════════════════════════════════════════════════════════════════════
function VueGestionnaire() {
  const [cards,        setCards]        = useState([]);
  const [dashboard,    setDashboard]    = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [totalTx,      setTotalTx]      = useState(0);
  const [selCard,      setSelCard]      = useState(null);
  const [activeTab,    setActiveTab]    = useState("cartes");
  const [loading,      setLoading]      = useState(true);
  const [txLoading,    setTxLoading]    = useState(false);
  const [toast,        setToast]        = useState({ msg: "", type: "success" });
  const [filterStatus, setFilterStatus] = useState("EN_ATTENTE");
  const [filterType,   setFilterType]   = useState("");
  const [searchTx,     setSearchTx]     = useState("");
  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeForm, setRechargeForm] = useState({ amount: "", notes: "" });
  const [rechargeHistory, setRechargeHistory] = useState([]);
  const [cardFormMode, setCardFormMode] = useState(null); // null | "create" | cardObj
  const [page,         setPage]         = useState(1);
  const [actioning,    setActioning]    = useState(null);
  const [rejectModal,  setRejectModal]  = useState(null);
  const [bulkSelected, setBulkSelected] = useState([]);
  const [bulkLoading,  setBulkLoading]  = useState(false);
  const [receiptUrl,   setReceiptUrl]   = useState(null);
  const [deleteModal,  setDeleteModal]  = useState(null); // null | cardObj
  const [deleting,     setDeleting]     = useState(false);
  const PAGE_SIZE = 15;
  const now = new Date();

  const showToast = (msg, type = "success") => setToast({ msg, type });

  const loadCards = useCallback(async () => {
    try {
      const [c, d] = await Promise.all([
        api("/cards/").catch(() => []),
        api("/cards/dashboard/").catch(() => null),
      ]);
      setCards(Array.isArray(c) ? c : c?.results ?? []);
      setDashboard(d);
    } catch {}
  }, []);

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const params = new URLSearchParams({ page, page_size: PAGE_SIZE });
      if (filterStatus) params.append("status", filterStatus);
      if (filterType)   params.append("transaction_type", filterType);
      if (searchTx)     params.append("search", searchTx);
      const t = await api(`/transactions/?${params}`).catch(() => []);
      const list = Array.isArray(t) ? t : t?.results ?? [];
      setTransactions(list);
      setTotalTx(t?.count || list.length);
    } finally { setTxLoading(false); }
  }, [filterStatus, filterType, searchTx, page]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadCards(), loadTransactions()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (activeTab === "transactions") { setPage(1); loadTransactions(); } }, [filterStatus, filterType]);
  useEffect(() => { if (activeTab === "transactions") loadTransactions(); }, [page]);
  useEffect(() => {
    if (activeTab !== "transactions") return;
    const t = setTimeout(() => { setPage(1); loadTransactions(); }, 350);
    return () => clearTimeout(t);
  }, [searchTx]);

  const handleValider = async (txId) => {
    setActioning(txId);
    try {
      await api(`/transactions/${txId}/valider/`, { method: "POST", body: JSON.stringify({ action: "VALIDE" }) });
      showToast("Transaction validée ✓");
      loadTransactions(); loadCards();
    } catch (e) { showToast(e.message, "error"); }
    finally { setActioning(null); }
  };

  const handleRejeter = async (txId, reason) => {
    setActioning(txId);
    try {
      await api(`/transactions/${txId}/valider/`, { method: "POST", body: JSON.stringify({ action: "REJETE", reason }) });
      showToast("Transaction rejetée");
      setRejectModal(null);
      loadTransactions();
    } catch (e) { showToast(e.message, "error"); }
    finally { setActioning(null); }
  };

  const handleBulkValider = async () => {
    if (!bulkSelected.length) return;
    setBulkLoading(true);
    try {
      await Promise.all(bulkSelected.map(id =>
        api(`/transactions/${id}/valider/`, { method: "POST", body: JSON.stringify({ action: "VALIDE" }) })
      ));
      showToast(`${bulkSelected.length} transaction(s) validée(s) ✓`);
      setBulkSelected([]);
      loadTransactions(); loadCards();
    } catch (e) { showToast(e.message, "error"); }
    finally { setBulkLoading(false); }
  };

  const handleRecharge = async () => {
    if (!selCard || !rechargeForm.amount) { showToast("Montant requis", "error"); return; }
    try {
      await api(`/cards/${selCard.id}/recharge/`, {
        method: "POST",
        body: JSON.stringify({ month: now.getMonth() + 1, year: now.getFullYear(), allocated_amount: rechargeForm.amount, notes: rechargeForm.notes }),
      });
      showToast("Carte rechargée ✓");
      setShowRecharge(false);
      setRechargeForm({ amount: "", notes: "" });
      loadCards();
    } catch (e) { showToast(e.message, "error"); }
  };

  const handleDeleteCard = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      await api(`/cards/${deleteModal.id}/`, { method: "DELETE" });
      showToast("Carte supprimée");
      setDeleteModal(null);
      setSelCard(null);
      loadCards();
    } catch (e) { showToast(e.message, "error"); }
    finally { setDeleting(false); }
  };

  const loadRechargeHistory = async (cardId) => {
    try {
      const h = await api(`/cards/${cardId}/recharges/`).catch(() => []);
      setRechargeHistory(Array.isArray(h) ? h : h?.results ?? []);
    } catch { setRechargeHistory([]); }
  };

  const alertCards   = cards.filter(c => (c.usage_pct || 0) >= 80);
  const pendingCount = transactions.filter(t => t.status === "EN_ATTENTE").length;
  const totalPages   = Math.ceil(totalTx / PAGE_SIZE);

  const TABS = [
    { id: "cartes",       label: "Cartes",       icon: "💳", badge: alertCards.length, badgeColor: C.amber },
    { id: "transactions", label: "Transactions", icon: "⛽", badge: pendingCount,      badgeColor: C.red   },
    { id: "stats",        label: "Statistiques", icon: "📊" },
  ];

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner size={28} /></div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.65} }
      `}</style>
      <Toast msg={toast.msg} type={toast.type} onDone={() => setToast({ msg: "" })} />
      {receiptUrl && <ModalReceiptViewer url={receiptUrl} onClose={() => setReceiptUrl(null)} />}
      {deleteModal && (
        <ModalConfirmDelete
          label={`${deleteModal.card_network} · ${deleteModal.vehicle_info?.registration_number || deleteModal.card_number_masked}`}
          onClose={() => setDeleteModal(null)}
          onConfirm={handleDeleteCard}
          loading={deleting}
        />
      )}

      {/* Alertes globales */}
      {alertCards.length > 0 && (
        <div style={{ background: C.amberLight, borderRadius: 10, padding: "10px 16px", border: `1px solid ${C.amber}30`, display: "flex", alignItems: "center", gap: 10 }}>
          <span>⚠️</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.amber }}>{alertCards.length} carte(s) à surveiller : </span>
            <span style={{ fontSize: 12, color: C.textMid }}>
              {alertCards.map(c => `${c.vehicle_info?.registration_number || "—"} (${Math.round(c.usage_pct || 0)}%)`).join(" · ")}
            </span>
          </div>
          <button onClick={() => setActiveTab("cartes")} style={{ fontSize: 11, color: C.amber, background: "none", border: `1px solid ${C.amber}40`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
            Voir →
          </button>
        </div>
      )}

      {/* KPIs */}
      {dashboard && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[
            { label: "Budget mensuel total",  val: fmtMoney(dashboard.budget_total),   color: C.blue,  icon: "💰" },
            { label: "Consommé ce mois",      val: fmtMoney(dashboard.consumed_total), color: C.amber, icon: "⛽",
              sub: `${fmtPct(dashboard.usage_pct)} du budget`, subColor: (dashboard.usage_pct || 0) > 85 ? C.red : C.amber },
            { label: "Cartes actives",        val: `${dashboard.active_cards} / ${dashboard.total_cards}`, color: C.green, icon: "💳" },
            { label: "Saisies en attente",    val: dashboard.pending_transactions, color: dashboard.pending_transactions > 0 ? C.red : C.textLight, icon: "📋" },
          ].map((k, i) => (
            <div key={i} style={{ background: C.white, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.border}`, borderTop: `3px solid ${k.color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.textLight, textTransform: "uppercase", letterSpacing: "1px" }}>{k.label}</div>
                <span style={{ fontSize: 16 }}>{k.icon}</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.val}</div>
              {k.sub && <div style={{ fontSize: 10, color: k.subColor || C.textLight, marginTop: 4, fontWeight: 600 }}>{k.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, background: C.bg, padding: 5, borderRadius: 10, border: `1px solid ${C.border}` }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => {
            setActiveTab(t.id);
            if (t.id === "transactions" || t.id === "stats") loadTransactions();
          }}
            style={{ flex: 1, padding: "8px 14px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: "none",
              background: activeTab === t.id ? C.white : "transparent", color: activeTab === t.id ? C.green : C.textMid,
              boxShadow: activeTab === t.id ? "0 1px 4px rgba(0,0,0,.08)" : "none",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {t.icon} {t.label}
            {(t.badge || 0) > 0 && (
              <span style={{ background: t.badgeColor || C.red, color: "#fff", borderRadius: 99, fontSize: 9, fontWeight: 800, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════ CARTES ════ */}
      {activeTab === "cartes" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, color: C.textLight }}>{cards.length} carte{cards.length > 1 ? "s" : ""} enregistrée{cards.length > 1 ? "s" : ""}</div>
            <button onClick={() => setCardFormMode("create")} style={btn(C.green)}>+ Créer une carte</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
            {cards.map(c => (
              <CardVisual key={c.id} card={c} selected={selCard?.id === c.id}
                onClick={() => { setSelCard(selCard?.id === c.id ? null : c); if (selCard?.id !== c.id) loadRechargeHistory(c.id); }} />
            ))}
          </div>

          {selCard && (
            <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>BOCOM · {selCard.vehicle_info?.make} {selCard.vehicle_info?.model}</div>
                  <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>{selCard.vehicle_info?.registration_number} · {selCard.card_number_masked}</div>
                  {selCard.vehicle_info?.assigned_driver && <div style={{ fontSize: 12, color: C.textMid, marginTop: 4 }}>👤 {selCard.vehicle_info.assigned_driver}</div>}
                </div>
                {/* Actions : Recharger + Modifier + Supprimer */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={() => setShowRecharge(true)} style={btn(C.green)}>💳 Recharger</button>
                  <button onClick={() => setCardFormMode(selCard)}
                    style={{ ...ghostBtn, display: "flex", alignItems: "center", gap: 5, fontSize: 12, padding: "8px 14px" }}>
                    ✏️ Modifier
                  </button>
                  <button onClick={() => setDeleteModal(selCard)}
                    style={{ ...ghostBtn, color: C.red, borderColor: `${C.red}50`, display: "flex", alignItems: "center", gap: 5, fontSize: 12, padding: "8px 14px" }}>
                    🗑️ Supprimer
                  </button>
                </div>
              </div>

              <div style={{ padding: "14px 20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 12 }}>
                  {[
                    { label: "Quota mensuel",    val: fmtMoney(selCard.monthly_quota),                                   color: C.blue  },
                    { label: "Consommé ce mois", val: fmtMoney(selCard.monthly_quota - (selCard.current_balance || 0)),  color: C.amber },
                    { label: "Solde disponible", val: fmtMoney(selCard.current_balance),                                 color: C.green },
                  ].map((f, i) => (
                    <div key={i} style={{ background: C.bg, borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: 9, color: C.textLight, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>{f.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: f.color }}>{f.val}</div>
                    </div>
                  ))}
                </div>
                <ProgressBar pct={selCard.usage_pct} height={8} />
                <div style={{ fontSize: 10, color: C.textLight, marginTop: 4 }}>{fmtPct(selCard.usage_pct)} du budget utilisé</div>

                {rechargeHistory.length > 0 && (
                  <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textMid, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Historique des rechargements</div>
                    {rechargeHistory.slice(0, 6).map((r, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < Math.min(rechargeHistory.length, 6) - 1 ? `1px solid ${C.border}` : "none" }}>
                        <div style={{ fontSize: 11, color: C.textMid }}>{fmtDate(r.created_at)} · {r.notes || "Rechargement standard"}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.green }}>{fmtMoney(r.allocated_amount)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modal recharge */}
          {showRecharge && selCard && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
              <div style={{ background: C.white, borderRadius: 14, padding: 28, width: 480, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 4 }}>Recharger la carte</div>
                <div style={{ fontSize: 12, color: C.textLight, marginBottom: 20 }}>
                  BOCOM · {selCard.vehicle_info?.registration_number} · {MOIS[now.getMonth()]} {now.getFullYear()}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>Montant à allouer (FCFA) *</label>
                  <input style={inp} type="number" value={rechargeForm.amount}
                    onChange={e => setRechargeForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder={`Quota par défaut : ${Number(selCard.monthly_quota || 0).toLocaleString("fr-FR")} FCFA`} />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    {[selCard.monthly_quota, Math.round(selCard.monthly_quota * 0.75), Math.round(selCard.monthly_quota * 0.5)].map(v => (
                      <button key={v} onClick={() => setRechargeForm(f => ({ ...f, amount: v }))} type="button"
                        style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                          border: `1px solid ${C.border}`, background: rechargeForm.amount == v ? C.greenLight : C.bg, color: rechargeForm.amount == v ? C.green : C.textMid }}>
                        {Number(v).toLocaleString("fr-FR")}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={lbl}>Notes</label>
                  <input style={inp} value={rechargeForm.notes} onChange={e => setRechargeForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder={`Ex : Recharge standard BOCOM — ${MOIS[now.getMonth()]} ${now.getFullYear()}`} />
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowRecharge(false)} style={ghostBtn}>Annuler</button>
                  <button onClick={handleRecharge} style={btn(C.green)}>Confirmer la recharge</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ════ TRANSACTIONS ════ */}
      {activeTab === "transactions" && (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 6, background: C.bg, padding: 4, borderRadius: 8, border: `1px solid ${C.border}` }}>
              {[["EN_ATTENTE","⏳ En attente"], ["VALIDE","✓ Validées"], ["REJETE","✗ Rejetées"], ["","Toutes"]].map(([v, l]) => (
                <button key={v} onClick={() => { setFilterStatus(v); setPage(1); }}
                  style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: "none",
                    background: filterStatus === v ? C.white : "transparent", color: filterStatus === v ? C.green : C.textMid,
                    boxShadow: filterStatus === v ? "0 1px 4px rgba(0,0,0,.08)" : "none" }}>
                  {l}
                </button>
              ))}
            </div>
            <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}
              style={{ ...inp, width: "auto", padding: "6px 10px", fontSize: 11 }}>
              <option value="">Tous types</option>
              <option value="RAMASSAGE">🚌 Ramassage</option>
              <option value="MISSION">🗺️ Mission</option>
            </select>
            <input value={searchTx} onChange={e => setSearchTx(e.target.value)} placeholder="🔍 Chauffeur, véhicule, station…"
              style={{ ...inp, width: 220, padding: "6px 12px", fontSize: 12 }} />
            <div style={{ flex: 1 }} />
            {bulkSelected.length > 0 && (
              <button onClick={handleBulkValider} disabled={bulkLoading}
                style={{ ...btn(C.green), opacity: bulkLoading ? 0.7 : 1, fontSize: 12 }}>
                {bulkLoading ? <Spinner size={13} color="#fff" /> : null}
                ✓ Valider ({bulkSelected.length})
              </button>
            )}
            <button onClick={() => printTransactionsPDF(transactions, filterStatus || "Toutes", `${MOIS[now.getMonth()]} ${now.getFullYear()}`)}
              style={{ ...ghostBtn, fontSize: 11, padding: "6px 14px", display: "flex", alignItems: "center", gap: 5 }}>🖨️ Imprimer</button>
          </div>

          {totalTx > 0 && <div style={{ fontSize: 11, color: C.textLight }}>{totalTx} transaction(s) · page {page}/{totalPages || 1}</div>}

          <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
            {txLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Spinner size={24} /></div>
            ) : transactions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: C.textLight }}>
                <div style={{ fontSize: 30, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 13 }}>Aucune transaction</div>
              </div>
            ) : transactions.map((t, i) => {
              const isSelected  = bulkSelected.includes(t.id);
              const isActioning = actioning === t.id;
              return (
                <div key={t.id} style={{
                  padding: "12px 18px", borderBottom: i < transactions.length - 1 ? `1px solid ${C.border}` : "none",
                  display: "flex", alignItems: "center", gap: 12, opacity: isActioning ? 0.6 : 1,
                  background: isSelected ? C.greenXLight : "transparent",
                }}>
                  {t.status === "EN_ATTENTE" ? (
                    <input type="checkbox" checked={isSelected}
                      onChange={e => setBulkSelected(prev => e.target.checked ? [...prev, t.id] : prev.filter(id => id !== t.id))}
                      style={{ width: 15, height: 15, cursor: "pointer", flexShrink: 0, accentColor: C.green }} />
                  ) : <div style={{ width: 15, flexShrink: 0 }} />}

                  <div style={{ width: 40, height: 40, borderRadius: 10, background: C.amberLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>⛽</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{t.driver_name} · {t.vehicle_name}</span>
                      <StatusPill status={t.status} />
                      <span style={{ fontSize: 10, color: C.textLight, background: C.bg, padding: "1px 7px", borderRadius: 99 }}>
                        {t.transaction_type === "RAMASSAGE" ? "🚌 Ramassage" : "🗺️ Mission"}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: C.textMid }}>
                      {t.quantity_liters}L · {fmtMoney(t.total_amount)} · {fmtDT(t.transaction_date)}
                      {t.gas_station && ` · ${t.gas_station}`}
                    </div>
                    {t.status === "REJETE" && t.rejection_reason && (
                      <div style={{ fontSize: 10, color: C.red, marginTop: 3 }}>Motif : {t.rejection_reason}</div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                    {/* Reçu — viewer interne */}
                    {t.receipt_photo_url && (
                      <button onClick={() => setReceiptUrl(t.receipt_photo_url)}
                        style={{ fontSize: 11, color: C.blue, background: C.blueLight, border: `1px solid ${C.blue}20`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}>
                        🧾 Reçu
                      </button>
                    )}
                    {t.status === "EN_ATTENTE" && (
                      <>
                        <button onClick={() => handleValider(t.id)} disabled={isActioning}
                          style={{ ...btn(C.green), padding: "5px 12px", fontSize: 11, minWidth: 80, opacity: isActioning ? 0.6 : 1 }}>
                          {isActioning ? <Spinner size={12} color="#fff" /> : "✓ Valider"}
                        </button>
                        <button onClick={() => setRejectModal(t.id)} disabled={isActioning}
                          style={{ ...ghostBtn, color: C.red, borderColor: `${C.red}50`, padding: "5px 10px", fontSize: 11 }}>✕</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
              <button onClick={() => setPage(1)} disabled={page === 1} style={{ ...ghostBtn, padding: "5px 10px", fontSize: 11, opacity: page === 1 ? 0.4 : 1 }}>«</button>
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1} style={{ ...ghostBtn, padding: "5px 12px", fontSize: 11, opacity: page === 1 ? 0.4 : 1 }}>‹ Précédent</button>
              <span style={{ fontSize: 12, color: C.textMid, padding: "5px 12px" }}>Page {page} / {totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} style={{ ...ghostBtn, padding: "5px 12px", fontSize: 11, opacity: page >= totalPages ? 0.4 : 1 }}>Suivant ›</button>
              <button onClick={() => setPage(totalPages)} disabled={page >= totalPages} style={{ ...ghostBtn, padding: "5px 10px", fontSize: 11, opacity: page >= totalPages ? 0.4 : 1 }}>»</button>
            </div>
          )}
        </>
      )}

      {/* ════ STATISTIQUES ════ */}
      {activeTab === "stats" && (
        <StatsView
          dashboard={dashboard}
          cards={cards}
          transactions={transactions}
          printPDF={() =>
            printTransactionsPDF(transactions, "Rapport mensuel complet", `${MOIS[now.getMonth()]} ${now.getFullYear()}`)
          }
        />
      )}

      {/* Modals globaux */}
      {cardFormMode !== null && (
        <ModalCarteForm
          editCard={cardFormMode === "create" ? null : cardFormMode}
          onClose={() => setCardFormMode(null)}
          onSuccess={() => {
            setCardFormMode(null);
            setSelCard(null);
            loadCards();
          }}
          showToast={showToast}
        />
      )}
      {rejectModal && (
        <ModalRejet
          onClose={() => setRejectModal(null)}
          onConfirm={reason => handleRejeter(rejectModal, reason)}
          loading={actioning === rejectModal}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORT PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export function TabCarburant({ role = "GESTIONNAIRE", reservations = [] }) {
  return role === "CHAUFFEUR"
    ? <VueChauffeur reservations={reservations} />
    : <VueGestionnaire />;
}