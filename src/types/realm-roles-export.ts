/** Mirrors Keycloak Admin API / Jackson output from RealmRolesExport.java */

export interface RoleRepresentation {
  id?: string;
  name?: string;
  description?: string;
  composite?: boolean;
  clientRole?: boolean;
  containerId?: string;
}

export interface RolesRepresentation {
  realm?: RoleRepresentation[];
  client?: Record<string, RoleRepresentation[]>;
}

export interface RealmRolesExport {
  realm: string;
  realmId: string;
  exportedAt: number;
  roles: RolesRepresentation;
}
