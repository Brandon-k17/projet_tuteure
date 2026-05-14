// ─── src/constants/index.js ───────────────────────────────────────────────────

export const VEHICLE_CATEGORIES = [
  ["TOURISME",   "Tourisme",   "🚗"],
  ["UTILITAIRE", "Utilitaire", "🚐"],
  ["BUS",        "Bus",        "🚌"],
];

export const VEHICLE_TYPES = [
  ["BERLINE","Berline"],["SUV","SUV"],["MINIBUS","Minibus"],
  ["CAMION","Camion"],["FOURGON","Fourgon"],["MOTO","Moto"],["AUTRE","Autre"],
];

export const FUEL_TYPES = [
  ["ESSENCE","Essence"],["DIESEL","Diesel"],["HYBRIDE","Hybride"],
  ["ELECTRIQUE","Électrique"],["GPL","GPL"],
];

export const TRANS_TYPES = [
  ["MANUELLE","Manuelle"],["AUTOMATIQUE","Automatique"],
];

export const VEHICLE_STATUS = [
  ["DISPONIBLE","Disponible"],["EN_SERVICE","En service"],
  ["EN_MAINTENANCE","En maintenance"],["HORS_SERVICE","Hors service"],
];

export const ASSIGNMENT_TYPES = [
  ["POOL",         "Parc commun (réservable)"],
  ["FONCTION",     "Voiture de fonction (directeur)"],
  ["BUS_SCOLAIRE", "Bus scolaire (ramassage matin)"],
];

export const NAV = [
  { id:"dashboard",    label:"Tableau de bord",  icon:"grid"     },
  { id:"vehicles",     label:"Véhicules",         icon:"car"      },
  { id:"reservations", label:"Réservations",      icon:"calendar" },
  { id:"maintenance",  label:"Maintenance",       icon:"tool"     },
  { id:"carburant",    label:"Carburant",         icon:"fuel"     },
  { id:"documents",    label:"Documents",         icon:"doc"      },
  { id:"signalements", label:"Signalements",      icon:"alert"    },
  { id:"utilisateurs", label:"Utilisateurs",      icon:"users"    },
  { id:"depenses",     label:"Dépenses",          icon:"money"    },
  { id:"rapports",     label:"Rapports",          icon:"chart"    },
  { id:"parametres",   label:"Paramètres",        icon:"settings" },
];

export const EMPTY_VEH = {
  registration_number:"", internal_code:"", make:"", model:"",
  year: new Date().getFullYear(), color:"", category:"TOURISME",
  vehicle_type:"BERLINE", fuel_type:"DIESEL", transmission:"MANUELLE",
  seating_capacity:5, fuel_tank_capacity:"", current_mileage:"0",
  status:"DISPONIBLE", purchase_date:"", registration_date:"",
  purchase_price:"", vin_number:"", notes:"",
  assignment_type:"POOL", assigned_director:"",
  assigned_driver_name:"",
  bus_slot_start:"05:00",
  bus_slot_end:"08:30",
};

// ── Couleurs ──────────────────────────────────────────────────────────────────
export const C = {
  green:"#1B5E37", greenMid:"#2D7A4F", greenLight:"#EAF4EE",
  red:"#C0182A",   redLight:"#FDF0F1",  white:"#FFFFFF", bg:"#F0F3F1",
  // Sidebar — fond principal de la page (sidebar flottante verte par-dessus)
  pageBg:"#F0F3F1",
  sidebar:"#1a5d3b",
  sideHover:"rgba(255,255,255,0.10)",
  sideActive:"rgba(255,255,255,0.18)",
  border:"#E2E8E5", text:"#1A2820", textMid:"#4A6358", textLight:"#8EA99A",
  amber:"#D97706", amberLight:"#FFFBEB", blue:"#1D4ED8", blueLight:"#EFF6FF",
  purple:"#7C3AED", purpleLight:"#F5F3FF",
};

// ── Status map ────────────────────────────────────────────────────────────────
export const STATUS_MAP = {
  DISPONIBLE:    { label:"Disponible",     bg:C.greenLight,  color:C.green  },
  EN_SERVICE:    { label:"En service",     bg:C.amberLight,  color:C.amber  },
  EN_MAINTENANCE:{ label:"En maintenance", bg:C.redLight,    color:C.red    },
  HORS_SERVICE:  { label:"Hors service",   bg:"#F5F5F5",     color:"#888"   },
  PENDING:       { label:"En attente",     bg:C.amberLight,  color:C.amber  },
  APPROVED:      { label:"Approuvée",      bg:C.greenLight,  color:C.green  },
  REJECTED:      { label:"Refusée",        bg:C.redLight,    color:C.red    },
  ACTIVE:        { label:"Actif",          bg:C.blueLight,   color:C.blue   },
  COMPLETED:     { label:"Terminé",        bg:C.greenLight,  color:C.green  },
  FONCTION:      { label:"Véh. de fonction", bg:C.purpleLight, color:C.purple },
};

