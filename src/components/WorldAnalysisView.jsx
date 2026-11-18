import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  ExternalLink,
  Flame,
  Globe2,
  Loader2,
  Newspaper,
  Search,
  Sparkles,
  X
} from "lucide-react";
import { searchCountries, STRATEGIC_COUNTRY_COORDS } from "../data/countryCatalog.js";
import { InteractiveGlobe } from "./InteractiveGlobe.jsx";
import {
  IntelRadarChart,
  PredictionsDeck,
  TelemetryAnalyticsCard
} from "./WorldCharts.jsx";

const DOMAIN_FILTERS = [
  { id: "all", label: "Todos os Domínios" },
  { id: "conflict", label: "Conflitos & Geopolítica" },
  { id: "tech", label: "Tecnologia & IA" },
  { id: "economy", label: "Economia & Mercados" },
  { id: "climate", label: "Clima & Sísmico" }
];

const DOMAIN_BADGE = {
  conflict: { label: "Geopolítica", color: "#f87171" },
  tech: { label: "Tecnologia", color: "#38bdf8" },
  economy: { label: "Economia", color: "#fbbf24" },
  climate: { label: "Clima", color: "#34d399" },
  society: { label: "Sociedade", color: "#93c5fd" }
};

function formatRelativeTime(isoDate) {
  if (!isoDate) return "Agora";
  const diffMs = Date.now() - new Date(isoDate).getTime();
  if (Number.isNaN(diffMs) || diffMs < 60_000) return "Agora";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

export function WorldAnalysisView({
  globalData,
  selectedCountry,
  countryData,
  activeIntel,
  isLoadingGlobal,
  isLoadingCountry,
  error,
  onSelectCountry,
  onClearCountry
}) {
  const [domainFilter, setDomainFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchResults = useMemo(() => searchCountries(searchQuery, 7), [searchQuery]);

  const scopeLabel = selectedCountry ? selectedCountry.namePt : "Pulso Global";
  const intel = activeIntel || globalData;

  const filteredArticles = useMemo(() => {
    const list = intel?.articles || [];
    if (domainFilter === "all") return list;
    return list.filter((a) => a.domain === domainFilter);
  }, [intel, domainFilter]);

  const tensionValue = intel?.tensionIndex ?? 62;
  const tensionTone =
    tensionValue >= 72 ? "#f87171" : tensionValue >= 52 ? "#fbbf24" : "#34d399";

  const quakesCount = globalData?.stats?.quakes24h ?? globalData?.quakes?.length ?? 0;
  const maxQuakeMag = globalData?.stats?.maxQuakeMag ?? 0;
  const activeNaturalCount =
    globalData?.stats?.activeNaturalEvents ?? globalData?.eonet?.length ?? 0;

  function handlePickSearchCountry(country) {
    const coords = STRATEGIC_COUNTRY_COORDS[country.iso2] || null;
    onSelectCountry({
      ...country,
      ...(coords ? { lon: coords[0], lat: coords[1] } : {})
    });
    setSearchQuery("");
    setIsSearchFocused(false);
  }

  return (
    <motion.main
      className="world-layout"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Visually clear H1 + Command Telemetry Strip */}
      <section className="world-command-bar" aria-label="Resumo da situação planetária">
        <div className="world-command-heading">
          <div className="world-heading-row">
            <h1>Realtime World Analysis</h1>
            {selectedCountry && (
              <button
                type="button"
                className="world-back-global-btn"
                onClick={onClearCountry}
              >
                <ArrowLeft size={14} aria-hidden="true" />
                <span>Voltar ao Pulso Global</span>
              </button>
            )}
          </div>
          <p>
            Monitoramento planetário ao vivo de geopolítica, conflitos, mercados, tecnologia,
            sensores sísmicos e previsões por IA.
          </p>
        </div>

        <div className="world-kpi-strip">
          <div className="world-kpi-tile">
            <span>ÍNDICE DE INTENSIDADE</span>
            <strong style={{ color: tensionTone }}>
              {isLoadingCountry && !countryData ? "..." : `${tensionValue}/100`}
            </strong>
            <small>{intel?.statusLabel || "Sincronizando telemetria..."}</small>
          </div>

          <div className="world-kpi-tile">
            <span>ESCOPO ATIVO</span>
            <strong>
              {selectedCountry ? `${selectedCountry.flag} ${selectedCountry.namePt}` : "🌐 Planeta Terra"}
            </strong>
            <small>{selectedCountry ? selectedCountry.region : "177 territórios clicáveis"}</small>
          </div>

          <div className="world-kpi-tile">
            <span>SISMOS 24H (USGS)</span>
            <strong>{quakesCount} eventos</strong>
            <small>Pico recente: M{maxQuakeMag ? maxQuakeMag.toFixed(1) : "--"}</small>
          </div>

          <div className="world-kpi-tile">
            <span>FENÔMENOS ATIVOS (NASA)</span>
            <strong>{activeNaturalCount} alertas</strong>
            <small>Tempestades, vulcões &amp; focos</small>
          </div>
        </div>
      </section>

      {/* Filter Pills + Country Search Bar */}
      <section className="world-toolbar" aria-label="Filtros de domínio e busca de países">
        <div className="world-filter-pills" role="tablist" aria-label="Filtrar categoria de eventos">
          {DOMAIN_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={domainFilter === f.id}
              className={`world-filter-pill ${domainFilter === f.id ? "active" : ""}`}
              onClick={() => setDomainFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="world-country-search">
          <div className="world-search-input-wrap">
            <Search size={15} className="world-search-icon" aria-hidden="true" />
            <input
              id="world-country-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => window.setTimeout(() => setIsSearchFocused(false), 160)}
              placeholder="Buscar país (ex: Brasil, Ucrânia, China, EUA)..."
              aria-label="Buscar país para inspecionar no globo"
              autoComplete="off"
            />
            {searchQuery && (
              <button
                type="button"
                className="world-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {isSearchFocused && searchResults.length > 0 && (
            <div className="world-search-dropdown" role="listbox" aria-label="Países encontrados">
              {searchResults.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  className="world-search-option"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handlePickSearchCountry(c);
                  }}
                >
                  <span className="world-search-flag">{c.flag}</span>
                  <span className="world-search-name">{c.namePt}</span>
                  <small>{c.region}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {error && (
        <div className="world-error-banner" role="alert">
          <span>{error}</span>
        </div>
      )}

      {/* Primary Split Stage: 3D Interactive Globe + Live Situational Intelligence Feed */}
      <section className="world-stage-grid">
        <InteractiveGlobe
          selectedCountry={selectedCountry}
          onSelectCountry={onSelectCountry}
          hotspots={globalData?.hotspots || []}
          quakes={globalData?.quakes || []}
          eonet={globalData?.eonet || []}
          activeDomainFilter={domainFilter}
        />

        <aside className="world-intel-console" aria-live="polite">
          <div className="intel-console-header">
            <div className="intel-console-title-group">
              <span className="world-card-kicker">
                {selectedCountry ? `DOSSIÊ NACIONAL · ISO ${selectedCountry.iso3}` : "BRIEFING PLANETÁRIO AO VIVO"}
              </span>
              <h2>
                {selectedCountry
                  ? `${selectedCountry.flag} ${selectedCountry.namePt}`
                  : "Síntese Estratégica Mundial"}
              </h2>
            </div>

            {selectedCountry ? (
              <button
                type="button"
                className="intel-reset-chip"
                onClick={onClearCountry}
                title="Fechar dossiê do país e voltar à visão mundial"
              >
                <Globe2 size={13} aria-hidden="true" />
                <span>Global</span>
              </button>
            ) : (
              <span className="intel-live-badge">
                <Activity size={13} aria-hidden="true" />
                <span>LIVE</span>
              </span>
            )}
          </div>

          {(isLoadingCountry && selectedCountry && !countryData) ||
          (isLoadingGlobal && !globalData) ? (
            <div className="intel-loading-box">
              <Loader2 size={22} className="spin-icon" aria-hidden="true" />
              <p>
                Consultando agências internacionais, sensores e motor preditivo Groq AI para{" "}
                <strong>{scopeLabel}</strong>...
              </p>
            </div>
          ) : (
            <>
              <div className="intel-brief-box">
                <div className="intel-brief-tag">
                  <Sparkles size={13} aria-hidden="true" />
                  <span>Síntese Executiva IA</span>
                </div>
                <p className="intel-brief-text">
                  {intel?.executiveBrief ||
                    "Aguardando consolidação dos sinais em tempo real."}
                </p>

                {Array.isArray(intel?.keyHighlights) && intel.keyHighlights.length > 0 && (
                  <div className="intel-highlights-grid">
                    {intel.keyHighlights.slice(0, 3).map((hl, idx) => {
                      const dMeta = DOMAIN_BADGE[hl.domain] || DOMAIN_BADGE.society;
                      return (
                        <div key={idx} className="intel-highlight-item">
                          <span style={{ color: dMeta.color }}>{dMeta.label}</span>
                          <strong>{hl.title}</strong>
                          <p>{hl.detail}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Nearby seismic/natural alert banner for country */}
              {selectedCountry &&
                ((countryData?.nearbyQuakes?.length || 0) > 0 ||
                  (countryData?.nearbyNatural?.length || 0) > 0) && (
                  <div className="intel-hazard-strip">
                    <Flame size={14} aria-hidden="true" />
                    <span>
                      Sensores regionais:{" "}
                      {countryData.nearbyQuakes?.length > 0 &&
                        `${countryData.nearbyQuakes.length} sismo(s) M4.5+ na região `}
                      {countryData.nearbyNatural?.length > 0 &&
                        `· ${countryData.nearbyNatural.length} evento(s) natural(is) NASA ativo(s)`}
                    </span>
                  </div>
                )}

              <div className="intel-feed-header">
                <div className="intel-feed-label">
                  <Newspaper size={14} aria-hidden="true" />
                  <span>Acontecimentos Verificados ({filteredArticles.length})</span>
                </div>
                {domainFilter !== "all" && (
                  <button
                    type="button"
                    className="intel-clear-filter-btn"
                    onClick={() => setDomainFilter("all")}
                  >
                    Mostrar todos
                  </button>
                )}
              </div>

              <div className="intel-news-list">
                {filteredArticles.length === 0 ? (
                  <div className="intel-empty-feed">
                    Nenhuma notícia recente nesta categoria específica. Tente alternar o filtro acima.
                  </div>
                ) : (
                  filteredArticles.slice(0, 12).map((item, idx) => {
                    const badge = DOMAIN_BADGE[item.domain] || DOMAIN_BADGE.society;
                    return (
                      <a
                        key={`${item.url}-${idx}`}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="intel-news-card"
                      >
                        <div className="intel-news-meta">
                          <span className="intel-news-domain" style={{ color: badge.color }}>
                            {badge.label}
                          </span>
                          <span className="intel-news-source">{item.source}</span>
                          <span className="intel-news-time">
                            {formatRelativeTime(item.publishedAt)}
                          </span>
                        </div>
                        <div className="intel-news-title-row">
                          <strong>{item.title}</strong>
                          <ExternalLink size={13} className="intel-news-ext" aria-hidden="true" />
                        </div>
                      </a>
                    );
                  })
                )}
              </div>
            </>
          )}
        </aside>
      </section>

      {/* Charts & Strategic Predictions Deck */}
      <section className="world-analytics-grid" aria-label="Gráficos analíticos">
        <IntelRadarChart
          dimensions={intel?.dimensions}
          scopeLabel={scopeLabel}
        />

        <TelemetryAnalyticsCard
          mode={selectedCountry ? "country" : "global"}
          breakdown={intel?.breakdown || []}
          quakes={globalData?.quakes || []}
          macro={countryData?.macro || null}
          countryName={selectedCountry?.namePt || ""}
        />
      </section>

      <PredictionsDeck
        predictions={intel?.predictions || []}
        scopeLabel={scopeLabel}
        aiModel={intel?.aiModel}
      />
    </motion.main>
  );
}

export default WorldAnalysisView;
