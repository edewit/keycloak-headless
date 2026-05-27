package dev.keycloak.headless.events.role;

import org.keycloak.representations.idm.RolesRepresentation;

/**
 * JSON document written when roles are exported for a realm.
 */
public class RealmRolesExport {

    private String realm;
    private String realmId;
    private long exportedAt;
    private RolesRepresentation roles;

    public String getRealm() {
        return realm;
    }

    public void setRealm(String realm) {
        this.realm = realm;
    }

    public String getRealmId() {
        return realmId;
    }

    public void setRealmId(String realmId) {
        this.realmId = realmId;
    }

    public long getExportedAt() {
        return exportedAt;
    }

    public void setExportedAt(long exportedAt) {
        this.exportedAt = exportedAt;
    }

    public RolesRepresentation getRoles() {
        return roles;
    }

    public void setRoles(RolesRepresentation roles) {
        this.roles = roles;
    }
}
