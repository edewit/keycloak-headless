type RealmAccess = {
  roles?: string[];
};

type ResourceAccess = Record<string, { roles?: string[] } | undefined>;

/**
 * Reads realm-level roles from a decoded Keycloak ID token.
 */
export function getRealmRoles(
  decodedIdToken: Record<string, unknown> | undefined,
): readonly string[] {
  if (decodedIdToken == null) {
    return [];
  }
  const realmAccess = decodedIdToken.realm_access as RealmAccess | undefined;
  return realmAccess?.roles ?? [];
}

/**
 * Reads client-specific roles from a decoded Keycloak ID token.
 */
export function getClientRoles(
  decodedIdToken: Record<string, unknown> | undefined,
  clientId: string,
): readonly string[] {
  if (decodedIdToken == null || clientId === "") {
    return [];
  }
  const resourceAccess = decodedIdToken.resource_access as
    | ResourceAccess
    | undefined;
  return resourceAccess?.[clientId]?.roles ?? [];
}

export function hasRealmRole(
  decodedIdToken: Record<string, unknown> | undefined,
  role: string,
): boolean {
  return getRealmRoles(decodedIdToken).includes(role);
}

export function hasClientRole(
  decodedIdToken: Record<string, unknown> | undefined,
  clientId: string,
  role: string,
): boolean {
  return getClientRoles(decodedIdToken, clientId).includes(role);
}
