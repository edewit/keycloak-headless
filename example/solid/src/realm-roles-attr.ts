/**
 * Helper to convert role names to comma-separated string for kc-render-roles attribute.
 * @param roles - Role names to check
 * @returns Comma-separated string of role names
 */
export function realmRolesAttr(...roles: string[]): string {
  return roles.join(",");
}

// Made with Bob
