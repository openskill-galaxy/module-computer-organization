import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/module-computer-organization/",
  plugins: [react as unknown as PluginOption],
  build: { outDir: "dist", sourcemap: false },
});
