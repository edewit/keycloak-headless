import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { oidcSpa } from "oidc-spa/vite-plugin";
import { resolve } from "node:path";

import { keycloakRolesPlugin } from "keycloak-headless/vite";

export default defineConfig({
  plugins: [
    svelte(),
    oidcSpa(),
    keycloakRolesPlugin({
      input: resolve(__dirname, "keycloak-roles.json"),
      output: resolve(__dirname, "src/keycloak-config.generated.ts"),
    }),
  ],
});
