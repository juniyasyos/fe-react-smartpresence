/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/setupTests.ts",
    },
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
      port: parseInt(env.VITE_PORT || "3000"),
      allowedHosts: true,
      proxy: {
        "/storage": {
          target: env.VITE_API_URL || "http://localhost:8000",
          changeOrigin: true,
        },
        "/api": {
          target: env.VITE_API_URL || "http://localhost:8000",
          changeOrigin: true,
        },
        "/smartpresence": {
          target: env.VITE_MINIO_URL || "http://minio:9090",
          changeOrigin: true,
        },
      },
    },
  };
});
