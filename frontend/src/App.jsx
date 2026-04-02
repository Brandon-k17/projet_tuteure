import { useState } from "react";
import SplashScreen from "./pages/auth/SplashScreen";
import LoginScreen from "./pages/auth/Login";
import DashboardGestionnaire from "./pages/dashboard/DashboardGestionnaire";
import DashboardPersonnel from "./pages/dashboard/DashboardPersonnel";
import DashboardChauffeur from "./pages/dashboard/DashBoardChauffeur";

function App() {
  const [phase, setPhase] = useState("splash");
  const [userData, setUserData] = useState(null);

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    setUserData(null);
    setPhase("login");
  };

  if (phase === "splash") {
    return <SplashScreen onFinish={() => setPhase("login")} />;
  }

  if (phase === "login") {
    return (
      <LoginScreen
        onLogin={(data) => {
          localStorage.setItem("access_token", data.tokens?.access || data.access);
          localStorage.setItem("refresh_token", data.tokens?.refresh || data.refresh);
          localStorage.setItem("user_role", data.user.role);
          localStorage.setItem("user_data", JSON.stringify(data.user));
          setUserData(data.user);
          setPhase("app");
        }}
      />
    );
  }

  // ✅ Rôles qui viennent VRAIMENT de ton backend (init_driveparc.py)
  const role = userData?.role || localStorage.getItem("user_role") || "GESTIONNAIRE";

  if (role === "GESTIONNAIRE" || role === "ADMIN") {
    return <DashboardGestionnaire onLogout={handleLogout} />;
  }

  // ✅ PERSONNEL = directeurs + chefs de département
  if (role === "PERSONNEL") {
    return <DashboardPersonnel onLogout={handleLogout} />;
  }
if (role === "CHAUFFEUR") {
  return <DashboardChauffeur onLogout={handleLogout} />;
}
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", fontFamily: "sans-serif", flexDirection: "column",
      gap: 12, background: "#f5f4f0"
    }}>
      <div style={{ fontSize: 32 }}>🚗</div>
      <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: 2 }}>DRIVEPARC</div>
      <div style={{ color: "#999", fontSize: 14 }}>
        Dashboard <b>{role}</b> — à venir
      </div>
      <button onClick={handleLogout} style={{
        marginTop: 16, padding: "10px 24px",
        background: "#1a5d3b", color: "white",
        border: "none", borderRadius: 8, cursor: "pointer",
        fontWeight: "700", fontSize: 14
      }}>
        Se déconnecter
      </button>
    </div>
  );
}

export default App;