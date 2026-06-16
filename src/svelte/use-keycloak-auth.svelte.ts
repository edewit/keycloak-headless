import { writable, type Readable } from "svelte/store";

import type { AuthState } from "../components/provider/kc-context.js";
import { subscribeAuthContext } from "../subscribe-auth-context.js";

/**
 * Readonly store of `AuthState` for a DOM node under `<kc-provider>`.
 * Pass a getter that returns the host element (for example from `bind:this`).
 */
export function useKeycloakAuth(
  getHost: () => Element | null,
): Readable<AuthState> {
  const inner = writable<AuthState>({});

  $effect(() => {
    const el = getHost();
    if (!el) {
      inner.set({});
      return;
    }
    const unsub = subscribeAuthContext(el, (v) => inner.set(v));
    return () => {
      unsub();
    };
  });

  return { subscribe: inner.subscribe };
}
