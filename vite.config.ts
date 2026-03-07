import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@game": resolve(__dirname, "src/game"),
      "@entities": resolve(__dirname, "src/entities"),
      "@systems": resolve(__dirname, "src/systems"),
      "@utils": resolve(__dirname, "src/utils"),
      "@ui": resolve(__dirname, "src/ui"),
    },
  },
  build: {
    target: "ES2022",
    outDir: "dist",
    sourcemap: true,
  },
  server: {
    port: 3000,
    open: true,
  },
});
