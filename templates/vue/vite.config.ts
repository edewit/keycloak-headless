import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { oidcSpa } from "oidc-spa/vite-plugin";
import { resolve } from "node:path";

import { keycloakRolesPlugin } from "keycloak-headless/vite";

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith("kc-"),
        },
      },
    }),
    oidcSpa(),
    keycloakRolesPlugin({
      input: resolve(__dirname, "keycloak-roles.json"),
      output: resolve(__dirname, "src/keycloak-config.generated.ts"),
    }),
  ],
});
