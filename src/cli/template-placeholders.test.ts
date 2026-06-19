import { describe, expect, it } from "vitest";

import {
  applyPlaceholders,
  exampleProjectName,
  exampleValuesToPlaceholders,
  EXAMPLE_KEYCLOAK_DEFAULTS,
} from "./template-placeholders.js";

describe("template-placeholders", () => {
  it("replaces scaffold placeholders with provided values", () => {
    const content = `{
  "name": "__PROJECT_NAME__",
  "url": "__KEYCLOAK_URL__",
  "realm": "__KEYCLOAK_REALM__",
  "client": "__KEYCLOAK_CLIENT_ID__"
}`;

    expect(
      applyPlaceholders(content, {
        projectName: "my-app",
        keycloakUrl: "https://auth.example/",
        keycloakRealm: "demo",
        keycloakClientId: "spa",
        keycloakHeadlessVersion: "1.2.3",
        keycloakRoleCreatedVersion: "4.5.6",
      }),
    ).toBe(`{
  "name": "my-app",
  "url": "https://auth.example/",
  "realm": "demo",
  "client": "spa"
}`);
  });

  it("replaces example defaults with scaffold placeholders", () => {
    const content = `<kc-provider
  url="${EXAMPLE_KEYCLOAK_DEFAULTS.keycloakUrl}"
  realm="${EXAMPLE_KEYCLOAK_DEFAULTS.keycloakRealm}"
  client-id="${EXAMPLE_KEYCLOAK_DEFAULTS.keycloakClientId}"
/>`;

    expect(exampleValuesToPlaceholders(content, "vue")).toBe(`<kc-provider
  url="__KEYCLOAK_URL__"
  realm="__KEYCLOAK_REALM__"
  client-id="__KEYCLOAK_CLIENT_ID__"
/>`);
  });

  it("uses framework-specific example project names", () => {
    expect(exampleProjectName("react")).toBe("example-react");
    expect(exampleProjectName("svelte")).toBe("example-svelte");
  });
});
