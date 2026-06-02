# Keycloak Headless

Lit-based web components and small framework helpers (React, Vue, Svelte, Solid) around [keycloak-js](https://www.keycloak.org/docs/latest/securing_apps/#_javascript_adapter), with shared auth state via [@lit/context](https://lit.dev/docs/data/context/).

## Installation

```bash
pnpm add keycloak-headless
# or
npm install keycloak-headless
```

## Entry points

| Import | Purpose |
|--------|---------|
| `keycloak-headless` | `authContext`, `AuthState`, and `subscribeAuthContext` only (no custom element registration). |
| `keycloak-headless/provider` | Registers all `kc-*` elements and exports them plus `KcProvider`, `authContext`, `subscribeAuthContext`. |
| `keycloak-headless/react` | `KeycloakProvider`, `useAuth`, `AuthBridge`, and context helpers (registers `kc-provider` when used). |
| `keycloak-headless/vue` | `useKeycloakAuth`, `useKeycloakConfigRoles`, `subscribeAuthContext`, and `AuthState` (no custom element registration). |
| `keycloak-headless/svelte` | `useKeycloakAuth` store factory, `subscribeAuthContext`, and `AuthState`. |
| `keycloak-headless/solid` | `useKeycloakAuth`, `subscribeAuthContext`, and `AuthState`. |
| `keycloak-headless/vite` | `keycloakRolesPlugin` — generates typed `KEYCLOAK_CONFIG` from a realm roles export JSON file. |

Always import `keycloak-headless/provider` (side-effect or explicit imports) in apps that use the web components, so custom elements are defined.

## Web components

Mount `<kc-provider>` with `url`, `realm`, and `client-id` (or the `clientId` property in frameworks). Optional `scope` and any [Keycloak `init` options](https://www.keycloak.org/docs/latest/securing_apps/#_javascript_adapter) below are forwarded to `keycloak.init()`. Nested components consume `authContext`.

**`kc-provider` init attributes** (omit optional flags to keep Keycloak defaults; boolean flags use `true` / `false`, or `0` / `no` for false):

| Attribute | Maps to `KeycloakInitOptions` |
|-----------|-------------------------------|
| `on-load` | `onLoad` — `check-sso` (default) or `login-required` |
| `scope` | `scope` |
| `use-nonce` | `useNonce` |
| `adapter` | `adapter` — `default`, `cordova`, or `cordova-native` |
| `check-login-iframe` | `checkLoginIframe` |
| `check-login-iframe-interval` | `checkLoginIframeInterval` |
| `response-mode` | `responseMode` — `query` or `fragment` |
| `redirect-uri` | `redirectUri` |
| `silent-check-sso-redirect-uri` | `silentCheckSsoRedirectUri` |
| `silent-check-sso-fallback` | `silentCheckSsoFallback` |
| `flow` | `flow` — `standard`, `implicit`, or `hybrid` |
| `pkce-method` | `pkceMethod` — `S256` or `false` (string) to disable PKCE |
| `enable-logging` | `enableLogging` |
| `message-receive-timeout` | `messageReceiveTimeout` |
| `locale` | `locale` |
| `logout-method` | `logoutMethod` — `GET` or `POST` |

Programmatic-only (no HTML attribute): set the `token`, `refreshToken`, `idToken`, and `timeSkew` properties when you need to restore a session from your host app.

| Element | Role |
|---------|------|
| `<kc-provider>` | Initializes Keycloak and provides auth context. |
| `<kc-login-button>` | Renders slotted content when the user can log in; click delegates to `keycloak.login()`. |
| `<kc-logout-button>` | Renders when authenticated; delegates to `keycloak.logout()`. |
| `<kc-account-link>` | When authenticated, opens the account console URL from `keycloak.createAccountUrl()`. Optional `redirect-uri` attribute. |
| `<kc-render-authenticated>` | Slot visible only when `authenticated` is true. |
| `<kc-render-guest>` | Slot visible when Keycloak exists and the user is not authenticated. |
| `<kc-render-roles>` | Slot when the user has required realm or client roles (`roles`, `role-kind`, `match`, optional `resource`). |
| `<kc-error-display>` | Displays errors with user-friendly messages and retry button. |
| `<kc-loading>` | Shows loading spinner during authentication. |

Slot-based buttons: put a real `<button type="button">` (or other focusable control) inside each interactive component so keyboard and screen-reader behavior stay correct.

## React

```tsx
import "keycloak-headless/provider";
import { KeycloakProvider, useAuth } from "keycloak-headless/react";

export function App() {
  return (
    <KeycloakProvider
      url="https://keycloak.example/auth/"
      realm="myrealm"
      clientId="my-spa"
    >
      <AuthPanel />
    </KeycloakProvider>
  );
}

function AuthPanel() {
  const { keycloak, authenticated, error } = useAuth();
  // …
}
```

`KeycloakProvider` renders `<kc-provider>` and `AuthBridge`, which bridges Lit context into `AuthReactContext` for `useAuth()`.

## Vue

Import `keycloak-headless/vue` after `keycloak-headless/provider` so custom elements are defined. Use a template ref on a normal element inside `<kc-provider>`:

```vue
<script setup lang="ts">
import "keycloak-headless/provider";
import { computed, ref } from "vue";
import { useKeycloakAuth, useKeycloakConfigRoles } from "keycloak-headless/vue";

import { KEYCLOAK_CONFIG } from "./keycloak-config.generated.js";

const hostRef = ref<HTMLElement | null>(null);
const auth = useKeycloakAuth(hostRef);
const roleChecks = useKeycloakConfigRoles(auth, KEYCLOAK_CONFIG);
const showAdmin = computed(() => roleChecks.value.hasRealmRole("admin"));
</script>

<template>
  <kc-provider url="…" realm="…" client-id="…">
    <div ref="hostRef">
      <p v-if="showAdmin">Has admin role</p>
      <kc-render-roles :roles="realmRolesAttr('admin')" role-kind="realm" match="any">
        …
      </kc-render-roles>
    </div>
  </kc-provider>
</template>
```

`useKeycloakAuth` mirrors the React `AuthBridge` pattern: it subscribes to Lit context and tears down when the host ref or component scope changes. Pair it with `keycloakRolesPlugin` (see [Typed realm roles](#typed-realm-roles)) and `useKeycloakConfigRoles` for the same compile-time role names as the React example.

## Svelte

```svelte
<script lang="ts">
  import "keycloak-headless/provider";
  import { useKeycloakAuth } from "keycloak-headless/svelte";

  let host: HTMLDivElement | undefined;
  const auth = useKeycloakAuth(() => host ?? null);
</script>

<kc-provider url="…" realm="…" client-id="…">
  <div bind:this={host}>{$auth.keycloak ? "Ready" : "…"}</div>
</kc-provider>
```

The store updates when `bind:this` attaches the host node.

## Solid

```tsx
import "keycloak-headless/provider";
import { useKeycloakAuth } from "keycloak-headless/solid";

export function Panel() {
  let host: HTMLDivElement | undefined;
  const auth = useKeycloakAuth(() => host ?? null);
  return (
    <div ref={(el) => (host = el)}>{auth().keycloak ? "Ready" : "…"}</div>
  );
}
```

## Typed realm roles (Vite)

When using the optional [`headless-role-created`](providers/role-created-event-listener/) Keycloak provider, realm and client roles are exported to `{realm}-roles.json`. The Vite plugin watches that file and regenerates a typed config on change.

```ts
// vite.config.ts
import { keycloakRolesPlugin } from "keycloak-headless/vite";

export default defineConfig({
  plugins: [
    keycloakRolesPlugin({
      input: process.env.KEYCLOAK_ROLES_EXPORT ?? "/tmp/keycloak-role-exports/master-roles.json",
      output: "src/keycloak-config.generated.ts",
    }),
  ],
});
```

Generated output (do not edit):

```ts
export const KEYCLOAK_CONFIG = {
  realm: "master",
  exportedAt: 1710000000000,
  roles: ["admin", "editor"] as const,
  clientRoles: { "my-spa": ["read"] as const },
} as const;
export type RealmRole = (typeof KEYCLOAK_CONFIG.roles)[number];
```

React:

```tsx
import { useKeycloakConfigRoles } from "keycloak-headless/react";
import { KEYCLOAK_CONFIG } from "./keycloak-config.generated.js";

const { hasRealmRole } = useKeycloakConfigRoles(KEYCLOAK_CONFIG);
hasRealmRole("admin"); // ok
hasRealmRole("typo"); // TypeScript error
```

The export defines **which roles exist** in the realm; `hasRealmRole` still checks the **current user’s token** via keycloak-js. Regenerate when roles change in Keycloak (the plugin does this automatically in dev when the JSON file changes).

See [`example/react/vite.config.ts`](example/react/vite.config.ts) and [`example/vue/vite.config.ts`](example/vue/vite.config.ts) for working setups using the committed fixture at `scripts/fixtures/master-roles.json`.

Example `pnpm build` scripts run `tsc --noEmit` before Vite, so invalid role names fail the build. Run `pnpm build` at the repo root first so workspace `keycloak-headless` declaration files are up to date.

## Any framework

`subscribeAuthContext` from `keycloak-headless` or `keycloak-headless/provider` dispatches a Lit context request from any `Element` under `<kc-provider>`. It returns a disposer so you can unsubscribe on teardown. The React `AuthBridge`, `useKeycloakAuth` helpers above, and framework examples all build on this.

## Auth state

`AuthState` includes:

- `keycloak` — adapter instance (when initialization ran).
- `authenticated` — boolean when known.
- `error` — `unknown`; set if `init()` throws, on `onAuthError`, or on `onAuthRefreshError`. Cleared on successful auth sync.
- `loading` — boolean indicating if authentication is in progress.
- `loadingMessage` — optional message to display during loading.

Narrow errors in UI, for example:

```ts
function message(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
```

## Error Handling

The library provides comprehensive error handling with typed errors, automatic retry, user-friendly messages, and recovery strategies.

### Error Types

All Keycloak errors extend `KeycloakError` with structured error codes:

```ts
import { KeycloakError, ErrorCodes } from "keycloak-headless";

// Error types:
// - KeycloakInitError - Initialization failures
// - KeycloakAuthError - Authentication failures
// - KeycloakTokenError - Token refresh failures
// - KeycloakConfigError - Configuration errors
// - KeycloakNetworkError - Network errors

if (error instanceof KeycloakError) {
  console.log(error.code);           // e.g., "KC_INIT_1001"
  console.log(error.userMessage);    // User-friendly message
  console.log(error.suggestedAction); // Recovery suggestion
  console.log(error.recoverable);    // Can retry?
}
```

### Automatic Retry

`<kc-provider>` automatically retries failed initialization with exponential backoff:

```html
<kc-provider
  url="https://keycloak.example.com/"
  realm="myrealm"
  client-id="my-spa"
  retry-attempts="3"
  retry-delay="1000"
  auto-retry="true">
</kc-provider>
```

**Retry Attributes:**
- `retry-attempts` - Maximum retry attempts (default: 3)
- `retry-delay` - Initial delay in ms (default: 1000)
- `auto-retry` - Enable automatic retry (default: true)

### Error Events

Listen for error events to handle failures:

```ts
const provider = document.querySelector('kc-provider');

// Error occurred
provider.addEventListener('kc-error', (e) => {
  const { error, canRetry, timestamp } = e.detail;
  console.error(error.userMessage);
  if (canRetry) showRetryButton();
});

// Retry attempt
provider.addEventListener('kc-retry', (e) => {
  const { attempt, maxAttempts, delay } = e.detail;
  console.log(`Retry ${attempt}/${maxAttempts} in ${delay}ms`);
});

// State change
provider.addEventListener('kc-state-change', (e) => {
  const { previous, current } = e.detail;
  console.log('Auth state changed', current);
});
```

Or use callbacks:

```ts
provider.onError = (error) => {
  console.error(error.userMessage);
};

provider.onRetry = ({ attempt, maxAttempts }) => {
  console.log(`Retrying ${attempt}/${maxAttempts}`);
};
```

### Error Display Components

#### Web Components

```html
<kc-provider url="..." realm="..." client-id="...">
  <kc-loading message="Authenticating..."></kc-loading>
  <kc-error-display show-retry></kc-error-display>
  <kc-render-authenticated>
    <!-- Your app -->
  </kc-render-authenticated>
</kc-provider>
```

`<kc-error-display>` automatically shows errors from the auth context with:
- User-friendly error messages
- Suggested recovery actions
- Retry button (if recoverable)
- Technical details toggle

`<kc-loading>` shows a spinner during initialization and retries.

#### React

Display authentication errors from the auth context:

```tsx
import { ErrorDisplay } from "keycloak-headless/react";

function App() {
  const { error } = useAuth();
  const providerRef = useRef<HTMLElement>();

  return (
    <>
      {error && (
        <ErrorDisplay
          error={error}
          onRetry={() => providerRef.current?.retry()}
        />
      )}
      <YourApp />
    </>
  );
}
```

**ErrorBoundary** (Optional) - Use if you want to catch Keycloak errors thrown during render:

The provided `ErrorBoundary` is optional and designed for specific use cases:

1. **Wrap KeycloakProvider** to catch initialization errors:
```tsx
import { ErrorBoundary } from "keycloak-headless/react";

<ErrorBoundary onError={(error) => logToService(error)}>
  <KeycloakProvider url="..." realm="..." clientId="...">
    <App />
  </KeycloakProvider>
</ErrorBoundary>
```

2. **Use with your existing error boundary** - The library exports `KeycloakError` types that your error boundary can handle:
```tsx
// Your existing error boundary
class AppErrorBoundary extends React.Component {
  componentDidCatch(error: Error) {
    if (error instanceof KeycloakError) {
      // Handle Keycloak-specific errors
      console.log(error.userMessage, error.suggestedAction);
    }
    // Handle other errors...
  }
}
```

3. **Custom fallback UI**:
```tsx
<ErrorBoundary
  fallback={(error, reset) => (
    <div>
      <h1>{error.userMessage}</h1>
      <p>{error.suggestedAction}</p>
      <button onClick={reset}>Try Again</button>
    </div>
  )}
>
  <KeycloakProvider>...</KeycloakProvider>
</ErrorBoundary>
```

**Note**: Most apps should handle auth errors via the `error` property in `useAuth()` rather than error boundaries. The `ErrorBoundary` is provided for convenience but is entirely optional.

### Manual Retry

Programmatically retry initialization:

```ts
const provider = document.querySelector('kc-provider');
await provider.retry();
```

React:

```tsx
const providerRef = useRef<HTMLElement>();
// Later:
await providerRef.current?.retry();
```

### Error Logging

Configure custom error logging:

```ts
import {
  ConsoleErrorLogger,
  MemoryErrorLogger,
  RemoteErrorLogger,
  CompositeErrorLogger
} from "keycloak-headless";

// Console logger (default)
const consoleLogger = new ConsoleErrorLogger(100); // max 100 entries

// Memory logger (for testing)
const memoryLogger = new MemoryErrorLogger(50);

// Remote logger (sends to endpoint)
const remoteLogger = new RemoteErrorLogger('https://api.example.com/errors', {
  batchSize: 10,
  flushInterval: 30000, // 30 seconds
});

// Composite logger (multiple destinations)
const logger = new CompositeErrorLogger([
  consoleLogger,
  remoteLogger,
]);

// Set on provider
provider.errorLogger = logger;

// Get logged errors
const errors = logger.getErrors();
```

### Error Recovery Patterns

**Network Errors** - Automatically retried with exponential backoff.

**Configuration Errors** - Not retried (require code changes).

**Token Refresh Failures** - User should re-authenticate:

```ts
provider.addEventListener('auth-refresh-error', () => {
  // Show login prompt
  provider.keycloak?.login();
});
```

**Session Expired** - Redirect to login:

```ts
provider.addEventListener('token-expired', () => {
  if (!provider.keycloak?.authenticated) {
    provider.keycloak?.login();
  }
});
```

## API Reference

### Web Components

#### `<kc-provider>`
Main provider component that initializes Keycloak and provides auth context.

**Required Attributes:**
- `url` - Keycloak server URL
- `realm` - Realm name
- `client-id` - Client ID

**Optional Attributes:**
- `on-load` - `"check-sso"` (default) or `"login-required"`
- `scope` - OAuth scopes (space-separated)
- `pkce-method` - `"S256"` (recommended) or `"false"`
- See [full list above](#web-components)

**Example:**
```html
<kc-provider url="https://keycloak.example.com/" realm="myrealm" client-id="my-spa">
  <!-- Your app content -->
</kc-provider>
```

#### `<kc-login-button>`
Renders slot content when user can log in. Click triggers login.

**Example:**
```html
<kc-login-button>
  <button>Login</button>
</kc-login-button>
```

#### `<kc-logout-button>`
Renders slot content when authenticated. Click triggers logout.

**Example:**
```html
<kc-logout-button>
  <button>Logout</button>
</kc-logout-button>
```

#### `<kc-account-link>`
Opens Keycloak Account Console when clicked.

**Optional Attributes:**
- `redirect-uri` - URI to return to after leaving Account Console

**Example:**
```html
<kc-account-link redirect-uri="https://myapp.com/profile">
  <a href="#">My Account</a>
</kc-account-link>
```

#### `<kc-render-authenticated>`
Conditionally renders content only when authenticated.

**Example:**
```html
<kc-render-authenticated>
  <p>Welcome back!</p>
</kc-render-authenticated>
```

#### `<kc-render-guest>`
Conditionally renders content only when NOT authenticated.

**Example:**
```html
<kc-render-guest>
  <p>Please log in</p>
</kc-render-guest>
```

#### `<kc-render-roles>`
Conditionally renders based on user roles.

**Attributes:**
- `roles` - Comma-separated role names (e.g., `"admin,editor"`)
- `match` - `"any"` (default, OR logic) or `"all"` (AND logic)
- `role-kind` - `"realm"` (default) or `"client"`
- `resource` - Client ID (required for client roles)

**Examples:**
```html
<!-- Realm role - single -->
<kc-render-roles roles="admin">
  <button>Admin Panel</button>
</kc-render-roles>

<!-- Multiple roles - any match -->
<kc-render-roles roles="admin,moderator" match="any">
  <div>Admin or Moderator content</div>
</kc-render-roles>

<!-- Client roles -->
<kc-render-roles roles="manage-users" role-kind="client" resource="my-client">
  <div>User Management</div>
</kc-render-roles>
```

### React API

#### `KeycloakProvider`
React wrapper for `<kc-provider>`.

**Props:** Same as `<kc-provider>` attributes (camelCase)

**Example:**
```tsx
<KeycloakProvider url="..." realm="..." clientId="...">
  <App />
</KeycloakProvider>
```

#### `useAuth()`
Hook to access authentication state.

**Returns:** `AuthState` object with:
- `keycloak` - Keycloak instance
- `authenticated` - boolean or undefined
- `error` - Error if any

**Example:**
```tsx
const { keycloak, authenticated, error } = useAuth();
```

#### `useRealmRoles(roles)`
Type-safe realm role checking.

**Parameters:**
- `roles` - Array of role names (use `as const`)

**Returns:** Object with `hasRealmRole(role)` function

**Example:**
```tsx
const { hasRealmRole } = useRealmRoles(['admin', 'editor'] as const);
if (hasRealmRole('admin')) { /* ... */ }
```

#### `useKeycloakConfigRoles(config)`
Type-safe role checking with generated config.

**Parameters:**
- `config` - Generated `KEYCLOAK_CONFIG` object

**Returns:** Object with `hasRealmRole(role)` and `hasClientRole(client, role)` functions

**Example:**
```tsx
const { hasRealmRole, hasClientRole } = useKeycloakConfigRoles(KEYCLOAK_CONFIG);
```

### Vue API

#### `useKeycloakAuth(hostRef)`
Composable for accessing auth state.

**Parameters:**
- `hostRef` - Ref to an element inside `<kc-provider>`

**Returns:** Ref to `AuthState`

**Example:**
```vue
<script setup>
const hostRef = ref(null);
const auth = useKeycloakAuth(hostRef);
</script>
<template>
  <div ref="hostRef">{{ auth.authenticated }}</div>
</template>
```

#### `useKeycloakConfigRoles(auth, config)`
Composable for type-safe role checking.

**Parameters:**
- `auth` - Auth state from `useKeycloakAuth`
- `config` - Generated `KEYCLOAK_CONFIG`

**Returns:** Computed ref with role checker functions

### Svelte API

#### `useKeycloakAuth(getHost)`
Store factory for auth state.

**Parameters:**
- `getHost` - Function returning host element

**Returns:** Readable store with `AuthState`

**Example:**
```svelte
<script>
let host;
const auth = useKeycloakAuth(() => host ?? null);
</script>
<div bind:this={host}>{$auth.authenticated}</div>
```

### Solid API

#### `useKeycloakAuth(getHost)`
Signal-based auth state accessor.

**Parameters:**
- `getHost` - Function returning host element

**Returns:** Accessor function returning `AuthState`

**Example:**
```tsx
let host;
const auth = useKeycloakAuth(() => host ?? null);
return <div ref={host}>{auth().authenticated}</div>;
```

### Vite Plugin

#### `keycloakRolesPlugin(options)`
Generates typed config from Keycloak roles export.

**Options:**
- `input` - Path to `{realm}-roles.json` file
- `output` - Path for generated TypeScript file

**Example:**
```ts
// vite.config.ts
import { keycloakRolesPlugin } from 'keycloak-headless/vite';

export default defineConfig({
  plugins: [
    keycloakRolesPlugin({
      input: '/tmp/keycloak-role-exports/master-roles.json',
      output: 'src/keycloak-config.generated.ts',
    }),
  ],
});
```

## Troubleshooting

### Common Issues

#### "Keycloak init failed" Error

**Symptoms**: Console error on page load, authentication doesn't start

**Causes**:
1. Incorrect Keycloak server URL
2. Realm or client-id doesn't exist
3. CORS not configured in Keycloak
4. Network connectivity issues

**Solutions**:
- Verify URL format includes `/auth/` suffix for older Keycloak versions (pre-17), or just base URL for Keycloak 17+
- Check realm and client exist in Keycloak Admin Console
- Add your app's origin to "Web Origins" in client settings (e.g., `http://localhost:5173` for dev)
- Check browser DevTools Network tab for failed requests
- Ensure client is set to "Public" access type for SPAs

#### Infinite Redirect Loop

**Symptoms**: Page keeps redirecting to Keycloak and back

**Causes**:
1. `redirect-uri` mismatch
2. Invalid client configuration
3. Session cookie issues

**Solutions**:
- Ensure "Valid Redirect URIs" in Keycloak matches your app URL exactly (including protocol and port)
- Use `on-load="check-sso"` instead of `"login-required"` for SPAs to avoid forced redirects
- Clear browser cookies and try again
- Check for `redirectUri` typos in configuration
- Verify "Valid Post Logout Redirect URIs" is also configured

#### Roles Not Working

**Symptoms**: `<kc-render-roles>` doesn't show content despite having roles

**Causes**:
1. Role not assigned to user
2. Wrong `role-kind` (realm vs client)
3. Incorrect `resource` for client roles
4. Token not refreshed after role changes

**Solutions**:
- Verify role assignment in Keycloak Admin Console under Users → Role Mapping
- Use `role-kind="realm"` for realm roles, `"client"` for client roles
- For client roles, set `resource` to the exact client ID where the role is defined
- Log out and log back in to get fresh token with new roles
- Check token contents in browser DevTools → Application → Cookies or use jwt.io

#### TypeScript Errors with Generated Config

**Symptoms**: Type errors when using `KEYCLOAK_CONFIG`

**Causes**:
1. Generated file not created
2. Vite plugin not running
3. Stale generated file

**Solutions**:
- Ensure `keycloakRolesPlugin` is in `vite.config.ts` plugins array
- Check that input JSON file exists and is valid
- Delete generated file and restart dev server
- Run `pnpm build` to regenerate types
- Verify the JSON file path is correct (absolute or relative to project root)

#### Token Refresh Failures

**Symptoms**: User logged out unexpectedly, "Token refresh failed" errors

**Causes**:
1. Refresh token expired
2. Session timeout in Keycloak
3. Network issues during refresh

**Solutions**:
- Increase "SSO Session Idle" timeout in Keycloak realm settings (default is 30 minutes)
- Increase "SSO Session Max" for longer sessions
- Implement token refresh error handling in your app
- Use `onAuthRefreshError` callback to prompt re-login
- Consider implementing automatic token refresh before expiry

#### Components Not Rendering

**Symptoms**: Web components don't appear or show as unknown elements

**Causes**:
1. Forgot to import `keycloak-headless/provider`
2. Import order issues
3. Custom elements not supported

**Solutions**:
- Always import `keycloak-headless/provider` before using components
- Import provider at the top of your entry file (e.g., `main.tsx`)
- Check browser console for "Failed to execute 'define' on 'CustomElementRegistry'" errors
- Verify browser supports Custom Elements (Chrome 90+, Firefox 88+, Safari 14+)

#### CORS Errors

**Symptoms**: Network requests blocked by CORS policy

**Causes**:
1. Web Origins not configured in Keycloak
2. Incorrect origin format

**Solutions**:
- In Keycloak Admin Console, go to Clients → Your Client → Settings
- Add your app's origin to "Web Origins" (e.g., `http://localhost:5173`, `https://myapp.com`)
- Use `*` for development only (not recommended for production)
- Ensure protocol (http/https) matches exactly
- Check that Keycloak server is accessible from your network

### Browser Compatibility

- **Minimum**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Required**: ES2021 support, Custom Elements v1, Shadow DOM
- **Polyfills**: Not provided - use modern browsers or add your own polyfills

### Performance Tips

1. **Lazy Load Components**: Import components only when needed
   ```tsx
   const AdminPanel = lazy(() => import('./AdminPanel'));
   ```

2. **Minimize Token Checks**: Cache role check results in components
   ```tsx
   const isAdmin = useMemo(() => hasRealmRole('admin'), [hasRealmRole]);
   ```

3. **Use `check-sso`**: Avoid forced login on every page load
   ```html
   <kc-provider on-load="check-sso" ...>
   ```

4. **Enable Token Refresh**: Set appropriate session timeouts in Keycloak
   - SSO Session Idle: 30 minutes (default)
   - SSO Session Max: 10 hours (adjust based on security requirements)

5. **Optimize Bundle Size**: Import only what you need
   ```tsx
   // Good: Import specific hooks
   import { useAuth } from 'keycloak-headless/react';
   
   // Avoid: Importing everything
   import * as Keycloak from 'keycloak-headless/react';
   ```

### Getting Help

- **GitHub Issues**: [https://github.com/keycloak/keycloak-headless/issues](https://github.com/keycloak/keycloak-headless/issues)
- **Discussions**: [https://github.com/keycloak/keycloak-headless/discussions](https://github.com/keycloak/keycloak-headless/discussions)
- **Keycloak Docs**: [https://www.keycloak.org/docs/latest/](https://www.keycloak.org/docs/latest/)
- **Keycloak Discourse**: [https://keycloak.discourse.group/](https://keycloak.discourse.group/)

When reporting issues, please include:
- Keycloak version
- Browser and version
- Framework and version (React, Vue, etc.)
- Minimal reproduction code
- Console errors and network logs

## Development

Requirements: Node.js 18+, pnpm.

```bash
pnpm install
pnpm build        # library build to dist/
pnpm test         # Vitest
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm example:react
pnpm example:vue
```

## Keycloak server provider

The optional [`headless-role-created`](providers/role-created-event-listener/) listener exports realm and client roles to `{realm}-roles.json` when roles are created via the Admin API. For local development, install the npm package **`keycloak-headless-role-created`** (pre-built JAR) and pass it to [`keycloak-runner`](https://www.npmjs.com/package/keycloak-runner) with `-p`, as in [`example/react/package.json`](example/react/package.json).

This will ensure that the roles are typechecked when you are creating your project.

## License

Apache-2.0
