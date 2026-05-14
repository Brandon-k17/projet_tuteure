import { useState } from "react";
import SplashScreen from "./pages/auth/SplashScreen";
import LoginScreen from "./pages/auth/Login";
import OAuthCallback from "./pages/auth/OAuthCallback";
import DashboardGestionnaire from "./pages/dashboard/DashboardGestionnaire";
import DashboardPersonnel from "./pages/dashboard/DashboardPersonnel";
import DashboardChauffeur from "./pages/dashboard/DashBoardChauffeur";
import DashboardTechnicien from "./pages/dashboard/DashboardTechnicien";

function App() {
  const isOAuth = window.location.pathname === "/oauth-callback";
  const [phase, setPhase] = useState(isOAuth ? "oauth" : "splash");
  const [userData, setUserData] = useState(null);

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    setUserData(null);
    setPhase("login");
  };

  const handleLogin = (data) => {
    const accessToken  = data.tokens?.access  || data.access_token || data.access;
    const refreshToken = data.tokens?.refresh || data.refresh_token || data.refresh;
    const user         = data.user || data;

    localStorage.setItem("access_token",  accessToken);
    localStorage.setItem("refresh_token", refreshToken);
    localStorage.setItem("user_role",     user.role);
    localStorage.setItem("user_data",     JSON.stringify(user));
    setUserData(user);
    setPhase("app");
  };

  // ✅ Détecte /oauth-callback dans l'URL
  if (phase === "splash") {
    // Si on arrive depuis Google OAuth, skip le splash
    if (window.location.pathname === "/oauth-callback") {
      return <OAuthCallback onLogin={handleLogin} />;
    }
    return <SplashScreen onFinish={() => setPhase("login")} />;
  }
  if (phase === "oauth") {
  return <OAuthCallback onLogin={handleLogin} />;
}
  if (phase === "login") {
    if (window.location.pathname === "/oauth-callback") {
      return <OAuthCallback onLogin={handleLogin} />;
    }
    return <LoginScreen onLogin={handleLogin} />;
  }

  const role = userData?.role || localStorage.getItem("user_role") || "GESTIONNAIRE";

  if (role === "GESTIONNAIRE" || role === "ADMIN") return <DashboardGestionnaire onLogout={handleLogout} />;
  if (role === "TECHNICIEN")  return <DashboardTechnicien onLogout={handleLogout} />;
  if (role === "PERSONNEL")   return <DashboardPersonnel  onLogout={handleLogout} />;
  if (role === "CHAUFFEUR")   return <DashboardChauffeur  onLogout={handleLogout} />;

  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", flexDirection:"column", gap:12, background:"#f5f4f0" }}>
      <div style={{ fontSize:32 }}>🚗</div>
      <div style={{ fontWeight:800, fontSize:20, letterSpacing:2 }}>DRIVEPARC</div>
      <div style={{ color:"#999", fontSize:14 }}>Dashboard <b>{role}</b> — à venir</div>
      <button onClick={handleLogout} style={{ marginTop:16, padding:"10px 24px", background:"#1a5d3b", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontWeight:"700", fontSize:14 }}>
        Se déconnecter
      </button>
    </div>
  );
}

export default App;