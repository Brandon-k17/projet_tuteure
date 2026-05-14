// src/dashboard/TabTracking.jsx
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useRef, useCallback } from 'react';

// ── Fix icônes Leaflet ────────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Icônes personnalisées ─────────────────────────────────────────────────────
const carIcon = new L.DivIcon({
  html: `<div style="background:#1B5E37;border-radius:50%;width:32px;height:32px;
    border:2px solid white;display:flex;align-items:center;justify-content:center;
    font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,.3)">🚗</div>`,
  className: '', iconSize: [32, 32], iconAnchor: [16, 16],
});

const destIcon = new L.DivIcon({
  html: `<div style="background:#C0182A;width:28px;height:28px;
    border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3)"></div>`,
  className: '', iconSize: [28, 28], iconAnchor: [14, 28],
});

// ── Composant utilitaire : pan la carte quand la position change ──────────────
function MapUpdater({ position, mapRef }) {
  useEffect(() => {
    if (position && mapRef.current) {
      mapRef.current.panTo(position, { animate: true, duration: 0.8 });
    }
  }, [position]);
  return null;
}

// ── Couleurs (copie locale pour ne pas dépendre de DashboardPersonnel) ────────
const C = {
  green:"#1B5E37", greenLight:"#EAF4EE",
  red:"#C0182A",
  bg:"#F4F6F5", white:"#FFFFFF",
  border:"#E2E8E5", text:"#1A2820",
  textMid:"#4A6358", textLight:"#8EA99A",
  amber:"#D97706", amberLight:"#FFFBEB",
};

