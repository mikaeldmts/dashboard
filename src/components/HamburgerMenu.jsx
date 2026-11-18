import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Compass, Globe2, Sparkles, Terminal, X } from "lucide-react";

const MENU_ITEMS = [
  {
    id: "world",
    title: "Realtime World Analysis",
    badge: "PRINCIPAL",
    subtitle: "Globo 3D interativo, acontecimentos globais ao vivo, gráficos e previsões IA",
    Icon: Globe2
  },
  {
    id: "github",
    title: "GitHub Dashboard",
    badge: "ENGENHARIA",
    subtitle: "Telemetria de perfil, distribuição de linguagens, idiomas e proficiência",
    Icon: Terminal
  }
];

export function HamburgerMenu({ activeView, onSelectView }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  function handlePick(viewId) {
    setIsOpen(false);
    if (typeof onSelectView === "function") {
      onSelectView(viewId);
    }
  }

  return (
    <>
      <button
        id="hamburger-menu-btn"
        type="button"
        className={`hamburger-trigger ${isOpen ? "is-open" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
        aria-expanded={isOpen}
        aria-controls="main-navigation-drawer"
      >
        <span className="hamburger-bars" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <div className="nav-drawer-root" role="dialog" aria-modal="true" aria-label="Menu principal">
                <motion.div
                  className="nav-drawer-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setIsOpen(false)}
                />

                <motion.aside
                  id="main-navigation-drawer"
                  className="nav-drawer-panel"
                  initial={{ x: "-100%", opacity: 0.6 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "-100%", opacity: 0.6 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="nav-drawer-header">
                    <div>
                      <span className="nav-drawer-kicker">NAVEGAÇÃO DO SISTEMA</span>
                      <strong className="nav-drawer-title">Mikael · Intelligence Suite</strong>
                    </div>
                    <button
                      type="button"
                      className="nav-drawer-close"
                      onClick={() => setIsOpen(false)}
                      aria-label="Fechar menu"
                    >
                      <X size={17} aria-hidden="true" />
                    </button>
                  </div>

                  <nav className="nav-drawer-list" aria-label="Ambientes do dashboard">
                    {MENU_ITEMS.map(({ id, title, badge, subtitle, Icon }) => {
                      const isActive = activeView === id;
                      return (
                        <button
                          key={id}
                          id={`nav-option-${id}`}
                          type="button"
                          className={`nav-drawer-item ${isActive ? "active" : ""}`}
                          onClick={() => handlePick(id)}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <div className="nav-drawer-item-icon">
                            <Icon size={19} aria-hidden="true" />
                          </div>
                          <div className="nav-drawer-item-body">
                            <div className="nav-drawer-item-top">
                              <strong>{title}</strong>
                              <span className="nav-drawer-badge">{badge}</span>
                            </div>
                            <p>{subtitle}</p>
                          </div>
                          {isActive && (
                            <span className="nav-drawer-check" aria-hidden="true">
                              <Check size={15} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </nav>

                  <div className="nav-drawer-footer">
                    <button
                      id="nav-option-welcome"
                      type="button"
                      className="nav-drawer-welcome-btn"
                      onClick={() => handlePick("welcome")}
                    >
                      <Compass size={15} aria-hidden="true" />
                      <span>Voltar à página de boas-vindas</span>
                    </button>
                    <div className="nav-drawer-footnote">
                      <Sparkles size={12} aria-hidden="true" />
                      <span>Dados globais &amp; IA sincronizados em tempo real</span>
                    </div>
                  </div>
                </motion.aside>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}

export default HamburgerMenu;
