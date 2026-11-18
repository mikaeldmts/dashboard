import { useEffect, useRef, useState } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import { GitBranch, History, PieChart, Zap } from "lucide-react";
import { formatDate } from "../lib/github.js";

function parseNumericValue(value) {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function AnimatedCounter({ value }) {
  const shouldReduceMotion = useReducedMotion();
  const numericTarget = parseNumericValue(value);
  const [displayValue, setDisplayValue] = useState(numericTarget ?? "-");
  const prevValueRef = useRef(0);

  useEffect(() => {
    if (numericTarget === null) {
      prevValueRef.current = 0;
      setDisplayValue("-");
      return undefined;
    }

    if (shouldReduceMotion) {
      prevValueRef.current = numericTarget;
      setDisplayValue(numericTarget);
      return undefined;
    }

    const fromValue = Number.isFinite(prevValueRef.current) ? prevValueRef.current : 0;
    if (fromValue === numericTarget) {
      setDisplayValue(numericTarget);
      return undefined;
    }

    const controls = animate(fromValue, numericTarget, {
      duration: 0.75,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        const rounded = Math.round(latest);
        prevValueRef.current = rounded;
        setDisplayValue(rounded);
      },
      onComplete: () => {
        prevValueRef.current = numericTarget;
        setDisplayValue(numericTarget);
      }
    });

    return () => controls.stop();
  }, [numericTarget, shouldReduceMotion]);

  if (numericTarget === null) {
    return <>-</>;
  }

  return <>{shouldReduceMotion ? String(numericTarget) : String(displayValue === "-" ? 0 : displayValue)}</>;
}

const tileContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07
    }
  }
};

const tileVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] }
  }
};

export function TelemetryCard({ profile, syncedAt = "-", variants }) {
  const publicReposCount = profile ? (profile.public_repos ?? 0) : null;
  const githubUpdated = profile?.updated_at ? formatDate(profile.updated_at) : "-";

  return (
    <motion.section className="card telemetry-card" variants={variants}>
      <div className="section-head">
        <div className="section-title-group">
          <PieChart size={16} className="section-icon" aria-hidden="true" />
          <h2>Telemetria &amp; Sync</h2>
        </div>
        <p className="section-note">API v3</p>
      </div>

      <motion.div className="telemetry-grid" variants={tileContainerVariants}>
        <motion.article
          className="stat-tile"
          variants={tileVariants}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <div className="stat-info">
            <p className="label">Repositórios Públicos</p>
            <p id="repos" className="value">
              <AnimatedCounter value={publicReposCount} />
            </p>
          </div>
          <div className="stat-icon">
            <GitBranch size={16} aria-hidden="true" />
          </div>
        </motion.article>

        <motion.article
          className="stat-tile"
          variants={tileVariants}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <div className="stat-info">
            <p className="label">Último Update no GitHub</p>
            <p id="githubUpdated" className="value small">
              {githubUpdated}
            </p>
          </div>
          <div className="stat-icon">
            <History size={16} aria-hidden="true" />
          </div>
        </motion.article>

        <motion.article
          className="stat-tile"
          variants={tileVariants}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <div className="stat-info">
            <p className="label">Última Sincronização Local</p>
            <p id="syncedAt" className="value small">
              {syncedAt || "-"}
            </p>
          </div>
          <div className="stat-icon">
            <Zap size={16} aria-hidden="true" />
          </div>
        </motion.article>
      </motion.div>
    </motion.section>
  );
}

export default TelemetryCard;
