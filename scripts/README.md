# Keycloak Roles CLI Tool

A command-line tool to fetch roles from a running Keycloak instance and generate TypeScript type definitions.

## Overview

This tool connects to a Keycloak server via the Admin REST API, fetches all realm and client roles, and exports them in a format compatible with the `keycloak-roles-plugin` for automatic TypeScript type generation.

## Installation

### For Projects Using keycloak-headless

The CLI tool is automatically available when you install `keycloak-headless`:

```bash
npm install keycloak-headless
# or
pnpm add keycloak-headless
# or
yarn add keycloak-headless
```

The `fetch-keycloak-roles` command will be available in your project's `node_modules/.bin/` directory.

### For Development (This Repository)

Dependencies are already installed. Use the development script:

```bash
pnpm fetch-roles
```

## Usage

### In Your Project

After installing `keycloak-headless`, you can use the CLI tool directly:

```bash
# Using npx
npx fetch-keycloak-roles \
  --url http://localhost:8080 \
  --realm master \
  --username admin \
  --password admin \
  --output ./src/keycloak-roles.json

# Or add to your package.json scripts
```

**Add to your `package.json`:**

```json
{
  "scripts": {
    "fetch-roles": "fetch-keycloak-roles --url http://localhost:8080 --realm master --username admin --password admin --output ./src/keycloak-roles.json"
  }
}
```

Then run:

```bash
npm run fetch-roles
```

### Basic Usage

```bash
fetch-keycloak-roles \
  --url http://localhost:8080 \
  --realm master \
  --username admin \
  --password admin \
  --output ./keycloak-roles.json
```

### Using Environment Variables

For better security, you can use environment variables for credentials:

```bash
export KEYCLOAK_ADMIN_USERNAME=admin
export KEYCLOAK_ADMIN_PASSWORD=admin

pnpm fetch-roles \
  --url http://localhost:8080 \
  --realm master \
  --output ./keycloak-roles.json
```

### Filter Clients

To only fetch roles from specific clients (useful for large Keycloak instances):

```bash
pnpm fetch-roles \
  --url http://localhost:8080 \
  --realm master \
  --username admin \
  --password admin \
  --client-filter "example-spa" \
  --output ./keycloak-roles.json
```

## Command Options

| Option | Alias | Description | Default | Required |
|--------|-------|-------------|---------|----------|
| `--url <url>` | `-u` | Keycloak server URL | `http://localhost:8080` | Yes |
| `--realm <realm>` | `-r` | Realm name | `master` | Yes |
| `--username <username>` | | Admin username | `$KEYCLOAK_ADMIN_USERNAME` | Yes |
| `--password <password>` | | Admin password | `$KEYCLOAK_ADMIN_PASSWORD` | Yes |
| `--output <path>` | `-o` | Output file path | `./keycloak-roles.json` | Yes |
| `--client-filter <filter>` | `-c` | Filter clients by name (partial match) | - | No |

## Output Format

The tool generates a JSON file in the `RealmRolesExport` format:

```json
{
  "realm": "master",
  "realmId": "abc-123",
  "exportedAt": 1234567890000,
  "roles": {
    "realm": [
      { "id": "1", "name": "admin" },
      { "id": "2", "name": "user" }
    ],
    "client": {
      "example-spa": [
        { "id": "3", "name": "read" },
        { "id": "4", "name": "write" }
      ]
    }
  }
}
```

## Integration with Vite Plugin

Once you have the roles JSON file, the Vite plugin will automatically generate TypeScript types:

```typescript
// vite.config.ts
import { keycloakRolesPlugin } from 'keycloak-headless/vite';

export default defineConfig({
  plugins: [
    keycloakRolesPlugin({
      input: './keycloak-roles.json',
      output: './src/keycloak-config.generated.ts',
    }),
  ],
});
```

This generates type-safe role definitions:

```typescript
// Generated file
export type RealmRole = "admin" | "user";
export type ClientId = "example-spa";
export type ClientRole<C extends ClientId> = 
  C extends "example-spa" ? "read" | "write" : never;
```

## Workflow Comparison

### Option 1: Event Listener (Automatic)

```bash
# Start Keycloak with event listener
pnpm run run-keycloak

# Roles are automatically exported when created/updated
# File: /tmp/keycloak-role-exports/master-roles.json
```

**Pros:**
- Automatic synchronization
- Real-time updates during development
- No manual intervention needed

**Cons:**
- Requires custom Keycloak setup
- Only works during development

### Option 2: CLI Tool (Manual)

```bash
# Fetch roles from any running Keycloak instance
pnpm fetch-roles \
  --url https://keycloak.production.com \
  --realm production \
  --username admin \
  --password $ADMIN_PASSWORD \
  --output ./production-roles.json
```

**Pros:**
- Works with any Keycloak instance (dev, staging, production)
- No custom Keycloak configuration needed
- Can be integrated into CI/CD pipelines
- Useful for initial setup or one-time exports

**Cons:**
- Manual execution required
- Requires admin credentials

## Examples

### Development Workflow (In Your Project)

```bash
# 1. Install keycloak-headless
npm install keycloak-headless

# 2. Fetch roles from your Keycloak instance
npx fetch-keycloak-roles \
  --url http://localhost:8080 \
  --realm master \
  --username admin \
  --password admin \
  --output ./src/keycloak-roles.json

# 3. Configure Vite plugin in vite.config.ts
# (see Integration with Vite Plugin section above)

# 4. Start development server
npm run dev

# 5. TypeScript types are automatically generated!
# Use them in your code with full type safety
```

### Development Workflow (This Repository)

```bash
# 1. Fetch roles from local Keycloak
pnpm fetch-roles \
  --url http://localhost:8080 \
  --realm master \
  --username admin \
  --password admin \
  --output ./keycloak-roles.json

# 2. Start development server (Vite plugin watches the file)
pnpm dev

# 3. TypeScript types are automatically generated
# Use them in your code with full type safety!
```

### CI/CD Integration

```yaml
# .github/workflows/build.yml
- name: Fetch Keycloak roles
  run: |
    pnpm fetch-roles \
      --url ${{ secrets.KEYCLOAK_URL }} \
      --realm production \
      --username ${{ secrets.KEYCLOAK_ADMIN_USER }} \
      --password ${{ secrets.KEYCLOAK_ADMIN_PASSWORD }} \
      --output ./src/keycloak-roles.json

- name: Build application
  run: pnpm build
```

## Troubleshooting

### Authentication Failed

**Error:** `Authentication failed: 401 Unauthorized`

**Solution:** Verify your username and password are correct. Ensure the user has admin privileges in the specified realm.

### Cannot Connect to Keycloak

**Error:** `fetch failed`

**Solution:** 
- Check that Keycloak is running at the specified URL
- Verify the URL includes the protocol (`http://` or `https://`)
- Check firewall/network settings

### No Roles Found

**Issue:** The tool runs successfully but exports empty role arrays.

**Solution:**
- Verify roles exist in the Keycloak realm
- Check that the admin user has permission to view roles
- Try without `--client-filter` to see all clients

## Related Documentation

- [Keycloak Admin REST API](https://www.keycloak.org/docs-api/latest/rest-api/index.html)
- [Vite Plugin Documentation](../src/vite/README.md)
- [Event Listener Provider](../providers/role-created-event-listener/README.md)