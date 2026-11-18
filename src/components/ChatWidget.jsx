import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, MessageSquare, Send, X } from "lucide-react";
import { CHAT_STORAGE_KEYS } from "../lib/constants.js";
import { sendVisitorMessage, subscribeVisitorMessages } from "../lib/firebase.js";
import { safeStorageGet, safeStorageSet } from "../lib/github.js";

const MAX_MESSAGE_LENGTH = 500;

function readSeenAdminIds() {
  const raw = safeStorageGet(CHAT_STORAGE_KEYS.seenAdminIds);
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((id) => typeof id === "string")) : new Set();
  } catch {
    return new Set();
  }
}

function persistSeenAdminIds(idSet) {
  safeStorageSet(CHAT_STORAGE_KEYS.seenAdminIds, JSON.stringify(Array.from(idSet)));
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [savedName, setSavedName] = useState(
    () => (safeStorageGet(CHAT_STORAGE_KEYS.chatName) || "").trim()
  );
  const [hasSubmitted, setHasSubmitted] = useState(() => {
    const submitted = safeStorageGet(CHAT_STORAGE_KEYS.submitted) === "1";
    const storedName = (safeStorageGet(CHAT_STORAGE_KEYS.chatName) || "").trim();
    return submitted && Boolean(storedName);
  });
  const [messages, setMessages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusInfo, setStatusInfo] = useState({ text: "", variant: "" });
  const [hasUnread, setHasUnread] = useState(false);

  const containerRef = useRef(null);
  const nameInputRef = useRef(null);
  const closeButtonRef = useRef(null);
  const messagesEndRef = useRef(null);
  const seenAdminIdsRef = useRef(readSeenAdminIds());
  const isOpenRef = useRef(isOpen);
  const statusTimerRef = useRef(null);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      setHasUnread((prev) => (prev ? false : prev));
      let added = false;
      messages.forEach((msg) => {
        if (msg.type === "admin" && !seenAdminIdsRef.current.has(msg.id)) {
          seenAdminIdsRef.current.add(msg.id);
          added = true;
        }
      });
      if (added) {
        persistSeenAdminIds(seenAdminIdsRef.current);
      }
    }
  }, [isOpen, messages]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const id = setTimeout(() => {
      if (hasSubmitted) {
        closeButtonRef.current?.focus();
      } else {
        nameInputRef.current?.focus();
      }
    }, 60);
    return () => clearTimeout(id);
  }, [isOpen, hasSubmitted]);

  useEffect(() => {
    if (!savedName) {
      return undefined;
    }

    const unsubscribe = subscribeVisitorMessages(
      savedName,
      (thread) => {
        setMessages((prev) => {
          const optimisticOnly = prev.filter(
            (item) =>
              item.optimistic &&
              !thread.some((remote) => remote.type === item.type && remote.text === item.text)
          );
          return [...thread, ...optimisticOnly];
        });

        const hasNewReply = thread.some(
          (msg) => msg.type === "admin" && !seenAdminIdsRef.current.has(msg.id)
        );
        if (hasNewReply) {
          if (isOpenRef.current) {
            let added = false;
            thread.forEach((msg) => {
              if (msg.type === "admin" && !seenAdminIdsRef.current.has(msg.id)) {
                seenAdminIdsRef.current.add(msg.id);
                added = true;
              }
            });
            if (added) {
              persistSeenAdminIds(seenAdminIdsRef.current);
            }
          } else {
            setHasUnread(true);
          }
        }
      },
      () => {
        // Ignore background subscription failures silently on offline visitors
      }
    );

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [savedName]);

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
    if (isOpen && messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
      }
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName || !trimmedMessage) {
      setStatusInfo({ text: "❌ Preencha todos os campos", variant: "error" });
      return;
    }

    setIsSubmitting(true);
    setStatusInfo({ text: "⏳ Enviando...", variant: "" });

    const result = await sendVisitorMessage(trimmedName, trimmedMessage);

    if (result.success) {
      safeStorageSet(CHAT_STORAGE_KEYS.chatId, result.chatId);
      safeStorageSet(CHAT_STORAGE_KEYS.chatName, trimmedName);
      safeStorageSet(CHAT_STORAGE_KEYS.submitted, "1");

      setMessages((prev) => [
        ...prev,
        {
          id: `${result.messageId}:user`,
          docId: result.messageId,
          chatId: result.chatId,
          type: "user",
          text: trimmedMessage,
          timestampMs: Date.now(),
          optimistic: true
        }
      ]);

      setSavedName(trimmedName);
      setName("");
      setMessage("");
      setHasSubmitted(true);
      setStatusInfo({ text: "✓ Mensagem enviada!", variant: "success" });

      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
      }
      statusTimerRef.current = setTimeout(() => {
        setStatusInfo({ text: "", variant: "" });
      }, 3000);
    } else {
      setStatusInfo({
        text: `❌ Erro: ${result.error || "Falha ao enviar"}`,
        variant: "error"
      });
    }

    setIsSubmitting(false);
  }

  return (
    <div id="chat-widget-container" ref={containerRef}>
      <motion.button
        id="chat-widget-toggle"
        type="button"
        className="chat-widget-button"
        title="Envie uma mensagem"
        aria-label={isOpen ? "Fechar chat" : "Abrir chat para enviar mensagem"}
        aria-expanded={isOpen}
        aria-controls="chat-widget"
        onClick={() => setIsOpen((prev) => !prev)}
        whileHover={{ y: -2, scale: 1.04 }}
        whileTap={{ scale: 0.94 }}
      >
        <MessageSquare size={20} aria-hidden="true" />
        <AnimatePresence>
          {hasUnread && (
            <motion.span
              id="unread-badge"
              className="chat-widget-badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              aria-label="Nova resposta recebida"
            >
              !
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="chat-widget"
            className="chat-widget"
            role="dialog"
            aria-label="Chat com o desenvolvedor"
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
          >
            <div className="chat-widget-header">
              <div>
                <div className="chat-widget-heading">
                  <motion.span
                    className="chat-online-dot"
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.55, 1] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                    aria-hidden="true"
                  />
                  <h3>Deixe uma mensagem</h3>
                </div>
                <p>Responderei em breve</p>
              </div>
              <button
                ref={closeButtonRef}
                id="chat-widget-close"
                type="button"
                className="chat-widget-close"
                aria-label="Fechar janela de chat"
                title="Fechar chat"
                onClick={() => setIsOpen(false)}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="chat-widget-content">
              <div id="chat-widget-messages" className="chat-widget-messages">
                {messages.length === 0 ? (
                  <p className="chat-widget-empty">
                    Nenhuma mensagem ainda. Envie sua pergunta ou feedback abaixo.
                  </p>
                ) : (
                  <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        className={`chat-widget-message ${msg.type}`}
                        data-msg-id={msg.docId}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {msg.text}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="chat-widget-input">
                {!hasSubmitted ? (
                  <form id="chat-form" onSubmit={handleSubmit} noValidate>
                    <div className="form-group">
                      <input
                        ref={nameInputRef}
                        type="text"
                        id="chat-name"
                        aria-label="Seu nome"
                        placeholder="Seu nome"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        autoComplete="name"
                      />
                    </div>

                    <div className="form-group">
                      <textarea
                        id="chat-message"
                        aria-label="Sua mensagem"
                        placeholder="Sua mensagem..."
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                        maxLength={MAX_MESSAGE_LENGTH}
                      />
                      <small id="char-count">
                        {message.length}/{MAX_MESSAGE_LENGTH}
                      </small>
                    </div>

                    <motion.button
                      type="submit"
                      className="btn-send"
                      disabled={isSubmitting}
                      whileHover={!isSubmitting ? { y: -1 } : undefined}
                      whileTap={!isSubmitting ? { scale: 0.98 } : undefined}
                    >
                      <Send size={14} aria-hidden="true" />
                      <span>Enviar</span>
                    </motion.button>

                    {statusInfo.text && (
                      <div
                        id="chat-status"
                        role="status"
                        className={`chat-status${statusInfo.variant ? ` ${statusInfo.variant}` : ""}`}
                      >
                        {statusInfo.text}
                      </div>
                    )}
                  </form>
                ) : (
                  <motion.div
                    id="chat-after-submit"
                    className="chat-widget-after"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="chat-after-icon">
                      <Check size={18} aria-hidden="true" />
                    </div>
                    <p className="chat-widget-after-title">Mensagem enviada</p>
                    <p className="chat-widget-after-text">
                      Obrigado! Assim que eu responder, a mensagem vai aparecer aqui.
                    </p>
                    {statusInfo.text && (
                      <div
                        id="chat-status"
                        role="status"
                        className={`chat-status${statusInfo.variant ? ` ${statusInfo.variant}` : ""}`}
                      >
                        {statusInfo.text}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ChatWidget;
