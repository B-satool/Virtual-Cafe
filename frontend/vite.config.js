import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:3001",
        ws: true,
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      // Backend serves this file from its `public/` directory
      "/freesound_community-cafe-noise-32940.mp3": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/rain.mp3": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/fireplace.mp3": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "socket.io-client"],
        },
      },
    },
  },
});
