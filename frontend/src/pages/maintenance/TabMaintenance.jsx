// ─── src/maintenance/TabMaintenance.jsx ──────────────────────────────────────
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { apiFetch } from "../../utils/api";

// ── COULEURS & CONSTANTES ─────────────────────────────────────────────────────
const C = {
  green:"#1B5E37", greenMid:"#2D7A4F", greenLight:"#EAF4EE", greenDark:"#14472A",
  red:"#C0182A",   redLight:"#FDF0F1",
  white:"#FFFFFF", bg:"#F4F6F5",
  border:"#E2E8E5", text:"#1A2820", textMid:"#4A6358", textLight:"#8EA99A",
  amber:"#D97706", amberLight:"#FFFBEB",
  blue:"#1D4ED8",  blueLight:"#EFF6FF",
  orange:"#EA580C",orangeLight:"#FFF7ED",
  teal:"#0F766E",  tealLight:"#F0FDFA",
  purple:"#7C3AED",purpleLight:"#F5F3FF",
};

const PAGE_SIZE = 12;

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  @keyframes spin    { to { transform:rotate(360deg); } }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideIn { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
  @keyframes toast-in{ from{opacity:0;transform:translateX(120%) scale(.95)} to{opacity:1;transform:translateX(0) scale(1)} }
  @keyframes pulse-red { 0%,100%{opacity:1} 50%{opacity:.5} }

  .maint-card { animation:fadeUp .22s ease both; transition:box-shadow .18s,transform .18s,border-color .15s; }
  .maint-card:hover { box-shadow:0 10px 28px rgba(27,94,55,.12)!important; transform:translateY(-3px); border-color:${C.green}!important; }
  .maint-row { transition:background .12s; }
  .maint-row:hover td { background:#F7FAF8!important; }
  .maint-tab-btn { transition:all .15s; }
  .sort-th { cursor:pointer; user-select:none; }
  .sort-th:hover { background:${C.greenLight}!important; color:${C.green}!important; }
  .page-btn { width:32px;height:32px;border-radius:8px;border:1.5px solid ${C.border};
    background:#fff;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;
    color:${C.textMid};display:inline-flex;align-items:center;justify-content:center;transition:all .15s; }
  .page-btn:hover { border-color:${C.green};color:${C.green}; }
  .page-btn.active { background:${C.green};color:#fff;border-color:${C.green}; }
  .page-btn:disabled { opacity:.4;cursor:not-allowed; }
  .kpi-card { transition:all .2s; cursor:pointer; }
  .kpi-card:hover { transform:translateY(-3px); box-shadow:0 10px 28px rgba(0,0,0,.1)!important; }
  .progress-bar-inner { transition:width .8s cubic-bezier(.4,0,.2,1); }
  input[type=date],input[type=number],input[type=text],textarea,select {
    color:${C.text}!important; background:#fff!important;
  }
  input[type=date]::-webkit-calendar-picker-indicator {
    filter:invert(25%) sepia(40%) saturate(400%) hue-rotate(120deg); cursor:pointer;
  }
  .urgence-critique { animation:pulse-red 2s infinite; }
  .timeline-bar { transition:width .6s ease; }
  .stat-ring { transform:rotate(-90deg); transform-origin:center; }
`;

// ── HELPERS ───────────────────────────────────────────────────────────────────
const fmt      = d  => d ? new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const fmtMoney = n  => n!=null&&n!==""?Number(n).toLocaleString("fr-FR")+" FCFA":"—";
const fmtKm    = n  => n!=null?Number(n).toLocaleString("fr-FR")+" km":"—";
const activeVehicles = vs => vs.filter(v => v.status !== "HORS_SERVICE");
const returnStatus   = (vehicleId, vehicles) => {
  const veh = vehicles.find(v => String(v.id) === String(vehicleId));
  return veh?.assignment_type === "FONCTION" ? "EN_SERVICE" : "DISPONIBLE";
};

// ── METADATA ──────────────────────────────────────────────────────────────────
const TYPES = [
  {val:"VIDANGE",        label:"Vidange huile",        icon:"🛢️", color:C.amber  },
  {val:"FILTRES",        label:"Filtres",               icon:"🔽", color:C.blue   },
  {val:"PNEUS",          label:"Pneus",                 icon:"🛞", color:C.textMid},
  {val:"FREINS",         label:"Freins",                icon:"🛑", color:C.red    },
  {val:"REVISION_MINOR", label:"Révision mineure",      icon:"🔧", color:C.green  },
  {val:"REVISION_MAJOR", label:"Révision majeure",      icon:"⚙️", color:C.purple },
  {val:"CONTROLE_TECH",  label:"Contrôle technique",    icon:"📋", color:C.blue   },
  {val:"COURROIE",       label:"Courroie distribution", icon:"⛓️", color:C.orange },
  {val:"CLIMATISATION",  label:"Climatisation",         icon:"❄️", color:C.teal   },
  {val:"BATTERIE",       label:"Batterie",              icon:"🔋", color:C.amber  },
  {val:"CARROSSERIE",    label:"Carrosserie",           icon:"🚘", color:C.textMid},
  {val:"ELECTRICITE",    label:"Électricité",           icon:"⚡", color:C.amber  },
  {val:"AUTRE",          label:"Autre",                 icon:"🔩", color:C.textMid},
];
const STATUTS = [
  {val:"PLANIFIE", label:"Planifié",  color:C.blue,       bg:C.blueLight  },
  {val:"EN_COURS", label:"En cours",  color:C.orange,     bg:C.orangeLight},
  {val:"TERMINE",  label:"Terminé",   color:C.green,      bg:C.greenLight },
  {val:"ANNULE",   label:"Annulé",    color:C.textLight,  bg:C.bg         },
];
const PRIORITES = [
  {val:"CRITIQUE", label:"Critique", color:C.red,    bg:C.redLight,    icon:"🔴"},
  {val:"HAUTE",    label:"Haute",    color:C.orange, bg:C.orangeLight, icon:"🟠"},
  {val:"NORMALE",  label:"Normale",  color:C.blue,   bg:C.blueLight,   icon:"🔵"},
  {val:"BASSE",    label:"Basse",    color:C.green,  bg:C.greenLight,  icon:"🟢"},
];
const getType     = v => TYPES.find(t=>t.val===v)    || TYPES[TYPES.length-1];
const getStatut   = v => STATUTS.find(s=>s.val===v)  || STATUTS[0];
const getPriorite = v => PRIORITES.find(p=>p.val===v)|| PRIORITES[2];

// ── TOAST ─────────────────────────────────────────────────────────────────────
let _setToastsGlobal = null;
function ToastProvider() {
  const [toasts, setToasts] = useState([]);
  _setToastsGlobal = setToasts;
  const remove = id => {
    setToasts(t => t.map(x => x.id===id ? {...x,removing:true} : x));
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),300);
  };
  return (
    <div style={{position:"fixed",top:24,right:24,zIndex:9999,display:"flex",flexDirection:"column",gap:8,pointerEvents:"none"}}>
      {toasts.map(t=>(
        <div key={t.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"13px 17px",
          borderRadius:12,fontSize:12,fontWeight:600,minWidth:300,maxWidth:420,
          background:t.type==="error"?"#FEF2F2":t.type==="warning"?C.amberLight:"#F0FDF4",
          border:`1px solid ${t.type==="error"?"#FECACA":t.type==="warning"?"#FDE68A":"#BBF7D0"}`,
          color:t.type==="error"?C.red:t.type==="warning"?C.amber:C.green,
          boxShadow:"0 8px 32px rgba(0,0,0,.15)",
          animation:t.removing?"none":"toast-in .3s ease",
          opacity:t.removing?0:1, transition:"opacity .25s",
          pointerEvents:"all"}}>
          <span style={{fontSize:16,flexShrink:0}}>{t.type==="error"?"❌":t.type==="warning"?"⚠️":"✅"}</span>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,marginBottom:1}}>{t.title}</div>
            {t.msg&&<div style={{fontSize:11,opacity:.8,marginTop:2}}>{t.msg}</div>}
          </div>
          <button onClick={()=>remove(t.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:"inherit",opacity:.6,pointerEvents:"all"}}>✕</button>
        </div>
      ))}
    </div>
  );
}
function showToast(title, type="success", msg="") {
  if (!_setToastsGlobal) return;
  const id = Date.now();
  _setToastsGlobal(t=>[...t,{id,title,msg,type,removing:false}]);
  setTimeout(()=>{
    _setToastsGlobal(t=>t.map(x=>x.id===id?{...x,removing:true}:x));
    setTimeout(()=>_setToastsGlobal(t=>t.filter(x=>x.id!==id)),300);
  },4500);
}

// ── MODAL BASE ────────────────────────────────────────────────────────────────
function Modal({title,subtitle,onClose,children,width=580,footer}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(4px)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.white,borderRadius:16,width:"100%",maxWidth:width,maxHeight:"92vh",
        display:"flex",flexDirection:"column",boxShadow:"0 24px 60px rgba(0,0,0,.25)",animation:"fadeUp .2s ease"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"20px 24px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:C.text}}>{title}</div>
            {subtitle&&<div style={{fontSize:12,color:C.textLight,marginTop:2}}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",
            fontSize:20,color:C.textLight,padding:4,width:32,height:32,borderRadius:8,
            display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{overflowY:"auto",padding:"20px 24px",flex:1}}>{children}</div>
        {footer&&<div style={{padding:"16px 24px",borderTop:`1px solid ${C.border}`,flexShrink:0}}>{footer}</div>}
      </div>
    </div>
  );
}
const LBL={fontSize:10,fontWeight:700,color:C.textMid,textTransform:"uppercase",letterSpacing:"1px",marginBottom:5,display:"block"};
const INP=(extra={})=>({padding:"9px 12px",border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:13,
  fontFamily:"inherit",color:C.text,background:"#fff",width:"100%",outline:"none",
  boxSizing:"border-box",transition:"border-color .15s",...extra});
function Field({label,children,required}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <label style={LBL}>{label}{required&&<span style={{color:C.red,marginLeft:3}}>*</span>}</label>
      {children}
    </div>
  );
}
function Badge({label,color,bg,icon="",size="sm"}){
  return(
    <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:size==="lg"?"5px 12px":"3px 10px",
      borderRadius:99,fontSize:size==="lg"?11:10,fontWeight:700,background:bg,color}}>
      {icon} {label}
    </span>
  );
}

// ── PAGINATION ─────────────────────────────────────────────────────────────────
function Pagination({page,totalPages,onChange,total,pageSize}){
  if(totalPages<=1)return null;
  const pages=[];
  for(let i=1;i<=totalPages;i++){
    if(i===1||i===totalPages||(i>=page-1&&i<=page+1))pages.push(i);
    else if(pages[pages.length-1]!=="…")pages.push("…");
  }
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:16,padding:"12px 0",borderTop:`1px solid ${C.border}`}}>
      <span style={{fontSize:11,color:C.textLight}}>
        {(page-1)*pageSize+1}–{Math.min(page*pageSize,total)} sur {total} résultat{total>1?"s":""}
      </span>
      <div style={{display:"flex",gap:4,alignItems:"center"}}>
        <button className="page-btn" disabled={page===1} onClick={()=>onChange(page-1)}>‹</button>
        {pages.map((p,i)=>p==="…"
          ?<span key={i} style={{fontSize:12,color:C.textLight,padding:"0 4px"}}>…</span>
          :<button key={p} className={`page-btn${page===p?" active":""}`} onClick={()=>onChange(p)}>{p}</button>
        )}
        <button className="page-btn" disabled={page===totalPages} onClick={()=>onChange(page+1)}>›</button>
      </div>
    </div>
  );
}

// ── GRAPHIQUE COÛTS PAR MOIS (SVG pur) ────────────────────────────────────────
function GraphiqueCouts({maintenances}){
  const mois = useMemo(()=>{
    const now = new Date();
    const result = [];
    for(let i=11;i>=0;i--){
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      const label = d.toLocaleDateString("fr-FR",{month:"short"});
      const total = maintenances
        .filter(m=>m.status==="TERMINE"&&(m.done_date||m.scheduled_date)?.startsWith(key))
        .reduce((s,m)=>s+Number(m.actual_cost||m.estimated_cost||0),0);
      result.push({label,total,key});
    }
    return result;
  },[maintenances]);

  const max = Math.max(...mois.map(m=>m.total),1);
  const W=560,H=140,PB=28,PL=10,PR=10;
  const barW = (W-PL-PR)/mois.length;
  const scale = v => H-PB - (v/max)*(H-PB-10);

  return(
    <div style={{background:C.white,borderRadius:12,padding:"16px 20px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div>
          <div style={{fontSize:13,fontWeight:800,color:C.text}}>📊 Coûts de maintenance — 12 derniers mois</div>
          <div style={{fontSize:11,color:C.textLight,marginTop:2}}>
            Total : <b style={{color:C.green}}>{fmtMoney(mois.reduce((s,m)=>s+m.total,0))}</b>
          </div>
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:"visible"}}>
        {/* Grille */}
        {[0,.25,.5,.75,1].map((pct,i)=>(
          <line key={i} x1={PL} y1={10+(H-PB-10)*pct} x2={W-PR} y2={10+(H-PB-10)*pct}
            stroke={C.border} strokeWidth="1" strokeDasharray="4,4"/>
        ))}
        {/* Barres */}
        {mois.map((m,i)=>{
          const x = PL + i*barW + barW*.15;
          const bw = barW*.7;
          const y = scale(m.total);
          const h = H-PB-y;
          const isMax = m.total===max&&max>0;
          return(
            <g key={i}>
              <rect x={x} y={y} width={bw} height={Math.max(h,0)}
                fill={isMax?C.green:`${C.green}55`} rx="4"
                style={{transition:"all .3s ease"}}>
                <title>{m.label} : {fmtMoney(m.total)}</title>
              </rect>
              {m.total>0&&(
                <text x={x+bw/2} y={y-4} textAnchor="middle" fontSize="9" fill={C.green} fontWeight="700">
                  {m.total>999?`${Math.round(m.total/1000)}k`:m.total}
                </text>
              )}
              <text x={x+bw/2} y={H-4} textAnchor="middle" fontSize="9" fill={C.textLight}>{m.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── TCO PAR VÉHICULE ──────────────────────────────────────────────────────────
function TCOVehicules({maintenances,vehicles}){
  const actives = activeVehicles(vehicles);
  const tco = useMemo(()=>{
    return actives.map(v=>{
      const vM = maintenances.filter(m=>String(m.vehicle)===String(v.id)&&m.status==="TERMINE");
      const total = vM.reduce((s,m)=>s+Number(m.actual_cost||m.estimated_cost||0),0);
      const count = vM.length;
      return { v, total, count };
    }).sort((a,b)=>b.total-a.total).slice(0,8);
  },[maintenances,actives]);

  const maxTco = Math.max(...tco.map(t=>t.total),1);

  return(
    <div style={{background:C.white,borderRadius:12,padding:"16px 20px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
      <div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:14}}>
        💰 Coût total par véhicule (TCO)
      </div>
      {tco.length===0
        ? <div style={{textAlign:"center",padding:"24px",color:C.textLight,fontSize:12}}>Aucune donnée de coût disponible</div>
        : tco.map(({v,total,count},i)=>(
          <div key={v.id} style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{width:20,height:20,borderRadius:6,background:i===0?C.green:i===1?C.amber:C.bg,
                  color:i<=1?"#fff":C.textLight,fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {i+1}
                </span>
                <div>
                  <span style={{fontSize:12,fontWeight:700,color:C.text}}>{v.make} {v.model}</span>
                  <span style={{fontSize:10,color:C.textLight,marginLeft:6}}>{v.registration_number}</span>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:12,fontWeight:700,color:i===0?C.red:C.text}}>{fmtMoney(total)}</div>
                <div style={{fontSize:10,color:C.textLight}}>{count} intervention{count>1?"s":""}</div>
              </div>
            </div>
            <div style={{height:6,background:C.bg,borderRadius:99,overflow:"hidden"}}>
              <div className="progress-bar-inner" style={{height:"100%",width:`${(total/maxTco)*100}%`,borderRadius:99,
                background:i===0?"linear-gradient(90deg,#DC2626,#EF4444)":i===1?"linear-gradient(90deg,#D97706,#F59E0B)":"linear-gradient(90deg,#16A34A,#4ADE80)"}}/>
            </div>
          </div>
        ))
      }
    </div>
  );
}
function parseFCFA(raw) {
  if (raw === "" || raw == null) return null;
  // Supprimer espaces, apostrophes, séparateurs de milliers
  const cleaned = String(raw).replace(/[\s\u00a0'_]/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  if (isNaN(n) || n < 0) return null;
  return Math.round(n); // entier, jamais de décimale pour des FCFA
}
 
// ── HELPER : afficher proprement un montant ────────────────────────────────────
function displayFCFA(raw) {
  const n = parseFCFA(raw);
  if (n == null) return "—";
  return n.toLocaleString("fr-FR") + " FCFA";
}
// ── EXPORT PDF ────────────────────────────────────────────────────────────────
function exportHistoriquePDF(list){
  const done=list.filter(m=>m.status==="TERMINE")
    .sort((a,b)=>new Date(b.done_date||b.scheduled_date)-new Date(a.done_date||a.scheduled_date));
  const now=new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"});
  const coutTotal=done.reduce((s,m)=>s+Number(m.actual_cost||m.estimated_cost||0),0);
  const rows=done.map(m=>{
    const t=getType(m.type);
    const cat={PREVENTIVE:"Préventive",CORRECTIVE:"Corrective",REGLEMENTAIRE:"Réglementaire"}[m.maintenance_type]||"—";
    return `<tr><td>${t.icon} ${t.label}</td><td>${m.vehicle_name||"—"}</td>
      <td>${m.vehicle_registration||"—"}</td><td>${fmt(m.done_date||m.scheduled_date)}</td>
      <td>${fmtKm(m.done_km)}</td><td>${cat}</td><td>${m.technician_name||"—"}</td>
      <td class="money">${fmtMoney(m.actual_cost||m.estimated_cost)}</td><td>${m.notes||"—"}</td></tr>`;
  }).join("");
  const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <title>Historique Maintenance — ${now}</title>
  <style>@page{size:A4 landscape;margin:12mm 10mm}*{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:9.5px;color:#1A2820}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #1B5E37}
  .hdr h1{font-size:15px;font-weight:800;color:#1B5E37}.hdr p{font-size:9px;color:#6B7280;margin-top:3px}
  .stats{display:flex;gap:10px;margin-bottom:14px}.stat{padding:7px 14px;border-radius:6px;background:#EAF4EE}
  .stat .n{font-size:16px;font-weight:800;color:#1B5E37}.stat .l{font-size:8px;color:#4A6358;font-weight:600;text-transform:uppercase;letter-spacing:.8px}
  table{width:100%;border-collapse:collapse}thead tr{background:#1B5E37;color:#fff}
  thead th{padding:6px 5px;text-align:left;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.8px}
  tbody tr:nth-child(even){background:#F7FAF8}tbody td{padding:5px;border-bottom:1px solid #E8EDEB;vertical-align:middle}
  .money{font-weight:700;color:#1B5E37}.total td{background:#EAF4EE!important;font-weight:700;color:#1B5E37;padding:7px 5px}
  .footer{margin-top:12px;font-size:8.5px;color:#9CA3AF;text-align:center;border-top:1px solid #E8EDEB;padding-top:8px}
  </style></head><body>
  <div class="hdr"><div><h1>🔧 Historique des Maintenances</h1>
  <p>Imprimé le ${now} · ${done.length} intervention${done.length!==1?"s":""} terminée${done.length!==1?"s":""}</p></div>
  <div style="text-align:right;font-size:9px;color:#6B7280"><div style="font-weight:700;font-size:12px;color:#1B5E37">IUC Logbessou</div><div>Service des Transports</div></div></div>
  <div class="stats">
  <div class="stat"><div class="n">${done.length}</div><div class="l">Interventions</div></div>
  <div class="stat"><div class="n">${new Set(done.map(m=>m.vehicle)).size}</div><div class="l">Véhicules</div></div>
  <div class="stat" style="background:#FFFBEB"><div class="n" style="color:#D97706">${fmtMoney(coutTotal)}</div><div class="l" style="color:#92400E">Coût total</div></div>
  </div>
  <table><thead><tr><th>Type</th><th>Véhicule</th><th>Immat.</th><th>Date</th>
  <th>Kilométrage</th><th>Catégorie</th><th>Technicien</th><th>Coût réel</th><th>Notes</th></tr></thead>
  <tbody>${rows}<tr class="total"><td colspan="7">TOTAL</td><td class="money">${fmtMoney(coutTotal)}</td><td></td></tr></tbody></table>
  <div class="footer">Document généré automatiquement — Système de Gestion du Parc Automobile · IUC Logbessou</div>
  <script>window.onload=function(){window.print()};<\/script></body></html>`;
  const blob=new Blob([html],{type:"text/html;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  let f=document.getElementById("__maint_pdf__");
  if(!f){f=document.createElement("iframe");f.id="__maint_pdf__";
    f.style.cssText="position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;";
    document.body.appendChild(f);}
  f.src=url;f.onload=()=>{try{f.contentWindow.focus();f.contentWindow.print();}catch{window.open(url,"_blank");}
    setTimeout(()=>URL.revokeObjectURL(url),60000);};
}

// ── MODAL CRÉER / MODIFIER MAINTENANCE ───────────────────────────────────────
// À intégrer dans TabMaintenance.jsx en remplacement de la version existante
// ─────────────────────────────────────────────────────────────────────────────

function ModalMaintenance({ initial, vehicles, technicians, onClose, onSuccess }) {
  const isEdit = !!initial;
  const [saving,      setSaving]      = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});   // erreurs par champ
  const [apiError,    setApiError]    = useState("");    // erreur globale API
  const [touched,     setTouched]     = useState({});   // champs que l'utilisateur a touchés

  const avail = activeVehicles(vehicles);

  const [form, setForm] = useState({
    vehicle:             initial?.vehicle            || "",
    maintenance_type:    initial?.maintenance_type   || "PREVENTIVE",
    type:                initial?.type               || "VIDANGE",
    priorite:            initial?.priorite           || "NORMALE",
    scheduled_date:      initial?.scheduled_date     || "",
    estimated_km:        initial?.estimated_km       || "",
    technician:          initial?.technician         || "",
    description:         initial?.description        || "",
    estimated_cost:      initial?.estimated_cost     || "",
    status:              initial?.status             || "PLANIFIE",
    notify_before_days:  initial?.notify_before_days || 7,
  });

  const set   = (k, v) => { setForm(f => ({ ...f, [k]: v })); touch(k); };
  const touch = k      => setTouched(t => ({ ...t, [k]: true }));

  // ── Règles de validation ────────────────────────────────────────────────────
  const RULES = {
    vehicle: {
      validate: v => !!v,
      message:  "Sélectionnez un véhicule dans la liste.",
      label:    "Véhicule",
    },
    scheduled_date: {
      validate: v => {
        if (!v) return false;
        // La date ne peut pas être dans le passé (sauf en modification)
        if (!isEdit && new Date(v) < new Date(new Date().toDateString())) return false;
        return true;
      },
      message: v => {
        if (!v) return "La date d'intervention est obligatoire.";
        if (!isEdit && new Date(v) < new Date(new Date().toDateString()))
          return "La date doit être aujourd'hui ou dans le futur.";
        return "Date invalide.";
      },
      label: "Date planifiée",
    },
    description: {
      validate: v => v && v.trim().length >= 10,
      message:  v => !v || !v.trim()
        ? "La description des travaux est obligatoire."
        : `Description trop courte (${v.trim().length}/10 caractères minimum).`,
      label: "Description",
    },
    
    estimated_cost: {
      validate: v => !v || (!isNaN(Number(v)) && Number(v) >= 0),
      message:  "Le coût estimé doit être un montant valide en FCFA (ex : 85 000).",
      label:    "Coût estimé",
    },
  };

  // Valider un champ spécifique
  const validateField = (key, value) => {
    const rule = RULES[key];
    if (!rule) return "";
    const isValid = rule.validate(value ?? form[key]);
    if (isValid) return "";
    return typeof rule.message === "function"
      ? rule.message(value ?? form[key])
      : rule.message;
  };

  // Valider tout le formulaire, retourner un objet { champ: message }
  const validateAll = () => {
    const errors = {};
    Object.keys(RULES).forEach(key => {
      const msg = validateField(key, form[key]);
      if (msg) errors[key] = msg;
    });
    return errors;
  };

  // Traduire les erreurs API Django en messages lisibles
  const parseApiErrors = (raw) => {
    if (!raw) return "Une erreur inattendue s'est produite. Réessayez.";
    const r = raw.toLowerCase();

    // Erreurs de champs Django (format clé: [message])
    if (raw.includes("{") && raw.includes(":")) {
      try {
        const parsed = JSON.parse(raw);
        const entries = Object.entries(parsed);
        if (entries.length > 0) {
          const fieldMap = {
            vehicle:          "Véhicule",
            scheduled_date:   "Date planifiée",
            description:      "Description",
            technician:       "Technicien",
            estimated_cost:   "Coût estimé",
            estimated_km:     "Kilométrage",
            status:           "Statut",
            maintenance_type: "Type d'intervention",
          };
          return entries.map(([k, v]) => {
            const label = fieldMap[k] || k;
            const msg = Array.isArray(v) ? v.join(", ") : String(v);
            return `• ${label} : ${msg}`;
          }).join("\n");
        }
      } catch { /* not JSON */ }
    }

    if (r.includes("unique") || r.includes("already exists"))
      return "Une maintenance identique existe déjà pour ce véhicule à cette date.";
    if (r.includes("vehicle") && r.includes("maintenance"))
      return "Ce véhicule a déjà une maintenance planifiée sur cette période.";
    if (r.includes("scheduled_date"))
      return "La date planifiée est invalide ou incorrectement formatée (format attendu : AAAA-MM-JJ).";
    if (r.includes("technician"))
      return "Le technicien sélectionné n'existe pas ou n'est plus disponible.";
    if (r.includes("500") || r.includes("internal server"))
      return "Erreur interne du serveur (500). Vérifiez les logs Django et la configuration de l'API.";
    if (r.includes("403") || r.includes("permission") || r.includes("unauthorized"))
      return "Vous n'avez pas les permissions nécessaires pour effectuer cette action.";
    if (r.includes("network") || r.includes("failed to fetch"))
      return "Impossible de contacter le serveur. Vérifiez votre connexion internet.";
    if (r.includes("404"))
      return "La ressource demandée est introuvable. L'enregistrement a peut-être été supprimé.";

    // Message brut trop technique → version générique
    if (raw.length > 200 || r.includes("traceback") || r.includes("exception"))
      return "Erreur lors de l'enregistrement. Consultez les logs serveur pour plus de détails.";

    return raw;
  };

  // ── Soumission ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setApiError("");

    // Marquer tous les champs comme touchés
    const allKeys = Object.keys(RULES);
    setTouched(Object.fromEntries(allKeys.map(k => [k, true])));

    // Valider
    const errors = validateAll();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      // Scroller vers le premier champ en erreur (UX)
      return;
    }

    setSaving(true);
    try {
      const body = {
        ...form,
        technician:     form.technician     || null,
        estimated_cost: form.estimated_cost || null,
        estimated_km:   form.estimated_km   || null,
      };

      if (isEdit) {
        await apiFetch(`/maintenance/maintenance/${initial.id}/`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await apiFetch("/maintenance/maintenance/", { method: "POST", body: JSON.stringify(body) });
      }

      // Passer le véhicule EN_MAINTENANCE
      if (["PLANIFIE", "EN_COURS"].includes(form.status) && form.vehicle) {
        try {
          await apiFetch(`/vehicles/${form.vehicle}/`, {
            method: "PATCH",
            body: JSON.stringify({ status: "EN_MAINTENANCE" }),
          });
        } catch { /* non bloquant */ }
      }

      showToast(
        isEdit ? "Maintenance mise à jour ✓" : "Maintenance planifiée ✓",
        "success",
        isEdit ? "" : "Le véhicule est passé en statut « En maintenance »."
      );
      onSuccess();
    } catch (e) {
      const readable = parseApiErrors(e.message || e.toString());
      setApiError(readable);
      showToast("Erreur lors de l'enregistrement", "error");
    } finally {
      setSaving(false);
    }
  };

  // Composant message d'erreur sous un champ
  const ErrMsg = ({ field }) => {
    if (!touched[field] || !fieldErrors[field]) return null;
    return (
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 5, marginTop: 4,
        fontSize: 11, color: "#BE123C", fontWeight: 600, lineHeight: 1.4,
      }}>
        <span style={{ flexShrink: 0, marginTop: 1 }}>⚠</span>
        <span>{fieldErrors[field]}</span>
      </div>
    );
  };

  // Style de champ avec état d'erreur
  const INP_STYLE = (field, extra = {}) => ({
    ...INP(),
    border: `1.5px solid ${touched[field] && fieldErrors[field] ? "#E11D48" : "#E2E8E5"}`,
    background: touched[field] && fieldErrors[field] ? "#FFF8F8" : "#fff",
    transition: "border-color .15s, background .15s",
    ...extra,
  });

  const hasErrors = Object.keys(fieldErrors).length > 0;
  const touchedWithErrors = Object.keys(fieldErrors).filter(k => touched[k]);

  return (
    <Modal
      title={isEdit ? "Modifier la maintenance" : "Planifier une maintenance"}
      subtitle="Préventive, curative ou réglementaire"
      onClose={onClose}
      width={640}
      footer={
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose}
            style={{ padding: "10px 20px", background: "transparent", color: C.textMid, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving || avail.length === 0}
            style={{ padding: "10px 24px", background: C.green, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: (saving || avail.length === 0) ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: (saving || avail.length === 0) ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6 }}>
            {saving
              ? <><span style={{ animation: "spin .8s linear infinite", display: "inline-block" }}>⟳</span> Enregistrement…</>
              : isEdit ? "💾 Enregistrer" : "📅 Planifier"
            }
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Erreur API globale ── */}
        {apiError && (
          <div style={{
            background: "#FFF1F2", border: "1.5px solid #FECDD3", borderRadius: 10,
            padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>❌</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#BE123C", marginBottom: 4 }}>
                Erreur lors de l'enregistrement
              </div>
              <div style={{ fontSize: 12, color: "#9F1239", lineHeight: 1.7, whiteSpace: "pre-line" }}>
                {apiError}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: "#6B7280", borderTop: "1px solid #FECDD3", paddingTop: 8 }}>
                💡 Si le problème persiste, vérifiez les logs serveur ou contactez l'administrateur.
              </div>
            </div>
          </div>
        )}

        {/* ── Résumé erreurs de validation ── */}
        {touchedWithErrors.length > 0 && (
          <div style={{
            background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 10,
            padding: "12px 16px",
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#92400E", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <span>⚠️</span>
              {touchedWithErrors.length === 1
                ? "1 champ nécessite votre attention :"
                : `${touchedWithErrors.length} champs nécessitent votre attention :`
              }
            </div>
            {touchedWithErrors.map(k => (
              <div key={k} style={{ fontSize: 11, color: "#92400E", display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 3 }}>
                <span style={{ flexShrink: 0 }}>•</span>
                <span><b>{RULES[k]?.label || k}</b> : {fieldErrors[k]}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Type d'intervention ── */}
        <Field label="Type d'intervention" required>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { val: "PREVENTIVE",    icon: "🛡️", label: "Préventive",    desc: "Révisions planifiées" },
              { val: "CORRECTIVE",    icon: "🔧", label: "Corrective",    desc: "Suite à une panne"    },
              { val: "REGLEMENTAIRE", icon: "📋", label: "Réglementaire", desc: "Contrôle technique"   },
            ].map(({ val, icon, label, desc }) => (
              <button key={val} type="button" onClick={() => set("maintenance_type", val)}
                style={{
                  flex: 1, padding: "10px 8px", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", textAlign: "center",
                  border: `2px solid ${form.maintenance_type === val ? C.green : C.border}`,
                  background: form.maintenance_type === val ? C.greenLight : C.bg, transition: "all .15s",
                }}>
                <div style={{ fontSize: 20, marginBottom: 3 }}>{icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: form.maintenance_type === val ? C.green : C.text }}>{label}</div>
                <div style={{ fontSize: 9, color: C.textLight, marginTop: 2 }}>{desc}</div>
              </button>
            ))}
          </div>
        </Field>

        {/* Aucun véhicule disponible */}
        {avail.length === 0 && (
          <div style={{ background: C.amberLight, border: "1.5px solid #FDE68A", borderRadius: 9, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.amber }}>Aucun véhicule actif disponible</div>
              <div style={{ fontSize: 11, color: "#92400E", marginTop: 2 }}>
                Tous les véhicules sont soit hors service, soit déjà en maintenance. Remettez un véhicule en service avant de planifier une intervention.
              </div>
            </div>
          </div>
        )}

        {/* Véhicule + Opération */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Véhicule" required>
            <select style={INP_STYLE("vehicle")} value={form.vehicle}
              onChange={e => set("vehicle", e.target.value)}
              onBlur={() => touch("vehicle")}>
              <option value="">— Sélectionnez un véhicule —</option>
              {avail.map(v => (
                <option key={v.id} value={v.id}>{v.make} {v.model} · {v.registration_number}</option>
              ))}
            </select>
            <ErrMsg field="vehicle" />
          </Field>

          <Field label="Opération">
            <select style={INP_STYLE("type")} value={form.type} onChange={e => set("type", e.target.value)}>
              {TYPES.map(t => <option key={t.val} value={t.val}>{t.icon} {t.label}</option>)}
            </select>
          </Field>

          <Field label="Date planifiée" required>
            <input
              type="date"
              style={INP_STYLE("scheduled_date")}
              value={form.scheduled_date}
              min={isEdit ? undefined : new Date().toISOString().split("T")[0]}
              onChange={e => set("scheduled_date", e.target.value)}
              onBlur={() => touch("scheduled_date")}
            />
            <ErrMsg field="scheduled_date" />
          </Field>

         

          <Field label="Priorité">
            <select style={INP_STYLE("priorite")} value={form.priorite} onChange={e => set("priorite", e.target.value)}>
              {PRIORITES.map(p => <option key={p.val} value={p.val}>{p.icon} {p.label}</option>)}
            </select>
          </Field>

          <Field label="Statut">
            <select style={INP_STYLE("status")} value={form.status} onChange={e => set("status", e.target.value)}>
              {STATUTS.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
            </select>
          </Field>

          <Field label="Technicien assigné">
            <select style={INP_STYLE("technician")} value={form.technician} onChange={e => set("technician", e.target.value)}>
              <option value="">— À assigner ultérieurement —</option>
              {technicians.map(t => (
                <option key={t.id} value={t.id}>{t.full_name || `${t.first_name} ${t.last_name}`}</option>
              ))}
            </select>
          </Field>

          <Field label="Coût estimé (FCFA)">
            <input
              type="number"
              style={INP_STYLE("estimated_cost")}
              value={form.estimated_cost}
              onChange={e => set("estimated_cost", e.target.value)}
              onBlur={() => touch("estimated_cost")}
              placeholder="Ex : 85 000"
              min={0}
            />
            <ErrMsg field="estimated_cost" />
          </Field>
        </div>

        {/* Alerte avant échéance */}
        <Field label="Rappel avant échéance">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              type="range" min={1} max={30}
              value={form.notify_before_days}
              onChange={e => set("notify_before_days", parseInt(e.target.value))}
              style={{ flex: 1, accentColor: C.green }}
            />
            <span style={{
              fontSize: 13, fontWeight: 800, color: C.green,
              background: C.greenLight, padding: "3px 10px", borderRadius: 7, minWidth: 70, textAlign: "center",
            }}>
              {form.notify_before_days} jour{form.notify_before_days > 1 ? "s" : ""}
            </span>
          </div>
          <div style={{ fontSize: 10, color: C.textLight, marginTop: 3 }}>
            Une alerte sera envoyée {form.notify_before_days} jour{form.notify_before_days > 1 ? "s" : ""} avant la date d'intervention.
          </div>
        </Field>

        {/* Description */}
        <Field label="Description des travaux" required>
          <div style={{ position: "relative" }}>
            <textarea
              style={{
                ...INP_STYLE("description"),
                resize: "vertical",
                minHeight: 88,
                paddingBottom: 22,
              }}
              value={form.description}
              onChange={e => set("description", e.target.value)}
              onBlur={() => touch("description")}
              placeholder="Détaillez les opérations à effectuer : pièces concernées, procédures, points de contrôle…"
            />
            {/* Compteur de caractères */}
            <span style={{
              position: "absolute", bottom: 8, right: 10, fontSize: 10,
              color: form.description.trim().length >= 10 ? C.green : C.textLight,
              fontWeight: 600,
            }}>
              {form.description.trim().length}/10 min.
            </span>
          </div>
          <ErrMsg field="description" />
        </Field>

        {/* Info véhicule */}
        <div style={{ background: C.blueLight, border: "1px solid #BFDBFE", borderRadius: 9, padding: "10px 14px", fontSize: 11, color: C.blue, display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>ℹ️</span>
          <span>
            Le statut du véhicule passera automatiquement à <b>« En maintenance »</b> dès la planification.
            Il redeviendra <b>« Disponible »</b> après la clôture de l'intervention.
          </span>
        </div>

      </div>
    </Modal>
  );
}

// ── MODAL CLÔTURER ────────────────────────────────────────────────────────────
function ModalCloturer({maintenance,vehicles,onClose,onSuccess}){
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({
    done_date:   new Date().toISOString().split("T")[0],
    done_km:     maintenance.vehicle_km||"",
    actual_cost: maintenance.estimated_cost||"",
    notes:       "",
    pieces:      "",
  });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const typeCfg=getType(maintenance.type);
  const rs=returnStatus(maintenance.vehicle,vehicles);
  const rsLabel=rs==="EN_SERVICE"?"En service":"Disponible";

  const handleSubmit=async()=>{
    if(!form.done_date){showToast("La date est obligatoire","error");return;}
    setSaving(true);
    try{
      const notes=[form.notes,form.pieces?"Pièces : "+form.pieces:""].filter(Boolean).join("\n");
      await apiFetch(`/maintenance/maintenance/${maintenance.id}/`,{method:"PATCH",
        body:JSON.stringify({status:"TERMINE",done_date:form.done_date,
          done_km:form.done_km||null,actual_cost:form.actual_cost||null,notes:notes||null})});
      if(form.done_km&&maintenance.vehicle){
        try{await apiFetch(`/vehicles/${maintenance.vehicle}/`,{method:"PATCH",body:JSON.stringify({current_mileage:form.done_km})});}catch{}
      }
      if(maintenance.vehicle){
        try{await apiFetch(`/vehicles/${maintenance.vehicle}/`,{method:"PATCH",body:JSON.stringify({status:rs})});}catch{}
      }
      showToast(`Clôturée ✓ — Véhicule remis « ${rsLabel} »`,"success");
      onSuccess();
    }catch(e){showToast(e.message,"error");}
    finally{setSaving(false);}
  };

  return(
    <Modal title={`Clôturer — ${typeCfg.icon} ${typeCfg.label}`}
      subtitle={`${maintenance.vehicle_name} · Enregistrez l'intervention réelle`}
      onClose={onClose} width={520}
      footer={
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"10px 18px",background:"transparent",color:C.textMid,
            border:`1px solid ${C.border}`,borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving}
            style={{padding:"10px 22px",background:C.green,color:"#fff",border:"none",borderRadius:8,fontSize:12,
              fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:saving?0.7:1,display:"flex",alignItems:"center",gap:6}}>
            {saving?<><span style={{animation:"spin .8s linear infinite",display:"inline-block"}}>⟳</span> Clôture…</>:"✓ Clôturer la maintenance"}
          </button>
        </div>
      }>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{background:C.greenLight,borderRadius:9,padding:"12px 14px",display:"flex",gap:12,alignItems:"center"}}>
          <span style={{fontSize:28}}>{typeCfg.icon}</span>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:C.green}}>{typeCfg.label}</div>
            <div style={{fontSize:11,color:C.textMid,marginTop:2}}>
              {maintenance.vehicle_name}
              {maintenance.scheduled_date&&` · Prévu le ${fmt(maintenance.scheduled_date)}`}
              {maintenance.estimated_cost&&` · Estimé : ${fmtMoney(maintenance.estimated_cost)}`}
            </div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Date d'intervention" required>
            <input type="date" style={INP()} value={form.done_date} onChange={e=>set("done_date",e.target.value)}/>
          </Field>
          <Field label="Kilométrage réel (km)">
            <input type="number" style={INP()} value={form.done_km} onChange={e=>set("done_km",e.target.value)}
              placeholder={maintenance.vehicle_km?`Actuel : ${Number(maintenance.vehicle_km).toLocaleString("fr-FR")}`:"km actuel"}/>
          </Field>
          <Field label="Coût réel (FCFA)">
            <input type="number" style={INP()} value={form.actual_cost} onChange={e=>set("actual_cost",e.target.value)}
              placeholder={maintenance.estimated_cost?`Estimé : ${Number(maintenance.estimated_cost).toLocaleString("fr-FR")}`:"0"}/>
          </Field>
          <Field label="Pièces utilisées">
            <input type="text" style={INP()} value={form.pieces} onChange={e=>set("pieces",e.target.value)}
              placeholder="Ex : Filtre huile, 5L huile 5W40…"/>
          </Field>
        </div>
        <Field label="Notes / Observations">
          <textarea style={{...INP(),resize:"vertical",minHeight:64}} value={form.notes}
            onChange={e=>set("notes",e.target.value)} placeholder="Anomalies, recommandations, suite…"/>
        </Field>
        <div style={{background:C.greenLight,border:"1px solid #BBF7D0",borderRadius:8,padding:"10px 14px",fontSize:11,color:C.green,fontWeight:600}}>
          ✓ À la clôture : véhicule remis à <b>« {rsLabel} »</b>
          {form.done_km&&<> · km mis à jour à <b>{Number(form.done_km).toLocaleString("fr-FR")} km</b></>}
          {form.actual_cost&&maintenance.estimated_cost&&(
            <span style={{marginLeft:8,color:Number(form.actual_cost)>Number(maintenance.estimated_cost)?C.red:C.green}}>
              · Δ coût {Number(form.actual_cost)>Number(maintenance.estimated_cost)?"▲":"▼"} {fmtMoney(Math.abs(Number(form.actual_cost)-Number(maintenance.estimated_cost)))}
            </span>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ── MODAL DÉTAIL ──────────────────────────────────────────────────────────────
function ModalDetail({ maintenance, onClose, onCloturer, onEdit }) {
  const typeCfg = getType(maintenance.type);
  const stCfg   = getStatut(maintenance.status);
  const priCfg  = getPriorite(maintenance.priorite);
  const isLate  = !["TERMINE","ANNULE"].includes(maintenance.status) &&
    maintenance.scheduled_date && new Date(maintenance.scheduled_date) < new Date();
 
  // ── Calculs coûts ──────────────────────────────────────────────────────────
  const laborCost  = Number(maintenance.labor_cost  || 0);
  const partsCost  = Number(maintenance.parts_cost  || 0);
  const totalReal  = Number(maintenance.total_cost  || 0);
  // "Estimé" = ce qui avait été saisi lors de la planification
  // "Réel"   = total_cost calculé auto après clôture
  const hasCoûts   = laborCost > 0 || partsCost > 0;
  const diff       = totalReal - (laborCost + partsCost); // écart si modifié
  const isTermine  = maintenance.status === "TERMINE";
 
  return (
    <Modal
      title={`${typeCfg.icon} ${typeCfg.label}`}
      subtitle={`${maintenance.vehicle_name || "Véhicule"} · ${maintenance.vehicle_registration || ""} · #${maintenance.id}`}
      onClose={onClose}
      width={580}
      footer={
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"9px 18px", background:"transparent", color:C.textMid,
            border:`1px solid ${C.border}`, borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            Fermer
          </button>
          {!["TERMINE","ANNULE"].includes(maintenance.status) && (
            <>
              <button onClick={() => { onClose(); onEdit(maintenance); }}
                style={{ padding:"9px 18px", background:C.blueLight, color:C.blue,
                  border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                ✏️ Modifier
              </button>
              <button onClick={() => { onClose(); onCloturer(maintenance); }}
                style={{ padding:"9px 18px", background:C.green, color:"#fff",
                  border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                ✓ Clôturer
              </button>
            </>
          )}
        </div>
      }>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
 
        {/* ── Badges statut ── */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          <Badge label={stCfg.label} color={stCfg.color} bg={stCfg.bg} size="lg"/>
          <Badge label={priCfg.label} color={priCfg.color} bg={priCfg.bg} icon={priCfg.icon} size="lg"/>
          {isLate && <Badge label="EN RETARD" color={C.red} bg={C.redLight} icon="⏰" size="lg"/>}
          {isTermine && <Badge label="Clôturée" color={C.green} bg={C.greenLight} icon="✅" size="lg"/>}
        </div>
 
        {/* ── Véhicule & Planification ── */}
        <div style={{ background:C.bg, borderRadius:10, padding:"14px 16px" }}>
          <div style={{ fontSize:10, fontWeight:800, color:C.green, textTransform:"uppercase",
            letterSpacing:"1.2px", paddingBottom:6, borderBottom:`2px solid ${C.greenLight}`,
            marginBottom:12 }}>🚗 Véhicule & Planification</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[
              ["Véhicule",         maintenance.vehicle_name      || "—"],
              ["Immatriculation",  maintenance.vehicle_registration || "—"],
              ["Km actuel",        maintenance.vehicle_km != null
                                    ? `${Number(maintenance.vehicle_km).toLocaleString("fr-FR")} km`
                                    : "—"],
              ["Technicien",       maintenance.technician_name   || "Non assigné"],
              ["Date planifiée",   fmt(maintenance.scheduled_date)],
             
              ["Type opération",   `${typeCfg.icon} ${typeCfg.label}`],
              ["Catégorie",        { PREVENTIVE:"🛡️ Préventive", CORRECTIVE:"🔧 Corrective",
                                     REGLEMENTAIRE:"📋 Réglementaire" }[maintenance.maintenance_type] || "—"],
            ].map(([lbl, val]) => (
              <div key={lbl}>
                <div style={{ fontSize:9, color:C.textLight, fontWeight:700, textTransform:"uppercase",
                  letterSpacing:".8px", marginBottom:3 }}>{lbl}</div>
                <div style={{ fontSize:12, fontWeight:600, color:C.text }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
 
        {/* ── Description ── */}
        {maintenance.description && (
          <div style={{ background:C.bg, borderRadius:9, padding:"12px 14px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.textLight, textTransform:"uppercase",
              letterSpacing:"1px", marginBottom:6 }}>📝 Description des travaux prévus</div>
            <div style={{ fontSize:12, color:C.text, lineHeight:1.7 }}>{maintenance.description}</div>
          </div>
        )}
 
        {/* ── SECTION COÛTS — cœur de la fonctionnalité ── */}
        <div style={{ background:"#fff", border:`1.5px solid ${C.border}`, borderRadius:10, overflow:"hidden" }}>
          <div style={{ background: isTermine ? C.greenLight : C.amberLight,
            padding:"12px 16px", borderBottom:`1px solid ${C.border}`,
            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:12, fontWeight:800, color: isTermine ? C.green : C.amber }}>
              💰 {isTermine ? "Coûts réels de l'intervention" : "Estimation des coûts"}
            </div>
            {isTermine && (
              <span style={{ fontSize:10, fontWeight:700, color:C.green, background:"#fff",
                padding:"2px 10px", borderRadius:99 }}>✓ Clôturée</span>
            )}
          </div>
 
          <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:12 }}>
            {/* Ligne main d'œuvre */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"8px 12px", background:C.bg, borderRadius:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:16 }}>🔧</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:C.text }}>Main d'œuvre</div>
                  <div style={{ fontSize:10, color:C.textLight }}>Coût de la main d'œuvre technicien</div>
                </div>
              </div>
              <div style={{ fontSize:14, fontWeight:800,
                color: laborCost > 0 ? C.text : C.textLight }}>
                {laborCost > 0 ? `${laborCost.toLocaleString("fr-FR")} FCFA` : "—"}
              </div>
            </div>
 
            {/* Ligne pièces */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"8px 12px", background:C.bg, borderRadius:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:16 }}>🔩</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:C.text }}>Pièces détachées</div>
                  <div style={{ fontSize:10, color:C.textLight }}>
                    {maintenance.parts_replaced || "Aucune pièce renseignée"}
                  </div>
                </div>
              </div>
              <div style={{ fontSize:14, fontWeight:800,
                color: partsCost > 0 ? C.text : C.textLight }}>
                {partsCost > 0 ? `${partsCost.toLocaleString("fr-FR")} FCFA` : "—"}
              </div>
            </div>
 
            {/* Séparateur */}
            <div style={{ height:1, background:C.border }}/>
 
            {/* TOTAL */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"10px 12px",
              background: isTermine ? C.greenLight : C.amberLight,
              borderRadius:9, border:`1.5px solid ${isTermine ? C.green+"30" : C.amber+"30"}` }}>
              <div style={{ fontSize:13, fontWeight:800,
                color: isTermine ? C.green : C.amber }}>
                {isTermine ? "💰 Coût total réel" : "💰 Coût total estimé"}
              </div>
              <div style={{ fontSize:18, fontWeight:800,
                color: isTermine ? C.green : C.amber }}>
                {totalReal > 0
                  ? `${totalReal.toLocaleString("fr-FR")} FCFA`
                  : hasCoûts
                    ? `${(laborCost + partsCost).toLocaleString("fr-FR")} FCFA`
                    : "Non renseigné"
                }
              </div>
            </div>
 
            {/* Alerte si pas de coûts renseignés */}
            {!hasCoûts && !isTermine && (
              <div style={{ fontSize:11, color:C.amber, background:C.amberLight,
                borderRadius:7, padding:"8px 12px", display:"flex", gap:6 }}>
                <span>💡</span>
                <span>Les coûts seront renseignés lors de la clôture de cette maintenance.</span>
              </div>
            )}
          </div>
        </div>
 
        {/* ── Données de clôture (si terminée) ── */}
        {isTermine && (
          <div style={{ background:C.greenLight, border:`1px solid ${C.green}20`,
            borderRadius:10, padding:"14px 16px" }}>
            <div style={{ fontSize:10, fontWeight:800, color:C.green, textTransform:"uppercase",
              letterSpacing:"1.2px", marginBottom:12 }}>✅ Données de clôture</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[
                ["📅 Date d'intervention", fmt(maintenance.end_date  || maintenance.done_date)],
                ["📍 Km à la clôture",     maintenance.mileage_at_maintenance
                                              ? `${Number(maintenance.mileage_at_maintenance).toLocaleString("fr-FR")} km`
                                              : "—"],
                ["⏱ Durée",               maintenance.duration_hours
                                              ? `${maintenance.duration_hours.toFixed(1)}h`
                                              : "—"],
                ["👤 Technicien",          maintenance.technician_name || "—"],
              ].map(([lbl,val]) => (
                <div key={lbl}>
                  <div style={{ fontSize:9, color:C.greenMid, fontWeight:700,
                    textTransform:"uppercase", letterSpacing:".8px", marginBottom:3 }}>{lbl}</div>
                  <div style={{ fontSize:12, fontWeight:600, color:C.text }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        )}
 
        {/* ── Travaux effectués (si renseignés) ── */}
        {maintenance.work_performed && (
          <div style={{ background:C.bg, borderRadius:9, padding:"12px 14px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.textLight, textTransform:"uppercase",
              letterSpacing:"1px", marginBottom:6 }}>🔧 Travaux effectués</div>
            <div style={{ fontSize:12, color:C.text, lineHeight:1.7,
              whiteSpace:"pre-wrap" }}>{maintenance.work_performed}</div>
          </div>
        )}
 
        {/* ── Notes ── */}
        {maintenance.notes && (
          <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A",
            borderRadius:9, padding:"12px 14px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.amber, textTransform:"uppercase",
              letterSpacing:"1px", marginBottom:6 }}>🗒️ Notes d'intervention</div>
            <div style={{ fontSize:12, color:C.text, lineHeight:1.7,
              whiteSpace:"pre-wrap" }}>{maintenance.notes}</div>
          </div>
        )}
 
        {/* ── Documents (si disponibles) ── */}
        {(maintenance.invoice_document || maintenance.report_document) && (
          <div style={{ background:C.bg, borderRadius:9, padding:"12px 14px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.textLight, textTransform:"uppercase",
              letterSpacing:"1px", marginBottom:8 }}>📎 Documents joints</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {maintenance.invoice_document && (
                <a href={maintenance.invoice_document} target="_blank" rel="noopener noreferrer"
                  style={{ padding:"6px 12px", background:C.blueLight, color:C.blue, borderRadius:7,
                    fontSize:11, fontWeight:600, textDecoration:"none", display:"flex", alignItems:"center", gap:5 }}>
                  📄 Facture
                </a>
              )}
              {maintenance.report_document && (
                <a href={maintenance.report_document} target="_blank" rel="noopener noreferrer"
                  style={{ padding:"6px 12px", background:C.greenLight, color:C.green, borderRadius:7,
                    fontSize:11, fontWeight:600, textDecoration:"none", display:"flex", alignItems:"center", gap:5 }}>
                  📋 Rapport
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── VUE CALENDRIER ────────────────────────────────────────────────────────────
function VueCalendrier({maintenances,onDetail}){
  const [current,setCurrent]=useState(new Date());
  const year=current.getFullYear(),month=current.getMonth();
  const firstDay=new Date(year,month,1).getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const offset=firstDay===0?6:firstDay-1;
  const days=[];
  for(let i=offset-1;i>=0;i--) days.push({date:new Date(year,month,-i),cur:false});
  for(let i=1;i<=daysInMonth;i++) days.push({date:new Date(year,month,i),cur:true});
  while(days.length<42) days.push({date:new Date(year,month+1,days.length-daysInMonth-offset+1),cur:false});

  const getForDay=d=>maintenances.filter(m=>{
    const sd=m.scheduled_date||m.done_date;
    if(!sd)return false;
    return new Date(sd).toDateString()===d.toDateString();
  });
  const today=new Date();today.setHours(0,0,0,0);
  const MONTHS=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const DAYS=["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

  return(
    <div style={{background:C.white,borderRadius:12,padding:16,boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <button onClick={()=>setCurrent(new Date(year,month-1,1))}
          style={{padding:"6px 12px",border:`1.5px solid ${C.border}`,borderRadius:8,background:C.white,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>‹</button>
        <div style={{fontWeight:800,fontSize:15,color:C.text}}>{MONTHS[month]} {year}</div>
        <button onClick={()=>setCurrent(new Date(year,month+1,1))}
          style={{padding:"6px 12px",border:`1.5px solid ${C.border}`,borderRadius:8,background:C.white,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
        {DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:10,fontWeight:700,color:C.textLight,padding:"4px 0",textTransform:"uppercase",letterSpacing:".6px"}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {days.map((day,i)=>{
          const items=getForDay(day.date);
          const isToday=day.date.getTime()===today.getTime();
          return(
            <div key={i} style={{minHeight:64,borderRadius:6,padding:4,fontSize:10,
              border:`1px solid ${isToday?C.green:C.border}`,
              background:isToday?C.greenLight:day.cur?"#fff":"#F9FAFB",
              opacity:day.cur?1:.5}}>
              <div style={{fontSize:11,fontWeight:isToday?800:500,color:isToday?C.green:day.cur?C.text:C.textLight}}>{day.date.getDate()}</div>
              {items.slice(0,2).map(m=>{
                const tc=getType(m.type);const st=getStatut(m.status);
                return(
                  <div key={m.id} onClick={()=>onDetail(m)}
                    style={{fontSize:9,padding:"2px 5px",borderRadius:4,marginTop:2,cursor:"pointer",
                      background:st.bg,color:st.color,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}
                    title={`${tc.label} — ${m.vehicle_name}`}>
                    {tc.icon} {m.vehicle_name?.split(" ")[0]||`#${m.id}`}
                  </div>
                );
              })}
              {items.length>2&&<div style={{fontSize:8,color:C.textLight,marginTop:2}}>+{items.length-2}</div>}
            </div>
          );
        })}
      </div>
      <div style={{display:"flex",gap:10,marginTop:10,flexWrap:"wrap"}}>
        {STATUTS.map(s=>(
          <div key={s.val} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.textLight}}>
            <span style={{width:8,height:8,borderRadius:2,background:s.color,display:"inline-block"}}/>
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── TAB PREVENTIF ─────────────────────────────────────────────────────────────
export function TabPreventif({vehicles,toast}){
  const [plans,setPlans]=useState([]);
  const [loading,setLoading]=useState(true);
  const [modalDone,setModalDone]=useState(null);
  const [filterUrgency,setFilterUrgency]=useState("");
  const URGENCY_CFG={
    CRITIQUE:{label:"Dépassée",color:C.red,   bg:C.redLight,   icon:"🔴",order:0},
    WARNING: {label:"Urgente", color:C.orange,bg:C.orangeLight,icon:"🟠",order:1},
    BIENTOT: {label:"Proche",  color:C.amber, bg:C.amberLight, icon:"🟡",order:2},
    OK:      {label:"À jour",  color:C.green, bg:C.greenLight, icon:"🟢",order:3},
    INCONNU: {label:"Inconnue",color:C.textLight,bg:C.bg,       icon:"⚪",order:4},
  };
  const TYPE_LABELS={VIDANGE:"Vidange 🛢️",FILTRES:"Filtres 🔽",PNEUS:"Pneus 🛞",FREINS:"Freins 🛑",
    REVISION_MINOR:"Rév. mineure 🔧",REVISION_MAJOR:"Rév. majeure ⚙️",CONTROLE_TECH:"Contrôle tech 📋",
    COURROIE:"Courroie ⛓️",CLIMATISATION:"Clim ❄️",BATTERIE:"Batterie 🔋",AUTRE:"Autre 🔩"};
  const activeIds=new Set(activeVehicles(vehicles).map(v=>String(v.id)));

  const load=async()=>{
    setLoading(true);
    try{
      const r=await apiFetch("/maintenance/plans/").catch(()=>[]);
      const all=Array.isArray(r)?r:r?.results??[];
      setPlans(all.filter(p=>!p.vehicle||activeIds.has(String(p.vehicle))));
    }finally{setLoading(false);}
  };
  useEffect(()=>{load();},[JSON.stringify([...activeIds])]);

  const sorted=[...plans].filter(p=>!filterUrgency||p.urgency===filterUrgency)
    .sort((a,b)=>{const oA=URGENCY_CFG[a.urgency]?.order??4,oB=URGENCY_CFG[b.urgency]?.order??4;
      if(oA!==oB)return oA-oB;
      return new Date(a.next_due_date||"9999")-new Date(b.next_due_date||"9999");
    });
  const countBy=u=>plans.filter(p=>p.urgency===u).length;

  function ModalDone({plan,onClose,onSuc}){
    const [saving,setSaving]=useState(false);
    const [form,setForm]=useState({done_date:new Date().toISOString().split("T")[0],done_km:plan.vehicle_km||"",cost:plan.estimated_cost||"",notes:""});
    const set=(k,v)=>setForm(f=>({...f,[k]:v}));
    const rs=returnStatus(plan.vehicle,vehicles);
    const rsLabel=rs==="EN_SERVICE"?"En service":"Disponible";
    const handleSubmit=async()=>{
      if(!form.done_date){showToast("La date est obligatoire","error");return;}
      setSaving(true);
      try{
        await apiFetch(`/maintenance/plans/${plan.id}/done/`,{method:"POST",
          body:JSON.stringify({done_date:form.done_date,done_km:form.done_km||null,cost:form.cost||null,notes:form.notes||null})});
        if(form.done_km&&plan.vehicle)try{await apiFetch(`/vehicles/${plan.vehicle}/`,{method:"PATCH",body:JSON.stringify({current_mileage:form.done_km})});}catch{}
        if(plan.vehicle)try{await apiFetch(`/vehicles/${plan.vehicle}/`,{method:"PATCH",body:JSON.stringify({status:rs})});}catch{}
        showToast(`Plan mis à jour ✓ — Véhicule remis « ${rsLabel} »`);
        onSuc();
      }catch(e){showToast(e.message||"Erreur","error");}
      finally{setSaving(false);}
    };
    return(
      <Modal title="Marquer comme effectuée" subtitle={`${TYPE_LABELS[plan.type]||plan.type} · ${plan.vehicle_name}`}
        onClose={onClose}
        footer={
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button onClick={onClose} style={{padding:"10px 18px",background:"transparent",color:C.textMid,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Annuler</button>
            <button onClick={handleSubmit} disabled={saving}
              style={{padding:"10px 22px",background:C.green,color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:saving?0.7:1,display:"flex",alignItems:"center",gap:6}}>
              {saving?<><span style={{animation:"spin .8s linear infinite",display:"inline-block"}}>⟳</span> Enregistrement…</>:"✓ Confirmer"}
            </button>
          </div>
        }>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:C.greenLight,borderRadius:9,padding:"12px 14px",fontSize:11,color:C.green,lineHeight:1.6}}>
            ℹ️ Cycle repart à zéro. Prochaine : <b>{plan.trigger_months?`dans ${plan.trigger_months} mois`:""}{plan.trigger_km&&plan.trigger_months?" ou ":""}{plan.trigger_km?`dans ${Number(plan.trigger_km).toLocaleString("fr-FR")} km`:""}</b>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Field label="Date d'intervention" required><input type="date" style={INP()} value={form.done_date} onChange={e=>set("done_date",e.target.value)}/></Field>
            <Field label="Kilométrage actuel"><input type="number" style={INP()} value={form.done_km} onChange={e=>set("done_km",e.target.value)} placeholder={plan.vehicle_km?`${Number(plan.vehicle_km).toLocaleString("fr-FR")} km`:"km actuel"}/></Field>
            <Field label="Coût (FCFA)"><input type="number" style={INP()} value={form.cost} onChange={e=>set("cost",e.target.value)} placeholder="0"/></Field>
          </div>
          <Field label="Notes"><textarea style={{...INP(),resize:"vertical",minHeight:60}} value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="Pièces utilisées, observations…"/></Field>
        </div>
      </Modal>
    );
  }

  if(loading)return(
    <div style={{textAlign:"center",padding:"60px 0",color:C.textLight}}>
      <div style={{width:24,height:24,border:`3px solid ${C.green}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",display:"inline-block"}}/>
      <div style={{marginTop:10,fontSize:13}}>Chargement des plans préventifs…</div>
    </div>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        {["CRITIQUE","WARNING","BIENTOT","OK"].map(u=>{
          const cfg=URGENCY_CFG[u],n=countBy(u);
          return(
            <div key={u} onClick={()=>setFilterUrgency(filterUrgency===u?"":u)} className="kpi-card"
              style={{background:filterUrgency===u?cfg.bg:C.white,borderRadius:10,padding:"16px",textAlign:"center",cursor:"pointer",
                border:`${filterUrgency===u?"2":"1"}px solid ${filterUrgency===u?cfg.color:C.border}`,
                borderTop:`3px solid ${cfg.color}`,boxShadow:"0 1px 4px rgba(0,0,0,.05)"}}>
              <div style={{fontSize:22,marginBottom:4}}>{cfg.icon}</div>
              <div style={{fontSize:28,fontWeight:800,color:cfg.color,lineHeight:1}}>{n}</div>
              <div style={{fontSize:10,color:C.textLight,textTransform:"uppercase",letterSpacing:"1px",marginTop:4}}>{cfg.label}</div>
            </div>
          );
        })}
      </div>

      {countBy("CRITIQUE")===0&&countBy("WARNING")===0&&(
        <div style={{background:C.greenLight,border:`1px solid ${C.green}30`,borderRadius:10,padding:"14px 18px",fontSize:13,color:C.green,fontWeight:600,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:20}}>✅</span>Toutes les maintenances préventives sont à jour !
        </div>
      )}

      {sorted.length===0?(
        <div style={{background:C.white,borderRadius:12,padding:"48px 20px",textAlign:"center",color:C.textLight}}>
          <div style={{fontSize:36,marginBottom:8}}>🛡️</div>
          <div style={{fontSize:14,fontWeight:700}}>Aucun plan de maintenance</div>
        </div>
      ):sorted.map(plan=>{
        const urgCfg=URGENCY_CFG[plan.urgency]||URGENCY_CFG.INCONNU;
        const pct=plan.urgency_score??0;
        const barColor=pct>=90?C.red:pct>=70?C.orange:pct>=50?C.amber:C.green;
        return(
          <div key={plan.id} className="maint-card" style={{background:C.white,borderRadius:12,padding:"16px 20px",
            boxShadow:"0 1px 4px rgba(0,0,0,.06)",
            border:`1px solid ${plan.urgency==="CRITIQUE"?C.red+"30":C.border}`,
            borderLeft:`4px solid ${urgCfg.color}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:200}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                  <span className={plan.urgency==="CRITIQUE"?"urgence-critique":""} style={{padding:"2px 9px",borderRadius:99,fontSize:10,fontWeight:800,background:urgCfg.bg,color:urgCfg.color}}>{urgCfg.icon} {urgCfg.label}</span>
                  <span style={{fontSize:12,fontWeight:700,color:C.text}}>{TYPE_LABELS[plan.type]||plan.type}</span>
                </div>
                <div style={{fontSize:12,color:C.textMid,marginBottom:10}}>
                  🚗 {plan.vehicle_name}{plan.vehicle_km!=null&&<span style={{marginLeft:8,color:C.textLight}}>· {Number(plan.vehicle_km).toLocaleString("fr-FR")} km</span>}
                </div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  {plan.next_due_km!=null&&(
                    <div style={{background:C.bg,borderRadius:8,padding:"8px 12px",minWidth:140}}>
                      <div style={{fontSize:9,color:C.textLight,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>📍 Prochain km</div>
                      <div style={{fontSize:14,fontWeight:800,color:plan.km_remaining<0?C.red:C.text}}>{Number(plan.next_due_km).toLocaleString("fr-FR")} km</div>
                      <div style={{fontSize:10,fontWeight:600,marginTop:2,color:plan.km_remaining<0?C.red:C.textMid}}>
                        {plan.km_remaining==null?"—":plan.km_remaining<0?`Dépassé de ${Math.abs(plan.km_remaining).toLocaleString("fr-FR")} km`:`${plan.km_remaining.toLocaleString("fr-FR")} km restants`}
                      </div>
                    </div>
                  )}
                  {plan.next_due_date&&(
                    <div style={{background:C.bg,borderRadius:8,padding:"8px 12px",minWidth:140}}>
                      <div style={{fontSize:9,color:C.textLight,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>📅 Prochaine date</div>
                      <div style={{fontSize:14,fontWeight:800,color:plan.days_remaining<0?C.red:C.text}}>{fmt(plan.next_due_date)}</div>
                      <div style={{fontSize:10,fontWeight:600,marginTop:2,color:plan.days_remaining<0?C.red:C.textMid}}>
                        {plan.days_remaining==null?"—":plan.days_remaining<0?`Dépassée de ${Math.abs(plan.days_remaining)} j`:plan.days_remaining===0?"Aujourd'hui !":`Dans ${plan.days_remaining} j`}
                      </div>
                    </div>
                  )}
                  <div style={{background:C.bg,borderRadius:8,padding:"8px 12px",minWidth:140}}>
                    <div style={{fontSize:9,color:C.textLight,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>🔧 Dernière fois</div>
                    <div style={{fontSize:12,fontWeight:700,color:C.text}}>{fmt(plan.last_done_date)}</div>
                    <div style={{fontSize:10,color:C.textLight,marginTop:2}}>{plan.last_done_km?`à ${Number(plan.last_done_km).toLocaleString("fr-FR")} km`:"Jamais effectué"}</div>
                  </div>
                </div>
                <div style={{marginTop:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.textLight,marginBottom:4}}>
                    <span>Consommation du cycle</span><span style={{fontWeight:700,color:barColor}}>{pct}%</span>
                  </div>
                  <div style={{height:6,background:"rgba(0,0,0,.07)",borderRadius:99,overflow:"hidden"}}>
                    <div className="progress-bar-inner" style={{height:"100%",width:`${Math.min(pct,100)}%`,borderRadius:99,
                      background:pct>=90?"linear-gradient(90deg,#F87171,#DC2626)":pct>=70?"linear-gradient(90deg,#FCD34D,#D97706)":pct>=50?"linear-gradient(90deg,#60A5FA,#2563EB)":"linear-gradient(90deg,#4ADE80,#16A34A)",
                      boxShadow:`0 0 6px ${barColor}60`}}/>
                  </div>
                </div>
              </div>
              <button onClick={()=>setModalDone(plan)}
                style={{padding:"9px 18px",background:plan.urgency==="CRITIQUE"?C.red:C.green,color:"#fff",
                  border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0}}>
                ✓ Marquer effectuée
              </button>
            </div>
          </div>
        );
      })}
      {modalDone&&<ModalDone plan={modalDone} onClose={()=>setModalDone(null)} onSuc={()=>{setModalDone(null);load();}}/>}
    </div>
  );
}

// ── COMPOSANT PRINCIPAL ───────────────────────────────────────────────────────
export function TabMaintenance({vehicles=[],onRefresh}){
  const [tab,       setTab]       = useState("dashboard");
  const [vue,       setVue]       = useState("liste"); // "liste" | "calendrier"
  const [loading,   setLoading]   = useState(true);
  const [maintenances,setMaintenances] = useState([]);
  const [technicians, setTechnicians]  = useState([]);
  const [modalNew,  setModalNew]  = useState(false);
  const [modalEdit, setModalEdit] = useState(null);
  const [modalClot, setModalClot] = useState(null);
  const [modalDet,  setModalDet]  = useState(null);
  const [search,    setSearch]    = useState("");
  const [filterStatus,setFilterStatus] = useState("");
  const [filterType,  setFilterType]   = useState("");
  const [filterVeh,   setFilterVeh]    = useState("");
  const [filterPrio,  setFilterPrio]   = useState("");
  const [deleting,  setDeleting]  = useState(null);
  const [page,      setPage]      = useState(1);
  const [sortBy,    setSortBy]    = useState("date"); // "date"|"priorite"|"cout"|"vehicule"
  const [sortDir,   setSortDir]   = useState("desc");

  const activeVehs=activeVehicles(vehicles);
  const hsIds=new Set(vehicles.filter(v=>v.status==="HORS_SERVICE").map(v=>String(v.id)));

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const [ma,tech]=await Promise.all([
        apiFetch("/maintenance/maintenance/").catch(()=>[]),
        apiFetch("/auth/users/?role=TECHNICIEN").catch(()=>[]),
      ]);
      setMaintenances(Array.isArray(ma)?ma:ma?.results??[]);
      setTechnicians(Array.isArray(tech)?tech:tech?.results??[]);
    }finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);
  const refresh=async()=>{await load();onRefresh?.();};

  // Reset page on filter change
  useEffect(()=>setPage(1),[tab,search,filterStatus,filterType,filterVeh,filterPrio,sortBy,sortDir]);

  const activeMaint = maintenances.filter(m=>!hsIds.has(String(m.vehicle)));
  const planifiees  = activeMaint.filter(m=>m.status==="PLANIFIE");
  const enCours     = activeMaint.filter(m=>m.status==="EN_COURS");
  const terminees   = maintenances.filter(m=>m.status==="TERMINE");
  const critiques   = activeMaint.filter(m=>m.priorite==="CRITIQUE"&&!["TERMINE","ANNULE"].includes(m.status));
  const enRetard    = activeMaint.filter(m=>!["TERMINE","ANNULE"].includes(m.status)&&m.scheduled_date&&new Date(m.scheduled_date)<new Date());

  // Coût total
  const coutTotal = terminees.reduce((s,m)=>s+Number(m.actual_cost||m.estimated_cost||0),0);

  const toggleSort=(col)=>{
    if(sortBy===col)setSortDir(d=>d==="asc"?"desc":"asc");
    else{setSortBy(col);setSortDir("asc");}
  };
  const SortIcon=({col})=>{
    if(sortBy!==col)return<span style={{opacity:.3,marginLeft:4}}>↕</span>;
    return<span style={{color:C.green,marginLeft:4}}>{sortDir==="asc"?"↑":"↓"}</span>;
  };

  const getFilteredList=useCallback((forHistory=false)=>{
    const src=forHistory?maintenances:activeMaint;
    let list=src.filter(m=>{
      const q=search.toLowerCase();
      const ms=!q||[m.vehicle_name,m.description,m.technician_name,m.vehicle_registration].some(x=>(x||"").toLowerCase().includes(q));
      return ms&&(!filterStatus||m.status===filterStatus)
        &&(!filterType||m.type===filterType)
        &&(!filterVeh||String(m.vehicle)===filterVeh)
        &&(!filterPrio||m.priorite===filterPrio);
    });
    // Tri
    list=[...list].sort((a,b)=>{
      let va,vb;
      switch(sortBy){
        case "priorite": {const ord={CRITIQUE:0,HAUTE:1,NORMALE:2,BASSE:3};va=ord[a.priorite]??2;vb=ord[b.priorite]??2;break;}
        case "cout":     va=Number(a.actual_cost||a.estimated_cost||0);vb=Number(b.actual_cost||b.estimated_cost||0);break;
        case "vehicule": va=a.vehicle_name||"";vb=b.vehicle_name||"";break;
        default:         va=new Date(a.scheduled_date||0);vb=new Date(b.scheduled_date||0);
      }
      if(va<vb)return sortDir==="asc"?-1:1;
      if(va>vb)return sortDir==="asc"?1:-1;
      return 0;
    });
    return list;
  },[maintenances,activeMaint,search,filterStatus,filterType,filterVeh,filterPrio,sortBy,sortDir]);

  const handleDelete=async id=>{
    if(!window.confirm("Supprimer cette maintenance ?"))return;
    setDeleting(id);
    try{await apiFetch(`/maintenance/maintenance/${id}/`,{method:"DELETE"});showToast("Maintenance supprimée");refresh();}
    catch(e){showToast(e.message,"error");}finally{setDeleting(null);}
  };

  const TABS=[
    {id:"dashboard", icon:"📊",label:"Tableau de bord"},
    {id:"list",      icon:"📅",label:"Maintenances", badge:planifiees.length+enCours.length},
    {id:"encours",   icon:"🔧",label:"En cours",     badge:enCours.length},
    {id:"historique",icon:"📋",label:"Historique"},
    {id:"preventif", icon:"🛡️",label:"Préventif"},
    {id:"analytics", icon:"📈",label:"Analytique"},
  ];

  if(loading)return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"80px 0",gap:12,color:C.textLight}}>
      <div style={{width:24,height:24,border:`3px solid ${C.green}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
      Chargement des maintenances…
    </div>
  );

  // ── TOOLBAR ──
  const Toolbar=({forHistory=false})=>(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:16}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        {/* Recherche */}
        <div style={{position:"relative"}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:13,color:C.textLight,pointerEvents:"none"}}>🔍</span>
          <input placeholder="Rechercher véhicule, technicien…" value={search} onChange={e=>setSearch(e.target.value)}
            style={{padding:"7px 12px 7px 32px",border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:12,fontFamily:"inherit",color:C.text,background:"#fff",outline:"none",width:220,transition:"border-color .15s"}}/>
        </div>
        {!forHistory&&(
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
            style={{padding:"7px 12px",border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:12,fontFamily:"inherit",color:C.text,background:"#fff",outline:"none"}}>
            <option value="">Tous statuts</option>
            {STATUTS.map(s=><option key={s.val} value={s.val}>{s.label}</option>)}
          </select>
        )}
        <select value={filterType} onChange={e=>setFilterType(e.target.value)}
          style={{padding:"7px 12px",border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:12,fontFamily:"inherit",color:C.text,background:"#fff",outline:"none"}}>
          <option value="">Toutes opérations</option>
          {TYPES.map(t=><option key={t.val} value={t.val}>{t.icon} {t.label}</option>)}
        </select>
        <select value={filterVeh} onChange={e=>setFilterVeh(e.target.value)}
          style={{padding:"7px 12px",border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:12,fontFamily:"inherit",color:C.text,background:"#fff",outline:"none"}}>
          <option value="">Tous véhicules</option>
          {activeVehs.map(v=><option key={v.id} value={String(v.id)}>{v.registration_number}</option>)}
        </select>
        <select value={filterPrio} onChange={e=>setFilterPrio(e.target.value)}
          style={{padding:"7px 12px",border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:12,fontFamily:"inherit",color:C.text,background:"#fff",outline:"none"}}>
          <option value="">Toutes priorités</option>
          {PRIORITES.map(p=><option key={p.val} value={p.val}>{p.icon} {p.label}</option>)}
        </select>
        {/* Effacer filtres */}
        {(search||filterStatus||filterType||filterVeh||filterPrio)&&(
          <button onClick={()=>{setSearch("");setFilterStatus("");setFilterType("");setFilterVeh("");setFilterPrio("");}}
            style={{padding:"7px 12px",border:`1.5px solid ${C.red}30`,borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:C.redLight,color:C.red}}>
            × Effacer
          </button>
        )}
      </div>
      <div style={{display:"flex",gap:8}}>
        {/* Bascule vue liste/calendrier */}
        {!forHistory&&(
          <div style={{display:"flex",gap:2,background:C.bg,borderRadius:8,padding:3}}>
            {[{v:"liste",i:"☰"},{v:"calendrier",i:"📅"}].map(({v,i})=>(
              <button key={v} onClick={()=>setVue(v)}
                style={{padding:"5px 10px",borderRadius:6,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,
                  background:vue===v?"#fff":"transparent",color:vue===v?C.green:C.textMid,
                  boxShadow:vue===v?"0 1px 4px rgba(0,0,0,.08)":"none"}}>
                {i} {v==="liste"?"Liste":"Calendrier"}
              </button>
            ))}
          </div>
        )}
        {forHistory&&(
          <button onClick={()=>exportHistoriquePDF(getFilteredList(true))}
            style={{padding:"8px 14px",background:C.redLight,color:C.red,border:`1.5px solid ${C.red}30`,
              borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
            🖨️ Imprimer PDF
          </button>
        )}
        {!forHistory&&(
          <button onClick={()=>setModalNew(true)}
            style={{padding:"8px 18px",background:C.green,color:"#fff",border:"none",borderRadius:8,
              fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
            + Planifier
          </button>
        )}
      </div>
    </div>
  );

  // ── ROW TABLEAU ──
  const Row=({m})=>{
    const typeCfg=getType(m.type),stCfg=getStatut(m.status),priCfg=getPriorite(m.priorite);
    const isLate=!["TERMINE","ANNULE"].includes(m.status)&&m.scheduled_date&&new Date(m.scheduled_date)<new Date();
    return(
      <tr className="maint-row" style={{borderBottom:`1px solid ${C.border}`,background:"#fff"}}>
        <td style={{padding:"11px 14px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:9,background:stCfg.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{typeCfg.icon}</div>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.text}}>{typeCfg.label}</div>
              <div style={{fontSize:10,color:C.textLight,marginTop:1}}>
                {m.maintenance_type==="PREVENTIVE"?"🛡️ Préventive":m.maintenance_type==="CORRECTIVE"?"🔧 Corrective":"📋 Réglementaire"}
              </div>
            </div>
          </div>
        </td>
        <td style={{padding:"11px 14px"}}>
          <div style={{fontSize:12,fontWeight:600,color:C.text}}>{m.vehicle_name||"—"}</div>
          {m.vehicle_registration&&<div style={{fontSize:10,color:C.textLight}}>{m.vehicle_registration}</div>}
        </td>
        <td style={{padding:"11px 14px"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:12,color:isLate?C.red:C.textMid,fontWeight:isLate?700:400}}>{fmt(m.scheduled_date)}</span>
            {isLate&&<span style={{fontSize:9,fontWeight:800,color:C.red,background:C.redLight,padding:"1px 6px",borderRadius:99}}>RETARD</span>}
          </div>
          {m.estimated_km&&<div style={{fontSize:10,color:C.textLight,marginTop:2}}>📍 {fmtKm(m.estimated_km)}</div>}
        </td>
        <td style={{padding:"11px 14px"}}><Badge label={priCfg.label} color={priCfg.color} bg={priCfg.bg} icon={priCfg.icon}/></td>
        <td style={{padding:"11px 14px"}}><Badge label={stCfg.label} color={stCfg.color} bg={stCfg.bg}/></td>
        <td style={{padding:"11px 14px"}}><div style={{fontSize:12,color:C.textMid}}>{m.technician_name||<span style={{color:C.textLight,fontStyle:"italic"}}>Non assigné</span>}</div></td>
        <td style={{padding:"11px 14px"}}><div style={{fontSize:12,color:C.textMid,fontWeight:600}}>{fmtMoney(m.actual_cost||m.estimated_cost)}</div></td>
        <td style={{padding:"11px 14px"}}>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            <button onClick={()=>setModalDet(m)} style={{padding:"4px 9px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",background:"#fff",color:C.textMid,fontFamily:"inherit"}}>👁</button>
            {!["TERMINE","ANNULE"].includes(m.status)&&(
              <button onClick={()=>setModalClot(m)} style={{padding:"4px 9px",border:"none",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer",background:C.greenLight,color:C.green,fontFamily:"inherit"}}>✓</button>
            )}
            <button onClick={()=>setModalEdit(m)} style={{padding:"4px 9px",border:"none",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",background:C.blueLight,color:C.blue,fontFamily:"inherit"}}>✏️</button>
            {m.status!=="TERMINE"&&(
              <button onClick={()=>handleDelete(m.id)} disabled={deleting===m.id}
                style={{padding:"4px 9px",border:"none",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",background:C.redLight,color:C.red,fontFamily:"inherit",opacity:deleting===m.id?0.6:1}}>
                {deleting===m.id?"⟳":"🗑"}
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  // ── TABLE AVEC TRI + PAGINATION ──
  const TableView=({forHistory=false})=>{
    const all=getFilteredList(forHistory).filter(m=>tab==="encours"?m.status==="EN_COURS":forHistory?m.status==="TERMINE":true);
    const totalPages=Math.ceil(all.length/PAGE_SIZE);
    const paged=all.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
    const TH=({col,children})=>(
      <th className="sort-th" onClick={()=>toggleSort(col)}
        style={{textAlign:"left",padding:"9px 14px",fontSize:10,letterSpacing:"1.2px",textTransform:"uppercase",
          color:sortBy===col?C.green:C.textLight,fontWeight:700,borderBottom:`1.5px solid ${C.border}`,
          background:C.bg,cursor:"pointer",whiteSpace:"nowrap",transition:"all .15s"}}>
        {children}<SortIcon col={col}/>
      </th>
    );
    if(all.length===0)return(
      <div style={{textAlign:"center",padding:"48px 0",color:C.textLight}}>
        <div style={{fontSize:36,marginBottom:8}}>📅</div>
        <div style={{fontSize:13}}>Aucune maintenance trouvée</div>
        {(search||filterStatus||filterType)&&<div style={{fontSize:11,marginTop:4}}>Essayez de modifier vos filtres</div>}
      </div>
    );
    return(
      <>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr>
                <TH col="type">Opération</TH>
                <TH col="vehicule">Véhicule</TH>
                <TH col="date">Date prévue</TH>
                <TH col="priorite">Priorité</TH>
                <th style={{textAlign:"left",padding:"9px 14px",fontSize:10,letterSpacing:"1.2px",textTransform:"uppercase",color:C.textLight,fontWeight:700,borderBottom:`1.5px solid ${C.border}`,background:C.bg}}>Statut</th>
                <th style={{textAlign:"left",padding:"9px 14px",fontSize:10,letterSpacing:"1.2px",textTransform:"uppercase",color:C.textLight,fontWeight:700,borderBottom:`1.5px solid ${C.border}`,background:C.bg}}>Technicien</th>
                <TH col="cout">Coût</TH>
                <th style={{textAlign:"left",padding:"9px 14px",fontSize:10,letterSpacing:"1.2px",textTransform:"uppercase",color:C.textLight,fontWeight:700,borderBottom:`1.5px solid ${C.border}`,background:C.bg}}>Actions</th>
              </tr>
            </thead>
            <tbody>{paged.map(m=><Row key={m.id} m={m}/>)}</tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} total={all.length} pageSize={PAGE_SIZE}/>
      </>
    );
  };

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16,fontFamily:"'Inter',-apple-system,sans-serif"}}>
      <style>{CSS}</style>
      <ToastProvider/>

      {/* ── TABS ── */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);setPage(1);}} className="maint-tab-btn"
            style={{padding:"8px 16px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",border:"none",
              background:tab===t.id?C.green:"#fff",color:tab===t.id?"#fff":C.textMid,
              boxShadow:tab===t.id?"0 4px 14px rgba(27,94,55,.3)":"0 1px 3px rgba(0,0,0,.06)",
              display:"flex",alignItems:"center",gap:6,transition:"all .15s"}}>
            {t.icon} {t.label}
            {t.badge>0&&<span style={{background:tab===t.id?"rgba(255,255,255,.3)":C.red,color:"#fff",borderRadius:99,fontSize:9,fontWeight:800,padding:"1px 6px"}}>{t.badge}</span>}
          </button>
        ))}
        <button onClick={()=>setModalNew(true)}
          style={{marginLeft:"auto",padding:"8px 18px",background:C.green,color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
          + Planifier une maintenance
        </button>
      </div>

      {/* ══ DASHBOARD ══ */}
      {tab==="dashboard"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* KPIs */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12}}>
            {[
              {label:"Planifiées",    val:planifiees.length,  color:C.blue,   icon:"📅", sub:`${enCours.length} en cours`,      onClick:()=>setTab("list")},
              {label:"En cours",      val:enCours.length,     color:C.orange, icon:"🔧", sub:"Interventions actives",           onClick:()=>setTab("encours")},
              {label:"Critiques",     val:critiques.length,   color:C.red,    icon:"🔴", sub:"Priorité critique",               onClick:()=>setTab("list")},
              {label:"En retard",     val:enRetard.length,    color:C.orange, icon:"⏰", sub:"Échéances dépassées",             onClick:()=>setTab("list")},
              {label:"Coût total",    val:fmtMoney(coutTotal).replace(" FCFA",""), color:C.green, icon:"💰", sub:"FCFA (interventions terminées)", onClick:()=>setTab("analytique")},
            ].map((k,i)=>(
              <div key={i} className="kpi-card maint-card" onClick={k.onClick}
                style={{background:"#fff",borderRadius:12,padding:"16px",borderTop:`3px solid ${k.color}`,
                  boxShadow:"0 1px 4px rgba(0,0,0,.06)",cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div style={{fontSize:9,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:"1px"}}>{k.label}</div>
                  <span style={{fontSize:18}}>{k.icon}</span>
                </div>
                <div style={{fontSize:i===4?18:26,fontWeight:800,color:k.color,lineHeight:1}}>{k.val}</div>
                <div style={{fontSize:10,color:C.textLight,marginTop:6}}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Alertes critiques */}
          {critiques.length>0&&(
            <div style={{background:"#fff",borderRadius:12,padding:"16px 20px",borderLeft:`4px solid ${C.red}`,boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
              <div style={{fontSize:13,fontWeight:800,color:C.red,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
                <span className="urgence-critique">🚨</span>
                {critiques.length} maintenance{critiques.length>1?"s":""} critique{critiques.length>1?"s":""} — Intervention requise
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {critiques.slice(0,4).map((m,i)=>{
                  const typeCfg=getType(m.type);
                  const isLate=m.scheduled_date&&new Date(m.scheduled_date)<new Date();
                  return(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:C.redLight,borderRadius:9,border:"1px solid #FECDD3"}}>
                      <span style={{fontSize:20}}>{typeCfg.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:700,color:C.text}}>{typeCfg.label} — {m.vehicle_name}</div>
                        <div style={{fontSize:11,color:C.textMid,marginTop:2}}>
                          {isLate?`⏰ En retard depuis le ${fmt(m.scheduled_date)}`:`📅 Prévu le ${fmt(m.scheduled_date)}`}
                          {m.technician_name&&` · 👤 ${m.technician_name}`}
                        </div>
                      </div>
                      <button onClick={()=>setModalClot(m)} style={{padding:"6px 14px",background:C.green,color:"#fff",border:"none",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>✓ Clôturer</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grille par véhicule */}
          <div style={{background:"#fff",borderRadius:12,padding:"16px 20px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
            <div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:14}}>État de maintenance par véhicule</div>
            {activeVehs.length===0?(
              <div style={{textAlign:"center",padding:"24px",color:C.textLight,fontSize:12}}>Aucun véhicule actif.</div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
                {activeVehs.map(v=>{
                  const vM=maintenances.filter(m=>String(m.vehicle)===String(v.id)&&m.status!=="ANNULE");
                  const act=vM.filter(m=>!["TERMINE","ANNULE"].includes(m.status));
                  const lastDone=vM.filter(m=>m.status==="TERMINE").sort((a,b)=>new Date(b.done_date||b.scheduled_date)-new Date(a.done_date||a.scheduled_date))[0];
                  const coutVeh=vM.filter(m=>m.status==="TERMINE").reduce((s,m)=>s+Number(m.actual_cost||m.estimated_cost||0),0);
                  const hasCrit=act.some(m=>m.priorite==="CRITIQUE"),hasHigh=act.some(m=>m.priorite==="HAUTE");
                  const bc=hasCrit?C.red:hasHigh?C.orange:act.length>0?C.amber:C.green;
                  return(
                    <div key={v.id} className="maint-card" style={{padding:"12px 14px",borderRadius:10,
                      border:`1.5px solid ${C.border}`,borderLeft:`4px solid ${bc}`,
                      background:hasCrit?C.redLight:hasHigh?C.orangeLight:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                        <div>
                          <div style={{fontSize:12,fontWeight:700,color:C.text}}>{v.make} {v.model}</div>
                          <div style={{fontSize:10,color:C.textLight}}>{v.registration_number}</div>
                        </div>
                        <span style={{fontSize:16}}>{hasCrit?"🔴":hasHigh?"🟠":act.length>0?"🟡":"🟢"}</span>
                      </div>
                      {act.length>0?(
                        <div style={{fontSize:11,color:C.textMid}}>
                          <b style={{color:bc}}>{act.length}</b> intervention{act.length>1?"s":""} en attente
                          {act.slice(0,2).map(m=>{const t=getType(m.type);return(
                            <div key={m.id} style={{marginTop:4,display:"flex",alignItems:"center",gap:4}}>
                              <span>{t.icon}</span><span style={{fontSize:10}}>{t.label}</span>
                              <Badge label={getStatut(m.status).label} color={getStatut(m.status).color} bg={getStatut(m.status).bg}/>
                            </div>
                          );})}
                        </div>
                      ):(
                        <div style={{fontSize:11,color:C.green,fontWeight:600}}>
                          ✓ À jour{lastDone&&<span style={{color:C.textLight,fontWeight:400}}>{" "}· {fmt(lastDone.done_date||lastDone.scheduled_date)}</span>}
                        </div>
                      )}
                      {coutVeh>0&&(
                        <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${C.border}`,fontSize:10,color:C.textLight}}>
                          💰 Coût total : <b style={{color:C.textMid}}>{fmtMoney(coutVeh)}</b>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 7 prochains jours */}
          {(()=>{
            const d7=activeMaint.filter(m=>{
              if(["TERMINE","ANNULE"].includes(m.status)||!m.scheduled_date)return false;
              const diff=(new Date(m.scheduled_date)-new Date())/(1000*60*60*24);
              return diff>=0&&diff<=7;
            }).sort((a,b)=>new Date(a.scheduled_date)-new Date(b.scheduled_date));
            if(!d7.length)return null;
            return(
              <div style={{background:"#fff",borderRadius:12,padding:"16px 20px",borderLeft:`4px solid ${C.amber}`,boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
                <div style={{fontSize:13,fontWeight:800,color:C.amber,marginBottom:12}}>📅 Dans les 7 prochains jours — {d7.length} maintenance{d7.length>1?"s":""}</div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {d7.map((m,i)=>{
                    const t=getType(m.type);
                    const diff=Math.round((new Date(m.scheduled_date)-new Date())/(1000*60*60*24));
                    return(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:C.amberLight,borderRadius:9,border:"1px solid #FDE68A"}}>
                        <span style={{fontSize:18}}>{t.icon}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,fontWeight:700,color:C.text}}>{t.label} — {m.vehicle_name}</div>
                          <div style={{fontSize:11,color:C.textMid,marginTop:2}}>
                            {diff===0?"Aujourd'hui":`Dans ${diff} jour${diff>1?"s":""}`}{m.technician_name&&` · 👤 ${m.technician_name}`}
                          </div>
                        </div>
                        <button onClick={()=>setModalClot(m)} style={{padding:"5px 12px",background:C.green,color:"#fff",border:"none",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✓ Clôturer</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ══ LISTE / EN COURS ══ */}
      {(tab==="list"||tab==="encours")&&(
        <div style={{background:"#fff",borderRadius:12,padding:"16px 20px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
          <Toolbar/>
          {vue==="calendrier"
            ? <VueCalendrier maintenances={getFilteredList(false)} onDetail={setModalDet}/>
            : <TableView/>
          }
        </div>
      )}

      {/* ══ HISTORIQUE ══ */}
      {tab==="historique"&&(
        <div style={{background:"#fff",borderRadius:12,padding:"16px 20px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
          <Toolbar forHistory={true}/>
          <TableView forHistory={true}/>
        </div>
      )}

      {/* ══ PRÉVENTIF ══ */}
      {tab==="preventif"&&(
        <TabPreventif vehicles={vehicles} toast={(msg,type)=>showToast(msg,type||"success")}/>
      )}

      {/* ══ ANALYTIQUE ══ */}
      {tab==="analytics"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Résumé analytique */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
            {[
              {label:"Coût total maintenances",val:fmtMoney(coutTotal),   icon:"💰",color:C.green,sub:`${terminees.length} interventions terminées`},
              {label:"Coût moyen / intervention",val:terminees.length>0?fmtMoney(Math.round(coutTotal/terminees.length)):"—",icon:"📊",color:C.blue,sub:"Sur les interventions clôturées"},
              {label:"Véhicules en maintenance", val:vehicles.filter(v=>v.status==="EN_MAINTENANCE").length,icon:"🔧",color:C.orange,sub:"Actuellement immobilisés"},
            ].map((k,i)=>(
              <div key={i} style={{background:"#fff",borderRadius:12,padding:"18px",borderTop:`3px solid ${k.color}`,boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.textLight,textTransform:"uppercase",letterSpacing:"1px"}}>{k.label}</div>
                  <span style={{fontSize:20}}>{k.icon}</span>
                </div>
                <div style={{fontSize:22,fontWeight:800,color:k.color}}>{k.val}</div>
                <div style={{fontSize:10,color:C.textLight,marginTop:5}}>{k.sub}</div>
              </div>
            ))}
          </div>
          <GraphiqueCouts maintenances={maintenances}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <TCOVehicules maintenances={maintenances} vehicles={vehicles}/>
            {/* Répartition par type */}
            <div style={{background:C.white,borderRadius:12,padding:"16px 20px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
              <div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:14}}>🔧 Répartition par type</div>
              {TYPES.map(t=>{
                const n=maintenances.filter(m=>m.type===t.val).length;
                const pct=maintenances.length>0?Math.round(n/maintenances.length*100):0;
                if(n===0)return null;
                return(
                  <div key={t.val} style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <span style={{fontSize:12,color:C.text,display:"flex",alignItems:"center",gap:6}}>
                        <span>{t.icon}</span>{t.label}
                      </span>
                      <span style={{fontSize:11,fontWeight:700,color:t.color}}>{n} ({pct}%)</span>
                    </div>
                    <div style={{height:5,background:C.bg,borderRadius:99,overflow:"hidden"}}>
                      <div className="progress-bar-inner" style={{height:"100%",width:`${pct}%`,borderRadius:99,background:t.color}}/>
                    </div>
                  </div>
                );
              }).filter(Boolean)}
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {modalNew  && <ModalMaintenance vehicles={vehicles} technicians={technicians} onClose={()=>setModalNew(false)}  onSuccess={()=>{setModalNew(false);refresh();}}/>}
      {modalEdit && <ModalMaintenance initial={modalEdit} vehicles={vehicles} technicians={technicians} onClose={()=>setModalEdit(null)} onSuccess={()=>{setModalEdit(null);refresh();}}/>}
      {modalClot && <ModalCloturer    maintenance={modalClot} vehicles={vehicles} onClose={()=>setModalClot(null)} onSuccess={()=>{setModalClot(null);refresh();}}/>}
      {modalDet  && <ModalDetail      maintenance={modalDet}  onClose={()=>setModalDet(null)} onCloturer={m=>{setModalDet(null);setModalClot(m);}} onEdit={m=>{setModalDet(null);setModalEdit(m);}}/>}
    </div>
  );
}