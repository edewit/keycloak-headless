import type Keycloak from "keycloak-js";

import type { KeycloakRolesConfig } from "./keycloak-config.js";

export function createRealmRoleChecker<const T extends readonly string[]>(
  kc: Keycloak | undefined,
  roles: T,
) {
  return {
    hasRealmRole(role: T[number]): boolean {
      return kc?.hasRealmRole(role) === true;
    },
    roles,
  };
}

export function createClientRoleChecker<
  const C extends string,
  const T extends readonly string[],
>(kc: Keycloak | undefined, clientId: C, roles: T) {
  return {
    hasClientRole(role: T[number]): boolean {
      return kc?.hasResourceRole(role, clientId) === true;
    },
    clientId,
    roles,
  };
}

type RealmRoleName<C extends KeycloakRolesConfig> =
  C["roles"] extends readonly (infer R extends string)[] ? R : never;
type ClientRolesOf<C extends KeycloakRolesConfig> = NonNullable<C["clientRoles"]>;
type ClientIdOf<C extends KeycloakRolesConfig> = keyof ClientRolesOf<C> & string;
type ClientRoleName<
  C extends KeycloakRolesConfig,
  Id extends ClientIdOf<C>,
> = ClientRolesOf<C>[Id] extends readonly (infer R extends string)[] ? R : never;

export function createRoleCheckerFromConfig<const C extends KeycloakRolesConfig>(
  kc: Keycloak | undefined,
  config: C,
) {
  const realm = createRealmRoleChecker(kc, config.roles);

  return {
    config,
    hasRealmRole(role: RealmRoleName<C>): boolean {
      return realm.hasRealmRole(role);
    },
    hasClientRole<Id extends ClientIdOf<C>>(
      clientId: Id,
      role: ClientRoleName<C, Id>,
    ): boolean {
      return kc?.hasResourceRole(role, clientId) === true;
    },
    clientRoleChecker<Id extends ClientIdOf<C>>(clientId: Id) {
      const roles = config.clientRoles?.[clientId];
      if (roles == null) {
        throw new Error(`No roles configured for client ${clientId}`);
      }
      return createClientRoleChecker(kc, clientId, roles);
    },
  };
}
