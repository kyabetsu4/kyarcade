import { defineConfig } from "vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";

// `--mode electron` builds for the packaged desktop app, which loads
// dist/index.html from disk over file:// and therefore needs relative asset
// paths. The default build keeps the absolute base for the GitHub Pages demo.
export default defineConfig(({ mode }) => ({
  base: mode === "electron" ? "./" : "/kyarcade/",
  resolve: {
    alias: {
      "@": `${process.cwd()}/src`,
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  plugins: [
    TanStackRouterVite({
      routesDirectory: "src/routes",
      generatedRouteTree: "src/routeTree.gen.ts",
    }),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    react(),
  ],
}));
