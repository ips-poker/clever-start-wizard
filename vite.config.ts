import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Prevent "Invalid hook call" by ensuring ALL deps resolve the same React instance.
    // This is especially important with Radix UI packages.
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    // All dependencies now bundled together to avoid React duplication
    force: true,
    include: ["react", "react-dom"],
  },
}));
