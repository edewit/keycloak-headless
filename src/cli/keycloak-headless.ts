#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";

import { buildCreateCommand } from "./create.js";
import { buildFetchKeycloakRolesCommand } from "./fetch-keycloak-roles.js";

const packageRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const { version } = JSON.parse(
  readFileSync(resolve(packageRoot, "package.json"), "utf8"),
) as { version: string };

const program = new Command()
  .name("keycloak-headless")
  .description("Keycloak Headless CLI")
  .version(version);

program.addCommand(buildCreateCommand());
program.addCommand(buildFetchKeycloakRolesCommand("fetch-roles"));

program.parse();
