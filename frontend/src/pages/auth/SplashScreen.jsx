import { useEffect, useRef, useState } from "react";

export default function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState("driving");
  const smokeRef = useRef(null);
  const intervalRef = useRef(null);

  const hour = new Date().getHours();
  const isDay = hour >= 6 && hour < 20;
  const T = isDay ? DAY_THEME : NIGHT_THEME;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("logo"), 2400);
    const t2 = setTimeout(() => { setPhase("done"); onFinish?.(); }, 5200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onFinish]);

  useEffect(() => {
    if (phase === "done") { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      if (!smokeRef.current) return;
      for (let i = 0; i < 3; i++) {
        const p = document.createElement("div");
        const sz = 18 + Math.random() * 30;
        const dur = (0.9 + Math.random() * 1.1).toFixed(2);
        const sx = -(25 + Math.random() * 65);
        const sy = -(12 + Math.random() * 35);
        Object.assign(p.style, {
          position: "absolute", borderRadius: "50%",
          background: "rgba(190,205,215,0.22)",
          width: `${sz}px`, height: `${sz}px`,
          left: `${Math.random() * 8}px`, bottom: `${Math.random() * 8}px`,
          "--sx": `${sx}px`, "--sy": `${sy}px`,
          animation: `dp-smoke ${dur}s ease-out forwards`,
          animationDelay: `${(Math.random() * 0.15).toFixed(2)}s`,
        });
        smokeRef.current.appendChild(p);
        setTimeout(() => p.remove(), (parseFloat(dur) + 0.5) * 1000);
      }
    }, 85);
    return () => clearInterval(intervalRef.current);
  }, [phase]);

  if (phase === "done") return null;

  return (
    <div style={{ ...s.root, background: T.rootBg }}>
      <style>{CSS}</style>

      {/* SKY */}
      <div style={{ ...s.sky, background: T.skyGrad }}>
        {isDay ? (
          <>
            <div style={s.sun} />
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{
                ...s.ray,
                transform: `rotate(${i * 45}deg) translateX(38px)`,
                animation: `dp-ray ${1.5 + i * 0.2}s ease-in-out infinite`,
              }} />
            ))}
            {CLOUDS.map((cl, i) => (
              <div key={i} style={{
                ...s.cloud, top: `${cl.top}%`, left: `${cl.left}%`, width: cl.w,
                animation: `dp-cloud ${cl.dur}s ease-in-out infinite alternate`,
              }}>
                <div style={s.cloudPuff} />
              </div>
            ))}
            {[0, 1, 2].map(b => (
              <div key={b} style={{
                ...s.bird, top: `${25 + b * 8}%`, left: `${20 + b * 15}%`,
                animation: `dp-bird ${2 + b * 0.4}s ease-in-out ${b * 0.6}s infinite alternate`,
              }}>
                <svg width="18" height="8" viewBox="0 0 18 8">
                  <path d="M0 4 Q4 0 9 4 Q13 0 18 4" stroke="#555" strokeWidth="1.5" fill="none" />
                </svg>
              </div>
            ))}
          </>
        ) : (
          <>
            {STARS.map((st, i) => (
              <div key={i} style={{
                position: "absolute", background: "white", borderRadius: "50%",
                width: `${st.size}px`, height: `${st.size}px`,
                top: `${st.top}%`, left: `${st.left}%`,
                animation: `dp-twinkle ${st.dur}s ${st.delay}s ease-in-out infinite alternate`,
              }} />
            ))}
            <div style={s.moon}><div style={s.moonCrescent} /></div>
          </>
        )}
      </div>

      {/* ROUTE */}
      <div style={{ ...s.road, background: T.roadGrad }}>
        <div style={s.roadTrack}>
          {[...Array(10)].map((_, i) => (
            <div key={i} style={{
              ...s.dashLine, background: T.dashColor,
              animationDelay: `${-i * 0.11}s`,
            }} />
          ))}
        </div>
        <div style={{ ...s.roadEdge, top: "8%", background: isDay ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,.08)" }} />
        <div style={{ ...s.roadEdge, top: "90%", background: isDay ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,.08)" }} />
        {isDay && <div style={s.grass} />}
      </div>

      {/* VOITURE */}
      <div style={{ ...s.car, animation: "dp-car 2.3s cubic-bezier(.4,0,.2,1) forwards" }}>
        <div ref={smokeRef} style={s.smokeOrigin} />
        <div style={{
          ...s.beam,
          right: isDay ? "-50px" : "-185px",
          width: isDay ? "60px" : "200px",
          background: isDay
            ? "linear-gradient(90deg,rgba(255,255,180,.1) 0%,transparent 100%)"
            : "linear-gradient(90deg,rgba(255,255,160,.48) 0%,transparent 100%)",
        }} />
        <CarSVG T={T} isDay={isDay} />
      </div>

      {/* LOGO */}
      {phase === "logo" && (
        <div style={s.logoWrap}>
          {/* Fond semi-transparent pour lisibilité */}
          <div style={{
            ...s.logoBg,
            background: isDay ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.65)",
          }}>
            <div style={{
              ...s.logoIcon,
              background: T.logoGrad,
              animation: `dp-glow-green 2s ease-in-out infinite`,
            }}>
              <LogoIcon />
            </div>
            <div style={{ ...s.logoText, color: "#ffffff", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
              DRIVE<span style={{ color: "#1db954" }}>PARC</span>
            </div>
            <p style={{ ...s.tagline, color: "#ffffff", animation: "dp-tag .7s .35s both" }}>
              Gestion du parc automobile
            </p>
            <div style={{ ...s.badge, borderColor: "#1db954", color: "#ffffff", animation: "dp-tag .7s .65s both" }}>
              &nbsp;<span style={{ color: "#1db954", fontWeight: 700 }}>IUC</span>&nbsp;· Douala
            </div>
            <div style={{ ...s.timeBadge, background: "rgba(29,185,84,0.25)", color: "#ffffff", border: "1px solid rgba(29,185,84,0.5)", animation: "dp-tag .7s .8s both" }}>
              {isDay ? `☀ Bonjour · ${hour}h` : `☾ Bonsoir · ${hour}h`}
            </div>
            <div style={{ ...s.dots, animation: "dp-tag .5s 1s both" }}>
              {[0, 0.18, 0.36].map((d, i) => (
                <div key={i} style={{
                  ...s.dot, background: "#1db954",
                  animation: `dp-dot .9s ${d}s ease-in-out infinite`,
                }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CarSVG({ T, isDay }) {
  const ws = {
    display: "block", transformBox: "fill-box",
    transformOrigin: "center", animation: "dp-wheel .32s linear infinite",
  };
  return (
    <svg width="240" viewBox="0 0 240 100" fill="none">
      <ellipse cx="120" cy="93" rx="92" ry="7" fill="rgba(0,0,0,0.4)" />
      <rect x="8" y="46" width="218" height="38" rx="12" fill={T.carColor} />
      <path d="M55 46 Q70 16 108 14 L156 14 Q188 14 192 46 Z" fill={T.carDark} />
      <path d="M70 46 Q82 22 108 20 L145 20 Q168 20 174 46 Z" fill={isDay ? "#fde68a" : "#a8f0cc"} opacity=".45" />
      <line x1="123" y1="20" x2="125" y2="46" stroke={T.carDark} strokeWidth="2.5" />
      <rect x="207" y="54" width="20" height="13" rx="4" fill="#fffde0" />
      <rect x="210" y="56" width="13" height="8" rx="2" fill={isDay ? "#fbbf24" : "#ffd600"} />
      <rect x="8" y="55" width="14" height="10" rx="3" fill="#ff3333" opacity=".9" />
      <rect x="14" y="76" width="26" height="7" rx="3.5" fill="#333340" />
      <rect x="207" y="64" width="22" height="14" rx="5.5" fill={T.carAccent} />
      <rect x="8" y="64" width="18" height="14" rx="5.5" fill={T.carAccent} />
      <line x1="125" y1="46" x2="125" y2="84" stroke={T.carAccent} strokeWidth="1.5" />
      <rect x="92" y="62" width="16" height="5" rx="2.5" fill={T.carDark} />
      <rect x="134" y="62" width="16" height="5" rx="2.5" fill={T.carDark} />
      <rect x="128" y="50" width="34" height="18" rx="5" fill="rgba(255,255,255,0.15)" />
      <text x="145" y="63" textAnchor="middle" fontSize="9" fontWeight="800" fill="white" fontFamily="Arial, sans-serif">IUC</text>
      <rect x="88" y="12" width="60" height="5" rx="2.5" fill={T.carAccent} />
      <circle cx="58" cy="84" r="15" fill="#0f1020" />
      <g style={ws}>
        <circle cx="58" cy="84" r="10" fill="#22243a" />
        <circle cx="58" cy="84" r="4.5" fill="#b0b0b8" />
        <line x1="58" y1="74" x2="58" y2="94" stroke="#888" strokeWidth="2" />
        <line x1="48" y1="84" x2="68" y2="84" stroke="#888" strokeWidth="2" />
      </g>
      <circle cx="178" cy="84" r="15" fill="#0f1020" />
      <g style={{ ...ws, transformOrigin: "178px 84px" }}>
        <circle cx="178" cy="84" r="10" fill="#22243a" />
        <circle cx="178" cy="84" r="4.5" fill="#b0b0b8" />
        <line x1="178" y1="74" x2="178" y2="94" stroke="#888" strokeWidth="2" />
        <line x1="168" y1="84" x2="188" y2="84" stroke="#888" strokeWidth="2" />
      </g>
    </svg>
  );
}

function LogoIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <path d="M7 34L16 18Q18 13 22 13H30Q34 13 36 18L45 34" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
      <rect x="5" y="32" width="42" height="12" rx="6" fill="white" opacity=".92" />
      <circle cx="15" cy="44" r="6" fill="#0a6e2e" />
      <circle cx="37" cy="44" r="6" fill="#0a6e2e" />
      <circle cx="15" cy="44" r="2.8" fill="white" />
      <circle cx="37" cy="44" r="2.8" fill="white" />
      <rect x="22" y="18" width="8" height="8" rx="2" fill="white" opacity=".4" />
    </svg>
  );
}

const DAY_THEME = {
  rootBg: "#87CEEB",
  skyGrad: "linear-gradient(180deg,#87CEEB 0%,#c9e8f5 60%,#dff0fa 100%)",
  roadGrad: "linear-gradient(180deg,#6b6b6b 0%,#555 100%)",
  dashColor: "#ffffff",
  carColor: "#1db954", carDark: "#17a347", carAccent: "#15963e",
  // LOGO VERT pour le jour (corrigé)
  logoGrad: "linear-gradient(135deg,#1db954,#0a6e2e)",
};

const NIGHT_THEME = {
  rootBg: "#080d18",
  skyGrad: "linear-gradient(180deg,#080d18 0%,#0c1e36 60%,#152f4a 100%)",
  roadGrad: "linear-gradient(180deg,#0f1120 0%,#090b16 100%)",
  dashColor: "#e8b832",
  carColor: "#1db954", carDark: "#17a347", carAccent: "#15963e",
  logoGrad: "linear-gradient(135deg,#1db954,#0a6e2e)",
};

const CLOUDS = [
  { top: 10, left: 8,  w: "120px", dur: 4.5 },
  { top: 8,  left: 38, w: "80px",  dur: 5.2 },
  { top: 20, left: 62, w: "100px", dur: 3.8 },
];

const STARS = Array.from({ length: 65 }, () => ({
  size: Math.random() * 2.2 + 0.4,
  top: Math.random() * 60, left: Math.random() * 100,
  dur: 1.4 + Math.random() * 2, delay: Math.random() * 3,
}));

const CSS = `
  @keyframes dp-car {
    0%   { left: -260px; }
    58%  { left: 29%; }
    78%  { left: 31%; }
    100% { left: 30.5%; }
  }
  @keyframes dp-wheel { to { transform: rotate(360deg); } }
  @keyframes dp-road {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-340px); }
  }
  @keyframes dp-smoke {
    0%   { transform: translate(0,0) scale(.3); opacity: .65; }
    100% { transform: translate(var(--sx),var(--sy)) scale(1.8); opacity: 0; }
  }
  @keyframes dp-logo {
    0%   { opacity:0; transform:translate(-50%,-54%) scale(.62); filter:blur(20px); }
    58%  { filter:blur(4px); }
    100% { opacity:1; transform:translate(-50%,-58%) scale(1); filter:blur(0); }
  }
  @keyframes dp-glow-green {
    0%,100% { box-shadow: 0 0 24px rgba(29,185,84,.6); }
    50%      { box-shadow: 0 0 58px rgba(29,185,84,.95); }
  }
  @keyframes dp-tag {
    from { opacity:0; transform:translateY(10px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes dp-dot {
    0%,100% { transform:translateY(0); opacity:.3; }
    50%      { transform:translateY(-5px); opacity:1; }
  }
  @keyframes dp-twinkle { from { opacity:.1; } to { opacity:.9; } }
  @keyframes dp-beam { 0%,100% { opacity:.5; } 50% { opacity:.88; } }
  @keyframes dp-sun-pulse {
    0%,100% { transform:scale(1); opacity:.9; }
    50%      { transform:scale(1.08); opacity:1; }
  }
  @keyframes dp-cloud { 0% { transform:translateX(0); } 100% { transform:translateX(30px); } }
  @keyframes dp-bird {
    0%   { transform:translateX(-20px) translateY(0); }
    50%  { transform:translateX(0px) translateY(-4px); }
    100% { transform:translateX(20px) translateY(0); }
  }
  @keyframes dp-ray { 0%,100% { opacity:.13; } 50% { opacity:.28; } }
`;

const s = {
  root: { position: "fixed", inset: 0, overflow: "hidden", zIndex: 9999, fontFamily: "Arial, sans-serif" },
  sky: { position: "absolute", top: 0, left: 0, right: 0, height: "60%" },
  sun: {
    position: "absolute", top: "14%", right: "18%",
    width: "64px", height: "64px", borderRadius: "50%",
    background: "radial-gradient(circle,#fde68a 30%,#fbbf24 65%,rgba(251,191,36,0) 100%)",
    animation: "dp-sun-pulse 3s ease-in-out infinite",
  },
  ray: {
    position: "absolute", top: "calc(14% + 28px)", right: "calc(18% + 28px)",
    width: "80px", height: "3px", background: "rgba(251,191,36,0.5)",
    transformOrigin: "0 50%", borderRadius: "2px",
  },
  cloud: { position: "absolute", height: "28px", borderRadius: "50px", background: "rgba(255,255,255,0.82)" },
  cloudPuff: { position: "absolute", top: "-14px", left: "20%", width: "42px", height: "42px", borderRadius: "50%", background: "rgba(255,255,255,0.82)" },
  bird: { position: "absolute" },
  moon: { position: "absolute", top: "12%", right: "16%", width: "48px", height: "48px", borderRadius: "50%", background: "#f5f0d8", overflow: "hidden" },
  moonCrescent: { position: "absolute", top: "-6px", right: "-6px", width: "44px", height: "44px", borderRadius: "50%", background: "linear-gradient(180deg,#0c1e36 0%,#152f4a 100%)" },
  road: { position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", overflow: "hidden" },
  roadTrack: { position: "absolute", top: "44%", display: "flex", gap: "62px", animation: "dp-road .65s linear infinite" },
  dashLine: { width: "110px", height: "6px", borderRadius: "3px", opacity: 0.85, flexShrink: 0 },
  roadEdge: { position: "absolute", left: 0, right: 0, height: "3px" },
  grass: { position: "absolute", top: 0, left: 0, right: 0, height: "10px", background: "rgba(100,160,60,0.3)" },
  car: { position: "absolute", bottom: "40%", left: "-260px" },
  smokeOrigin: { position: "absolute", left: "10px", bottom: "10px", width: "10px", height: "10px", pointerEvents: "none" },
  beam: { position: "absolute", top: "26px", height: "60px", clipPath: "polygon(0 36%,100% 0%,100% 100%,0 64%)", animation: "dp-beam 1.8s ease-in-out infinite" },
  // Wrapper centré
  logoWrap: {
    position: "absolute", top: "50%", left: "50%",
    transform: "translate(-50%,-58%)",
    animation: "dp-logo 1.5s cubic-bezier(.22,1,.36,1) forwards",
  },
  // Fond semi-transparent pour lisibilité des textes
  logoBg: {
    textAlign: "center",
    padding: "28px 36px 24px",
    borderRadius: "20px",
    backdropFilter: "blur(4px)",
    border: "1px solid rgba(29,185,84,0.3)",
  },
  logoIcon: {
    width: "90px", height: "90px", margin: "0 auto 16px",
    borderRadius: "22px", display: "flex",
    alignItems: "center", justifyContent: "center",
  },
  logoText: { fontSize: "38px", fontWeight: 800, letterSpacing: "5px" },
  tagline: {
    fontSize: "12px", letterSpacing: "3px", textTransform: "uppercase",
    margin: "8px 0 0", opacity: 0, fontWeight: 600,
    textShadow: "0 1px 4px rgba(0,0,0,0.8)",
  },
  badge: {
    display: "inline-block", marginTop: "14px", padding: "5px 18px",
    border: "1px solid", borderRadius: "20px", fontSize: "11px",
    letterSpacing: "2px", textTransform: "uppercase", opacity: 0,
    fontWeight: 600,
  },
  timeBadge: {
    display: "inline-block", marginTop: "8px", padding: "4px 14px",
    borderRadius: "20px", fontSize: "11px", letterSpacing: "2px",
    textTransform: "uppercase", opacity: 0, fontWeight: 600,
  },
  dots: { display: "flex", gap: "8px", justifyContent: "center", marginTop: "24px", opacity: 0 },
  dot: { width: "7px", height: "7px", borderRadius: "50%" },
};