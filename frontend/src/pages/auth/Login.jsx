import React, { useState } from "react";

const API_BASE = "http://localhost:8000/api/v1/auth";

export default function LoginScreen({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:8000/api/v1/auth/social/login/google-oauth2/";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError("Veuillez remplir tous les champs."); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API_BASE}/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json?.message || json?.non_field_errors?.[0] || json?.detail || "Email ou mot de passe incorrect.");
        return;
      }
      onLogin(json.data);
    } catch { setError("Impossible de joindre le serveur."); }
    finally  { setLoading(false); }
  };

  return (
    <div className="dp-wrap">
      <style>{CSS}</style>
      <div className="dp-card">

        <div className="dp-left">

          {/* Header : logo + DRIVEPARC à gauche | IUC à droite */}
          <div className="dp-header">
            <div className="dp-brand">
              <img src="/assets/logo (3).png" alt="DriveParc" className="dp-logo-img" />
              <span className="dp-brand-name">
                <span className="dp-drive">DRIVE</span><span className="dp-parc">PARC</span>
              </span>
            </div>
            <div className="dp-iuc">
              <span className="g">I</span><span className="r">U</span><span className="g">C</span>
            </div>
          </div>

          {/* Titre */}
          <div className="dp-heading">
            <p className="dp-title">Connexion</p>
            <p className="dp-sub">Connectez-vous à votre espace DriveParc</p>
          </div>

          {error && <div className="dp-err">⚠ {error}</div>}

          <button className="dp-google" onClick={handleGoogleLogin} type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" style={{flexShrink:0}}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
          </button>

          <div className="dp-div"><span>ou</span></div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="dp-field">
              <label className="dp-lbl">Email</label>
              <div className="dp-inp-wrap">
                <svg className="dp-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                <input className="dp-inp" type="email" required placeholder="gestionnaire@iuc.univ.cm"
                  value={email} onChange={e => { setEmail(e.target.value); setError(""); }} disabled={loading} />
              </div>
            </div>

            <div className="dp-field">
              <label className="dp-lbl">Mot de passe</label>
              <div className="dp-inp-wrap">
                <button type="button" className="dp-ico dp-eye" onClick={() => setShowPass(!showPass)} tabIndex={-1}>
                  {showPass
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
                <input className="dp-inp" type={showPass ? "text" : "password"} required placeholder="••••••••••"
                  value={password} onChange={e => { setPassword(e.target.value); setError(""); }} disabled={loading} />
              </div>
            </div>

            <div className="dp-row">
              <label className="dp-rem"><input type="checkbox" className="dp-chk" /><span>Rester connecté</span></label>
              <a href="#" className="dp-fgt">Mot de passe oublié ?</a>
            </div>

            <button className="dp-btn" type="submit" disabled={loading}>
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>

          <p className="dp-foot">Besoin d'aide ? <a href="mailto:admin@iuc.univ.cm">Support IUC</a></p>
        </div>

        <div className="dp-right">
          <img src="/assets/im.jpeg" alt="" className="dp-img" />
          <div className="dp-badge">Passez à la vitesse supérieure</div>
        </div>

      </div>
    </div>
  );
}

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100vh; width: 100vw; overflow: hidden; }

  .dp-wrap {
    position: fixed; inset: 0;
    display: flex; align-items: center; justify-content: center;
    background: #eef1f6;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .dp-card {
    display: flex;
    width: 660px;
    height: 440px;
    background: #fff;
    border-radius: 18px;
    box-shadow: 0 16px 48px rgba(0,0,0,0.13), 0 0 0 1px rgba(0,0,0,0.04);
    overflow: hidden;
  }

  .dp-left {
    width: 310px;
    flex-shrink: 0;
    padding: 22px 26px 18px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: hidden;
  }

  /* Header */
  .dp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .dp-brand {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Logo plus grand */
  .dp-logo-img {
    height: 46px;
    width: auto;
    object-fit: contain;
  }

  /* DRIVEPARC texte comme sur l'image */
  .dp-brand-name {
    font-size: 16px;
    font-weight: 800;
    letter-spacing: .3px;
    line-height: 1;
  }
  .dp-drive { color: #212224; }
  .dp-parc  { color: #1a8a4a; }

  /* Badge IUC */
  .dp-iuc {
    font-size: 17px;
    font-weight: 900;
    letter-spacing: -.5px;
    display: flex;
    align-items: center;
    background: #ffffff;
    padding: 4px 10px;
    border-radius: 8px;
   
  }
  .dp-iuc .g { color: #1a5d3b; }
  .dp-iuc .r { color: #e11d48; }

  /* Titre — plus grand */
  .dp-heading { display: flex; flex-direction: column; gap: 2px; margin-top: 2px; }
  .dp-title {
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -.3px;
  }
  .dp-sub { font-size: 11px; color: #64748b; }

  .dp-err {
    background: #fff0f1; border: 1px solid #e63946;
    border-radius: 6px; padding: 5px 9px;
    font-size: 11px; color: #c0303a; font-weight: 500;
  }

  .dp-google {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    width: 100%; padding: 7px 12px;
    border: 1.5px solid #dde3ec; border-radius: 7px;
    background: #fff; color: #1e293b;
    font-size: 12px; font-weight: 600;
    cursor: pointer; font-family: inherit;
    transition: background .18s, box-shadow .18s, transform .12s;
  }
  .dp-google:hover {
    background: #f7f9fc; border-color: #c5cdd8;
    transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.07);
  }

  .dp-div { display: flex; align-items: center; gap: 8px; font-size: 10.5px; color: #94a3b8; }
  .dp-div::before, .dp-div::after { content: ""; flex: 1; height: 1px; background: #e8edf2; }

  .dp-field { display: flex; flex-direction: column; gap: 3px; }
  .dp-lbl   { font-size: 10.5px; font-weight: 700; color: #475569; }

  .dp-inp-wrap { position: relative; display: flex; align-items: center; }

  .dp-ico {
    position: absolute; left: 10px; color: #94a3b8;
    display: flex; background: none; border: none; padding: 0; cursor: default;
  }
  .dp-eye { cursor: pointer; transition: color .18s; }
  .dp-eye:hover { color: #1a5d3b; }

  .dp-inp {
    width: 100%; padding: 7px 10px 7px 30px;
    border: 1.5px solid #e2e8f0; background: #f8fafc;
    border-radius: 7px; font-size: 12px; color: #1e293b;
    font-family: inherit; transition: border-color .18s, box-shadow .18s;
  }
  .dp-inp::placeholder { color: #a8b5c8; }
  .dp-inp:focus {
    outline: none; border-color: #1a5d3b; background: #fff;
    box-shadow: 0 0 0 3px rgba(26,93,59,0.09);
  }
  .dp-inp:disabled { opacity: .6; cursor: not-allowed; }

  .dp-row { display: flex; justify-content: space-between; align-items: center; }
  .dp-rem { display: flex; align-items: center; gap: 5px; font-size: 10.5px; color: #64748b; cursor: pointer; user-select: none; }
  .dp-chk { accent-color: #1a5d3b; width: 12px; height: 12px; }
  .dp-fgt { font-size: 10.5px; color: #e11d48; text-decoration: none; font-weight: 600; }
  .dp-fgt:hover { text-decoration: underline; }

  .dp-btn {
    width: 100%; padding: 8px;
    background: linear-gradient(135deg, #1a5d3b 0%, #0f3d27 100%);
    color: #fff; border: none; border-radius: 7px;
    font-size: 13px; font-weight: 700;
    cursor: pointer; font-family: inherit;
    transition: opacity .18s, transform .12s, box-shadow .18s;
  }
  .dp-btn:hover:not(:disabled) {
    opacity: .92; transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(26,93,59,0.30);
  }
  .dp-btn:disabled { opacity: .7; cursor: not-allowed; }

  .dp-foot { font-size: 10.5px; color: #94a3b8; text-align: center; margin-top: auto; }
  .dp-foot a { color: #1a5d3b; text-decoration: none; font-weight: 600; }

  .dp-right { flex: 1; position: relative; overflow: hidden; }
  .dp-img   { width: 100%; height: 100%; object-fit: cover; transition: transform .4s; }
  .dp-right:hover .dp-img { transform: scale(1.03); }

  .dp-badge {
    position: absolute; bottom: 14px; left: 14px; right: 14px;
    background: rgba(255,255,255,0.9); backdrop-filter: blur(8px);
    padding: 9px 12px; border-radius: 9px; text-align: center;
    font-size: 9.5px; font-weight: 800; color: #1a5d3b;
    text-transform: uppercase; letter-spacing: 2.5px;
  }

  @keyframes dp-spin { to { transform: rotate(360deg); } }

  @media (max-width: 680px) {
    .dp-card  { width: 100vw; height: 100vh; border-radius: 0; flex-direction: column; }
    .dp-right { display: none; }
    .dp-left  { width: 100%; padding: 36px 28px; }
  }
`;