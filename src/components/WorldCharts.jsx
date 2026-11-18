import { useState } from "react";
import { Activity, AlertTriangle, Sparkles, TrendingUp } from "lucide-react";

const RADAR_AXES = [
  { key: "conflict", short: "Geopolítica", full: "Conflitos & Geopolítica", color: "#f87171" },
  { key: "economy", short: "Economia", full: "Economia & Mercados", color: "#fbbf24" },
  { key: "tech", short: "Tecnologia", full: "Tecnologia & IA", color: "#38bdf8" },
  { key: "society", short: "Sociedade", full: "Política & Sociedade", color: "#93c5fd" },
  { key: "climate", short: "Clima", full: "Clima & Sísmico", color: "#34d399" }
];

const DOMAIN_META = {
  conflict: { label: "Conflitos & Geopolítica", color: "#f87171" },
  economy: { label: "Economia & Mercados", color: "#fbbf24" },
  tech: { label: "Tecnologia & IA", color: "#38bdf8" },
  climate: { label: "Clima & Sísmico", color: "#34d399" },
  society: { label: "Política & Sociedade", color: "#93c5fd" }
};

function polarPoint(cx, cy, radius, index, total = 5) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / total;
  return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
}

export function IntelRadarChart({ dimensions = {}, scopeLabel = "Pulso Global" }) {
  const [hoveredKey, setHoveredKey] = useState(null);
  const cx = 130;
  const cy = 126;
  const maxR = 84;
  const levels = [0.25, 0.5, 0.75, 1];

  const dataPoints = RADAR_AXES.map((axis, idx) => {
    const val = Math.max(5, Math.min(100, Number(dimensions[axis.key] ?? 45)));
    const [x, y] = polarPoint(cx, cy, (val / 100) * maxR, idx, RADAR_AXES.length);
    return { ...axis, value: val, x, y };
  });

  const polygonPoints = dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <article className="world-panel-card">
      <div className="world-card-head">
        <div>
          <span className="world-card-kicker">MATRIZ MULTIDIMENSIONAL</span>
          <h3>Vetores de Intensidade · {scopeLabel}</h3>
        </div>
        <Activity size={17} className="world-card-icon" aria-hidden="true" />
      </div>

      <div className="radar-layout">
        <div className="radar-svg-wrap">
          <svg viewBox="0 0 260 250" role="img" aria-label={`Gráfico radar de intensidade para ${scopeLabel}`}>
            {levels.map((lvl) => {
              const pts = RADAR_AXES.map((_, idx) => {
                const [px, py] = polarPoint(cx, cy, maxR * lvl, idx, RADAR_AXES.length);
                return `${px.toFixed(1)},${py.toFixed(1)}`;
              }).join(" ");
              return (
                <polygon
                  key={lvl}
                  points={pts}
                  fill="none"
                  stroke="rgba(148, 163, 184, 0.14)"
                  strokeWidth="1"
                />
              );
            })}

            {RADAR_AXES.map((axis, idx) => {
              const [ox, oy] = polarPoint(cx, cy, maxR, idx, RADAR_AXES.length);
              const [lx, ly] = polarPoint(cx, cy, maxR + 22, idx, RADAR_AXES.length);
              return (
                <g key={axis.key}>
                  <line
                    x1={cx}
                    y1={cy}
                    x2={ox}
                    y2={oy}
                    stroke="rgba(148, 163, 184, 0.16)"
                    strokeWidth="1"
                  />
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="radar-axis-label"
                  >
                    {axis.short}
                  </text>
                </g>
              );
            })}

            <polygon
              points={polygonPoints}
              fill="rgba(56, 189, 248, 0.18)"
              stroke="#38bdf8"
              strokeWidth="1.8"
            />

            {dataPoints.map((pt) => {
              const active = hoveredKey === pt.key;
              return (
                <g
                  key={pt.key}
                  onMouseEnter={() => setHoveredKey(pt.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  style={{ cursor: "pointer" }}
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={active ? 6 : 4}
                    fill={pt.color}
                    stroke="#06080f"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        <div className="radar-bars-list">
          {dataPoints.map((pt) => (
            <div
              key={pt.key}
              className={`radar-bar-row ${hoveredKey === pt.key ? "is-hovered" : ""}`}
              onMouseEnter={() => setHoveredKey(pt.key)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              <div className="radar-bar-meta">
                <span>{pt.full}</span>
                <strong style={{ color: pt.color }}>{pt.value}/100</strong>
              </div>
              <div className="radar-bar-track">
                <div
                  className="radar-bar-fill"
                  style={{ width: `${pt.value}%`, background: pt.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function MacroLineChart({ gdpSeries = [], inflationSeries = [] }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const years = gdpSeries.length >= inflationSeries.length
    ? gdpSeries.map((d) => d.year)
    : inflationSeries.map((d) => d.year);

  if (years.length < 2) {
    return (
      <div className="chart-empty-note">
        Série histórica anual em atualização pelo Banco Mundial para este território.
      </div>
    );
  }

  const gdpMap = new Map(gdpSeries.map((d) => [d.year, d.value]));
  const infMap = new Map(inflationSeries.map((d) => [d.year, d.value]));

  const allValues = [
    ...gdpSeries.map((d) => d.value),
    ...inflationSeries.map((d) => d.value),
    0
  ];
  const minVal = Math.min(...allValues) - 1.5;
  const maxVal = Math.max(...allValues) + 1.5;
  const range = Math.max(2, maxVal - minVal);

  const W = 420;
  const H = 148;
  const padX = 28;
  const padY = 18;
  const plotW = W - padX * 2;
  const plotH = H - padY * 2;

  const xFor = (idx) => padX + (idx / Math.max(1, years.length - 1)) * plotW;
  const yFor = (val) => padY + plotH - ((val - minVal) / range) * plotH;
  const zeroY = yFor(0);

  const buildPolyline = (map) =>
    years
      .map((yr, i) => (map.has(yr) ? `${xFor(i).toFixed(1)},${yFor(map.get(yr)).toFixed(1)}` : null))
      .filter(Boolean)
      .join(" ");

  const activeYear = activeIndex != null ? years[activeIndex] : years[years.length - 1];

  return (
    <div className="macro-chart-box">
      <div className="macro-chart-legend">
        <span>
          <i style={{ background: "#38bdf8" }} /> PIB Real (% a.a.)
        </span>
        <span>
          <i style={{ background: "#fbbf24" }} /> Inflação (% a.a.)
        </span>
        {activeYear && (
          <strong className="macro-chart-readout">
            {activeYear}: PIB {gdpMap.has(activeYear) ? `${gdpMap.get(activeYear)}%` : "N/D"} ·
            Inflação {infMap.has(activeYear) ? `${infMap.get(activeYear)}%` : "N/D"}
          </strong>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="macro-svg" role="img" aria-label="Evolução histórica do PIB e Inflação">
        <line
          x1={padX}
          y1={zeroY}
          x2={W - padX}
          y2={zeroY}
          stroke="rgba(148, 163, 184, 0.22)"
          strokeDasharray="3 4"
        />

        {gdpSeries.length >= 2 && (
          <polyline
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.2"
            points={buildPolyline(gdpMap)}
          />
        )}

        {inflationSeries.length >= 2 && (
          <polyline
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeDasharray="4 2"
            points={buildPolyline(infMap)}
          />
        )}

        {years.map((yr, idx) => {
          const cx = xFor(idx);
          const gdpVal = gdpMap.get(yr);
          const infVal = infMap.get(yr);
          return (
            <g
              key={yr}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseLeave={() => setActiveIndex(null)}
              style={{ cursor: "pointer" }}
            >
              <rect x={cx - 18} y={0} width={36} height={H} fill="transparent" />
              {gdpVal != null && (
                <circle cx={cx} cy={yFor(gdpVal)} r={activeIndex === idx ? 4.8 : 3.4} fill="#38bdf8" />
              )}
              {infVal != null && (
                <circle cx={cx} cy={yFor(infVal)} r={activeIndex === idx ? 4.6 : 3.2} fill="#fbbf24" />
              )}
              <text x={cx} y={H - 3} textAnchor="middle" className="macro-year-label">
                {yr}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function SeismicPulseChart({ quakes = [] }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const slice = quakes.slice(0, 14);

  if (!slice.length) {
    return (
      <div className="chart-empty-note">
        Nenhum abalo sísmico acima de M4.5 reportado no momento.
      </div>
    );
  }

  const active = slice[selectedIdx] || slice[0];

  return (
    <div className="seismic-chart-box">
      <div className="seismic-header-row">
        <span>SISMOS 24H (USGS M4.5+)</span>
        {active && (
          <strong>
            M{active.mag.toFixed(1)} · {active.place}
          </strong>
        )}
      </div>

      <div className="seismic-bars" role="list" aria-label="Últimos terremotos globais acima de 4.5">
        {slice.map((q, idx) => {
          const heightPct = Math.min(100, Math.max(22, ((q.mag - 4.0) / 3.5) * 100));
          const isHigh = q.mag >= 5.5;
          return (
            <button
              key={q.id || idx}
              type="button"
              className={`seismic-bar-btn ${selectedIdx === idx ? "active" : ""}`}
              onMouseEnter={() => setSelectedIdx(idx)}
              onClick={() => setSelectedIdx(idx)}
              title={`M${q.mag.toFixed(1)} — ${q.place}`}
            >
              <span
                className="seismic-bar-col"
                style={{
                  height: `${heightPct}%`,
                  background: isHigh ? "#f87171" : "#fbbf24"
                }}
              />
              <small>{q.mag.toFixed(1)}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TelemetryAnalyticsCard({
  mode = "global",
  breakdown = [],
  quakes = [],
  macro = null,
  countryName = ""
}) {
  const formatPop = (num) => {
    if (!num) return "N/D";
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)} bi`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)} mi`;
    return num.toLocaleString("pt-BR");
  };

  return (
    <article className="world-panel-card">
      <div className="world-card-head">
        <div>
          <span className="world-card-kicker">
            {mode === "country" ? "TELEMETRIA ESTRUTURAL & TEMÁTICA" : "DISTRIBUIÇÃO & SENSORES 24H"}
          </span>
          <h3>
            {mode === "country"
              ? `Indicadores Macro · ${countryName}`
              : "Volume Temático & Pulso Sísmico"}
          </h3>
        </div>
        <TrendingUp size={17} className="world-card-icon" aria-hidden="true" />
      </div>

      {/* Stacked proportion bar of today's live news */}
      <div className="domain-stack-section">
        <div className="domain-stack-bar" aria-label="Proporção temática das notícias em tempo real">
          {breakdown
            .filter((b) => b.count > 0)
            .map((b) => (
              <div
                key={b.key}
                style={{
                  width: `${Math.max(6, b.share)}%`,
                  background: DOMAIN_META[b.key]?.color || "#60a5fa"
                }}
                title={`${b.label}: ${b.share}% (${b.count})`}
              />
            ))}
        </div>

        <div className="domain-stack-legend">
          {breakdown.map((b) => (
            <span key={b.key}>
              <i style={{ background: DOMAIN_META[b.key]?.color || "#60a5fa" }} />
              {b.label.split(" ")[0]} <strong>{b.share}%</strong>
            </span>
          ))}
        </div>
      </div>

      {mode === "country" && macro ? (
        <>
          <div className="country-macro-kpis">
            <div className="macro-kpi">
              <span>População</span>
              <strong>{formatPop(macro.population)}</strong>
            </div>
            <div className="macro-kpi">
              <span>Conectividade</span>
              <strong>{macro.internetPct != null ? `${macro.internetPct}%` : "N/D"}</strong>
            </div>
            <div className="macro-kpi">
              <span>Último PIB</span>
              <strong>
                {macro.gdpGrowthSeries?.length
                  ? `${macro.gdpGrowthSeries[macro.gdpGrowthSeries.length - 1].value}%`
                  : "N/D"}
              </strong>
            </div>
          </div>

          <MacroLineChart
            gdpSeries={macro.gdpGrowthSeries}
            inflationSeries={macro.inflationSeries}
          />
        </>
      ) : (
        <SeismicPulseChart quakes={quakes} />
      )}
    </article>
  );
}

function ProbabilityRing({ value = 50, impact = "Alto" }) {
  const radius = 21;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(5, Math.min(98, Number(value) || 50));
  const offset = circumference - (clamped / 100) * circumference;
  const stroke =
    impact === "Crítico" ? "#f87171" : impact === "Alto" ? "#fbbf24" : "#38bdf8";

  return (
    <div className="prob-ring" aria-label={`Probabilidade estimada de ${clamped}%`}>
      <svg width="54" height="54" viewBox="0 0 54 54">
        <circle
          cx="27"
          cy="27"
          r={radius}
          fill="none"
          stroke="rgba(148, 163, 184, 0.15)"
          strokeWidth="3.5"
        />
        <circle
          cx="27"
          cy="27"
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 27 27)"
        />
      </svg>
      <strong>{clamped}%</strong>
    </div>
  );
}

export function PredictionsDeck({ predictions = [], scopeLabel = "Cenário Global", aiModel = "" }) {
  return (
    <section className="predictions-section" aria-label="Previsões estratégicas com IA">
      <div className="predictions-header">
        <div>
          <span className="world-card-kicker">MOTOR PREDITIVO GROQ AI</span>
          <h2>Previsões &amp; Cenários Prováveis · {scopeLabel}</h2>
        </div>
        <div className="predictions-model-tag">
          <Sparkles size={13} aria-hidden="true" />
          <span>{aiModel && aiModel !== "telemetry-heuristic" ? `IA: ${aiModel}` : "Análise Preditiva"}</span>
        </div>
      </div>

      <div className="predictions-grid">
        {predictions.map((pred, idx) => {
          const domainInfo = DOMAIN_META[pred.domain] || DOMAIN_META.economy;
          return (
            <article key={`${pred.title}-${idx}`} className="prediction-card">
              <div className="prediction-top">
                <div className="prediction-meta">
                  <span className="prediction-horizon">{pred.horizon}</span>
                  <div className="prediction-badges">
                    <span
                      className={`impact-pill impact-${String(pred.impact || "Alto")
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")}`}
                    >
                      <AlertTriangle size={11} aria-hidden="true" />
                      Impacto {pred.impact}
                    </span>
                    <span className="domain-tag" style={{ color: domainInfo.color }}>
                      {domainInfo.label}
                    </span>
                  </div>
                </div>

                <ProbabilityRing value={pred.probability} impact={pred.impact} />
              </div>

              <h3 className="prediction-title">{pred.title}</h3>
              <p className="prediction-summary">{pred.summary}</p>

              <div className="prediction-trigger">
                <span>SINAL PARA MONITORAR</span>
                <p>{pred.trigger}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
