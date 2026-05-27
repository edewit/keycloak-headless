/** Shape of generated KEYCLOAK_CONFIG and compatible app configs. */
export type KeycloakRolesConfig = {
  readonly realm: string;
  readonly exportedAt?: number;
  readonly roles: readonly string[];
  readonly clientRoles?: Readonly<Record<string, readonly string[]>>;
};
