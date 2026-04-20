import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const rootDir = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith("kc-"),
        },
      },
    }),
  ],
  resolve: {
    alias: {
      "keycloak-headless/provider": resolve(
        rootDir,
        "src/components/provider/index.ts",
      ),
    },
  },
  server: {
    port: 5175,
  },
});
