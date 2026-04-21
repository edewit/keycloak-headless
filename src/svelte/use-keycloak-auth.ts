import { afterUpdate, onDestroy } from "svelte";
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
  let cleanup: (() => void) | undefined;
  let lastHost: Element | null = null;

  afterUpdate(() => {
    const el = getHost();
    if (el === lastHost) return;
    cleanup?.();
    cleanup = undefined;
    lastHost = el;
    if (!el) {
      inner.set({});
      return;
    }
    cleanup = subscribeAuthContext(el, (v) => inner.set(v));
  });

  onDestroy(() => {
    cleanup?.();
  });

  return { subscribe: inner.subscribe };
}
