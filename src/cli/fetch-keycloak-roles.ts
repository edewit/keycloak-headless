#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "commander";
import type {
  RealmRolesExport,
  RoleRepresentation,
} from "../types/realm-roles-export.js";

interface KeycloakTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
}

interface KeycloakClientRepresentation {
  id: string;
  clientId: string;
  name?: string;
  enabled?: boolean;
}

class KeycloakAdminClient {
  private accessToken: string | null = null;

  constructor(
    private url: string,
    private realm: string,
    private username: string,
    private password: string,
  ) {}

  private async authenticate(): Promise<void> {
    const tokenUrl = `${this.url}/realms/${this.realm}/protocol/openid-connect/token`;
    const params = new URLSearchParams({
      grant_type: "password",
      client_id: "admin-cli",
      username: this.username,
      password: this.password,
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Authentication failed: ${response.status} ${response.statusText}\n${error}`,
      );
    }

    const data = (await response.json()) as KeycloakTokenResponse;
    this.accessToken = data.access_token;
  }

  private async request<T>(path: string): Promise<T> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    const url = `${this.url}/admin/realms/${this.realm}${path}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}\n${error}`,
      );
    }

    return response.json() as Promise<T>;
  }

  async getRealmRoles(): Promise<RoleRepresentation[]> {
    return this.request<RoleRepresentation[]>("/roles");
  }

  async getClients(): Promise<KeycloakClientRepresentation[]> {
    return this.request<KeycloakClientRepresentation[]>("/clients");
  }

  async getClientRoles(clientId: string): Promise<RoleRepresentation[]> {
    return this.request<RoleRepresentation[]>(`/clients/${clientId}/roles`);
  }

  async getRealmInfo(): Promise<{ id: string; realm: string }> {
    return this.request<{ id: string; realm: string }>("");
  }
}

async function fetchKeycloakRoles(options: {
  url: string;
  realm: string;
  username: string;
  password: string;
  output: string;
  clientFilter?: string;
}): Promise<void> {
  console.log(`Connecting to Keycloak at ${options.url}...`);
  console.log(`Realm: ${options.realm}`);
  console.log(`Username: ${options.username}`);

  const client = new KeycloakAdminClient(
    options.url,
    options.realm,
    options.username,
    options.password,
  );

  try {
    // Fetch realm info
    console.log("\nFetching realm information...");
    const realmInfo = await client.getRealmInfo();

    // Fetch realm roles
    console.log("Fetching realm roles...");
    const realmRoles = await client.getRealmRoles();
    console.log(`Found ${realmRoles.length} realm roles`);

    // Fetch clients and their roles
    console.log("\nFetching clients...");
    const clients = await client.getClients();
    console.log(`Found ${clients.length} clients`);

    const clientRoles: Record<string, RoleRepresentation[]> = {};
    let processedClients = 0;

    for (const clientRep of clients) {
      // Skip if client filter is specified and doesn't match
      if (
        options.clientFilter &&
        !clientRep.clientId.includes(options.clientFilter)
      ) {
        continue;
      }

      try {
        const roles = await client.getClientRoles(clientRep.id);
        if (roles.length > 0) {
          clientRoles[clientRep.clientId] = roles;
          console.log(
            `  ${clientRep.clientId}: ${roles.length} role${roles.length !== 1 ? "s" : ""}`,
          );
          processedClients++;
        }
      } catch {
        // Some clients may not have roles or may not be accessible
        console.warn(
          `  Warning: Could not fetch roles for client ${clientRep.clientId}`,
        );
      }
    }

    console.log(
      `\nProcessed ${processedClients} client${processedClients !== 1 ? "s" : ""} with roles`,
    );

    // Build export document
    const exportDoc: RealmRolesExport = {
      realm: realmInfo.realm,
      realmId: realmInfo.id,
      exportedAt: Date.now(),
      roles: {
        realm: realmRoles,
        client: clientRoles,
      },
    };

    // Write to file
    const outputPath = resolve(options.output);
    writeFileSync(outputPath, JSON.stringify(exportDoc, null, 2), "utf8");
    console.log(`\n✓ Roles exported to: ${outputPath}`);

    // Summary
    console.log("\nSummary:");
    console.log(`  Realm roles: ${realmRoles.length}`);
    console.log(`  Clients with roles: ${Object.keys(clientRoles).length}`);
    const totalClientRoles = Object.values(clientRoles).reduce(
      (sum, roles) => sum + roles.length,
      0,
    );
    console.log(`  Total client roles: ${totalClientRoles}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`\n✗ Error: ${error.message}`);
    } else {
      console.error(`\n✗ Unknown error:`, error);
    }
    process.exit(1);
  }
}

// CLI setup
const program = new Command();

program
  .name("fetch-keycloak-roles")
  .description("Fetch roles from a Keycloak realm and generate TypeScript types")
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

// Made with Bob
