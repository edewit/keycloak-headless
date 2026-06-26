/**
 * Builds a Keycloak OIDC issuer URI from server URL and realm name.
 *
 * @example
 * buildIssuerUri("https://keycloak.example.com/", "myrealm")
 * // => "https://keycloak.example.com/realms/myrealm"
 *
 * @example Legacy Keycloak with /auth path
 * buildIssuerUri("https://keycloak.example.com/auth/", "myrealm")
 * // => "https://keycloak.example.com/auth/realms/myrealm"
 */
export function buildIssuerUri(url: string, realm: string): string {
  const trimmed = url.trim();
  if (trimmed === "") {
    throw new Error("Keycloak URL is required");
  }
  if (realm.trim() === "") {
    throw new Error("Keycloak realm is required");
  }

  const base = trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
  return `${base}/realms/${encodeURIComponent(realm)}`;
}
