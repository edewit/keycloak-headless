#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "commander";
import { NetworkError } from "@keycloak/keycloak-admin-client";
import type {
  RealmRolesExport,
  RoleRepresentation,
} from "../types/realm-roles-export.js";
import {
  authenticateAdminClient,
  normalizeKeycloakBaseUrl,
} from "./keycloak-admin.js";

export async function fetchKeycloakRoles(options: {
  url: string;
  realm: string;
  username: string;
  password: string;
  output: string;
  clientFilter?: string;
}): Promise<void> {
  const baseUrl = normalizeKeycloakBaseUrl(options.url);
  console.log(`Connecting to Keycloak at ${baseUrl}...`);
  console.log(`Realm: ${options.realm}`);
  console.log(`Username: ${options.username}`);

  try {
    const client = await authenticateAdminClient({
      baseUrl,
      realm: options.realm,
      credentials: {
        username: options.username,
        password: options.password,
      },
    });

    console.log("\nFetching realm information...");
    const realmInfo = await client.realms.findOne({ realm: options.realm });
    if (!realmInfo?.id || !realmInfo.realm) {
      throw new Error(`Could not find realm "${options.realm}"`);
    }

    console.log("Fetching realm roles...");
    const realmRoles = await client.roles.find();
    console.log(`Found ${realmRoles.length} realm roles`);

    console.log("\nFetching clients...");
    const clients = await client.clients.find();
    console.log(`Found ${clients.length} clients`);

    const clientRoles: Record<string, RoleRepresentation[]> = {};
    let processedClients = 0;

    for (const clientRep of clients) {
      if (!clientRep.id || !clientRep.clientId) {
        continue;
      }

      if (
        options.clientFilter &&
        !clientRep.clientId.includes(options.clientFilter)
      ) {
        continue;
      }

      try {
        const roles = await client.clients.listRoles({ id: clientRep.id });
        if (roles.length > 0) {
          clientRoles[clientRep.clientId] = roles;
          console.log(
            `  ${clientRep.clientId}: ${roles.length} role${roles.length !== 1 ? "s" : ""}`,
          );
          processedClients++;
        }
      } catch {
        console.warn(
          `  Warning: Could not fetch roles for client ${clientRep.clientId}`,
        );
      }
    }

    console.log(
      `\nProcessed ${processedClients} client${processedClients !== 1 ? "s" : ""} with roles`,
    );

    const exportDoc: RealmRolesExport = {
      realm: realmInfo.realm,
      realmId: realmInfo.id,
      exportedAt: Date.now(),
      roles: {
        realm: realmRoles,
        client: clientRoles,
      },
    };

    const outputPath = resolve(options.output);
    writeFileSync(outputPath, JSON.stringify(exportDoc, null, 2), "utf8");
    console.log(`\n✓ Roles exported to: ${outputPath}`);

    console.log("\nSummary:");
    console.log(`  Realm roles: ${realmRoles.length}`);
    console.log(`  Clients with roles: ${Object.keys(clientRoles).length}`);
    const totalClientRoles = Object.values(clientRoles).reduce(
      (sum, roles) => sum + roles.length,
      0,
    );
    console.log(`  Total client roles: ${totalClientRoles}`);
  } catch (error) {
    if (error instanceof NetworkError) {
      console.error(
        `\n✗ Error: ${error.response.status} ${error.response.statusText}`,
      );
      if (error.responseData) {
        console.error(JSON.stringify(error.responseData, null, 2));
      }
    } else if (error instanceof Error) {
      console.error(`\n✗ Error: ${error.message}`);
    } else {
      console.error(`\n✗ Unknown error:`, error);
    }
    process.exit(1);
  }
}

const program = new Command();

program
  .name("fetch-keycloak-roles")
  .description(
    "Fetch roles from a Keycloak realm and generate TypeScript types",
  )
  .version("1.0.0")
  .requiredOption(
    "-u, --url <url>",
    "Keycloak server URL",
    "http://localhost:8080",
  )
  .requiredOption("-r, --realm <realm>", "Realm name", "master")
  .requiredOption(
    "--username <username>",
    "Admin username",
    process.env.KEYCLOAK_ADMIN_USERNAME,
  )
  .requiredOption(
    "--password <password>",
    "Admin password",
    process.env.KEYCLOAK_ADMIN_PASSWORD,
  )
  .requiredOption(
    "-o, --output <path>",
    "Output file path",
    "./keycloak-roles.json",
  )
  .option(
    "-c, --client-filter <filter>",
    "Filter clients by name (partial match)",
  )
  .action(async (options) => {
    await fetchKeycloakRoles(options);
  });

program.parse();
