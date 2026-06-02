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

Narrow errors in UI, for example:

```ts
function message(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
```

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
