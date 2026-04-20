# Keycloak Headless

Lit-based web components and a thin React wrapper around [keycloak-js](https://www.keycloak.org/docs/latest/securing_apps/#_javascript_adapter), with shared auth state via [@lit/context](https://lit.dev/docs/data/context/).

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

Always import `keycloak-headless/provider` (side-effect or explicit imports) in apps that use the web components, so custom elements are defined.

## Web components

Mount `<kc-provider>` with `url`, `realm`, and `clientId` (and optional `scope`). Nested components consume `authContext`.

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

## Vue (and other frameworks)

Use `subscribeAuthContext` with a template ref on an element inside `<kc-provider>`:

```ts
import { onMounted, ref, shallowRef } from "vue";
import {
  subscribeAuthContext,
  type AuthState,
} from "keycloak-headless/provider";

const hostRef = ref<HTMLElement | null>(null);
const auth = shallowRef<AuthState>({});

onMounted(() => {
  const el = hostRef.value;
  if (!el) return;
  subscribeAuthContext(el, (value) => {
    auth.value = value;
  });
});
```

The same helper is used internally by `AuthBridge` in React.

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
