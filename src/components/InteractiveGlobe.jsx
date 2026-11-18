import { useEffect, useMemo, useRef, useState } from "react";
import {
  geoArea,
  geoCentroid,
  geoContains,
  geoDistance,
  geoGraticule10,
  geoOrthographic,
  geoPath
} from "d3-geo";
import { feature as topoFeature, mesh as topoMesh } from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";
import { Pause, Play, RotateCcw } from "lucide-react";
import {
  getCountryByIso,
  resolveCountryFromFeature,
  STRATEGIC_COUNTRY_COORDS
} from "../data/countryCatalog.js";

const DOMAIN_COLORS = {
  conflict: "#f87171",
  tech: "#38bdf8",
  economy: "#fbbf24",
  climate: "#34d399",
  society: "#93c5fd"
};

function clampLat(lat) {
  return Math.max(-72, Math.min(72, lat));
}

function normalizeLonDelta(delta) {
  let d = delta;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

export function InteractiveGlobe({
  selectedCountry,
  onSelectCountry,
  hotspots = [],
  quakes = [],
  eonet = [],
  activeDomainFilter = "all"
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [autoRotate, setAutoRotate] = useState(true);

  // Mutable animation state for 60fps loop without React re-renders
  const rotationRef = useRef([28, -14, 0]); // Initial view showing Atlantic / Americas / Europe / Africa
  const targetRotationRef = useRef(null);
  const dragStateRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startRot: [28, -14, 0],
    moved: false
  });
  const hoveredIdRef = useRef(null);
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;

  const selectedRef = useRef(selectedCountry);
  selectedRef.current = selectedCountry;

  const dataOverlayRef = useRef({ hotspots, quakes, eonet, activeDomainFilter });
  dataOverlayRef.current = { hotspots, quakes, eonet, activeDomainFilter };

  // Precompute world geometries once
  const worldGeo = useMemo(() => {
    const fc = topoFeature(worldAtlas, worldAtlas.objects.countries);
    const borders = topoMesh(worldAtlas, worldAtlas.objects.countries, (a, b) => a !== b);
    const graticule = geoGraticule10();

    const enrichedFeatures = fc.features
      .map((feat) => {
        const meta = resolveCountryFromFeature(feat);
        if (!meta || meta.iso2 === "AQ") return null;
        const strategic = meta.iso2 ? STRATEGIC_COUNTRY_COORDS[meta.iso2] : null;
        const rawCentroid = geoCentroid(feat);
        const centroid =
          strategic ||
          (Array.isArray(rawCentroid) && !Number.isNaN(rawCentroid[0]) ? rawCentroid : [0, 0]);
        const area = geoArea(feat);
        return {
          feature: feat,
          meta: {
            ...meta,
            lon: Number(centroid[0].toFixed(2)),
            lat: Number(centroid[1].toFixed(2))
          },
          area
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.area - b.area); // Smallest polygons tested first for enclaves

    const byIso2 = new Map();
    for (const item of enrichedFeatures) {
      if (item.meta.iso2) byIso2.set(item.meta.iso2, item);
    }

    return { enrichedFeatures, borders, graticule, byIso2 };
  }, []);

  // Fly smoothly to selectedCountry when it changes
  useEffect(() => {
    if (!selectedCountry) return;
    let lon = selectedCountry.lon;
    let lat = selectedCountry.lat;

    if ((lon == null || lat == null) && selectedCountry.iso2) {
      const found = worldGeo.byIso2.get(selectedCountry.iso2);
      if (found) {
        lon = found.meta.lon;
        lat = found.meta.lat;
      } else if (STRATEGIC_COUNTRY_COORDS[selectedCountry.iso2]) {
        [lon, lat] = STRATEGIC_COUNTRY_COORDS[selectedCountry.iso2];
      }
    }

    if (typeof lon === "number" && typeof lat === "number") {
      targetRotationRef.current = [-lon, clampLat(-lat), 0];
    }
  }, [selectedCountry, worldGeo]);

  // Hit test screen [x, y] -> country meta
  const hitTestCountry = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const width = rect.width;
    const height = rect.height;
    const radius = Math.min(width, height) * 0.445;
    const cx = width / 2;
    const cy = height / 2;

    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy > radius * radius) {
      return null;
    }

    const projection = geoOrthographic()
      .translate([cx, cy])
      .scale(radius)
      .rotate(rotationRef.current)
      .clipAngle(90);

    const coords = projection.invert([x, y]);
    if (!coords || Number.isNaN(coords[0]) || Number.isNaN(coords[1])) {
      return null;
    }

    for (const item of worldGeo.enrichedFeatures) {
      if (geoContains(item.feature, coords)) {
        return item.meta;
      }
    }

    // Gentle proximity fallback (<= 2.6 deg) for small islands / narrow territories
    let closest = null;
    let minRad = 0.045;
    for (const item of worldGeo.enrichedFeatures) {
      const dist = geoDistance(coords, [item.meta.lon, item.meta.lat]);
      if (dist < minRad) {
        minRad = dist;
        closest = item.meta;
      }
    }
    return closest;
  };

  // Main 60fps Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    let rafId = 0;
    let lastTs = performance.now();

    const renderFrame = (now) => {
      const dt = Math.min(48, now - lastTs);
      lastTs = now;

      // Update camera rotation
      if (!dragStateRef.current.active) {
        if (targetRotationRef.current) {
          const [curLon, curLat] = rotationRef.current;
          const [tgtLon, tgtLat] = targetRotationRef.current;
          const dLon = normalizeLonDelta(tgtLon - curLon);
          const dLat = tgtLat - curLat;

          if (Math.abs(dLon) < 0.15 && Math.abs(dLat) < 0.15) {
            rotationRef.current = [tgtLon, tgtLat, 0];
            targetRotationRef.current = null;
          } else {
            const ease = 1 - Math.pow(0.88, dt / 16.67);
            rotationRef.current = [curLon + dLon * ease, clampLat(curLat + dLat * ease), 0];
          }
        } else if (autoRotateRef.current && !selectedRef.current) {
          rotationRef.current = [
            ((rotationRef.current[0] + dt * 0.0045 + 180) % 360) - 180,
            rotationRef.current[1],
            0
          ];
        }
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = container.clientWidth || 520;
      const height = container.clientHeight || 520;
      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.445;

      const projection = geoOrthographic()
        .translate([cx, cy])
        .scale(radius)
        .rotate(rotationRef.current)
        .clipAngle(90);

      const path = geoPath(projection, ctx);

      // 1. Outer atmospheric scatter halo
      const outerHalo = ctx.createRadialGradient(cx, cy, radius * 0.88, cx, cy, radius * 1.16);
      outerHalo.addColorStop(0, "rgba(56, 189, 248, 0.18)");
      outerHalo.addColorStop(0.55, "rgba(96, 165, 250, 0.06)");
      outerHalo.addColorStop(1, "rgba(6, 8, 15, 0)");
      ctx.fillStyle = outerHalo;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.16, 0, Math.PI * 2);
      ctx.fill();

      // 2. Deep ocean sphere
      const oceanGrad = ctx.createRadialGradient(
        cx - radius * 0.3,
        cy - radius * 0.32,
        radius * 0.06,
        cx,
        cy,
        radius
      );
      oceanGrad.addColorStop(0, "#10203a");
      oceanGrad.addColorStop(0.52, "#081224");
      oceanGrad.addColorStop(1, "#040812");
      ctx.fillStyle = oceanGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // 3. Graticule meridians & parallels
      ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      path(worldGeo.graticule);
      ctx.stroke();

      // Build quick map of hotspot intensities for subtle country fill tinting
      const {
        hotspots: liveHotspots,
        quakes: liveQuakes,
        eonet: liveEonet,
        activeDomainFilter: filter
      } = dataOverlayRef.current;

      const hotspotByIso = new Map();
      for (const h of liveHotspots) {
        if (filter !== "all" && h.domain !== filter) continue;
        hotspotByIso.set(h.iso2, h);
      }

      const activeSelectedIso = selectedRef.current?.iso2;
      const activeSelectedId = selectedRef.current?.id;
      const activeHoveredId = hoveredIdRef.current;

      // 4. Country polygons
      for (const item of worldGeo.enrichedFeatures) {
        const isSelected =
          (activeSelectedIso && item.meta.iso2 === activeSelectedIso) ||
          (activeSelectedId && item.meta.id === activeSelectedId);
        const isHovered = activeHoveredId && item.meta.id === activeHoveredId;
        const hotspot = item.meta.iso2 ? hotspotByIso.get(item.meta.iso2) : null;

        ctx.beginPath();
        path(item.feature);

        if (isSelected) {
          ctx.fillStyle = "rgba(56, 189, 248, 0.42)";
        } else if (isHovered) {
          ctx.fillStyle = "rgba(96, 165, 250, 0.28)";
        } else if (hotspot) {
          ctx.fillStyle =
            hotspot.domain === "conflict"
              ? "rgba(248, 113, 113, 0.19)"
              : hotspot.domain === "tech"
                ? "rgba(56, 189, 248, 0.17)"
                : "rgba(30, 49, 78, 0.92)";
        } else {
          ctx.fillStyle = "rgba(21, 34, 56, 0.92)";
        }
        ctx.fill();

        if (isSelected || isHovered) {
          ctx.strokeStyle = isSelected ? "#7dd3fc" : "rgba(147, 197, 253, 0.75)";
          ctx.lineWidth = isSelected ? 1.5 : 1.1;
          ctx.stroke();
        }
      }

      // 5. Internal country borders mesh
      ctx.strokeStyle = "rgba(148, 163, 184, 0.22)";
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      path(worldGeo.borders);
      ctx.stroke();

      // Visible center in [lon, lat] for hemisphere culling
      const viewCenter = [-rotationRef.current[0], -rotationRef.current[1]];
      const isVisibleOnFront = (lon, lat) =>
        geoDistance([lon, lat], viewCenter) < Math.PI / 2 - 0.04;

      // 6. Live NASA EONET natural markers
      if (filter === "all" || filter === "climate") {
        for (const ev of liveEonet.slice(0, 14)) {
          if (!isVisibleOnFront(ev.lon, ev.lat)) continue;
          const pt = projection([ev.lon, ev.lat]);
          if (!pt) continue;
          ctx.fillStyle = "rgba(52, 211, 153, 0.85)";
          ctx.beginPath();
          ctx.arc(pt[0], pt[1], 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 7. Live USGS Earthquakes M4.5+ (24h)
      if (filter === "all" || filter === "climate") {
        for (let i = 0; i < Math.min(liveQuakes.length, 18); i += 1) {
          const q = liveQuakes[i];
          if (!isVisibleOnFront(q.lon, q.lat)) continue;
          const pt = projection([q.lon, q.lat]);
          if (!pt) continue;

          const wave = ((now * 0.0012 + i * 0.21) % 1);
          const maxR = Math.max(7, (q.mag - 3.8) * 6.5);
          ctx.strokeStyle = q.mag >= 5.5 ? "rgba(248, 113, 113, 0.7)" : "rgba(251, 191, 36, 0.65)";
          ctx.globalAlpha = (1 - wave) * 0.75;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.arc(pt[0], pt[1], 2.5 + wave * maxR, 0, Math.PI * 2);
          ctx.stroke();

          ctx.globalAlpha = 0.92;
          ctx.fillStyle = q.mag >= 5.5 ? "#f87171" : "#fbbf24";
          ctx.beginPath();
          ctx.arc(pt[0], pt[1], q.mag >= 5.5 ? 3.1 : 2.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // 8. Global News Hotspots beacons
      for (let i = 0; i < liveHotspots.length; i += 1) {
        const h = liveHotspots[i];
        if (filter !== "all" && h.domain !== filter) continue;
        if (!isVisibleOnFront(h.lon, h.lat)) continue;
        const pt = projection([h.lon, h.lat]);
        if (!pt) continue;

        const color = DOMAIN_COLORS[h.domain] || "#60a5fa";
        const pulse = ((now * 0.0015 + i * 0.29) % 1);

        ctx.strokeStyle = color;
        ctx.globalAlpha = (1 - pulse) * 0.85;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 4 + pulse * 15, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 3.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 1.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // 9. Target Reticle on Selected Country
      if (selectedRef.current) {
        const sel = selectedRef.current;
        const fallbackMeta = sel.iso2 ? worldGeo.byIso2.get(sel.iso2)?.meta : null;
        const lon = sel.lon ?? fallbackMeta?.lon;
        const lat = sel.lat ?? fallbackMeta?.lat;
        if (typeof lon === "number" && typeof lat === "number" && isVisibleOnFront(lon, lat)) {
          const pt = projection([lon, lat]);
          if (pt) {
            const [px, py] = pt;
            const ringR = 12 + Math.sin(now * 0.005) * 2;
            ctx.strokeStyle = "#7dd3fc";
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(px, py, ringR, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = "#38bdf8";
            ctx.beginPath();
            ctx.arc(px, py, 3.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 10. Crisp planetary rim stroke
      ctx.strokeStyle = "rgba(125, 211, 252, 0.34)";
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
      rafId = window.requestAnimationFrame(renderFrame);
    };

    rafId = window.requestAnimationFrame(renderFrame);
    return () => window.cancelAnimationFrame(rafId);
  }, [worldGeo]);

  // Pointer interaction handlers (drag to rotate + click to select country)
  const handlePointerDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    targetRotationRef.current = null;
    dragStateRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startRot: [...rotationRef.current],
      moved: false
    };
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic events
    }
  };

  const handlePointerMove = (e) => {
    const drag = dragStateRef.current;
    if (drag.active && drag.pointerId === e.pointerId) {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (Math.hypot(dx, dy) > 5) {
        drag.moved = true;
      }
      const sensitivity = 0.32;
      rotationRef.current = [
        drag.startRot[0] + dx * sensitivity,
        clampLat(drag.startRot[1] - dy * sensitivity),
        0
      ];
      return;
    }

    // Hover hit-test on fine pointers
    if (e.pointerType === "mouse") {
      const hit = hitTestCountry(e.clientX, e.clientY);
      hoveredIdRef.current = hit?.id || null;
      setHoveredCountry((prev) => (prev?.id === hit?.id ? prev : hit));
    }
  };

  const handlePointerUp = (e) => {
    const drag = dragStateRef.current;
    if (!drag.active || drag.pointerId !== e.pointerId) return;
    drag.active = false;

    if (!drag.moved) {
      const hit = hitTestCountry(e.clientX, e.clientY);
      if (hit && typeof onSelectCountry === "function") {
        onSelectCountry(hit);
      }
    }
  };

  const handlePointerLeave = () => {
    hoveredIdRef.current = null;
    setHoveredCountry(null);
  };

  const handleResetGlobe = () => {
    targetRotationRef.current = [28, -14, 0];
    if (selectedCountry && typeof onSelectCountry === "function") {
      onSelectCountry(null);
    }
  };

  return (
    <div className="globe-card">
      <div className="globe-topbar">
        <div>
          <span className="globe-kicker">SENSORES PLANETÁRIOS 3D</span>
          <h2 className="globe-title">Globo Interativo em Tempo Real</h2>
        </div>

        <div className="globe-controls">
          <button
            type="button"
            className="globe-ctrl-btn"
            onClick={() => setAutoRotate((v) => !v)}
            title={autoRotate ? "Pausar rotação automática" : "Ativar rotação automática"}
            aria-label={autoRotate ? "Pausar rotação automática" : "Ativar rotação automática"}
          >
            {autoRotate ? <Pause size={14} /> : <Play size={14} />}
            <span>{autoRotate ? "Pausar giro" : "Girar"}</span>
          </button>

          <button
            type="button"
            className="globe-ctrl-btn"
            onClick={handleResetGlobe}
            title="Centralizar visão global"
            aria-label="Centralizar visão global"
          >
            <RotateCcw size={14} />
            <span>Global</span>
          </button>
        </div>
      </div>

      <div ref={containerRef} className="globe-canvas-stage">
        <canvas
          ref={canvasRef}
          id="interactive-world-globe"
          className={`globe-canvas ${hoveredCountry ? "is-hovering-country" : ""}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          aria-label="Globo mundial interativo. Arraste para girar e clique em um país para analisar acontecimentos em tempo real."
        />

        {/* Floating Country Readout HUD */}
        <div className="globe-hud-bottom">
          {hoveredCountry ? (
            <div className="globe-hover-pill">
              <span className="globe-flag">{hoveredCountry.flag}</span>
              <div>
                <strong>{hoveredCountry.namePt}</strong>
                <span>{hoveredCountry.region} · Clique para analisar ao vivo</span>
              </div>
            </div>
          ) : selectedCountry ? (
            <div className="globe-hover-pill is-selected">
              <span className="globe-flag">{selectedCountry.flag}</span>
              <div>
                <strong>{selectedCountry.namePt}</strong>
                <span>
                  {selectedCountry.region} · Inspecionando país em tempo real
                </span>
              </div>
            </div>
          ) : (
            <div className="globe-hint-pill">
              Arraste o globo em 360° e toque em qualquer país para abrir o dossiê ao vivo
            </div>
          )}
        </div>
      </div>

      {/* Legend + Quick Active Hotspots */}
      <div className="globe-footer">
        <div className="globe-legend" aria-label="Legenda de sinais no globo">
          <span>
            <i style={{ background: "#f87171" }} /> Conflitos
          </span>
          <span>
            <i style={{ background: "#38bdf8" }} /> Tecnologia/IA
          </span>
          <span>
            <i style={{ background: "#fbbf24" }} /> Economia / Sismos
          </span>
          <span>
            <i style={{ background: "#34d399" }} /> Clima (NASA)
          </span>
        </div>

        {hotspots.length > 0 && (
          <div className="globe-hotspots-strip" aria-label="Focos globais em destaque">
            {hotspots.slice(0, 6).map((h) => {
              const countryMeta = getCountryByIso(h.iso2);
              if (!countryMeta) return null;
              const isSelected = selectedCountry?.iso2 === h.iso2;
              return (
                <button
                  key={h.iso2}
                  type="button"
                  className={`hotspot-chip ${isSelected ? "active" : ""}`}
                  onClick={() =>
                    onSelectCountry({
                      ...countryMeta,
                      lon: h.lon,
                      lat: h.lat
                    })
                  }
                >
                  <span>{countryMeta.flag}</span>
                  <span>{countryMeta.namePt}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default InteractiveGlobe;