const S = {
  section:  { background:C.white, borderRadius:10, padding:"16px 18px", boxShadow:"0 1px 3px rgba(0,0,0,.05)" },
  secHead:  { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 },
  secTitle: { fontSize:13, fontWeight:700, color:C.text },
  label:    { fontSize:11, fontWeight:600, color:C.textMid, textTransform:"uppercase", letterSpacing:"1px" },
  input:    { padding:"8px 12px", border:`1.5px solid ${C.border}`, borderRadius:7, fontSize:13,
              outline:"none", fontFamily:"inherit", color:C.text, background:C.white, width:"100%" },
  kpiCard:  { background:C.white, borderRadius:10, padding:"12px 14px", borderLeft:"3px solid transparent",
              boxShadow:"0 1px 3px rgba(0,0,0,.05)" },
  btn:      { padding:"8px 16px", background:C.green, color:"#fff", border:"none", borderRadius:7,
              fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" },
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" });
}

function StatusBadge({ status }) {
  const map = {
    APPROVED:  { label:"Approuvée", bg:C.greenLight, color:C.green },
    APPROUVEE: { label:"Approuvée", bg:C.greenLight, color:C.green },
  };
  const m = map[status] || { label: status, bg: "#F5F5F5", color: "#888" };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 9px",
      borderRadius:99, fontSize:11, fontWeight:700, background:m.bg, color:m.color }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:m.color, display:"inline-block" }}/>
      {m.label}
    </span>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function TabTracking({ reservations, isDirecteur, vehiculeFonction }) {
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [currentPos,   setCurrentPos]   = useState(null);
  const [trackPoints,  setTrackPoints]  = useState([]);
  const [destCoords,   setDestCoords]   = useState(null);
  const [isTracking,   setIsTracking]   = useState(false);
  const [speed,        setSpeed]        = useState(0);
  const [distDone,     setDistDone]     = useState(0);
  const [logs,         setLogs]         = useState(['En attente de démarrage…']);

  const watchRef   = useRef(null);
  const lastPosRef = useRef(null);
  const mapRef     = useRef(null);

  const DOUALA = [4.0511, 9.7679];
 console.log("TabTracking - toutes reservations:", reservations);
  console.log("TabTracking - approuvées:", reservations.filter(r => ['APPROVED','APPROUVEE'].includes(r.status)));
  const approved = reservations.filter(r =>
    ['APPROVED', 'APPROUVEE'].includes(r.status)
    
  );

  const addLog = (msg) => setLogs(l => {
    const t = new Date().toLocaleTimeString('fr-FR');
    return [...l.slice(-15), `[${t}] ${msg}`];
  });

  const resolveDestination = useCallback(async (destination) => {
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination + ', Cameroun')}&format=json&limit=1`);
      const json = await res.json();
      if (json[0]) {
        const coords = [parseFloat(json[0].lat), parseFloat(json[0].lon)];
        setDestCoords(coords);
        addLog(`Destination résolue : ${destination}`);
        return coords;
      }
    } catch {
      addLog('Impossible de résoudre la destination');
    }
    return null;
  }, []);

  const handleSelectTrip = async (trip) => {
    setSelectedTrip(trip);
    setTrackPoints([]);
    setCurrentPos(null);
    setDistDone(0);
    setSpeed(0);
    setDestCoords(null);
    lastPosRef.current = null;
    addLog(`Trajet sélectionné : → ${trip.destination}`);
    await resolveDestination(trip.destination);
  };

  const updatePosition = useCallback((lat, lng, speedMs = 0) => {
    const pos = [lat, lng];
    const spd = Math.round((speedMs || 0) * 3.6);
    setSpeed(spd);
    if (lastPosRef.current) {
      const R    = 6371;
      const dLat = (lat - lastPosRef.current[0]) * Math.PI / 180;
      const dLng = (lng - lastPosRef.current[1]) * Math.PI / 180;
      const a    = Math.sin(dLat/2)**2
        + Math.cos(lastPosRef.current[0] * Math.PI / 180)
        * Math.cos(lat * Math.PI / 180)
        * Math.sin(dLng/2)**2;
      const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      setDistDone(prev => Math.round((prev + d) * 10) / 10);
    }
    lastPosRef.current = pos;
    setCurrentPos(pos);
    setTrackPoints(prev => [...prev, pos]);
    addLog(`Pos : ${lat.toFixed(4)}, ${lng.toFixed(4)} · ${spd} km/h`);
  }, []);

  const startTracking = () => {
    if (!navigator.geolocation) { alert('Géolocalisation non supportée'); return; }
    setIsTracking(true);
    addLog('Démarrage du suivi GPS…');
    watchRef.current = navigator.geolocation.watchPosition(
      pos => updatePosition(pos.coords.latitude, pos.coords.longitude, pos.coords.speed),
      err => {
        addLog('Erreur GPS : ' + (err.code === 1 ? 'Accès refusé — activez la localisation' : err.message));
        setIsTracking(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 2000 }
    );
  };

  const stopTracking = () => {
    if (watchRef.current) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    setIsTracking(false);
    addLog(`Suivi arrêté · ${distDone} km parcourus`);
  };

  // Nettoyage au démontage
  useEffect(() => () => { if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current); }, []);

  const routePoints = [DOUALA, ...trackPoints, ...(destCoords ? [destCoords] : [])];
  const mapBounds   = destCoords ? [DOUALA, destCoords] : null;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ── Panneau de contrôle ── */}
      <div style={S.section}>
        <div style={S.secHead}>
          <span style={S.secTitle}>📱 Suivi GPS en temps réel</span>
          {selectedTrip && <StatusBadge status={selectedTrip.status} />}
        </div>

        {/* Sélecteur de trajet */}
        <div style={{ marginBottom:14 }}>
          <label style={S.label}>Réservation approuvée</label>
          <select
            style={{ ...S.input, marginTop:6, cursor:'pointer', colorScheme:'light' }}
            onChange={e => {
              const trip = approved.find(r => String(r.id) === e.target.value);
              if (trip) handleSelectTrip(trip);
            }}
            defaultValue="">
            <option value="">-- Choisir un trajet --</option>
            {approved.map(r => (
              <option key={r.id} value={r.id}>
                {r.destination} · {fmtDate(r.start_date)} · {r.number_of_passengers || 1} pers.
              </option>
            ))}
          </select>
          {!approved.length && (
            <div style={{ background:C.amberLight, borderRadius:8, padding:'10px 14px', fontSize:12, color:C.amber, marginTop:10 }}>
              ⏳ Aucune réservation approuvée pour le moment.
            </div>
          )}
        </div>

        {/* Infos trajet + KPIs */}
        {selectedTrip && (
          <>
            <div style={{ background:C.greenLight, borderRadius:8, padding:14, marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700, color:C.green, marginBottom:8 }}>
                🚗 {selectedTrip.vehicle_name || vehiculeFonction?.registration_number || 'Véhicule assigné'} → {selectedTrip.destination}
              </div>
              <div style={{ display:'flex', gap:16, fontSize:12, color:C.textMid, flexWrap:'wrap' }}>
                <span>📅 {fmtDate(selectedTrip.start_date)}</span>
                <span>👥 {selectedTrip.number_of_passengers || 1} pers.</span>
                {selectedTrip.estimated_distance && <span>📏 ~{selectedTrip.estimated_distance} km</span>}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
              {[
                { label:'Distance estimée', val: selectedTrip.estimated_distance ? selectedTrip.estimated_distance + ' km' : '—' },
                { label:'Vitesse actuelle', val: speed + ' km/h' },
                { label:'Parcouru',         val: distDone + ' km' },
              ].map((k, i) => (
                <div key={i} style={{ ...S.kpiCard, borderLeftColor:C.green }}>
                  <div style={{ fontSize:10, fontWeight:700, color:C.textLight, textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>{k.label}</div>
                  <div style={{ fontSize:18, fontWeight:800, color:C.text }}>{k.val}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Boutons */}
        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          {!isTracking ? (
            <button onClick={startTracking} disabled={!selectedTrip}
              style={{ ...S.btn, opacity: !selectedTrip ? 0.5 : 1, cursor: !selectedTrip ? 'not-allowed' : 'pointer' }}>
              🎯 Démarrer suivi GPS
            </button>
          ) : (
            <>
              <button onClick={stopTracking} style={{ ...S.btn, background:C.red }}>⏹️ Arrêter</button>
              <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:C.green, fontWeight:600 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:C.green }} />
                GPS actif
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Carte ── */}
      {selectedTrip && (
        <div style={{ borderRadius:10, overflow:'hidden', boxShadow:'0 4px 20px rgba(0,0,0,.1)', height:420 }}>
          <MapContainer
            center={DOUALA} zoom={10}
            style={{ height:'100%', width:'100%' }}
            ref={mapRef}
            bounds={mapBounds || undefined}
            boundsOptions={{ padding:[50, 50] }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© OpenStreetMap' />

            {/* Départ */}
            <Marker position={DOUALA}>
              <Popup><b>📍 Départ</b><br />Douala, Cameroun</Popup>
            </Marker>

            {/* Destination */}
            {destCoords && (
              <Marker position={destCoords} icon={destIcon}>
                <Popup><b>🏁 {selectedTrip.destination}</b></Popup>
              </Marker>
            )}

            {/* Véhicule en temps réel */}
            {currentPos && (
              <Marker position={currentPos} icon={carIcon}>
                <Popup>
                  <b>🚗 Position actuelle</b><br />
                  {currentPos[0].toFixed(5)}, {currentPos[1].toFixed(5)}<br />
                  <span style={{ color:C.green }}>Vitesse : {speed} km/h</span>
                </Popup>
              </Marker>
            )}

            {/* Tracé parcouru */}
            {trackPoints.length > 0 && (
              <Polyline positions={[DOUALA, ...trackPoints]}
                pathOptions={{ color:C.green, weight:4, opacity:0.9 }} />
            )}

            {/* Tracé pointillé vers destination */}
            {destCoords && (
              <Polyline
                positions={[currentPos || DOUALA, destCoords]}
                pathOptions={{ color:C.green, weight:2, opacity:0.3, dashArray:'8 6' }} />
            )}

            <MapUpdater position={currentPos} mapRef={mapRef} />
          </MapContainer>
        </div>
      )}

      {/* ── Journal ── */}
      {selectedTrip && (
        <div style={S.section}>
          <span style={{ ...S.secTitle, display:'block', marginBottom:8 }}>Journal de trajet</span>
          <div style={{ background:C.bg, borderRadius:7, padding:'10px 12px', maxHeight:110,
            overflowY:'auto', fontSize:11, color:C.textMid, fontFamily:'monospace', lineHeight:1.7 }}>
            {logs.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}