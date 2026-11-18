import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function localVercelApiPlugin() {
  return {
    name: "local-vercel-api",
    configureServer(server) {
      server.middlewares.use("/api/overthinker", async (req, res) => {
        const { default: overthinkerHandler } = await import("./api/overthinker.js");
        await overthinkerHandler(req, res);
      });
      server.middlewares.use("/api/world-intel", async (req, res) => {
        const { default: worldIntelHandler } = await import("./api/world-intel.js");
        await worldIntelHandler(req, res);
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  if (env.GROQ_API_KEY && !process.env.GROQ_API_KEY) {
    process.env.GROQ_API_KEY = env.GROQ_API_KEY;
  }
  if (env.GH_PROFILE_PAT && !process.env.GH_PROFILE_PAT) {
    process.env.GH_PROFILE_PAT = env.GH_PROFILE_PAT;
  }

  return {
    plugins: [react(), localVercelApiPlugin()],
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
            if (id.includes("d3-") || id.includes("topojson") || id.includes("world-atlas")) return "vendor-globe";
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
  };
});
