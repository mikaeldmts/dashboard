import { useState } from "react";
import { motion } from "framer-motion";
import { PieChart } from "lucide-react";
import { formatBytes } from "../lib/github.js";

const SVG_SIZE = 160;
const STROKE_WIDTH = 24;
const RADIUS = (SVG_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CENTER = SVG_SIZE / 2;

export function DonutChart({
  slices = [],
  totalLanguages = 0,
  totalBytes = 0,
  chartNote = "Carregando...",
  variants
}) {
  const [activeIndex, setActiveIndex] = useState(null);

  const hasData = slices.length > 0 && totalLanguages > 0;
  const activeSlice = activeIndex !== null && slices[activeIndex] ? slices[activeIndex] : null;
  const dominantSlice = slices[0] || null;
  const centerSlice = activeSlice || dominantSlice;

  // Apply gap only when >1 slice has visible >0% arc, preventing phantom notches on 100%+0% rings
  const visibleSlicesCount = slices.filter((slice) => slice.percent > 0).length;
  const gapPx = visibleSlicesCount > 1 ? 2.5 : 0;

  let cumulativeOffset = 0;
  const segments = slices.map((slice, index) => {
    const rawDash = slice.percent > 0 ? (slice.percent / 100) * CIRCUMFERENCE : 0;
    const visibleDash =
      rawDash <= 0 ? 0 : rawDash > gapPx ? rawDash - gapPx : rawDash * 0.85;
    const dashGap = Math.max(CIRCUMFERENCE - visibleDash, 0);
    const offset = -cumulativeOffset;
    cumulativeOffset += rawDash;

    return {
      ...slice,
      index,
      visibleDash,
      dashGap,
      offset
    };
  });

  return (
    <motion.section className="card chart-card" variants={variants}>
      <div className="section-head">
        <div className="section-title-group">
          <PieChart size={16} className="section-icon" aria-hidden="true" />
          <h2>Linguagens</h2>
        </div>
        <p id="chartNote" className="section-note">
          {chartNote}
        </p>
      </div>

      <div className="chart-wrap">
        <div id="langDonut" className="donut-container">
          {hasData ? (
            <>
              <svg
                className="donut-svg"
                width={SVG_SIZE}
                height={SVG_SIZE}
                viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
                role="img"
                aria-label={`Distribuição de linguagens: ${slices
                  .map((s) => `${s.name} ${s.percent}%`)
                  .join(", ")}`}
              >
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  fill="none"
                  stroke="rgba(130, 150, 180, 0.08)"
                  strokeWidth={STROKE_WIDTH}
                />

                {segments.map((seg) => {
                  const isActive = activeIndex === seg.index;
                  const isDimmed = activeIndex !== null && !isActive;
                  const isVisible = seg.visibleDash > 0;

                  return (
                    <motion.circle
                      key={seg.name}
                      cx={CENTER}
                      cy={CENTER}
                      r={RADIUS}
                      fill="none"
                      stroke={seg.color}
                      strokeLinecap={visibleSlicesCount === 1 && isVisible ? "round" : "butt"}
                      strokeDashoffset={seg.offset}
                      initial={{
                        strokeDasharray: `0 ${CIRCUMFERENCE}`,
                        strokeWidth: isVisible ? STROKE_WIDTH : 0,
                        opacity: 0
                      }}
                      animate={{
                        strokeDasharray: `${seg.visibleDash} ${seg.dashGap}`,
                        strokeWidth: isVisible ? (isActive ? STROKE_WIDTH + 4 : STROKE_WIDTH) : 0,
                        opacity: isVisible ? (isDimmed ? 0.35 : 1) : 0
                      }}
                      transition={{
                        strokeDasharray: {
                          type: "spring",
                          stiffness: 90,
                          damping: 18,
                          delay: seg.index * 0.07
                        },
                        strokeWidth: { duration: 0.18 },
                        opacity: { duration: 0.2 }
                      }}
                      style={{
                        cursor: isVisible ? "pointer" : "default",
                        pointerEvents: isVisible ? "auto" : "none",
                        filter: isActive && isVisible ? `drop-shadow(0 0 8px ${seg.color}66)` : "none"
                      }}
                      onMouseEnter={() => isVisible && setActiveIndex(seg.index)}
                      onMouseLeave={() => isVisible && setActiveIndex(null)}
                    />
                  );
                })}
              </svg>

              <div className="donut-center-readout" aria-live="polite">
                {centerSlice && (
                  <motion.div
                    key={`${centerSlice.name}-${activeSlice ? "active" : "top"}`}
                    initial={{ opacity: 0.7, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.12 }}
                  >
                    <div
                      className="donut-center-percent"
                      style={{ color: activeSlice ? activeSlice.color : undefined }}
                    >
                      {activeSlice ? `${activeSlice.percent}%` : `${totalLanguages}`}
                    </div>
                    <div className="donut-center-name">
                      {activeSlice ? activeSlice.name : "Linguagens"}
                    </div>
                    <div className="donut-center-meta">
                      {activeSlice ? formatBytes(activeSlice.bytes) : formatBytes(totalBytes)}
                    </div>
                  </motion.div>
                )}
              </div>
            </>
          ) : (
            <p className="donut-empty">Sem dados</p>
          )}
        </div>

        <div id="langLegend" className="donut-legend">
          {slices.map((slice, index) => {
            const isActive = activeIndex === index;
            const isDimmed = activeIndex !== null && !isActive;

            return (
              <motion.button
                key={slice.name}
                type="button"
                className={`legend-item${isActive ? " active" : ""}${isDimmed ? " dimmed" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                whileHover={{ x: 2 }}
                transition={{ duration: 0.16 }}
              >
                <span className="legend-dot" style={{ background: slice.color }} />
                <span className="legend-label">{slice.name}</span>
                <span className="legend-value">{slice.percent}%</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}

export default DonutChart;
