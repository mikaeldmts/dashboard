import { getApps, initializeApp } from "firebase/app";
import {
  addDoc,
  collection,
  getFirestore,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";

const env = typeof import.meta !== "undefined" ? import.meta.env : undefined;

const firebaseConfig = {
  apiKey: env?.VITE_FIREBASE_API_KEY || "AIzaSyA0VoWMLTJIyI54Pj0P5T75gCH6KpgAcbk",
  authDomain: env?.VITE_FIREBASE_AUTH_DOMAIN || "mikaelfmts.firebaseapp.com",
  projectId: env?.VITE_FIREBASE_PROJECT_ID || "mikaelfmts",
  storageBucket: env?.VITE_FIREBASE_STORAGE_BUCKET || "mikaelfmts.firebasestorage.app",
  messagingSenderId: env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "516762612351",
  appId: env?.VITE_FIREBASE_APP_ID || "1:516762612351:web:f8a0f229ffd5def8ec054a"
};

export const DEFAULT_SEND_TIMEOUT_MS = 10_000;

let dbInstance = null;

export function getFirestoreDb() {
  if (dbInstance) return dbInstance;
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  dbInstance = getFirestore(app);
  return dbInstance;
}

export function buildChatId(nome, nowMs = Date.now()) {
  const cleanName = String(nome || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  return `${cleanName}_${nowMs}`;
}

function toTimestampMs(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") {
    const ms = value.toDate().getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value.toMillis === "function") {
    const ms = value.toMillis();
    return Number.isFinite(ms) ? ms : null;
  }
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function extractChatIdTimestampMs(chatId) {
  if (typeof chatId !== "string") return null;
  const match = /_(\d{10,16})$/.exec(chatId.trim());
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function resolveDocTimestampMs(docItem) {
  const directMs = toTimestampMs(docItem?.hora);
  if (directMs !== null) return directMs;
  const chatIdMs = extractChatIdTimestampMs(docItem?.chat_id);
  if (chatIdMs !== null) return chatIdMs;
  return Number.MAX_SAFE_INTEGER;
}

export async function sendVisitorMessage(nome, mensagem, options = {}) {
  const trimmedName = String(nome || "").trim();
  const trimmedMessage = String(mensagem || "").trim();
  const timeoutMs =
    Number.isFinite(options?.timeoutMs) && options.timeoutMs > 0
      ? options.timeoutMs
      : DEFAULT_SEND_TIMEOUT_MS;

  if (!trimmedName || !trimmedMessage) {
    return {
      success: false,
      error: "Preencha nome e mensagem."
    };
  }

  let timeoutId = null;
  try {
    const chatId = buildChatId(trimmedName);
    const payload = {
      chat_id: chatId,
      nome: trimmedName,
      mensagem: trimmedMessage,
      hora: serverTimestamp(),
      respondido: false,
      resposta: null,
      horaResposta: null
    };

    const writePromise =
      typeof options?.writeMessageFn === "function"
        ? options.writeMessageFn(payload)
        : addDoc(collection(getFirestoreDb(), "mensagens"), payload);

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error("Tempo esgotado ao enviar mensagem. Verifique sua conexão e tente novamente."));
      }, timeoutMs);
    });

    const docRef = await Promise.race([writePromise, timeoutPromise]);

    return {
      success: true,
      messageId: docRef.id,
      chatId
    };
  } catch (error) {
    return {
      success: false,
      error: error?.message || "Erro ao enviar mensagem."
    };
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
}

export function normalizeVisitorThread(docs, visitorName) {
  const targetName = String(visitorName || "").trim().toLowerCase();
  if (!targetName || !Array.isArray(docs)) return [];

  const seenDocIds = new Set();
  const matchingDocs = [];

  for (const item of docs) {
    if (!item) continue;
    const docId = item.id ? String(item.id) : null;
    if (docId) {
      if (seenDocIds.has(docId)) continue;
      seenDocIds.add(docId);
    }
    if (String(item.nome || "").trim().toLowerCase() === targetName) {
      matchingDocs.push(item);
    }
  }

  matchingDocs.sort((a, b) => resolveDocTimestampMs(a) - resolveDocTimestampMs(b));

  const thread = [];

  for (const docItem of matchingDocs) {
    const sentAtMs = resolveDocTimestampMs(docItem);
    const trimmedMessage = typeof docItem.mensagem === "string" ? docItem.mensagem.trim() : "";
    if (trimmedMessage) {
      thread.push({
        id: `${docItem.id}:user`,
        docId: docItem.id,
        chatId: docItem.chat_id || null,
        type: "user",
        text: docItem.mensagem,
        timestampMs: sentAtMs
      });
    }

    const trimmedReply = typeof docItem.resposta === "string" ? docItem.resposta.trim() : "";
    if (docItem.respondido && trimmedReply) {
      const replyAtMs = toTimestampMs(docItem.horaResposta);
      thread.push({
        id: `${docItem.id}:admin`,
        docId: docItem.id,
        chatId: docItem.chat_id || null,
        type: "admin",
        text: docItem.resposta,
        timestampMs: replyAtMs !== null ? replyAtMs : sentAtMs + 1
      });
    }
  }

  return thread;
}

export function subscribeVisitorMessages(nome, onMessages, onError) {
  const targetName = String(nome || "").trim();
  if (!targetName) {
    return () => {};
  }

  try {
    const db = getFirestoreDb();
    const messagesRef = collection(db, "mensagens");

    return onSnapshot(
      messagesRef,
      (snapshot) => {
        const rawDocs = [];
        snapshot.forEach((docSnap) => {
          rawDocs.push({ id: docSnap.id, ...docSnap.data() });
        });
        const thread = normalizeVisitorThread(rawDocs, targetName);
        onMessages(thread);
      },
      (error) => {
        if (typeof onError === "function") {
          onError(error);
        }
      }
    );
  } catch (error) {
    if (typeof onError === "function") {
      onError(error);
    }
    return () => {};
  }
}
