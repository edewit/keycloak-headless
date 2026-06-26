import type { Oidc } from "oidc-spa/core";

import {
  getClientRoles,
  getRealmRoles,
} from "../oidc/extract-roles.js";
import type { KeycloakRolesConfig } from "./keycloak-config.js";

function decodedIdTokenFromOidc(
  oidc: Oidc | undefined,
): Record<string, unknown> | undefined {
  if (oidc == null || oidc.isUserLoggedIn !== true) {
    return undefined;
  }
  return oidc.getDecodedIdToken();
}

export function createRealmRoleChecker<const T extends readonly string[]>(
  userRealmRoles: readonly string[] | undefined,
  roles: T,
) {
  return {
    hasRealmRole(role: T[number]): boolean {
      return userRealmRoles?.includes(role) === true;
    },
    roles,
  };
}

export function createClientRoleChecker<
  const C extends string,
  const T extends readonly string[],
>(userClientRoles: readonly string[] | undefined, clientId: C, roles: T) {
  return {
    hasClientRole(role: T[number]): boolean {
      return userClientRoles?.includes(role) === true;
    },
    clientId,
    roles,
  };
}

type RealmRoleName<C extends KeycloakRolesConfig> =
  C["roles"] extends readonly (infer R extends string)[] ? R : never;
type ClientRolesOf<C extends KeycloakRolesConfig> = NonNullable<
  C["clientRoles"]
>;
type ClientIdOf<C extends KeycloakRolesConfig> = keyof ClientRolesOf<C> &
  string;
type ClientRoleName<
  C extends KeycloakRolesConfig,
  Id extends ClientIdOf<C>,
> = ClientRolesOf<C>[Id] extends readonly (infer R extends string)[] ? R : never;

export function createRoleCheckerFromConfig<const C extends KeycloakRolesConfig>(
  oidc: Oidc | undefined,
  config: C,
) {
  const decodedIdToken = decodedIdTokenFromOidc(oidc);
  const realmRoles = getRealmRoles(decodedIdToken);
  const realm = createRealmRoleChecker(realmRoles, config.roles);

  return {
    config,
    hasRealmRole(role: RealmRoleName<C>): boolean {
      return realm.hasRealmRole(role);
    },
    hasClientRole<Id extends ClientIdOf<C>>(
      clientId: Id,
      role: ClientRoleName<C, Id>,
    ): boolean {
      return getClientRoles(decodedIdToken, clientId).includes(role);
    },
    clientRoleChecker<Id extends ClientIdOf<C>>(clientId: Id) {
      const roles = config.clientRoles?.[clientId];
      if (roles == null) {
        throw new Error(`No roles configured for client ${clientId}`);
      }
      return createClientRoleChecker(
        getClientRoles(decodedIdToken, clientId),
        clientId,
        roles,
      );
    },
  };
}

export function createRoleCheckerFromOidc(oidc: Oidc | undefined) {
  const decodedIdToken = decodedIdTokenFromOidc(oidc);
  return {
    realmRoles: getRealmRoles(decodedIdToken),
    getClientRoles(clientId: string) {
      return getClientRoles(decodedIdToken, clientId);
    },
  };
}
