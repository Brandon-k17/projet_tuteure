// ─── src/components/ui.jsx ───────────────────────────────────────────────────
import { C, S, STATUS_MAP } from "../constants";

// ── Atomes ────────────────────────────────────────────────────────────────────

export function StatusBadge({ status }) {
  const m = STATUS_MAP[status] || { label: status, bg: "#F5F5F5", color: "#888" };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 9px", borderRadius:99, fontSize:11, fontWeight:700, background:m.bg, color:m.color }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:m.color, display:"inline-block" }} />
      {m.label}
    </span>
  );
}

export function Chip({ color, children }) {
  return (
    <span style={{ padding:"2px 10px", borderRadius:99, fontSize:11, fontWeight:700, background:color + "1A", color }}>
      {children}
    </span>
  );
}

export function Empty({ text, icon = "📭" }) {
  return (
    <div style={{ textAlign:"center", padding:"48px 0", color:C.textLight }}>
      <div style={{ fontSize:36, marginBottom:8 }}>{icon}</div>
      <div style={{ fontSize:13 }}>{text}</div>
    </div>
  );
}

export function Loader() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:C.bg, flexDirection:"column", gap:14 }}>
      <div style={{ width:32, height:32, border:`3px solid ${C.green}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin .8s linear infinite" }} />
      <div style={{ fontSize:11, color:C.textLight, letterSpacing:"2px", textTransform:"uppercase" }}>Chargement</div>
    </div>
  );
}

// ── Champs formulaire ─────────────────────────────────────────────────────────

export function Fld({ label, value, onChange, required, type = "text", placeholder, ...rest }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={{ fontSize:11, fontWeight:700, color:C.textMid, textTransform:"uppercase", letterSpacing:"0.8px" }}>
        {label}
      </label>
      <input
        type={type} value={value} onChange={onChange}
        required={required} placeholder={placeholder}
        style={{ ...S.search, width:"100%" }}
        {...rest}
      />
    </div>
  );
}

export function Sel({ label, value, onChange, opts }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={{ fontSize:11, fontWeight:700, color:C.textMid, textTransform:"uppercase", letterSpacing:"0.8px" }}>
        {label}
      </label>
      <select value={value} onChange={onChange} style={{ ...S.search, width:"100%" }}>
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

// ── Logo IUC ──────────────────────────────────────────────────────────────────

export function IUCLogo() {
  return (
    <div style={{ width:44, height:44, borderRadius:10, background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <svg width="28" height="28" viewBox="0 0 52 52" fill="none">
        <path d="M7 34L16 18Q18 13 22 13H30Q34 13 36 18L45 34" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <rect x="5" y="32" width="42" height="12" rx="6" fill="white" opacity=".92" />
        <circle cx="15" cy="44" r="5.5" fill={C.red} />
        <circle cx="37" cy="44" r="5.5" fill={C.red} />
        <circle cx="15" cy="44" r="2.5" fill="white" />
        <circle cx="37" cy="44" r="2.5" fill="white" />
      </svg>
    </div>
  );
}

// ── Icônes navigation ─────────────────────────────────────────────────────────

export function NavIcon({ id }) {
  const p = { width:16, height:16, viewBox:"0 0 24 24", fill:"none", stroke:"currentColor", strokeWidth:1.8, strokeLinecap:"round" };
  switch (id) {
    case "grid":     return <svg {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
    case "car":      return <svg {...p}><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h11l4 4v4a2 2 0 0 1-2 2h-1"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>;
    case "calendar": return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    case "tool":     return <svg {...p}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;
    case "fuel":     return <svg {...p}><path d="M3 22V8l6-6 6 6v14"/><line x1="3" y1="22" x2="21" y2="22"/><line x1="9" y1="22" x2="9" y2="12"/><rect x="6" y="12" width="6" height="4"/></svg>;
    case "money":    return <svg {...p}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
    case "users": return <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case "chart":    return <svg {...p}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;

    case "alert":    return <svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    default:         return <svg {...p}><circle cx="12" cy="12" r="10"/></svg>;
  }
}

export function BellIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}

export function LogoutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}