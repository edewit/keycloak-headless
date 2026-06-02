# Role created event listener

Keycloak `EventListenerProvider` that runs when a **realm role** or **client role** is created through the Admin REST API (Admin Console, `kcadm`, Admin Client, etc.).

On each role creation it **exports every realm role and every client role** in that realm to a JSON file.

Provider id: **`headless-role-created`**

## npm install (recommended for local dev)

```bash
npm install keycloak-headless-role-created
# or from this monorepo:
pnpm --filter keycloak-headless-role-created build   # once per clone / after Java changes
```

The published package includes a pre-built JAR at:

`node_modules/keycloak-headless-role-created/target/role-created-event-listener.jar`

### keycloak-runner

Use with [`keycloak-runner`](https://www.npmjs.com/package/keycloak-runner) (multiple `-p` flags). Pass SPI options after `--`:

```bash
keycloak-runner \
  -p node_modules/keycloak-headless-role-created/target/role-created-event-listener.jar \
  --realm master \
  -- --spi-events-listener--headless-role-created--export-directory=/tmp/keycloak-role-exports
```

The React example in this repo runs the same setup via `pnpm --filter example-react run-keycloak` (together with `keycloak-onboarding-ui`).

## Build (Maven)

Always build with Maven (do not rely on IDE output in `target/classes`):

```bash
cd providers/role-created-event-listener
mvn clean package
# or: npm run build
```

The JAR is written to `target/role-created-event-listener.jar`.

Copy **only** that JAR to Keycloak’s `providers/` directory, then run `bin/kc.sh build`.

## Install

1. Copy the JAR to your Keycloak `providers/` directory.
2. Run `bin/kc.sh build` (required for `--optimized` / production images).
3. Start Keycloak.

## Realm configuration

This listener is **global** — once the JAR is installed you do **not** need to add `headless-role-created` under **Realm → Events → Event listeners**.

Roles must still be created through the **Admin API** (Admin Console, `kcadm`, Admin Client). Import/LDAP/internal creation does not trigger export.

Optional: enable **Save events** under **Admin events settings** if you also want events stored in the database.

## Export configuration

| Option | Default | Description |
|--------|---------|-------------|
| `export-enabled` | `true` | Turn JSON export on or off |
| `export-directory` | `$TMPDIR/keycloak-role-exports` | Directory for output files |
| `export-file-name` | `{realm}-roles.json` | File name; `{realm}` is the realm name |
| `log-level` | `info` | Log level when a role is created |

Example (startup / build options). **Quote** the file-name option so the shell does not alter `{realm}`:

```bash
bin/kc.sh build \
  --spi-events-listener--headless-role-created--export-directory=/var/keycloak/role-exports

bin/kc.sh start-dev \
  --spi-events-listener--headless-role-created--export-directory=/tmp/keycloak-role-exports \
  '--spi-events-listener--headless-role-created--export-file-name={realm}-roles.json'
```

On startup you should see a log line like: `headless-role-created role export: enabled=true, directory=...`

After creating a role, look for: `Exported all roles for realm 'myrealm' to /tmp/keycloak-role-exports/myrealm-roles.json`

For realm `myrealm`, the file `/var/keycloak/role-exports/myrealm-roles.json` is rewritten on every role create.

## JSON format

```json
{
  "realm" : "myrealm",
  "realmId" : "…",
  "exportedAt" : 1710000000000,
  "roles" : {
    "realm" : [ { "id": "…", "name": "…", … } ],
    "client" : {
      "my-client" : [ { "id": "…", "name": "…", … } ]
    }
  }
}
```

`roles.realm` lists realm roles; `roles.client` maps client id → client roles. The file is replaced atomically on each export.

### Typed config in SPA apps (keycloak-headless)

In a Vite app, add `keycloakRolesPlugin` from `keycloak-headless/vite` pointing `input` at this JSON file. On dev server start and whenever the file changes, the plugin writes `src/keycloak-config.generated.ts` with `KEYCLOAK_CONFIG` and `RealmRole` types. Use `useKeycloakConfigRoles(KEYCLOAK_CONFIG)` from `keycloak-headless/react` for compile-time-safe `hasRealmRole()` checks. See the parent project README.

## Scope

| Triggers export | Does not trigger export |
|-----------------|-------------------------|
| Admin API role create (`REALM_ROLE`, `CLIENT_ROLE`, `CREATE`) | Realm import, LDAP sync, internal `addRole()` |
| | User/group role mappings |

Extend `RolesJsonExporter` or `RoleCreatedEventListener#handleRoleCreated` for custom destinations.

## Publishing (maintainers)

Requires JDK 17+, Maven, and an npm account with publish rights:

```bash
npm login
cd providers/role-created-event-listener
npm publish --access public
```

## Keycloak version

Built against Keycloak **26.2.5** (aligned with `keycloak-js` 26.x in the parent project). Use a matching server version.
