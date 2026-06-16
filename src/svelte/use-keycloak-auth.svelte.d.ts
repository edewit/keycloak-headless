import type { Readable } from "svelte/store";

import type { AuthState } from "../components/provider/kc-context.js";

export declare function useKeycloakAuth(
  getHost: () => Element | null,
): Readable<AuthState>;
