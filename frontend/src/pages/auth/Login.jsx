import React, { useState } from "react";

// ✅ Définir votre API base URL
const API_BASE = "http://localhost:8000/api/v1/auth"; // Ajustez selon votre backend

/**
 * LOGIN SCREEN - DRIVEPARC x IUC
 */
export default function LoginScreen({ onLogin }) {  // ✅ Exporté
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(
          json?.message ||
          json?.non_field_errors?.[0] ||
          json?.detail ||
          "Email ou mot de passe incorrect."
        );
        return;
      }

      onLogin(json.data);

    } catch {
      setError("Impossible de joindre le serveur. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  const Icons = {
    Email: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
    EyeOn: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
      </svg>
    ),
    EyeOff: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
    ),
    Loader: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ animation: "dp-spin 0.9s linear infinite", display: "block" }}>
        <path d="M21 12a9 9 0 1 1-6.21-8.56"/>
      </svg>
    ),
  };
 
  return (
    <div className="dp-page-wrapper">
      <style>{CSS}</style>
 
      <div className="dp-container">
 
        {/* ── GAUCHE : Formulaire ────────────────────────────────────── */}
        <div className="dp-auth-section">
 
          {/* Brand */}
          <div className="dp-brand-header">
            <div className="dp-logo-box">
              <span className="dp-iuc-v">I</span>
              <span className="dp-iuc-r">U</span>
              <span className="dp-iuc-v">C</span>
            </div>
            <span className="dp-logo-text">DRIVEPARC</span>
          </div>
 
          <div className="dp-form-content">
            <h1 className="dp-main-title">Connexion à votre espace</h1>
            <p className="dp-sub-title">Saisissez vos identifiants DriveParc</p>
 
            {/* Erreur API */}
            {error && (
              <div className="dp-error-box">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}
 
            <form onSubmit={handleSubmit} className="dp-form" noValidate>
 
              {/* Email */}
              <div className="dp-field">
                <label className="dp-label">Votre adresse email</label>
                <div className="dp-input-wrapper">
                  <span className="dp-input-icon"><Icons.Email /></span>
                  <input
                    type="email"
                    required
                    placeholder="gestionnaire@iuc.univ.cm"
                    className="dp-input"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    disabled={loading}
                  />
                </div>
              </div>
 
              {/* Mot de passe */}
              <div className="dp-field">
                <label className="dp-label">Votre mot de passe</label>
                <div className="dp-input-wrapper">
                  <button
                    type="button"
                    className="dp-input-icon dp-eye-btn"
                    onClick={() => setShowPass(!showPass)}
                    tabIndex={-1}
                  >
                    {showPass ? <Icons.EyeOff /> : <Icons.EyeOn />}
                  </button>
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    placeholder="Entrez votre mot de passe"
                    className="dp-input"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    disabled={loading}
                  />
                </div>
              </div>
 
              {/* Remember + forgot */}
              <div className="dp-row">
                <label className="dp-remember">
                  <input type="checkbox" className="dp-checkbox" />
                  <span>Rester connecté</span>
                </label>
                <a href="#" className="dp-forgot">Mot de passe oublié ?</a>
              </div>
 
              {/* Submit */}
              <button type="submit" className="dp-submit-btn" disabled={loading}>
                {loading
                  ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Icons.Loader /> Connexion…</span>
                  : "Se connecter"
                }
              </button>
 
            </form>
          </div>
 
          <div className="dp-footer-support">
            Besoin d'aide ?&nbsp;<a href="mailto:admin@iuc.univ.cm">Contacter le support IUC</a>
          </div>
        </div>
 
        {/* ── DROITE : Image voiture ────────────────────────────────── */}
        <div className="dp-image-section">
          <img
            src="/assets/image.png"
            alt="Voiture de sport"
            className="dp-car-img"
          />
          <div className="dp-image-overlay">
            <span>Passez à la vitesse supérieure</span>
          </div>
        </div>
 
      </div>
    </div>
  );
}
 
// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
 /* ✅ FIX BODY + HTML */
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    height: 100vh !important;
    width: 100vw !important;
    overflow: hidden !important;
    background: #f1f5f9 !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
  }

  .dp-page-wrapper {
    height: 100vh;  /* ✅ FIX */
    width: 100vw;   /* ✅ FIX */
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Inter', -apple-system, sans-serif;
    position: fixed;
    top: 0;
    left: 0;
  }

  .dp-container {
  display: flex;
  width: 100%;
  max-width: 700px;      /* ✅ 700px parfait */
  height: 480px;         /* ✅ Hauteur fixe élégante */
  background: #ffffff;
  border-radius: 24px;   /* ✅ Coins arrondis + doux */
  box-shadow:            /* ✅ OMBRE 3D PREMIUM */
    0 25px 50px -12px rgba(0, 0, 0, 0.15),
    0 10px 20px -8px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(255, 255, 255, 0.9),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
 
  /* ── Section formulaire ── */
  .dp-auth-section {
    flex: 1;
    padding: 40px;
    display: flex;
    flex-direction: column;
  }
 
  .dp-brand-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 28px;
  }
 
  .dp-logo-box {
    display: flex;
    font-weight: 900;
    font-size: 20px;
    letter-spacing: -1px;
  }
 
  .dp-iuc-v { color: #1a5d3b; }
  .dp-iuc-r { color: #e11d48; }
 
  .dp-logo-text {
    font-weight: 700;
    font-size: 18px;
    color: #1e293b;
    letter-spacing: 1px;
    border-left: 2px solid #e2e8f0;
    padding-left: 12px;
  }
 
  .dp-form-content { flex: 1; }
 
  .dp-main-title {
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 4px;
  }
 
  .dp-sub-title {
    font-size: 14px;
    color: #64748b;
    margin-bottom: 20px;
  }
 
  /* Erreur */
  .dp-error-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #fff0f1;
    border: 1.5px solid #e63946;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 13px;
    color: #c0303a;
    font-weight: 500;
    margin-bottom: 16px;
  }
 
  .dp-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
 
  .dp-field {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
 
  .dp-label {
    font-size: 12px;
    font-weight: 700;
    color: #475569;
  }
 
  .dp-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }
 
  .dp-input-icon {
    position: absolute;
    left: 14px;
    color: #94a3b8;
    display: flex;
    z-index: 5;
    background: none;
    border: none;
    padding: 0;
    cursor: default;
  }
 
  .dp-eye-btn {
    cursor: pointer;
    transition: color 0.2s;
  }
 
  .dp-eye-btn:hover { color: #1a5d3b; }
 
  .dp-input {
    width: 100%;
    padding: 12px 14px 12px 44px;
    border: 1.5px solid #e8edf2;
    background: #f8fafc;
    border-radius: 8px;
    font-size: 14px;
    color: #1e293b;
    transition: all 0.2s;
    font-family: inherit;
  }
 
  .dp-input::placeholder { color: #303336; opacity: 1; }
 
  .dp-input:focus {
    outline: none;
    border-color: #1a5d3b;
    background: white;
    box-shadow: 0 0 0 3px rgba(26,93,59,0.1);
  }
 
  .dp-input:disabled { opacity: .65; cursor: not-allowed; }
 
  .dp-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
 
  .dp-remember {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #64748b;
    cursor: pointer;
    user-select: none;
  }
 
  .dp-checkbox { accent-color: #1a5d3b; }
 
  .dp-forgot {
    font-size: 12px;
    color: #e11d48;
    text-decoration: none;
    font-weight: 600;
  }
 
  .dp-forgot:hover { text-decoration: underline; }
 
  .dp-submit-btn {
    width: 100%;
    padding: 8px;
    background: #1a5d3b;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    margin-top: 6px;
    transition: background .2s, transform .1s, box-shadow .2s;
    font-family: inherit;
  }
 
  .dp-submit-btn:hover:not(:disabled) {
    background: #14472d;
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(26,93,59,0.25);
  }
 
  .dp-submit-btn:disabled { opacity: .7; cursor: not-allowed; }
 
  .dp-footer-support {
    font-size: 12px;
    color: #94a3b8;
    text-align: center;
    margin-top: 16px;
  }
 
  .dp-footer-support a {
    color: #1a5d3b;
    text-decoration: none;
    font-weight: 600;
  }
 
  /* ── Section image ── */
  .dp-image-section {
    flex: 1;
    position: relative;
    overflow: hidden;
  }
 
  .dp-car-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform .4s ease;
  }
 
  .dp-image-section:hover .dp-car-img { transform: scale(1.03); }
 
  .dp-image-overlay {
    position: absolute;
    bottom: 20px;
    left: 20px;
    right: 20px;
    background: rgba(255,255,255,0.92);
    backdrop-filter: blur(6px);
    padding: 12px;
    border-radius: 12px;
    text-align: center;
    font-size: 11px;
    font-weight: 700;
    color: #1a5d3b;
    text-transform: uppercase;
    letter-spacing: 2px;
  }
 
  @keyframes dp-spin { to { transform: rotate(360deg); } }
 
  @media (max-width: 768px) {
    .dp-container { flex-direction: column; height: auto; max-width: 420px; }
    .dp-image-section { display: none; }
  }
`;