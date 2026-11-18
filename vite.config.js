import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        login: resolve(__dirname, "login.html"),
        adminChat: resolve(__dirname, "admin-chat.html")
      },
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("firebase") || id.includes("@firebase")) return "vendor-firebase";
          if (id.includes("@tsparticles")) return "vendor-particles";
          if (id.includes("framer-motion") || id.includes("motion-")) return "vendor-motion";
          if (id.includes("react")) return "vendor-react";
          return undefined;
        }
      }
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.js"],
    globals: false
  }
});
