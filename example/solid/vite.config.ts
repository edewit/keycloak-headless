import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { oidcSpa } from "oidc-spa/vite-plugin";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { keycloakRolesPlugin } from "../../src/vite/keycloak-roles-plugin.ts";

const rootDir = fileURLToPath(new URL("../..", import.meta.url));
const rolesExport =
  process.env.KEYCLOAK_ROLES_EXPORT ??
  "/tmp/keycloak-role-exports/master-roles.json";

export default defineConfig({
  plugins: [
    solid(),
    oidcSpa(),
    keycloakRolesPlugin({
      input: rolesExport,
      output: resolve(__dirname, "src/keycloak-config.generated.ts"),
    }),
  ],
  resolve: {
    alias: {
      "keycloak-headless/solid": resolve(rootDir, "src/solid/index.ts"),
      "keycloak-headless/vite": resolve(rootDir, "src/vite/index.ts"),
      "keycloak-headless/provider": resolve(
        rootDir,
        "src/components/provider/index.ts",
      ),
    },
  },
  server: {
    port: 5176,
  },
});


