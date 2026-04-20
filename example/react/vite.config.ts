import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const rootDir = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "keycloak-headless/react": resolve(rootDir, "src/react/index.ts"),
      "keycloak-headless/provider": resolve(
        rootDir,
        "src/components/provider/index.ts",
      ),
    },
  },
  server: {
    port: 5174,
  },
});
