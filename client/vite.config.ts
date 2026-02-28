import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,         // bind to 0.0.0.0 so tunnel tools can reach it
    allowedHosts: true, // accept any Host header (ngrok, localtunnel, etc.)
    proxy: {
      "/socket.io": {
        target: "http://localhost:3001",
        ws: true,
        changeOrigin: true,
      },
      "/auth": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
      "/user": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
