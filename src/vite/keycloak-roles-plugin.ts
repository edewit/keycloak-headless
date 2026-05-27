import { normalize } from "node:path";
import type { Plugin } from "vite";

import {
  generateKeycloakConfigFile,
  resolveKeycloakRolesPaths,
} from "./generate-keycloak-config.js";

export interface KeycloakRolesPluginOptions {
  /** Path to `{realm}-roles.json` (relative to Vite root or absolute). */
  input: string;
  /** Output path for `keycloak-config.generated.ts`. */
  output: string;
}

export function keycloakRolesPlugin(
  options: KeycloakRolesPluginOptions,
): Plugin {
  let resolvedInput = "";
  let resolvedOutput = "";
  let projectRoot = process.cwd();

  const regenerate = (log: (msg: string) => void): boolean => {
    try {
      const updated = generateKeycloakConfigFile(resolvedInput, resolvedOutput);
      if (updated) {
        log(
          `[keycloak-roles] wrote ${resolvedOutput} from ${resolvedInput}`,
        );
      }
      return updated;
    } catch (error) {
      log(
        `[keycloak-roles] failed to generate from ${resolvedInput}: ${String(error)}`,
      );
      return false;
    }
  };

  return {
    name: "keycloak-roles",
    configResolved(config) {
      projectRoot = config.root;
      const paths = resolveKeycloakRolesPaths(options, projectRoot);
      resolvedInput = paths.input;
      resolvedOutput = paths.output;
    },
    buildStart() {
      regenerate((msg) => this.warn(msg));
    },
    configureServer(server) {
      const run = () => {
        const updated = regenerate((msg) => server.config.logger.warn(msg));
        if (!updated) {
          return;
        }
        const mod = server.moduleGraph.getModuleById(resolvedOutput);
        if (mod != null) {
          server.moduleGraph.invalidateModule(mod);
          server.ws.send({ type: "full-reload" });
        }
      };

      server.watcher.add(resolvedInput);
      const matchesInput = (path: string) =>
        normalize(path) === normalize(resolvedInput);

      server.watcher.on("change", (path) => {
        if (matchesInput(path)) {
          run();
        }
      });
      server.watcher.on("add", (path) => {
        if (matchesInput(path)) {
          run();
        }
      });
    },
  };
}
