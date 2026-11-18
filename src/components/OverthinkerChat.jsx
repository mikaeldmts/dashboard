import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, GitBranch, RotateCcw, Sparkles, X } from "lucide-react";
import { SPOKEN_LANGUAGES } from "../lib/constants.js";

const INITIAL_ASSISTANT_MESSAGE = {
  id: "overthinker-welcome",
  role: "assistant",
  content:
    "Olá! Eu sou o **Overthinker** — já analisei cada métrica deste dashboard e consulto a API do GitHub de **@mikaeldmts** em tempo real. Sobre o que vamos pensar hoje?",
  usedGithubTool: false
};

const QUICK_PROMPTS = [
  "Quais são os principais projetos do Mikael no GitHub?",
  "Como funcionam as Top Skills e este dashboard?",
  "Quais foram as últimas atividades no GitHub?",
  "Quais idiomas o Mikael fala?"
];

function renderInlineSegments(text, keyPrefix) {
  const pattern = /(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|\*\*[^*]+\*\*|`[^`]+`)/g;
  const parts = text.split(pattern);

  return parts.map((part, idx) => {
    if (!part) return null;
    const key = `${keyPrefix}-${idx}`;

    const linkMatch = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(part);
    if (linkMatch) {
      return (
        <a
          key={key}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="overthinker-md-link"
        >
          {linkMatch[1]}
        </a>
      );
    }

    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={key} className="overthinker-md-code">
          {part.slice(1, -1)}
        </code>
      );
    }

    return part;
  });
}

function FormattedMessage({ content }) {
  const lines = String(content || "").split("\n");
  const blocks = [];
  let currentList = [];

  const flushList = (idx) => {
    if (currentList.length > 0) {
      blocks.push(
        <ul key={`list-${idx}`} className="overthinker-md-list">
          {currentList.map((item, itemIdx) => (
            <li key={`li-${idx}-${itemIdx}`}>
              {renderInlineSegments(item, `li-${idx}-${itemIdx}`)}
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((rawLine, idx) => {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      flushList(idx);
      return;
    }

    const bulletMatch = /^[-*•]\s+(.+)$/.exec(trimmed);
    if (bulletMatch) {
      currentList.push(bulletMatch[1]);
      return;
    }

    flushList(idx);
    blocks.push(
      <p key={`p-${idx}`} className="overthinker-md-p">
        {renderInlineSegments(trimmed, `p-${idx}`)}
      </p>
    );
  });

  flushList(lines.length);
  return <div className="overthinker-md">{blocks}</div>;
}

function OverthinkerOrbIcon({ size = 34, isThinking = false }) {
  const uid = useId().replace(/:/g, "");
  const coreGradId = `ot-core-${uid}`;
  const ringGradA = `ot-ring-a-${uid}`;
  const ringGradB = `ot-ring-b-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={`overthinker-orb-svg${isThinking ? " thinking" : ""}`}
    >
      <defs>
        <radialGradient id={coreGradId} cx="38%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="45%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#10b981" />
        </radialGradient>
        <linearGradient id={ringGradA} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id={ringGradB} x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#38bdf8" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {/* Outer dashed cognitive halo */}
      <circle
        cx="24"
        cy="24"
        r="20"
        stroke="rgba(147, 197, 253, 0.28)"
        strokeWidth="1"
        strokeDasharray="3 4"
        className="ot-halo-ring"
      />

      {/* Tilted synaptic orbit A */}
      <g transform="rotate(-32 24 24)">
        <g className="ot-orbit-cw">
          <ellipse
            cx="24"
            cy="24"
            rx="17.5"
            ry="7.5"
            stroke={`url(#${ringGradA})`}
            strokeWidth="1.5"
          />
          <circle cx="41.5" cy="24" r="2.3" fill="#7dd3fc" />
        </g>
      </g>

      {/* Tilted synaptic orbit B */}
      <g transform="rotate(34 24 24)">
        <g className="ot-orbit-ccw">
          <ellipse
            cx="24"
            cy="24"
            rx="17.5"
            ry="7.5"
            stroke={`url(#${ringGradB})`}
            strokeWidth="1.5"
          />
          <circle cx="6.5" cy="24" r="2.1" fill="#34d399" />
        </g>
      </g>

      {/* Inner neural core */}
      <circle cx="24" cy="24" r="8.2" fill="rgba(56, 189, 248, 0.18)" className="ot-core-pulse" />
      <circle cx="24" cy="24" r="5.6" fill={`url(#${coreGradId})`} />
      <circle cx="22.2" cy="22" r="1.5" fill="#ffffff" fillOpacity="0.85" />
    </svg>
  );
}

