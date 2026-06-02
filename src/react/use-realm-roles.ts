import type { KeycloakRolesConfig } from "../roles/keycloak-config.js";
import {
  createRealmRoleChecker,
  createRoleCheckerFromConfig,
} from "../roles/create-role-checker.js";

import { useAuth } from "./auth-context.js";

/**
 * React hook for type-safe realm role checking.
 *
 * This hook provides a type-safe way to check if the authenticated user has
 * specific realm roles. It returns an object with `hasRealmRole` function that
 * provides autocomplete for the specified role names.
 *
 * @template T - Readonly array of role name strings
 * @param roles - Array of realm role names to check
 * @returns Object with `hasRealmRole` function for type-safe role checking
 *
 * @example Basic usage
 * ```tsx
 * import { useRealmRoles } from 'keycloak-headless/react';
 *
 * function AdminPanel() {
 *   const { hasRealmRole } = useRealmRoles(['admin', 'moderator'] as const);
 *
 *   if (!hasRealmRole('admin')) {
 *     return <div>Access denied</div>;
 *   }
 *
 *   return <div>Admin Panel</div>;
 * }
 * ```
 *
 * @example Multiple role checks
 * ```tsx
 * function Dashboard() {
 *   const { hasRealmRole } = useRealmRoles(['admin', 'editor', 'viewer'] as const);
 *
 *   return (
 *     <div>
 *       {hasRealmRole('admin') && <AdminTools />}
 *       {hasRealmRole('editor') && <EditorTools />}
 *       {hasRealmRole('viewer') && <ViewerTools />}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Conditional rendering
 * ```tsx
 * function UserList() {
 *   const { hasRealmRole } = useRealmRoles(['user-manager'] as const);
 *
 *   return (
 *     <div>
 *       <h2>Users</h2>
 *       {hasRealmRole('user-manager') ? (
 *         <button>Add User</button>
 *       ) : (
 *         <p>View only</p>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useRealmRoles<const T extends readonly string[]>(roles: T) {
  const { keycloak } = useAuth();
  return createRealmRoleChecker(keycloak, roles);
}

/**
 * React hook for type-safe role checking using generated Keycloak config.
 *
 * This hook works with the Vite plugin-generated configuration to provide
 * fully type-safe role checking with autocomplete for both realm and client roles.
 * The config is typically imported from the generated file.
 *
 * @template C - KeycloakRolesConfig type
 * @param config - Generated Keycloak roles configuration object
 * @returns Object with `hasRealmRole` and `hasClientRole` functions
 *
 * @example With generated config
 * ```tsx
 * import { useKeycloakConfigRoles } from 'keycloak-headless/react';
 * import { KEYCLOAK_CONFIG } from './keycloak-config.generated';
 *
 * function ProtectedFeature() {
 *   const { hasRealmRole, hasClientRole } = useKeycloakConfigRoles(KEYCLOAK_CONFIG);
 *
 *   // Type-safe role checking with autocomplete
 *   if (!hasRealmRole('premium-user')) {
 *     return <UpgradePrompt />;
 *   }
 *
 *   return <PremiumFeature />;
 * }
 * ```
 *
 * @example Client roles
 * ```tsx
 * function ClientSpecificFeature() {
 *   const { hasClientRole } = useKeycloakConfigRoles(KEYCLOAK_CONFIG);
 *
 *   // Check client-specific roles
 *   if (hasClientRole('my-client', 'manage-users')) {
 *     return <UserManagement />;
 *   }
 *
 *   return <div>Access denied</div>;
 * }
 * ```
 *
 * @example Multiple role checks
 * ```tsx
 * function Dashboard() {
 *   const { hasRealmRole, hasClientRole } = useKeycloakConfigRoles(KEYCLOAK_CONFIG);
 *
 *   const isAdmin = hasRealmRole('admin');
 *   const canManageUsers = hasClientRole('my-app', 'manage-users');
 *   const canViewReports = hasClientRole('my-app', 'view-reports');
 *
 *   return (
 *     <div>
 *       {isAdmin && <AdminPanel />}
 *       {canManageUsers && <UserManagement />}
 *       {canViewReports && <Reports />}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Role-based navigation
 * ```tsx
 * function Navigation() {
 *   const { hasRealmRole } = useKeycloakConfigRoles(KEYCLOAK_CONFIG);
 *
 *   return (
 *     <nav>
 *       <Link to="/">Home</Link>
 *       {hasRealmRole('user') && <Link to="/dashboard">Dashboard</Link>}
 *       {hasRealmRole('admin') && <Link to="/admin">Admin</Link>}
 *     </nav>
 *   );
 * }
 * ```
 */
export function useKeycloakConfigRoles<const C extends KeycloakRolesConfig>(
  config: C,
) {
  const { keycloak } = useAuth();
  return createRoleCheckerFromConfig(keycloak, config);
}
