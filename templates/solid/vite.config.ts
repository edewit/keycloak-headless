import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { oidcSpa } from "oidc-spa/vite-plugin";
import { resolve } from "node:path";

import { keycloakRolesPlugin } from "keycloak-headless/vite";

export default defineConfig({
  plugins: [
    solid(),
    oidcSpa(),
    keycloakRolesPlugin({
      input: resolve(__dirname, "keycloak-roles.json"),
      output: resolve(__dirname, "src/keycloak-config.generated.ts"),
    }),
  ],
});
