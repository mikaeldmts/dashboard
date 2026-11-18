import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";

function GitHubMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
    </svg>
  );
}

export function Topbar({
  statusText = "Conectando...",
  statusVariant = "connecting",
  isLoading = false,
  isRateLimited = false,
  onRefresh
}) {
  const isHealthy = statusVariant === "online" || statusVariant === "cache";
  const isBusy = isLoading || statusVariant === "updating" || statusVariant === "connecting";

  const refreshLabel = isRateLimited
    ? "Atualização bloqueada temporariamente por rate limit da API"
    : isBusy
      ? "Sincronizando dados do GitHub..."
      : "Atualizar dados do GitHub";

  return (
    <motion.header
      className="topbar"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="topbar-inner">
        <div className="brand">
          <motion.div
            className="brand-icon"
            whileHover={{ scale: 1.06, rotate: 4 }}
            transition={{ type: "spring", stiffness: 320, damping: 20 }}
          >
            <GitHubMark />
          </motion.div>
          <div className="brand-meta">
            <span className="brand-kicker">Realtime Dashboard</span>
            <span className="brand-title">GitHub Intelligence</span>
          </div>
        </div>

        <div className="topbar-actions">
          <div className="status-chip" role="status" aria-live="polite">
            <motion.span
              className={`status-dot ${statusVariant}`}
              animate={
                isHealthy || isBusy
                  ? {
                      scale: [1, 1.35, 1],
                      opacity: [1, 0.55, 1]
                    }
                  : { scale: 1, opacity: 1 }
              }
              transition={
                isHealthy || isBusy
                  ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
                  : { duration: 0.2 }
              }
            />
            <strong id="status">{statusText}</strong>
          </div>

          {typeof onRefresh === "function" && (
            <motion.button
              type="button"
              className="refresh-btn"
              onClick={onRefresh}
              disabled={isBusy || isRateLimited}
              aria-label={refreshLabel}
              title={refreshLabel}
              whileHover={!isBusy && !isRateLimited ? { scale: 1.06 } : undefined}
              whileTap={!isBusy && !isRateLimited ? { scale: 0.94 } : undefined}
            >
              <motion.span
                style={{ display: "inline-flex" }}
                animate={isBusy ? { rotate: 360 } : { rotate: 0 }}
                transition={
                  isBusy
                    ? { duration: 1, repeat: Infinity, ease: "linear" }
                    : { duration: 0.2 }
                }
              >
                <RefreshCw size={14} aria-hidden="true" />
              </motion.span>
            </motion.button>
          )}
        </div>
      </div>
    </motion.header>
  );
}

export default Topbar;
