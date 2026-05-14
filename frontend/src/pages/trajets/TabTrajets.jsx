// ─── pages/trajets/TabTrajets.jsx ────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const API_BASE = "http://localhost:8000/api/v1";

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (res.status === 204) return null;
  const json = await res.json();
  if (!res.ok) throw new Error(json?.detail || json?.message || json?.data?.message || `Erreur ${res.status}`);
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

const IUC_POS  = [4.0841, 9.7808];
const IUC_NOM  = "IUC Logbessou, Douala";
const BONA_POS = [4.0641, 9.7508];

const makeIcon = (emoji, bg) => new L.DivIcon({
  html: `<div style="background:${bg};color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)">${emoji}</div>`,
  className: "", iconSize: [32, 32], iconAnchor: [16, 16],
});

const iconIUC  = makeIcon("🏫", "#1B5E37");
const iconBus  = makeIcon("🚌", "#D97706");
const iconDest = makeIcon("📍", "#1D4ED8");
const iconMe   = makeIcon("🚗", "#1B5E37");

function MapFitter({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [40, 40], animate: true });
  }, [bounds]);
  return null;
}

function MapPanner({ pos }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.panTo(pos, { animate: true, duration: 0.8 });
  }, [pos]);
  return null;
}

// ── Chrono basé sur actual_start_date (persistant même après refresh) ─────────
function LiveTimer({ startIso }) {
  const startMs = new Date(startIso).getTime();
  const [el, setEl] = useState(Date.now() - startMs);
  useEffect(() => {
    const t = setInterval(() => setEl(Date.now() - startMs), 1000);
    return () => clearInterval(t);
  }, [startMs]);
  const h = String(Math.floor(el / 3600000)).padStart(2, "0");
  const m = String(Math.floor((el % 3600000) / 60000)).padStart(2, "0");
  const s = String(Math.floor((el % 60000) / 1000)).padStart(2, "0");
  return (
    <span style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: C.green, letterSpacing: 2 }}>
      {h}:{m}:{s}
    </span>
  );
}

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
  : "—";

const fmtTime = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  const h = dt.getHours(), m = dt.getMinutes();
  if (h === 0 && m === 0) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// ─────────────────────────────────────────────────────────────────────────────
