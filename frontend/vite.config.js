import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pwa-icon.svg"],
      injectRegister: "auto",
      /** En dev no registrar SW: evita que intercepte /api y rompa cookies/sesión. */
      devOptions: { enabled: false },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,svg,woff2}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api"),
            handler: "NetworkOnly",
          },
        ],
      },
      manifest: {
        name: "Registro de gastos",
        short_name: "Gastos",
        description: "Registro de gastos del hogar",
        theme_color: "#f2f2f7",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        lang: "es-MX",
        icons: [
          {
            src: "/pwa-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        /** Evita que Set-Cookie traiga un Domain que el navegador ignore en dev. */
        configure(proxy) {
          proxy.on("proxyRes", (proxyRes) => {
            const raw = proxyRes.headers["set-cookie"];
            if (!raw) return;
            const list = Array.isArray(raw) ? raw : [raw];
            proxyRes.headers["set-cookie"] = list.map((cookie) =>
              cookie.replace(/;\s*Domain=[^;]*/gi, "")
            );
          });
        },
      },
    },
  },
});
