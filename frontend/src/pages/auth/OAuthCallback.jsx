import { useEffect } from "react";

export default function OAuthCallback({ onLogin }) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const access  = params.get("access");
    const refresh = params.get("refresh");
    const error   = params.get("error");

    if (error || !access) {
      window.location.href = "/login?error=oauth_failed";
      return;
    }

    // Récupère le profil avec le token
    fetch("http://localhost:8000/api/v1/auth/profile/", {
      headers: { Authorization: `Bearer ${access}` }
    })
      .then(r => r.json())
      .then(data => {
        const user = data?.data ?? data;
        onLogin({ access, refresh, user });
        // Nettoie l'URL
        window.history.replaceState({}, document.title, "/");
      })
      .catch(() => {
        window.location.href = "/login?error=profile_failed";
      });
  }, []);

  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"Inter,sans-serif", color:"#1B5E37" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:32, height:32, border:"3px solid #1B5E37", borderTopColor:"transparent", borderRadius:"50%", animation:"spin .8s linear infinite", margin:"0 auto 12px" }}/>
        <div style={{ fontSize:14, fontWeight:600 }}>Connexion Google en cours…</div>
        <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      </div>
    </div>
  );
}