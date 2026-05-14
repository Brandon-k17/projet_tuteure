// ─── pages/parametres/TabParametres.jsx ──────────────────────────────────────
import { useState, useEffect } from "react";

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
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    // Extraire le message d'erreur le plus lisible
    const msg = json?.old_password?.[0]
      || json?.new_password?.[0]
      || json?.message
      || json?.detail
      || JSON.stringify(json);
    throw new Error(msg || `Erreur ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

const LANGUES = [
  { code:"fr", label:"Français", flag:"🇫🇷" },
  { code:"en", label:"English",  flag:"🇬🇧" },
];

const DENSITES = [
  { val:"comfortable", label:"Confortable", desc:"Espacement généreux" },
  { val:"compact",     label:"Compact",     desc:"Plus d'infos à l'écran" },
];

function Toggle({ checked, onChange, C }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width:46, height:26, borderRadius:13, border:"none", cursor:"pointer",
        background: checked ? C.green : C.border,
        position:"relative", transition:"background .2s", flexShrink:0, padding:0,
      }}>
      <span style={{
        position:"absolute", top:3, left: checked ? 23 : 3,
        width:20, height:20, borderRadius:"50%", background:"#fff",
        transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,.25)",
      }}/>
    </button>
  );
}

function Section({ title, icon, children, C }) {
  return (
    <div style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden" }}>
      <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:18 }}>{icon}</span>
        <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{title}</span>
      </div>
      <div style={{ padding:"18px 20px" }}>{children}</div>
    </div>
  );
}

function Toast({ msg, type, C }) {
  if (!msg) return null;
  const isError = type === "error";
  return (
    <div style={{
      position:"fixed", bottom:28, right:28, zIndex:9999,
      background: isError ? C.red : C.success,
      color:"#fff", borderRadius:10, padding:"12px 18px",
      fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:10,
      boxShadow:"0 4px 20px rgba(0,0,0,0.25)", maxWidth:340,
      animation:"slideUp .3s ease",
    }}>
      <span>{isError ? "✕" : "✓"}</span>
      <span>{msg}</span>
    </div>
  );
}

// ── Couleurs selon thème ──────────────────────────────────────────────────────
function useColors(darkMode) {
  return darkMode ? {
    bg:"#0F1A14", card:"#162010", border:"#243320",
    text:"#E8F0E4", textMid:"#8FAF85", textLight:"#536E4A",
    green:"#4ADE80", greenLight:"#14321A", greenMid:"#2D7A4F",
    input:"#1C2B18", inputBorder:"#2D4228",
    red:"#F87171", redLight:"#2D0F0F",
    amber:"#FBB800", amberLight:"#2A1E00",
    blue:"#60A5FA", blueLight:"#0A1A2E",
    success:"#4ADE80", successLight:"#0D2A14",
  } : {
    bg:"#F4F6F5", card:"#FFFFFF", border:"#E2E8E5",
    text:"#1A2820", textMid:"#4A6358", textLight:"#8EA99A",
    green:"#1B5E37", greenLight:"#EAF4EE", greenMid:"#2D7A4F",
    input:"#FFFFFF", inputBorder:"#D1D9D5",
    red:"#C0182A", redLight:"#FDF0F1",
    amber:"#D97706", amberLight:"#FFFBEB",
    blue:"#1D4ED8", blueLight:"#EFF6FF",
    success:"#1B5E37", successLight:"#EAF4EE",
  };
}

// ══════════════════════════════════════════════════════════════════
export default function TabParametres({ user, darkMode, onThemeChange, onLangChange, lang }) {
  const C = useColors(darkMode);

  const [toast, setToast] = useState({ msg:"", type:"success" });
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg:"", type:"success" }), 3500);
  };

  // Prefs locales
  const [langue,      setLangue]      = useState(lang || localStorage.getItem("driveparc_lang") || "fr");
  const [densite,     setDensite]     = useState(localStorage.getItem("driveparc_density") || "comfortable");
  const [notifEmail,  setNotifEmail]  = useState(localStorage.getItem("notif_email")  !== "false");
  const [notifPush,   setNotifPush]   = useState(localStorage.getItem("notif_push")   !== "false");
  const [notifPanne,  setNotifPanne]  = useState(localStorage.getItem("notif_panne")  !== "false");

  // Formulaire mot de passe
  const [pwdForm,    setPwdForm]    = useState({ ancien:"", nouveau:"", confirm:"" });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdShow,    setPwdShow]    = useState({ ancien:false, nouveau:false, confirm:false });

  const pwdStrength = (p) => {
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8)           s++;
    if (/[A-Z]/.test(p))         s++;
    if (/[0-9]/.test(p))         s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };
  const strength = pwdStrength(pwdForm.nouveau);
  const strengthLabel = ["", "Faible", "Moyen", "Bon", "Fort"][strength];
  const strengthColor = [C.border, C.red, C.amber, C.amber, C.green][strength];

  // ✅ CORRECTION 1 : change-password envoie les 3 champs requis
  const handlePwd = async () => {
    if (!pwdForm.ancien || !pwdForm.nouveau || !pwdForm.confirm) {
      showToast("Remplissez tous les champs", "error"); return;
    }
    if (pwdForm.nouveau !== pwdForm.confirm) {
      showToast("Les mots de passe ne correspondent pas", "error"); return;
    }
    if (strength < 2) {
      showToast("Mot de passe trop faible", "error"); return;
    }
    setPwdLoading(true);
    try {
      await apiFetch("/auth/change-password/", {
        method: "POST",
        body: JSON.stringify({
          old_password:         pwdForm.ancien,    // ✅ nom exact attendu par Django
          new_password:         pwdForm.nouveau,   // ✅
          new_password_confirm: pwdForm.confirm,   // ✅ manquait avant → 400
        }),
      });
      showToast("Mot de passe modifié avec succès ✓");
      setPwdForm({ ancien:"", nouveau:"", confirm:"" });
    } catch(e) {
      showToast(e.message || "Erreur lors du changement", "error");
    } finally { setPwdLoading(false); }
  };

  // Téléphone
  const [tel,       setTel]       = useState(user?.phone || "");
  const [telLoading,setTelLoading]= useState(false);

  // ✅ CORRECTION 2 : profile/update/ au lieu de profile/ (qui est GET only)
  const handleTel = async () => {
    if (!tel.trim()) { showToast("Numéro invalide", "error"); return; }
    setTelLoading(true);
    try {
      await apiFetch("/auth/profile/update/", {   // ✅ URL correcte
        method: "PATCH",
        body: JSON.stringify({ phone: tel.trim() }),
      });
      showToast("Numéro de téléphone mis à jour ✓");
    } catch(e) {
      showToast(e.message || "Erreur lors de la mise à jour", "error");
    } finally { setTelLoading(false); }
  };

  // Préférences locales
  const handleDensite = (v) => {
    setDensite(v);
    localStorage.setItem("driveparc_density", v);
    showToast("Densité mise à jour");
  };
  const handleNotif = (key, val, setter) => {
    setter(val);
    localStorage.setItem(key, String(val));
  };
  const handleLangue = (code) => {
    setLangue(code);
    localStorage.setItem("driveparc_lang", code);
    onLangChange?.(code);
    showToast("Langue mise à jour");
  };

  // ✅ CORRECTION 3 : thème — la fonction onThemeChange fait déjà localStorage + setAttribute
  // On passe juste la valeur booléenne
  const handleTheme = (isDark) => {
    onThemeChange(isDark);
    showToast(isDark ? "Mode nuit activé 🌙" : "Mode jour activé ☀️");
  };

  const inputStyle = {
    padding:"9px 12px", border:`1.5px solid ${C.inputBorder}`, borderRadius:8,
    fontSize:13, fontFamily:"inherit", color:C.text, background:C.input,
    width:"100%", outline:"none", transition:"border-color .15s",
    colorScheme: darkMode ? "dark" : "light",
  };
  const labelStyle = {
    fontSize:11, fontWeight:700, color:C.textMid,
    textTransform:"uppercase", letterSpacing:"1px", marginBottom:6, display:"block",
  };
  const btnPrimary = {
    padding:"9px 20px", background:C.green, color:"#fff", border:"none",
    borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
  };
  const btnGhost = {
    padding:"9px 20px", background:"transparent", color:C.textMid,
    border:`1px solid ${C.border}`, borderRadius:8, fontSize:12,
    fontWeight:600, cursor:"pointer", fontFamily:"inherit",
  };

  return (
    <div style={{
      display:"flex", flexDirection:"column", gap:16,
      fontFamily:"'Inter',-apple-system,sans-serif", color:C.text,
      // ✅ Le fond de la page suit le thème
      background: C.bg,
    }}>
      <style>{`
        @keyframes slideUp {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .param-input:focus { border-color:${C.green} !important; box-shadow:0 0 0 3px ${C.green}18 !important; }
        .param-btn-primary:hover { filter:brightness(1.08); }
        .param-btn-ghost:hover { background:${C.border}40 !important; }
        .param-toggle-option:hover { border-color:${C.green}60 !important; }
        .param-lang-btn:hover { border-color:${C.green} !important; }
        .param-notif-row:hover { background:${C.border}30; }
      `}</style>

      {/* En-tête profil */}
      <div style={{
        background:`linear-gradient(130deg, ${C.greenMid} 0%, ${C.green} 100%)`,
        borderRadius:12, padding:"18px 22px", display:"flex", alignItems:"center", gap:16,
      }}>
        <div style={{ width:52, height:52, borderRadius:"50%", background:"rgba(255,255,255,0.2)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:18, fontWeight:800, color:"#fff", flexShrink:0 }}>
          {user?.first_name?.[0]}{user?.last_name?.[0]}
        </div>
        <div>
          <div style={{ fontSize:16, fontWeight:800, color:"#fff" }}>
            {user?.full_name || `${user?.first_name} ${user?.last_name}`}
          </div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.7)", marginTop:2 }}>
            {user?.role_display || "Directeur"} · {user?.school || "IUC"}
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)", marginTop:3 }}>
            {user?.email || "—"}
          </div>
        </div>
      </div>

      {/* Apparence */}
      <Section title="Apparence & affichage" icon="🎨" C={C}>
        {/* Mode nuit */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:C.text }}>Mode nuit</div>
            <div style={{ fontSize:11, color:C.textLight, marginTop:2 }}>
              Réduire la luminosité pour les environnements sombres
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:18 }}>{darkMode ? "🌙" : "☀️"}</span>
            {/* ✅ handleTheme appelle onThemeChange qui gère localStorage + setAttribute */}
            <Toggle checked={darkMode} onChange={handleTheme} C={C} />
          </div>
        </div>

        {/* Langue */}
        <div style={{ padding:"14px 0", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:10 }}>
            Langue de l'interface
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {LANGUES.map(l => (
              <button key={l.code} className="param-lang-btn" onClick={() => handleLangue(l.code)}
                style={{
                  padding:"8px 16px", borderRadius:8,
                  border:`1.5px solid ${langue === l.code ? C.green : C.border}`,
                  background: langue === l.code ? C.greenLight : C.input,
                  color:      langue === l.code ? C.green : C.textMid,
                  fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
                  display:"flex", alignItems:"center", gap:6, transition:"all .12s",
                }}>
                <span>{l.flag}</span>
                <span>{l.label}</span>
                {langue === l.code && <span style={{ fontSize:10 }}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Densité */}
        <div style={{ paddingTop:14 }}>
          <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:10 }}>
            Densité d'affichage
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {DENSITES.map(d => (
              <button key={d.val} className="param-toggle-option"
                onClick={() => handleDensite(d.val)}
                style={{
                  flex:1, padding:"10px 14px", borderRadius:8,
                  border:`1.5px solid ${densite === d.val ? C.green : C.border}`,
                  background: densite === d.val ? C.greenLight : C.input,
                  cursor:"pointer", fontFamily:"inherit", textAlign:"left", transition:"all .12s",
                }}>
                <div style={{ fontSize:12, fontWeight:700, color:densite===d.val?C.green:C.text }}>
                  {d.label}
                </div>
                <div style={{ fontSize:10, color:C.textLight, marginTop:3 }}>{d.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Préférences de notifications" icon="🔔" C={C}>
        {[
          { key:"notif_email", label:"Notifications par e-mail",     desc:"Alertes importantes par mail",             val:notifEmail, setter:setNotifEmail },
          { key:"notif_push",  label:"Notifications dans l'appli",   desc:"Alertes dans la cloche en haut à droite",  val:notifPush,  setter:setNotifPush  },
          { key:"notif_panne", label:"Alertes pannes & incidents",   desc:"Notifié immédiatement de tout signalement", val:notifPanne, setter:setNotifPanne },
        ].map((n, i, arr) => (
          <div key={n.key} className="param-notif-row"
            style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"12px 8px", borderRadius:8,
              borderBottom: i < arr.length-1 ? `1px solid ${C.border}` : "none",
              transition:"background .12s" }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{n.label}</div>
              <div style={{ fontSize:11, color:C.textLight, marginTop:2 }}>{n.desc}</div>
            </div>
            <Toggle checked={n.val} onChange={(v) => handleNotif(n.key, v, n.setter)} C={C} />
          </div>
        ))}
      </Section>

      {/* Téléphone */}
      <Section title="Coordonnées" icon="📱" C={C}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:10, alignItems:"flex-end" }}>
          <div>
            <label style={labelStyle}>Numéro de téléphone</label>
            <input
              className="param-input"
              value={tel}
              onChange={e => setTel(e.target.value)}
              placeholder="+237 6 XX XX XX XX"
              style={inputStyle}
            />
            <div style={{ fontSize:10, color:C.textLight, marginTop:5 }}>
              Utilisé pour les alertes SMS urgentes du gestionnaire.
            </div>
          </div>
          <button onClick={handleTel} disabled={telLoading}
            className="param-btn-primary"
            style={{ ...btnPrimary, opacity:telLoading?0.7:1, whiteSpace:"nowrap", height:38 }}>
            {telLoading ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </Section>

      {/* Mot de passe */}
      <Section title="Sécurité — Changer le mot de passe" icon="🔒" C={C}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Ancien */}
          <div>
            <label style={labelStyle}>Mot de passe actuel *</label>
            <div style={{ position:"relative" }}>
              <input className="param-input"
                type={pwdShow.ancien ? "text" : "password"}
                value={pwdForm.ancien}
                onChange={e => setPwdForm(f => ({ ...f, ancien:e.target.value }))}
                placeholder="Votre mot de passe actuel"
                style={{ ...inputStyle, paddingRight:40 }}
              />
              <button type="button"
                onClick={() => setPwdShow(s => ({ ...s, ancien:!s.ancien }))}
                style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
                  background:"none", border:"none", cursor:"pointer", fontSize:15, color:C.textLight }}>
                {pwdShow.ancien ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Nouveau */}
          <div>
            <label style={labelStyle}>Nouveau mot de passe *</label>
            <div style={{ position:"relative" }}>
              <input className="param-input"
                type={pwdShow.nouveau ? "text" : "password"}
                value={pwdForm.nouveau}
                onChange={e => setPwdForm(f => ({ ...f, nouveau:e.target.value }))}
                placeholder="Minimum 8 caractères"
                style={{ ...inputStyle, paddingRight:40 }}
              />
              <button type="button"
                onClick={() => setPwdShow(s => ({ ...s, nouveau:!s.nouveau }))}
                style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
                  background:"none", border:"none", cursor:"pointer", fontSize:15, color:C.textLight }}>
                {pwdShow.nouveau ? "🙈" : "👁️"}
              </button>
            </div>
            {pwdForm.nouveau && (
              <div style={{ marginTop:8 }}>
                <div style={{ display:"flex", gap:4, marginBottom:4 }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{ flex:1, height:3, borderRadius:99,
                      background: i<=strength ? strengthColor : C.border,
                      transition:"background .2s" }}/>
                  ))}
                </div>
                <div style={{ fontSize:10, color:strengthColor, fontWeight:700 }}>{strengthLabel}</div>
                <div style={{ fontSize:10, color:C.textLight, marginTop:3 }}>
                  Incluez majuscules, chiffres et caractères spéciaux.
                </div>
              </div>
            )}
          </div>

          {/* Confirmation */}
          <div>
            <label style={labelStyle}>Confirmer le nouveau mot de passe *</label>
            <div style={{ position:"relative" }}>
              <input className="param-input"
                type={pwdShow.confirm ? "text" : "password"}
                value={pwdForm.confirm}
                onChange={e => setPwdForm(f => ({ ...f, confirm:e.target.value }))}
                placeholder="Répétez le nouveau mot de passe"
                style={{
                  ...inputStyle, paddingRight:40,
                  borderColor: pwdForm.confirm && pwdForm.nouveau !== pwdForm.confirm
                    ? C.red : C.inputBorder,
                }}
              />
              <button type="button"
                onClick={() => setPwdShow(s => ({ ...s, confirm:!s.confirm }))}
                style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
                  background:"none", border:"none", cursor:"pointer", fontSize:15, color:C.textLight }}>
                {pwdShow.confirm ? "🙈" : "👁️"}
              </button>
            </div>
            {pwdForm.confirm && pwdForm.nouveau !== pwdForm.confirm && (
              <div style={{ fontSize:11, color:C.red, marginTop:5 }}>
                ⚠️ Les mots de passe ne correspondent pas
              </div>
            )}
            {pwdForm.confirm && pwdForm.nouveau === pwdForm.confirm && pwdForm.confirm.length > 0 && (
              <div style={{ fontSize:11, color:C.green, marginTop:5 }}>
                ✓ Les mots de passe correspondent
              </div>
            )}
          </div>

          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <button onClick={handlePwd} disabled={pwdLoading}
              className="param-btn-primary"
              style={{ ...btnPrimary, opacity:pwdLoading?0.7:1 }}>
              {pwdLoading ? "Modification en cours…" : "Modifier le mot de passe"}
            </button>
            <button onClick={() => setPwdForm({ ancien:"", nouveau:"", confirm:"" })}
              className="param-btn-ghost"
              style={btnGhost}>
              Annuler
            </button>
          </div>
        </div>
      </Section>

      {/* Infos version */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
        padding:"10px 4px", fontSize:11, color:C.textLight }}>
        <span>DRIVEPARC · Institut Universitaire de la Côte</span>
        <span>v2.1.0 — {new Date().getFullYear()}</span>
      </div>

      <Toast msg={toast.msg} type={toast.type} C={C} />
    </div>
  );
}