export function OverthinkerChat({
  profile,
  skills,
  languages,
  totalLanguagesCount,
  syncedAt,
  statusText
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_ASSISTANT_MESSAGE]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [errorText, setErrorText] = useState("");

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const dashboardContext = useMemo(
    () => ({
      statusText: statusText || "Online",
      syncedAt: syncedAt || null,
      profile: profile
        ? {
            login: profile.login,
            name: profile.name,
            bio: profile.bio,
            public_repos: profile.public_repos,
            updated_at: profile.updated_at,
            html_url: profile.html_url
          }
        : null,
      topSkillsDisplayed: Array.isArray(skills)
        ? skills.map((s) => ({
            name: s.name,
            percentage: s.percentage,
            stars: s.stars,
            type: s.type,
            metric: s.metric
          }))
        : [],
      languageDonutBreakdown: {
        totalLanguagesCount: totalLanguagesCount ?? 0,
        slices: Array.isArray(languages)
          ? languages.map((l) => ({ name: l.name, percent: l.percent }))
          : []
      },
      spokenLanguages: SPOKEN_LANGUAGES
    }),
    [profile, skills, languages, totalLanguagesCount, syncedAt, statusText]
  );

  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 80);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleOutsideClick(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (
      isOpen &&
      messagesEndRef.current &&
      typeof messagesEndRef.current.scrollIntoView === "function"
    ) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, isThinking, isOpen]);

  async function sendQuestion(questionText) {
    const trimmed = String(questionText || "").trim();
    if (!trimmed || isThinking) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setErrorText("");
    setIsThinking(true);

    try {
      const apiHistory = nextMessages
        .filter((m) => m.id !== "overthinker-welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch("/api/overthinker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiHistory,
          dashboardContext
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || `Falha ao consultar o Overthinker (${response.status})`);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: payload.reply || "Sem resposta disponível no momento.",
          usedGithubTool: Boolean(payload.usedGithubTool)
        }
      ]);
    } catch (err) {
      setErrorText(err?.message || "Não foi possível conectar ao Overthinker agora.");
    } finally {
      setIsThinking(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendQuestion(input);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendQuestion(input);
    }
  }

  function handleReset() {
    if (isThinking) return;
    setMessages([INITIAL_ASSISTANT_MESSAGE]);
    setErrorText("");
    inputRef.current?.focus();
  }

  const hasUserMessages = messages.some((m) => m.role === "user");

  return (
    <div
      id="overthinker-container"
      className={isOpen ? "is-open" : ""}
      ref={containerRef}
    >
      {/* Chamativo orbital AI trigger button — pure visual magnetism, zero text CTA */}
      <motion.button
        id="overthinker-toggle"
        type="button"
        className={`overthinker-trigger${isOpen ? " active" : ""}`}
        aria-label={isOpen ? "Fechar assistente Overthinker" : "Abrir assistente IA Overthinker"}
        aria-expanded={isOpen}
        aria-controls="overthinker-panel"
        onClick={() => setIsOpen((prev) => !prev)}
        whileHover={{ scale: 1.08, y: -3 }}
        whileTap={{ scale: 0.94 }}
      >
        <span className="overthinker-aura" aria-hidden="true" />
        <span className="overthinker-conic-ring" aria-hidden="true" />
        <span className="overthinker-trigger-surface">
          <OverthinkerOrbIcon size={36} isThinking={isThinking} />
        </span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.section
            id="overthinker-panel"
            className="overthinker-panel"
            role="dialog"
            aria-label="Overthinker — Assistente IA do Dashboard"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <header className="overthinker-header">
              <div className="overthinker-brand">
                <div className="overthinker-header-orb">
                  <OverthinkerOrbIcon size={26} isThinking={isThinking} />
                </div>
                <div className="overthinker-title-wrap">
                  <div className="overthinker-title-row">
                    <h3>Overthinker</h3>
                    <span className="overthinker-chip">
                      <Sparkles size={10} aria-hidden="true" />
                      AI · GitHub Live
                    </span>
                  </div>
                  <p>Analista neural do portfólio & API GitHub</p>
                </div>
              </div>

              <div className="overthinker-header-actions">
                {hasUserMessages && (
                  <button
                    type="button"
                    className="overthinker-icon-btn"
                    onClick={handleReset}
                    title="Reiniciar conversa"
                    aria-label="Reiniciar conversa"
                  >
                    <RotateCcw size={14} aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  className="overthinker-icon-btn"
                  onClick={() => setIsOpen(false)}
                  title="Fechar"
                  aria-label="Fechar Overthinker"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            </header>

            <div className="overthinker-messages" aria-live="polite">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  className={`overthinker-msg ${msg.role}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {msg.role === "assistant" ? (
                    <FormattedMessage content={msg.content} />
                  ) : (
                    <p className="overthinker-md-p">{msg.content}</p>
                  )}

                  {msg.usedGithubTool && (
                    <span className="overthinker-tool-badge">
                      <GitBranch size={11} aria-hidden="true" />
                      Repositório consultado ao vivo na API do GitHub
                    </span>
                  )}
                </motion.div>
              ))}

              {!hasUserMessages && !isThinking && (
                <div className="overthinker-suggestions">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="overthinker-suggestion-chip"
                      onClick={() => sendQuestion(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              {isThinking && (
                <motion.div
                  className="overthinker-thinking"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <span className="overthinker-thinking-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  <span>Overthinking dados do dashboard & GitHub...</span>
                </motion.div>
              )}

              {errorText && (
                <div className="overthinker-error" role="alert">
                  {errorText}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <form className="overthinker-input-bar" onSubmit={handleSubmit}>
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte sobre projetos, skills ou o GitHub..."
                maxLength={800}
                disabled={isThinking}
                aria-label="Mensagem para o Overthinker"
              />
              <button
                type="submit"
                className="overthinker-send-btn"
                disabled={isThinking || !input.trim()}
                aria-label="Enviar pergunta"
              >
                <ArrowUp size={16} aria-hidden="true" />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

export default OverthinkerChat;
