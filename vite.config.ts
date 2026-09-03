import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three", "@react-three/fiber", "@react-three/drei"],
          physics: ["@react-three/rapier"],
          post: ["@react-three/postprocessing", "postprocessing"],
        },
      },
    },
  },
});
