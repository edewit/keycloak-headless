import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { keycloakRolesPlugin } from "../../src/vite/keycloak-roles-plugin.ts";

const rootDir = fileURLToPath(new URL("../..", import.meta.url));
const rolesExport =
  process.env.KEYCLOAK_ROLES_EXPORT ??
  resolve(rootDir, "scripts/fixtures/master-roles.json");

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith("kc-"),
        },
      },
    }),
    keycloakRolesPlugin({
      input: rolesExport,
      output: resolve(__dirname, "src/keycloak-config.generated.ts"),
    }),
  ],
  resolve: {
    alias: {
      "keycloak-headless/provider": resolve(
        rootDir,
        "src/components/provider/index.ts",
      ),
      "keycloak-headless/vue": resolve(rootDir, "src/vue/index.ts"),
      "keycloak-headless/vite": resolve(rootDir, "src/vite/index.ts"),
    },
  },
  server: {
    port: 5175,
  },
});
