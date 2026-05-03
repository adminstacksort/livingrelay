import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import "dotenv/config";

const publicHost = process.env.APP_PUBLIC_URL ? new URL(process.env.APP_PUBLIC_URL).host : undefined;

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    allowedHosts: publicHost ? [publicHost] : [],
    proxy: {
      "/api": "http://127.0.0.1:8787"
    }
  }
});
