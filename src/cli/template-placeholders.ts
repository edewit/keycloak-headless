export type Framework = "react" | "vue" | "solid" | "svelte";

export const FRAMEWORKS: Framework[] = ["react", "vue", "solid", "svelte"];

export const PLACEHOLDER_TOKENS = [
  "__PROJECT_NAME__",
  "__KEYCLOAK_URL__",
  "__KEYCLOAK_REALM__",
  "__KEYCLOAK_CLIENT_ID__",
  "__KEYCLOAK_HEADLESS_VERSION__",
  "__KEYCLOAK_ROLE_CREATED_VERSION__",
] as const;

export type PlaceholderToken = (typeof PLACEHOLDER_TOKENS)[number];

export interface ScaffoldValues {
  projectName: string;
  keycloakUrl: string;
  keycloakRealm: string;
  keycloakClientId: string;
  keycloakHeadlessVersion: string;
  keycloakRoleCreatedVersion: string;
}

export const EXAMPLE_KEYCLOAK_DEFAULTS = {
  keycloakUrl: "http://localhost:8080/",
  keycloakRealm: "master",
  keycloakClientId: "example-spa",
} as const;

export function exampleProjectName(framework: Framework): string {
  return `example-${framework}`;
}

const PLACEHOLDER_GETTERS: Record<
  PlaceholderToken,
  (values: ScaffoldValues) => string
> = {
  __PROJECT_NAME__: (values) => values.projectName,
  __KEYCLOAK_URL__: (values) => values.keycloakUrl,
  __KEYCLOAK_REALM__: (values) => values.keycloakRealm,
  __KEYCLOAK_CLIENT_ID__: (values) => values.keycloakClientId,
  __KEYCLOAK_HEADLESS_VERSION__: (values) => values.keycloakHeadlessVersion,
  __KEYCLOAK_ROLE_CREATED_VERSION__: (values) =>
    values.keycloakRoleCreatedVersion,
};

export function applyPlaceholders(
  content: string,
  values: ScaffoldValues,
): string {
  let result = content;
  for (const token of PLACEHOLDER_TOKENS) {
    result = result.replaceAll(token, PLACEHOLDER_GETTERS[token](values));
  }
  return result;
}

export function exampleValuesToPlaceholders(
  content: string,
  framework: Framework,
): string {
  let result = content;
  result = result.replaceAll(exampleProjectName(framework), "__PROJECT_NAME__");
  result = result.replaceAll(
    EXAMPLE_KEYCLOAK_DEFAULTS.keycloakUrl,
    "__KEYCLOAK_URL__",
  );
  result = result.replaceAll(
    EXAMPLE_KEYCLOAK_DEFAULTS.keycloakRealm,
    "__KEYCLOAK_REALM__",
  );
  result = result.replaceAll(
    EXAMPLE_KEYCLOAK_DEFAULTS.keycloakClientId,
    "__KEYCLOAK_CLIENT_ID__",
  );
  return result;
}