// ── Styles globaux ────────────────────────────────────────────────────────────
export const S = {
  // Shell principal — fond page
  shell: {
    display:"flex", height:"100vh", width:"100vw",
    fontFamily:"'Inter',-apple-system,sans-serif",
    background:C.pageBg, overflow:"hidden",
    padding: "12px",
    gap: "12px",
  },

  // Sidebar : colonne gauche avec header blanc + nav verte flottante
  sidebarCol: {
    display:"flex", flexDirection:"column",
    width:220, flexShrink:0, gap:"10px",
  },

  // Header blanc en haut de la sidebar
  sideHeader: {
    background:"#fff",
    borderRadius:14,
    padding:"13px 16px",
    display:"flex",
    alignItems:"center",
    gap:10,
    boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
    flexShrink:0,
  },

  brandName: { fontSize:13, fontWeight:800, color:"#1e293b", letterSpacing:".4px", lineHeight:1.1 },
  brandSub:  { fontSize:9,  color:"#94a3b8", marginTop:1 },

  // Sidebar verte arrondie (nav)
  sidebar: {
    background: C.sidebar,
    borderRadius: 16,
    flex: 1,
    display:"flex", flexDirection:"column",
    overflow:"hidden",
    boxShadow:"0 4px 20px rgba(26,93,59,0.25)",
  },

  divider: { height:1, background:"rgba(255,255,255,0.10)", margin:"4px 12px" },

  nav:      { flex:1, padding:"10px 8px", overflowY:"auto" },
  navItem:  {
    display:"flex", alignItems:"center", gap:11, width:"100%",
    padding:"8px 10px", borderRadius:10, border:"none", cursor:"pointer",
    color:"rgba(255,255,255,0.65)", marginBottom:2, textAlign:"left",
    background:"transparent", fontFamily:"inherit", position:"relative",
    transition:"all .15s",
  },
  navActive: {
    background:"rgba(255,255,255,0.18)",
    color:"#fff", fontWeight:600,
    boxShadow:"inset 0 0 0 1px rgba(255,255,255,0.12)",
  },
  navLabel:  { fontSize:12, flex:1 },
  navPip:    { position:"absolute", right:0, top:"50%", transform:"translateY(-50%)", width:3, height:16, background:"#fff", borderRadius:99 },
  navBadge:  { background:C.red, color:"#fff", borderRadius:99, fontSize:9, fontWeight:800, width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center" },

  sideBottom:   { padding:"8px 8px 12px" },
  sideUser:     { display:"flex", alignItems:"center", gap:9, padding:"8px 6px 10px" },
  sideAvatar:   { width:30, height:30, borderRadius:"50%", background:"rgba(255,255,255,0.20)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:11, flexShrink:0 },
  sideUserName: { fontSize:11, fontWeight:600, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  sideUserRole: { fontSize:9,  color:"rgba(255,255,255,0.50)" },
  logoutBtn:    { display:"flex", alignItems:"center", gap:8, width:"100%", padding:"8px 10px", borderRadius:10, border:"none", cursor:"pointer", background:"rgba(192,24,42,0.18)", color:"rgba(255,180,180,0.9)", fontSize:11, fontFamily:"inherit", transition:"all .15s" },

  // Zone principale
  main:      { flex:1, display:"flex", flexDirection:"column", gap:"10px", overflow:"hidden", minWidth:0 },

  // Topbar blanc arrondi
  topbar:    {
    background:"#fff", borderRadius:14, padding:"12px 20px",
    display:"flex", justifyContent:"space-between", alignItems:"center",
    flexShrink:0, boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
  },

  pageTitle: { fontSize:22, fontWeight:760, color:C.text, letterSpacing:"-.4px", margin:0 },
  pageDate:  { fontSize:11, color:C.textLight, marginTop:2 },
  iconBtn:   { width:34, height:34, borderRadius:8, border:`1px solid ${C.border}`, background:"#f8fafc", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:C.textMid },
  badge:     { position:"absolute", top:-5, right:-5, background:C.red, color:"#fff", borderRadius:99, fontSize:9, fontWeight:800, width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center" },
  userChip:  { display:"flex", alignItems:"center", gap:9 },
  topAvatar: { width:34, height:34, borderRadius:"50%", background:C.green, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:12 },
  topName:   { fontSize:13, fontWeight:700, color:C.text },
  topRole:   { fontSize:10, color:C.textLight, textTransform:"uppercase", letterSpacing:"1px" },

  content:   { flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:0 },

  kpiGrid:   { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 },
  kpiCard:   { background:"#fff", borderRadius:12, padding:"16px 18px", borderLeft:"3px solid transparent", boxShadow:"0 1px 3px rgba(0,0,0,0.05)" },
  section:   { background:"#fff", borderRadius:12, padding:"16px 18px", boxShadow:"0 1px 3px rgba(0,0,0,0.05)" },
  secHead:   { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 },
  secTitle:  { fontSize:13, fontWeight:700, color:C.text },
  alertItem: { display:"flex", alignItems:"flex-start", gap:12, padding:"12px 0", borderBottom:`1px solid ${C.border}` },
  alertTitle:{ fontSize:13, fontWeight:700, color:C.text },
  alertDesc: { fontSize:12, color:C.textMid, marginTop:2, lineHeight:1.5 },
  dot:       { width:9, height:9, borderRadius:"50%", flexShrink:0, marginTop:4 },
  listItem:  { display:"flex", alignItems:"center", gap:15, padding:"10px 0", borderBottom:`1px solid ${C.border}` },
  listName:  { fontSize:13, fontWeight:600, color:C.text },
  listSub:   { fontSize:11, color:C.textLight, marginTop:1 },
  miniAvatar:{ width:32, height:32, borderRadius:"50%", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:12, flexShrink:0 },
  resCard:   { background:"#FAFBFA", border:`1px solid ${C.border}`, borderRadius:9, padding:"14px 16px" },
  table:     { width:"100%", borderCollapse:"collapse" },
  th:        { textAlign:"left", padding:"8px 12px", fontSize:10, letterSpacing:"1.5px", textTransform:"uppercase", color:C.textLight, fontWeight:700, borderBottom:`1.5px solid ${C.border}`, whiteSpace:"nowrap" },
  td:        { padding:"10px 12px", fontSize:12, color:C.textMid, borderBottom:`1px solid ${C.border}` },
  typeBadge: { display:"inline-block", padding:"2px 8px", borderRadius:5, background:C.bg, color:C.textMid, fontSize:11, fontWeight:500 },
  btn:       { padding:"7px 14px", background:C.green, color:"#fff", border:"none", borderRadius:7, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" },
  ghostBtn:  { padding:"7px 14px", background:"transparent", color:C.textMid, border:`1px solid ${C.border}`, borderRadius:7, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" },
  search:    { padding:"7px 12px", border:`1.5px solid ${C.border}`, borderRadius:7, fontSize:12, outline:"none", fontFamily:"inherit", width:200, color:C.text, background:"#fff" },
  filterPill:  { padding:"5px 12px", border:`1.5px solid ${C.border}`, borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer", background:C.bg, color:C.textMid, fontFamily:"inherit", whiteSpace:"nowrap", transition:"all .15s" },
  filterPillOn:{ background:C.green, color:"#fff", border:`1.5px solid ${C.green}` },

  // Rétrocompat — brand/brandText inutilisés mais gardés pour éviter les erreurs dans d'autres fichiers
  brand:     { display:"flex", alignItems:"center", gap:11, padding:"20px 16px 16px" },
  brandText: { minWidth:0 },
};

export const M = {
  overlay:  { position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 },
  modal:    { background:"#fff", borderRadius:14, width:"100%", maxWidth:680, maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,.2)" },
  header:   { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 22px", borderBottom:`1px solid ${C.border}`, flexShrink:0 },
  title:    { fontSize:15, fontWeight:700, color:C.text },
  closeBtn: { background:"none", border:"none", fontSize:18, cursor:"pointer", color:C.textLight, lineHeight:1, padding:4 },
  body:     { overflowY:"auto", padding:"20px 22px", display:"flex", flexDirection:"column", gap:14 },
  secTitle: { fontSize:11, fontWeight:700, color:C.textLight, textTransform:"uppercase", letterSpacing:"1.2px", marginTop:6, paddingBottom:6, borderBottom:`1px solid ${C.border}` },
  grid2:    { display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 },
  grid3:    { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 },
  errorBar: { background:C.redLight, color:C.red, fontSize:12, padding:"10px 22px", borderBottom:`1px solid #fca5a5` },
};

export const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  @keyframes spin{to{transform:rotate(360deg);}}
  .nav-btn:hover{background:rgba(255,255,255,0.10)!important;color:#fff!important;}
  .btn-primary:hover{opacity:.88!important;}
  .btn-ghost:hover{background:${C.bg}!important;}
  .logout-btn:hover{background:rgba(192,24,42,0.35)!important;}
  .icon-btn:hover{background:#f1f5f9!important;}
  .tr-row:hover td{background:#FAFBFA;}
  button:active{transform:scale(0.97);}
  ::-webkit-scrollbar{width:4px;height:4px;}
  ::-webkit-scrollbar-thumb{background:#D4DDD9;border-radius:99px;}
  ::-webkit-scrollbar-track{background:transparent;}
  input:focus,select:focus,textarea:focus{border-color:${C.green}!important;box-shadow:0 0 0 3px ${C.green}18!important;outline:none;}
`;