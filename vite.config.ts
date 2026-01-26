import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],

  // IMPORTANT: Vite must be rooted at the repo root so /src/app.tsx is servable
  root: path.resolve(__dirname),

  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${process.env.BACKEND_PORT ?? "3001"}`,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (err, req) => {
            console.error("[vite-proxy] error", req.method, req.url, err);
          });

          proxy.on("proxyReq", (proxyReq, req) => {
            console.error(
              "[vite-proxy] proxyReq",
              req.method,
              req.url,
              "content-length=",
              req.headers["content-length"],
              "content-type=",
              req.headers["content-type"]
            );
          });

          proxy.on("proxyRes", (proxyRes, req) => {
            console.error(
              "[vite-proxy] proxyRes",
              req.method,
              req.url,
              proxyRes.statusCode
            );
          });
        },
      },
    },
  },

  build: {
    outDir: path.resolve(__dirname, "web-dist"),
    emptyOutDir: true,
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),

      // Web build must NEVER see Electron IPC
      "src/api/backendClient": path.resolve(
        __dirname,
        "src/api/backendClient.web.ts"
      ),
      "@/api/backendClient": path.resolve(
        __dirname,
        "src/api/backendClient.web.ts"
      ),
      "./src/api/backendClient": path.resolve(
        __dirname,
        "src/api/backendClient.web.ts"
      ),
    },
  },
});
