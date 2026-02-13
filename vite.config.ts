import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";
import path from "path";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

export default defineConfig({
  plugins: [glsl()],
  base: process.env.GITHUB_PAGES ? "/encontro/" : "/",
  root: path.resolve(import.meta.dirname, "client"),
  css: {
    postcss: {
      plugins: [
        tailwindcss(path.resolve(import.meta.dirname, "tailwind.config.cjs")),
        autoprefixer(),
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist", "public"),
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/ws": {
        target: "ws://localhost:3001",
        ws: true,
      },
    },
  },
});