export function TabTrajets({ vehicule }) {
  const [missions,   setMissions]   = useState([]); // APPROUVEE + EN_COURS
  const [historique, setHistorique] = useState([]); // TERMINEE
  const [loading,    setLoading]    = useState(true);

  const [missionSel, setMissionSel] = useState(null);
  const [showDrop,   setShowDrop]   = useState(false);

  // ── CORRECTION : phase basée sur le statut réel de la mission ──────────────
  // "IDLE"    = mission APPROUVEE, pas encore démarrée
  // "RUNNING" = mission EN_COURS (démarrée par le chauffeur)
  const [kmDepart,   setKmDepart]   = useState("");
  const [kmArrivee,  setKmArrivee]  = useState("");
  const [passagers,  setPassagers]  = useState("");
  const [saving,     setSaving]     = useState(false);

  // GPS
  const [currentPos,  setCurrentPos]  = useState(null);
  const [trackPoints, setTrackPoints] = useState([]);
  const [speed,       setSpeed]       = useState(0);
  const [distDone,    setDistDone]    = useState(0);
  const [geoError,    setGeoError]    = useState("");
  const [destCoords,  setDestCoords]  = useState(null);

  const watchRef   = useRef(null);
  const lastPosRef = useRef(null);

  const [logs, setLogs] = useState(["En attente de démarrage…"]);
  const addLog = (msg) => {
    const t = new Date().toLocaleTimeString("fr-FR");
    setLogs(l => [...l.slice(-20), `[${t}] ${msg}`]);
  };

  const [toast, setToast] = useState({ msg: "", type: "success" });
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "success" }), 4500);
  };

  // ── Chargement des missions ────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mR, hR] = await Promise.all([
        apiFetch("/reservations/?driver=me").catch(() => null),
        apiFetch("/reservations/?driver=me&status=TERMINEE").catch(() => null),
      ]);
      const all = Array.isArray(mR) ? mR : mR?.results ?? [];
      // Missions actives = APPROUVEE + EN_COURS
      const actives   = all.filter(m => ["APPROUVEE", "EN_COURS"].includes(m.status));
      const terminees = Array.isArray(hR) ? hR : hR?.results ?? [];
      setMissions(actives);
      setHistorique(terminees);

      // ── IMPORTANT : si une mission est déjà EN_COURS au rechargement,
      //    on la resélectionne automatiquement et on remet en phase RUNNING
      const enCours = actives.find(m => m.status === "EN_COURS");
      if (enCours && !missionSel) {
        setMissionSel({ ...enCours, isFixed: false, type: "MISSION" });
        if (enCours.destination) geocodeDest(enCours.destination);
        addLog(`Mission EN COURS restaurée : → ${enCours.destination}`);
      }
    } catch { /* empty */ }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => {
    if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
  }, []);

  // ── Dériver la phase depuis le statut réel ─────────────────────────────────
  // JAMAIS depuis un état local — toujours depuis la base
  const phase = missionSel?.status === "EN_COURS" ? "RUNNING" : "IDLE";

  // ── Stats ──────────────────────────────────────────────────────────────────
  const local   = JSON.parse(localStorage.getItem("driveparc_trajets") || "[]");
  const tous    = [...historique, ...local];
  const totalKm = tous.reduce((s, t) => s + Math.max(0,
    ((t.end_mileage||0)-(t.start_mileage||0)) ||
    ((t.km_arrivee||0)-(t.km_depart||0)) ||
    t.estimated_distance || 0), 0);
  const totalPass = tous.reduce((s, t) => s + (t.number_of_passengers || t.passagers || 0), 0);

  // ── GPS ────────────────────────────────────────────────────────────────────
  const updatePos = useCallback((lat, lng, spd = 0) => {
    const pos = [lat, lng];
    const kmh = Math.round((spd || 0) * 3.6);
    setSpeed(kmh);
    if (lastPosRef.current) {
      const R    = 6371;
      const dLat = (lat - lastPosRef.current[0]) * Math.PI / 180;
      const dLng = (lng - lastPosRef.current[1]) * Math.PI / 180;
      const a    = Math.sin(dLat/2)**2 + Math.cos(lastPosRef.current[0]*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLng/2)**2;
      const d    = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      setDistDone(prev => Math.round((prev + d) * 10) / 10);
    }
    lastPosRef.current = pos;
    setCurrentPos(pos);
    setTrackPoints(prev => [...prev, pos]);
    addLog(`📍 ${lat.toFixed(4)}, ${lng.toFixed(4)} · ${kmh} km/h`);
  }, []);

  const geocodeDest = async (dest) => {
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(dest + ", Douala, Cameroun")}&format=json&limit=1`);
      const json = await res.json();
      if (json[0]) {
        const coords = [parseFloat(json[0].lat), parseFloat(json[0].lon)];
        setDestCoords(coords);
        addLog(`Destination résolue : ${dest}`);
        return coords;
      }
    } catch { addLog("Impossible de géocoder la destination"); }
    return null;
  };

  const startGPS = () => {
    if (!navigator.geolocation) { setGeoError("Géolocalisation non supportée."); return; }
    setTrackPoints([]);
    lastPosRef.current = null;
    addLog("▶ Suivi GPS démarré");
    watchRef.current = navigator.geolocation.watchPosition(
      pos => updatePos(pos.coords.latitude, pos.coords.longitude, pos.coords.speed),
      err => { setGeoError(err.code === 1 ? "Accès GPS refusé." : "Position introuvable."); addLog("Erreur GPS"); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    );
  };

  const selMission = async (m) => {
    setMissionSel(m);
    setShowDrop(false);
    setTrackPoints([]);
    setCurrentPos(null);
    setDistDone(0);
    setSpeed(0);
    lastPosRef.current = null;
    setGeoError("");

    const dest = m.isFixed ? null : m.destination;
    if (m.isFixed) {
      setDestCoords(BONA_POS);
    } else if (dest) {
      await geocodeDest(dest);
    }

    // Si la mission est déjà EN_COURS (rechargement de page), démarrer GPS direct
    if (m.status === "EN_COURS") {
      addLog(`Mission EN COURS restaurée → ${dest || "Bonamoussadi"}`);
      startGPS();
    } else {
      addLog(`Mission sélectionnée → ${dest || "Bonamoussadi"}`);
    }
  };

  // ── DÉMARRER : appelle /start/ sur le backend ──────────────────────────────
  // Le backend va :
  //   - passer la réservation EN_COURS
  //   - passer le véhicule EN_SERVICE
  const demarrer = async () => {
    if (!missionSel)  { showToast("Sélectionnez une mission", "error"); return; }
    if (!kmDepart)    { showToast("Entrez le kilométrage de départ", "error"); return; }

    // Mission ramassage fixe = pas d'appel API (pas de réservation liée)
    if (missionSel.isFixed) {
      // Démarrer juste le GPS local pour la ligne de bus
      startGPS();
      setMissionSel(prev => ({ ...prev, status: "EN_COURS", actual_start_date: new Date().toISOString() }));
      showToast("Ramassage démarré ✓");
      return;
    }

    setSaving(true);
    try {
      // ── Appel backend : démarre le trajet, véhicule → EN_SERVICE ───────────
      const result = await apiFetch(`/reservations/${missionSel.id}/start/`, {
        method: "POST",
        body: JSON.stringify({
          start_mileage: parseInt(kmDepart) || 0,
        }),
      });

      // Mettre à jour la mission locale avec le statut retourné
      setMissionSel(prev => ({
        ...prev,
        status:            "EN_COURS",
        actual_start_date: result?.actual_start_date || new Date().toISOString(),
      }));

      // Démarrer le GPS
      startGPS();
      showToast("Trajet démarré ✓ — Véhicule passé en service");
      addLog("✅ Backend confirmé : réservation EN_COURS, véhicule EN_SERVICE");

      // Recharger les missions en arrière-plan
      load();
    } catch (e) {
      showToast(e.message || "Erreur au démarrage", "error");
      addLog(`❌ Erreur démarrage : ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ── TERMINER : appelle /complete/ sur le backend ───────────────────────────
  // Le backend va :
  //   - passer la réservation TERMINEE
  //   - repasser le véhicule DISPONIBLE
  const terminer = async () => {
    if (!kmArrivee) { showToast("Entrez le kilométrage d'arrivée", "error"); return; }

    // Arrêter GPS
    if (watchRef.current) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    addLog(`⏹ Fin de trajet · ${distDone} km parcourus`);

    setSaving(true);
    try {
      const endPosArr = currentPos || IUC_POS;

      // Mission ramassage fixe = pas d'appel API
      if (missionSel?.isFixed) {
        // Sauvegarder en localStorage uniquement
        const l = JSON.parse(localStorage.getItem("driveparc_trajets") || "[]");
        l.unshift({
          id: Date.now(), date: new Date().toISOString().split("T")[0],
          type: "RAMASSAGE", depart: IUC_NOM, arrivee: "Bonamoussadi",
          km_depart:  parseInt(kmDepart)  || 0,
          km_arrivee: parseInt(kmArrivee) || 0,
          passagers:  parseInt(passagers) || 0,
        });
        localStorage.setItem("driveparc_trajets", JSON.stringify(l.slice(0, 50)));
        showToast("Ramassage enregistré ✓");
      } else {
        // ── Appel backend : termine le trajet, véhicule → DISPONIBLE ─────────
        await apiFetch(`/reservations/${missionSel.id}/complete/`, {
          method: "POST",
          body: JSON.stringify({
            end_mileage: parseInt(kmArrivee) || 0,
            passengers:  parseInt(passagers) || missionSel?.number_of_passengers || 0,
            end_lat:     endPosArr[0],
            end_lng:     endPosArr[1],
            distance_km: distDone,
          }),
        });

        showToast("Trajet terminé ✓ — Véhicule repassé disponible");
        addLog("✅ Backend confirmé : réservation TERMINEE, véhicule DISPONIBLE");
      }

      // Reset de l'interface
      setMissionSel(null);
      setKmDepart(""); setKmArrivee(""); setPassagers("");
      setCurrentPos(null); setTrackPoints([]);
      setDestCoords(null); setDistDone(0); setSpeed(0);
      setLogs(["En attente de démarrage…"]);
      setGeoError("");
      load();
    } catch (e) {
      showToast(e.message || "Erreur à la fin du trajet", "error");
      addLog(`❌ Erreur terminaison : ${e.message}`);
      // Ne pas bloquer le chauffeur si l'API échoue — reset quand même
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  const inp = { padding: "10px 14px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit", color: C.text, background: C.white, width: "100%" };
  const lbl = { fontSize: 10, fontWeight: 700, color: C.textMid, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6, display: "block" };

  const allOptions = [
    {
      id: null, isFixed: true, type: "RAMASSAGE", status: "APPROUVEE",
      nom: "Ramassage scolaire — Ligne A",
      destination: "Bonamoussadi",
      description: "IUC Logbessou → Bonamoussadi → 2 tours · Lun–Ven",
    },
    ...missions.map(m => ({ ...m, isFixed: false, type: "MISSION" })),
  ];

  const mapBounds = destCoords
    ? [IUC_POS, destCoords, ...(currentPos ? [currentPos] : [])]
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        .opt-row:hover   { background: ${C.bg} !important; }
      `}</style>

      {/* Toast */}
      {toast.msg && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: toast.type === "error" ? C.red : C.green, color: "#fff", borderRadius: 10, padding: "12px 18px", fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,.2)", maxWidth: 420 }}>
          {toast.type === "error" ? "✕" : "✓"} {toast.msg}
        </div>
      )}

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[
          { icon: "🗺️", val: tous.length,                 label: "Trajets total",     color: C.green  },
          { icon: "📍", val: `${Math.round(totalKm)} km`, label: "Distance totale",   color: C.blue   },
          { icon: "👥", val: totalPass,                    label: "Passagers",          color: "#6D28D9" },
          { icon: "📋", val: missions.length,              label: "Missions assignées", color: C.amber  },
        ].map((k, i) => (
          <div key={i} style={{ background: C.white, borderRadius: 10, padding: "14px 16px", borderTop: `3px solid ${k.color}`, boxShadow: "0 1px 3px rgba(0,0,0,.05)", textAlign: "center" }}>
            <span style={{ fontSize: 18 }}>{k.icon}</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color, marginTop: 5 }}>{k.val}</div>
            <div style={{ fontSize: 10, color: C.textLight, textTransform: "uppercase", letterSpacing: "1px", marginTop: 3 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Bannière mission EN_COURS persistante */}
      {phase === "RUNNING" && missionSel && (
        <div style={{ background: `linear-gradient(135deg, ${C.green}, #16A34A)`, borderRadius: 12, padding: "14px 18px", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", opacity: 0.8, marginBottom: 4 }}>
              🟢 TRAJET EN COURS — {missionSel.isFixed ? "RAMASSAGE" : "MISSION"}
            </div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>
              IUC Logbessou → {missionSel.isFixed ? "Bonamoussadi" : missionSel.destination}
            </div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
              {missionSel.requester_name && `👤 ${missionSel.requester_name} · `}
              {missionSel.number_of_passengers ? `👥 ${missionSel.number_of_passengers} passagers · ` : ""}
              Démarré à {missionSel.actual_start_date
                ? new Date(missionSel.actual_start_date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                : "—"
              }
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, opacity: 0.7, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 2 }}>Durée</div>
              {missionSel.actual_start_date
                ? <LiveTimer startIso={missionSel.actual_start_date} />
                : <span style={{ fontSize: 20, fontWeight: 800 }}>--:--:--</span>
              }
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, opacity: 0.7, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 2 }}>GPS</div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{speed} km/h</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Panneau de contrôle ── */}
      <div style={{ background: C.white, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.05)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>
              {phase === "RUNNING"
                ? `🟢 En route → ${missionSel?.isFixed ? "Bonamoussadi" : missionSel?.destination}`
                : "Démarrer un trajet"
              }
            </div>
            <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>
              {phase === "RUNNING"
                ? "Suivi GPS actif — enregistrez le km d'arrivée pour terminer"
                : "Sélectionnez une mission puis démarrez"
              }
            </div>
          </div>
          {phase === "RUNNING" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.green, fontWeight: 700 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, animation: "pulse 1.5s ease-in-out infinite", display: "inline-block" }} />
              GPS actif · {speed} km/h · {distDone} km
            </div>
          )}
        </div>

        <div style={{ padding: "16px 20px" }}>

          {/* Sélecteur mission */}
          <div style={{ marginBottom: 16, position: "relative" }}>
            <label style={lbl}>Mission / trajet *</label>
            <div
              onClick={() => phase === "IDLE" && setShowDrop(!showDrop)}
              style={{ padding: "12px 14px", border: `1.5px solid ${missionSel ? C.green : C.border}`, borderRadius: showDrop ? "8px 8px 0 0" : 8, cursor: phase === "IDLE" ? "pointer" : "default", display: "flex", justifyContent: "space-between", alignItems: "center", background: missionSel ? C.greenLight : C.bg }}>
              {missionSel ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{missionSel.isFixed ? "🚌" : "🗺️"}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>
                      {missionSel.isFixed ? missionSel.nom : missionSel.destination}
                    </span>
                    <span style={{ padding: "1px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: missionSel.isFixed ? C.amberLight : C.blueLight, color: missionSel.isFixed ? C.amber : C.blue }}>
                      {missionSel.isFixed ? "RAMASSAGE" : "MISSION"}
                    </span>
                    {/* Badge statut mission */}
                    {!missionSel.isFixed && (
                      <span style={{ padding: "1px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700,
                        background: missionSel.status === "EN_COURS" ? C.blueLight : C.greenLight,
                        color:      missionSel.status === "EN_COURS" ? C.blue      : C.green }}>
                        {missionSel.status === "EN_COURS" ? "🟢 En cours" : "✓ Approuvée"}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMid, marginTop: 3, marginLeft: 24 }}>
                    {missionSel.isFixed ? "IUC → Bonamoussadi → 2 tours" : `IUC Logbessou → ${missionSel.destination}`}
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: 13, color: C.textLight }}>Choisir une mission…</span>
              )}
              {phase === "IDLE" && <span style={{ color: C.textLight, transform: showDrop ? "rotate(180deg)" : "none", transition: "transform .15s" }}>▼</span>}
            </div>

            {showDrop && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, border: `1.5px solid ${C.border}`, borderTop: "none", borderRadius: "0 0 10px 10px", background: C.white, zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,.08)", maxHeight: 300, overflowY: "auto" }}>
                {loading
                  ? <div style={{ padding: 16, textAlign: "center", color: C.textLight, fontSize: 12 }}>Chargement…</div>
                  : allOptions.map((opt, i) => (
                    <div key={i} className="opt-row" onClick={() => selMission(opt)}
                      style={{ padding: "12px 16px", cursor: "pointer", borderBottom: i < allOptions.length - 1 ? `1px solid ${C.border}` : "none", display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: opt.isFixed ? C.amberLight : C.blueLight }}>
                        {opt.isFixed ? "🚌" : "🗺️"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {opt.isFixed ? opt.nom : (opt.destination || opt.purpose || "Mission")}
                          </span>
                          <span style={{ padding: "1px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, flexShrink: 0, background: opt.isFixed ? C.amberLight : C.blueLight, color: opt.isFixed ? C.amber : C.blue }}>
                            {opt.isFixed ? "RAMASSAGE" : "MISSION"}
                          </span>
                          {!opt.isFixed && opt.status === "EN_COURS" && (
                            <span style={{ padding: "1px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: C.blueLight, color: C.blue, flexShrink: 0 }}>
                              🟢 En cours
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: C.textLight }}>
                          {opt.isFixed
                            ? "IUC Logbessou → Bonamoussadi → 2 tours · Lun–Ven"
                            : `${opt.requester_name ? opt.requester_name + " · " : ""}${opt.number_of_passengers ? opt.number_of_passengers + " pers. · " : ""}${opt.start_date ? fmtDate(opt.start_date) : ""}`
                          }
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          {/* Détails mission sélectionnée */}
          {missionSel && !missionSel.isFixed && (
            <div style={{ background: C.bg, borderRadius: 9, padding: "13px 15px", marginBottom: 16, border: `1px solid ${C.border}` }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { icon: "📍", label: "Départ",       val: "IUC Logbessou" },
                  { icon: "🏁", label: "Destination",  val: missionSel.destination || "—" },
                  { icon: "👤", label: "Demandeur",    val: missionSel.requester_name || "—" },
                  { icon: "👥", label: "Passagers",    val: missionSel.number_of_passengers ? `${missionSel.number_of_passengers} pers.` : "—" },
                  { icon: "💼", label: "Objet",        val: missionSel.purpose || "—" },
                  { icon: "📅", label: "Date prévue",  val: fmtDate(missionSel.start_date) + (fmtTime(missionSel.start_date) ? ` · ${fmtTime(missionSel.start_date)}` : "") },
                ].map((f, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 9, color: C.textLight, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 2 }}>{f.icon} {f.label}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{f.val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {missionSel?.isFixed && (
            <div style={{ background: C.amberLight, borderRadius: 9, padding: "13px 15px", marginBottom: 16, border: `1px solid ${C.amber}30` }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { icon: "📍", label: "Départ",  val: "IUC Logbessou" },
                  { icon: "🚌", label: "Vers",    val: "Bonamoussadi"  },
                  { icon: "🔄", label: "Tours",   val: "2 tours / jour" },
                  { icon: "⏰", label: "Créneau", val: "05h00 → 08h30" },
                  { icon: "📅", label: "Jours",   val: "Lun → Ven"     },
                  { icon: "🏫", label: "Retour",  val: "IUC Logbessou" },
                ].map((f, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 9, color: C.amber, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 2 }}>{f.icon} {f.label}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{f.val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* KPIs GPS si en cours */}
          {phase === "RUNNING" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14, padding: "12px 14px", background: C.greenLight, borderRadius: 9, border: `1px solid ${C.green}30` }}>
              {[
                { label: "Vitesse",    val: `${speed} km/h` },
                { label: "Parcouru",  val: `${distDone} km` },
                { label: "Points GPS", val: trackPoints.length },
              ].map((k, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.green }}>{k.val}</div>
                  <div style={{ fontSize: 10, color: C.textMid, textTransform: "uppercase", letterSpacing: "1px", marginTop: 2 }}>{k.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Kilométrage */}
          {missionSel && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              {phase === "IDLE" ? (
                <>
                  <div>
                    <label style={lbl}>Kilométrage départ *</label>
                    <input style={inp} type="number" value={kmDepart} onChange={e => setKmDepart(e.target.value)}
                      placeholder={`Ex: ${Number(vehicule?.mileage || vehicule?.current_mileage || 0).toLocaleString("fr-FR")}`} />
                  </div>
                  <div>
                    <label style={lbl}>Nombre de passagers</label>
                    <input style={inp} type="number" value={passagers} onChange={e => setPassagers(e.target.value)}
                      placeholder={`Ex: ${vehicule?.seating_capacity || 30}`} />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label style={lbl}>Kilométrage arrivée *</label>
                    <input style={inp} type="number" value={kmArrivee} onChange={e => setKmArrivee(e.target.value)} placeholder="Relevé compteur à l'arrivée" />
                  </div>
                  <div>
                    <label style={lbl}>Passagers réels</label>
                    <input style={inp} type="number" value={passagers} onChange={e => setPassagers(e.target.value)}
                      placeholder={`Max: ${vehicule?.seating_capacity || 30}`} />
                  </div>
                </>
              )}
            </div>
          )}

          {geoError && (
            <div style={{ fontSize: 11, color: C.red, marginBottom: 10, background: "#FFF1F2", padding: "8px 12px", borderRadius: 7 }}>
              ⚠️ {geoError}
            </div>
          )}

          {/* ── Boutons démarrer / terminer ── */}
          {missionSel && phase === "IDLE" && (
            <button
              onClick={demarrer}
              disabled={saving}
              style={{ width: "100%", padding: "13px 20px", background: saving ? C.border : `linear-gradient(135deg, ${C.green}, #16A34A)`, color: saving ? C.textLight : "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: saving ? "none" : `0 4px 16px ${C.green}40`, transition: "all .2s" }}>
              {saving
                ? <><span style={{ animation: "spin .8s linear infinite", display: "inline-block" }}>⟳</span> Démarrage en cours…</>
                : <><span style={{ fontSize: 18 }}>🚀</span> Démarrer le trajet</>
              }
            </button>
          )}

          {missionSel && phase === "RUNNING" && (
            <>
              <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 9, padding: "10px 14px", fontSize: 11, color: "#92400E", marginBottom: 12, display: "flex", gap: 8 }}>
                <span>⚠️</span>
                <span>Le trajet reste <b>actif</b> même si vous fermez cette page. Cliquez "Terminer" uniquement à l'arrivée à destination.</span>
              </div>
              <button
                onClick={terminer}
                disabled={saving || !kmArrivee}
                style={{ width: "100%", padding: "13px 20px", background: saving || !kmArrivee ? C.border : `linear-gradient(135deg, ${C.red}, #E11D48)`, color: saving || !kmArrivee ? C.textLight : "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: saving || !kmArrivee ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: !kmArrivee ? "none" : "0 4px 16px rgba(192,24,42,.35)", transition: "all .2s" }}>
                {saving
                  ? <><span style={{ animation: "spin .8s linear infinite", display: "inline-block" }}>⟳</span> Enregistrement…</>
                  : <><span style={{ fontSize: 18 }}>🏁</span> Terminer le trajet</>
                }
              </button>
            </>
          )}
        </div>

        {/* ── Carte ── */}
        {missionSel && (
          <>
            <div style={{ height: 1, background: C.border }} />
            <div style={{ height: 380 }}>
              <MapContainer center={IUC_POS} zoom={13} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />

                <Marker position={IUC_POS} icon={iconIUC}>
                  <Popup><b>🏫 IUC Logbessou</b><br />Point de départ</Popup>
                </Marker>

                {destCoords && (
                  <Marker position={destCoords} icon={missionSel.isFixed ? iconBus : iconDest}>
                    <Popup><b>{missionSel.isFixed ? "🚌 Bonamoussadi" : `📍 ${missionSel.destination}`}</b></Popup>
                  </Marker>
                )}

                {currentPos && (
                  <Marker position={currentPos} icon={iconMe}>
                    <Popup>
                      <b>🚗 Position actuelle</b><br />
                      {currentPos[0].toFixed(5)}, {currentPos[1].toFixed(5)}<br />
                      <span style={{ color: C.green }}>Vitesse : {speed} km/h</span>
                    </Popup>
                  </Marker>
                )}

                {trackPoints.length > 1 && (
                  <Polyline positions={[IUC_POS, ...trackPoints]} pathOptions={{ color: C.green, weight: 4, opacity: 0.9 }} />
                )}

                {destCoords && (
                  <Polyline positions={[currentPos || IUC_POS, destCoords]} pathOptions={{ color: missionSel.isFixed ? C.amber : C.blue, weight: 2, opacity: 0.4, dashArray: "8 6" }} />
                )}

                {mapBounds && <MapFitter bounds={mapBounds} />}
                {currentPos && phase === "RUNNING" && <MapPanner pos={currentPos} />}
              </MapContainer>
            </div>
          </>
        )}
      </div>

      {/* ── Journal GPS ── */}
      {phase === "RUNNING" && (
        <div style={{ background: C.white, borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>Journal de trajet</div>
          <div style={{ background: C.bg, borderRadius: 8, padding: "10px 14px", maxHeight: 120, overflowY: "auto", fontSize: 11, color: C.textMid, fontFamily: "monospace", lineHeight: 1.8 }}>
            {logs.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      )}

      {/* ── Historique ── */}
      <div style={{ background: C.white, borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>Historique des trajets</div>
            <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>Missions et ramassages effectués</div>
          </div>
          <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: C.greenLight, color: C.green }}>
            {tous.length} trajet{tous.length > 1 ? "s" : ""}
          </span>
        </div>

        {loading
          ? <div style={{ textAlign: "center", padding: "30px 0", color: C.textLight }}><div style={{ width: 24, height: 24, border: `3px solid ${C.green}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin .8s linear infinite", margin: "0 auto 8px" }} />Chargement…</div>
          : tous.length === 0
            ? <div style={{ textAlign: "center", padding: "40px 0", color: C.textLight }}><div style={{ fontSize: 34, marginBottom: 8 }}>🗺️</div><div style={{ fontSize: 13 }}>Aucun trajet enregistré</div></div>
            : tous.map((t, i) => {
                const isRes = !!t.destination;
                const km    = Math.max(0, isRes ? ((t.end_mileage||0)-(t.start_mileage||0)) || t.estimated_distance || 0 : (t.km_arrivee||0)-(t.km_depart||0));
                const type  = isRes ? "MISSION" : (t.type || "MISSION");
                const isRam = type === "RAMASSAGE";
                return (
                  <div key={i} style={{ display: "flex", gap: 14, padding: "13px 0", borderBottom: i < tous.length - 1 ? `1px solid ${C.border}` : "none", alignItems: "flex-start" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 9, background: isRam ? C.amberLight : C.blueLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                      {isRam ? "🚌" : "🗺️"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {isRes ? "IUC Logbessou" : (t.depart || "—")} → {isRes ? (t.destination || "—") : (t.arrivee || "—")}
                      </div>
                      <div style={{ fontSize: 11, color: C.textLight, marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <span>📅 {fmtDate(isRes ? (t.actual_end_date || t.start_date) : t.date)}</span>
                        {km > 0 && <span>📍 {Math.round(km)} km</span>}
                        {(t.number_of_passengers || t.passagers) > 0 && <span>👥 {t.number_of_passengers || t.passagers} passager{(t.number_of_passengers || t.passagers) > 1 ? "s" : ""}</span>}
                      </div>
                    </div>
                    <span style={{ display: "inline-block", padding: "3px 9px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: isRam ? C.amberLight : C.blueLight, color: isRam ? C.amber : C.blue, flexShrink: 0 }}>
                      {type}
                    </span>
                  </div>
                );
              })
        }
      </div>
    </div>
  );
}