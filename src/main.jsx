import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./world.css";
import App from "./App.jsx";

function lockPageZoom() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  // Block Safari/WebKit pinch & gesture zoom (iOS ignores user-scalable=no without this)
  const preventGesture = (event) => {
    event.preventDefault();
  };
  document.addEventListener("gesturestart", preventGesture, { passive: false });
  document.addEventListener("gesturechange", preventGesture, { passive: false });
  document.addEventListener("gestureend", preventGesture, { passive: false });

  // Block multi-finger pinch-to-zoom across mobile browsers
  document.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches && event.touches.length > 1) {
        event.preventDefault();
      }
    },
    { passive: false }
  );

  // Block rapid double-tap zoom on text/containers without eating fast button or globe taps
  let lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    (event) => {
      const now = Date.now();
      const isInteractive =
        event.target instanceof Element &&
        Boolean(
          event.target.closest(
            "button, a, input, textarea, select, summary, #interactive-world-globe"
          )
        );
      if (!isInteractive && now - lastTouchEnd <= 300 && event.touches.length === 0) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false }
  );

  // Block trackpad pinch and Ctrl/Cmd + mouse wheel zoom on desktop
  window.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
      }
    },
    { passive: false }
  );

  // Block Ctrl/Cmd + (+, -, =, 0) keyboard zoom shortcuts
  window.addEventListener("keydown", (event) => {
    if (
      (event.ctrlKey || event.metaKey) &&
      ["+", "-", "=", "_", "0"].includes(event.key)
    ) {
      event.preventDefault();
    }
  });
}

lockPageZoom();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
