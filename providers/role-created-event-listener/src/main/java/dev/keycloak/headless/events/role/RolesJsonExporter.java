package dev.keycloak.headless.events.role;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import org.keycloak.models.ClientModel;
import org.keycloak.models.RealmModel;
import org.keycloak.models.utils.ModelToRepresentation;
import org.keycloak.representations.idm.RoleRepresentation;
import org.keycloak.representations.idm.RolesRepresentation;
import org.keycloak.util.JsonSerialization;
import org.jboss.logging.Logger;

final class RolesJsonExporter {

    private static final Logger LOG = Logger.getLogger(RolesJsonExporter.class);
    private static final ConcurrentHashMap<String, Object> REALM_WRITE_LOCKS = new ConcurrentHashMap<>();

    private RolesJsonExporter() {
    }

    static RealmRolesExport buildExport(RealmModel realm) {
        RolesRepresentation roles = new RolesRepresentation();

        List<RoleRepresentation> realmRoles = realm.getRolesStream()
                .map(ModelToRepresentation::toRepresentation)
                .sorted(Comparator.comparing(RoleRepresentation::getName, Comparator.nullsLast(String::compareTo)))
                .collect(Collectors.toList());
        if (!realmRoles.isEmpty()) {
            roles.setRealm(realmRoles);
        }

        Map<String, List<RoleRepresentation>> clientRoles = new HashMap<>();
        realm.getClientsStream()
                .sorted(Comparator.comparing(ClientModel::getClientId, Comparator.nullsLast(String::compareTo)))
                .forEach(client -> {
                    List<RoleRepresentation> clientRoleReps = client.getRolesStream()
                            .map(ModelToRepresentation::toRepresentation)
                            .sorted(Comparator.comparing(RoleRepresentation::getName, Comparator.nullsLast(String::compareTo)))
                            .collect(Collectors.toList());
                    if (!clientRoleReps.isEmpty()) {
                        clientRoles.put(client.getClientId(), clientRoleReps);
                    }
                });
        if (!clientRoles.isEmpty()) {
            roles.setClient(clientRoles);
        }

        RealmRolesExport export = new RealmRolesExport();
        export.setRealm(realm.getName());
        export.setRealmId(realm.getId());
        export.setExportedAt(System.currentTimeMillis());
        export.setRoles(roles);
        return export;
    }

    static void writeExport(RealmRolesExport export, Path outputFile) {
        if (export == null || outputFile == null) {
            return;
        }

        String realmName = export.getRealm();
        Object lock = REALM_WRITE_LOCKS.computeIfAbsent(export.getRealmId(), id -> new Object());

        synchronized (lock) {
            try {
                writeAtomic(outputFile, JsonSerialization.prettyMapper.writeValueAsString(export));
                LOG.infof("Exported all roles for realm '%s' to %s", realmName, outputFile);
            } catch (IOException e) {
                LOG.errorf(e, "Failed to export roles for realm '%s' to %s", realmName, outputFile);
            }
        }
    }

    private static void writeAtomic(Path outputFile, String json) throws IOException {
        Files.createDirectories(outputFile.getParent());
        Path tempFile = Files.createTempFile(outputFile.getParent(), outputFile.getFileName().toString(), ".tmp");

        try {
            Files.writeString(tempFile, json, StandardCharsets.UTF_8);
            try {
                Files.move(tempFile, outputFile, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } catch (AtomicMoveNotSupportedException e) {
                Files.move(tempFile, outputFile, StandardCopyOption.REPLACE_EXISTING);
            }
        } finally {
            Files.deleteIfExists(tempFile);
        }
    }
}
