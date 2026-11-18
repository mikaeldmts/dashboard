import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Compass, Cpu, Globe2, Radio, ShieldAlert } from "lucide-react";

const GREETINGS = [
  { lang: "PT-BR", word: "Bem-vindo ao Observatório", note: "Monitoramento planetário & engenharia" },
  { lang: "EN", word: "Welcome to the Observatory", note: "Real-time planetary intelligence" },
  { lang: "FR", word: "Bienvenue à l'Observatoire", note: "Analyse mondiale en temps réel" },
  { lang: "ZH", word: "欢迎来到全球实时观测站", note: "实时地缘与科技态势感知" },
  { lang: "HE", word: "ברוכים הבאים למצפה העולמי", note: "ניתוח עולמי בזמן אמת" }
];

function formatUtcClock(date) {
  return date.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

export function WelcomePortal({ onEnterWorld, onEnterGithub }) {
  const canvasRef = useRef(null);
  const [greetingIndex, setGreetingIndex] = useState(0);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const clockTimer = window.setInterval(() => setNow(new Date()), 1000);
    const greetTimer = window.setInterval(() => {
      setGreetingIndex((prev) => (prev + 1) % GREETINGS.length);
    }, 3400);
    return () => {
      window.clearInterval(clockTimer);
      window.clearInterval(greetTimer);
    };
  }, []);

  // Interactive planetary horizon limb & orbital telemetry arcs on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    let rafId = 0;
    let pointerX = 0.5;
    let pointerY = 0.5;

    const handlePointerMove = (e) => {
      pointerX = e.clientX / Math.max(1, window.innerWidth);
      pointerY = e.clientY / Math.max(1, window.innerHeight);
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    const render = (time) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight;
      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const t = time * 0.00035;
      const cx = width * (width > 900 ? 0.78 : 0.5) + (pointerX - 0.5) * 28;
      const cy = height * (width > 900 ? 0.56 : 0.88) + (pointerY - 0.5) * 22;
      const radius = Math.min(width, height) * (width > 900 ? 0.54 : 0.62);

      // Atmospheric outer aura
      const halo = ctx.createRadialGradient(cx, cy, radius * 0.78, cx, cy, radius * 1.28);
      halo.addColorStop(0, "rgba(56, 189, 248, 0.14)");
      halo.addColorStop(0.5, "rgba(96, 165, 250, 0.05)");
      halo.addColorStop(1, "rgba(6, 8, 15, 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.28, 0, Math.PI * 2);
      ctx.fill();

      // Planetary sphere body
      const sphereGrad = ctx.createRadialGradient(
        cx - radius * 0.32,
        cy - radius * 0.34,
        radius * 0.08,
        cx,
        cy,
        radius
      );
      sphereGrad.addColorStop(0, "rgba(22, 37, 64, 0.92)");
      sphereGrad.addColorStop(0.55, "rgba(10, 17, 32, 0.96)");
      sphereGrad.addColorStop(1, "rgba(4, 7, 14, 0.99)");
      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Clipped meridian & latitude rings inside planetary sphere
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      ctx.strokeStyle = "rgba(148, 163, 184, 0.09)";
      ctx.lineWidth = 1;

      for (let i = -4; i <= 4; i += 1) {
        const latOffset = (i / 5) * radius;
        const latRadiusX = Math.sqrt(Math.max(0, radius * radius - latOffset * latOffset));
        ctx.beginPath();
        ctx.ellipse(cx, cy + latOffset, latRadiusX, latRadiusX * 0.2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (let i = 0; i < 8; i += 1) {
        const phase = (t + (i * Math.PI) / 8) % Math.PI;
        const rx = Math.abs(Math.cos(phase)) * radius;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(2, rx), radius, -0.18, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Telemetry pulse nodes on planetary surface
      const beacons = [
        { a: 0.9, b: -0.25, color: "#38bdf8" },
        { a: 1.45, b: 0.12, color: "#34d399" },
        { a: 2.05, b: -0.35, color: "#fbbf24" },
        { a: 2.6, b: 0.28, color: "#f87171" },
        { a: 0.35, b: 0.32, color: "#60a5fa" }
      ];

      beacons.forEach((b, idx) => {
        const angle = b.a + t * 0.9;
        const vis = Math.sin(angle);
        if (vis <= 0.05) return;
        const bx = cx + Math.cos(angle) * radius * 0.72 * Math.cos(b.b);
        const by = cy + Math.sin(b.b) * radius * 0.75;
        const pulse = ((time * 0.002 + idx * 0.37) % 1);

        ctx.strokeStyle = b.color;
        ctx.globalAlpha = (1 - pulse) * 0.65 * vis;
        ctx.beginPath();
        ctx.arc(bx, by, 4 + pulse * 18, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = b.color;
        ctx.globalAlpha = 0.9 * vis;
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.restore();

      // Crisp horizon rim arc
      ctx.strokeStyle = "rgba(96, 165, 250, 0.34)";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Outer orbital telemetry track
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.32);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.16)";
      ctx.setLineDash([5, 9]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.18, radius * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Orbiting satellite marker
      const satAngle = time * 0.00065;
      const sx = Math.cos(satAngle) * radius * 1.18;
      const sy = Math.sin(satAngle) * radius * 0.42;
      ctx.setLineDash([]);
      ctx.fillStyle = "#eaf0f9";
      ctx.beginPath();
      ctx.arc(sx, sy, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore();
      rafId = window.requestAnimationFrame(render);
    };

    rafId = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  const activeGreeting = GREETINGS[greetingIndex];

  return (
    <section className="welcome-stage" aria-label="Boas-vindas ao Observatório">
      <canvas ref={canvasRef} className="welcome-horizon-canvas" aria-hidden="true" />

      <div className="welcome-shell">
        <header className="welcome-rail">
          <div className="welcome-rail-brand">
            <span className="welcome-rail-code">MIKAEL F. DE MATOS // COMMAND SUITE</span>
            <span className="welcome-rail-sep" aria-hidden="true">/</span>
            <span className="welcome-rail-sub">WORLD INTEL &amp; SOFTWARE TELEMETRY</span>
          </div>
          <div className="welcome-rail-clock" aria-live="off">
            <Radio size={13} aria-hidden="true" />
            <span>{formatUtcClock(now)}</span>
          </div>
        </header>

        <div className="welcome-main">
          <motion.div
            className="welcome-copy"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="welcome-polyglot-bar" role="tablist" aria-label="Saudações por idioma">
              {GREETINGS.map((item, idx) => (
                <button
                  key={item.lang}
                  type="button"
                  role="tab"
                  aria-selected={idx === greetingIndex}
                  className={`welcome-lang-tab ${idx === greetingIndex ? "active" : ""}`}
                  onClick={() => setGreetingIndex(idx)}
                >
                  {item.lang}
                </button>
              ))}
            </div>

            <div className="welcome-salutation-slot">
              <AnimatePresence mode="wait">
                <motion.p
                  key={activeGreeting.lang}
                  className="welcome-salutation"
                  dir={activeGreeting.lang === "HE" ? "rtl" : "ltr"}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.24 }}
                >
                  <span>{activeGreeting.word}</span>
                  <small>{activeGreeting.note}</small>
                </motion.p>
              </AnimatePresence>
            </div>

            <h1 className="welcome-headline">
              Inteligência planetária em tempo real e engenharia orientada a dados.
            </h1>

            <p className="welcome-lead">
              Explore um globo 3D interativo onde cada país revela acontecimentos ao vivo —
              geopolítica, conflitos, tecnologia, economia e atividade sísmica — combinados a
              gráficos macroeconômicos e previsões geradas por IA.
            </p>

            <div className="welcome-cta-row">
              <motion.button
                id="enter-dashboard-btn"
                type="button"
                className="welcome-primary-btn"
                onClick={onEnterWorld}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Globe2 size={18} aria-hidden="true" />
                <span>Ir para o Dashboard</span>
                <ArrowRight size={17} className="welcome-btn-arrow" aria-hidden="true" />
              </motion.button>

              <button
                id="enter-github-secondary-btn"
                type="button"
                className="welcome-secondary-btn"
                onClick={onEnterGithub}
              >
                <span>Ver GitHub Dashboard</span>
              </button>
            </div>
          </motion.div>

          <motion.aside
            className="welcome-spec-panel"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            aria-label="Módulos disponíveis na plataforma"
          >
            <div className="welcome-spec-header">
              <span>ARQUITETURA DO SISTEMA</span>
              <strong>02 AMBIENTES INTEGRADOS</strong>
            </div>

            <div className="welcome-spec-list">
              <div className="welcome-spec-item">
                <div className="welcome-spec-icon">
                  <Compass size={17} aria-hidden="true" />
                </div>
                <div>
                  <h2>Realtime World Analysis</h2>
                  <p>
                    Globo terrestre interativo com inspeção por país, feed global ao vivo,
                    sensores USGS/NASA e séries do Banco Mundial.
                  </p>
                </div>
              </div>

              <div className="welcome-spec-item">
                <div className="welcome-spec-icon">
                  <ShieldAlert size={17} aria-hidden="true" />
                </div>
                <div>
                  <h2>Previsões Estratégicas com IA</h2>
                  <p>
                    Síntese executiva via Groq AI calculando probabilidades de curto e médio
                    prazo, vetores de risco e gatilhos críticos.
                  </p>
                </div>
              </div>

              <div className="welcome-spec-item">
                <div className="welcome-spec-icon">
                  <Cpu size={17} aria-hidden="true" />
                </div>
                <div>
                  <h2>GitHub Engineering Intelligence</h2>
                  <p>
                    Métricas reais de código, distribuição de linguagens, idiomas e assistente
                    neural Overthinker acessível pelo menu hambúrguer.
                  </p>
                </div>
              </div>
            </div>
          </motion.aside>
        </div>
      </div>
    </section>
  );
}

export default WelcomePortal;
