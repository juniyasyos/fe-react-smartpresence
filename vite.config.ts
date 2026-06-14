import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    minify: "esbuild",
    cssMinify: "esbuild",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          quill: ["react-quill-new"],
        },
      },
    },
  },
  server: {
    host: true,
    port: 3000,
    allowedHosts: true,
    proxy: {
      "/storage": {
        target: "http://nginx_server",
        changeOrigin: true,
      },
      "/api": {
        target: "http://nginx_server",
        changeOrigin: true,
      },
      "/smartpresence": {
        target: "http://minio:9090",
        changeOrigin: true,
      },
    },
  },
});
