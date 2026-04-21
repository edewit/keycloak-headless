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
| `keycloak-headless/vue` | `useKeycloakAuth`, `subscribeAuthContext`, and `AuthState` (no custom element registration). |
| `keycloak-headless/svelte` | `useKeycloakAuth` store factory, `subscribeAuthContext`, and `AuthState`. |
| `keycloak-headless/solid` | `useKeycloakAuth`, `subscribeAuthContext`, and `AuthState`. |

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
import { ref } from "vue";
import { useKeycloakAuth } from "keycloak-headless/vue";

const hostRef = ref<HTMLElement | null>(null);
const auth = useKeycloakAuth(hostRef);
</script>

<template>
  <kc-provider url="…" realm="…" client-id="…">
    <div ref="hostRef">…</div>
  </kc-provider>
</template>
```

`useKeycloakAuth` mirrors the React `AuthBridge` pattern: it subscribes to Lit context and tears down when the host ref or component scope changes.

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

## License

Apache-2.0
